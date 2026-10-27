/**
 * SANRAL i-TRAFFIC camera catalogue adapter.
 *
 * DISABLED unless a source owner has granted S2 written permission to
 * republish camera imagery and the operator supplies a server-side API key.
 *
 * Official docs: https://www.i-traffic.co.za/developers/help/api/get-api-getcameras_key_format
 * Terms: https://www.i-traffic.co.za/termsandconditions
 *
 * Do not place the API key in VITE_ variables or send it to the browser.
 */
const SANRAL_CATALOGUE_URL = 'https://www.i-traffic.co.za/api/getcameras';
const SANRAL_MAP_URL = 'https://www.i-traffic.co.za/map';
const FETCH_TIMEOUT_MS = 7000;

function isEnabledFlag(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function publicHttpsUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    if (!host.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return null;
    if (/\.(local|internal|test|invalid)$/.test(host) || /^\[/.test(host)) return null;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Normalize the published GetCameras schema into the existing Godseye CCTV
 * catalogue. These are *still images*, not video or verified live streams.
 */
export function normalizeSanralCameras(payload) {
  if (!Array.isArray(payload)) return [];
  const feeds = [];
  const seen = new Set();

  for (const camera of payload) {
    if (!camera || isEnabledFlag(camera.Disabled) || isEnabledFlag(camera.Blocked)) continue;
    const lat = Number(camera.Latitude);
    const lng = Number(camera.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    // A coarse national envelope, not a province or municipal boundary.
    if (lat < -35.5 || lat > -21.5 || lng < 16 || lng > 33.5) continue;

    const rawId = String(camera.ID ?? '').trim();
    if (!rawId) continue;
    const id = 'sanral-' + rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
    if (seen.has(id)) continue;
    const url = publicHttpsUrl(camera.Url);
    if (!url) continue;

    seen.add(id);
    const road = String(camera.RoadwayName || '').replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, 70);
    const name = String(camera.Name || 'Camera ' + rawId).replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, 120);
    const direction = String(camera.DirectionOfTravel || '').replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, 30);
    feeds.push({
      id,
      name: [road, name, direction].filter(Boolean).join(' · '),
      lat,
      lng,
      url,
      fallbackUrl: url,
      detailsUrl: SANRAL_MAP_URL,
      city: 'South Africa',
      country: 'South Africa',
      provider: 'SANRAL i-TRAFFIC',
      mediaType: 'image',
      refreshSeconds: 90,
      streamCapable: false,
      continuousLive: false,
      verificationStatus: 'unverified',
    });
  }
  return feeds;
}

/**
 * One catalog request per server-side /api/cctv/sources refresh (30 minute
 * response cache). Do not fetch any SANRAL data without both gates enabled.
 * A developer key by itself does not confer republication rights.
 */
export async function loadSanralCameraFeeds({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (env.SANRAL_CAMERA_REPUBLICATION_APPROVED !== 'true') {
    return { status: 'pending-written-permission', feeds: [] };
  }

  const key = String(env.SANRAL_CAMERA_API_KEY || '').trim();
  if (!key) return { status: 'pending-developer-key', feeds: [] };

  const url = new URL(SANRAL_CATALOGUE_URL);
  url.searchParams.set('key', key);
  url.searchParams.set('format', 'json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
    });
    if (!response.ok) return { status: 'upstream-unavailable', feeds: [] };
    const payload = await response.json();
    if (!Array.isArray(payload)) return { status: 'invalid-catalogue', feeds: [] };
    return { status: 'catalogue-received', feeds: normalizeSanralCameras(payload) };
  } catch {
    // Do not log the request URL because it contains the developer key.
    return { status: 'upstream-unavailable', feeds: [] };
  } finally {
    clearTimeout(timeout);
  }
}
