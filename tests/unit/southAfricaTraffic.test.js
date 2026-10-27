import { describe, expect, it, vi } from 'vitest';
import {
  loadSanralCameraFeeds,
  normalizeSanralCameras,
} from '../../server/services/southAfricaTraffic.mjs';

const sample = {
  ID: 'GP 001',
  Name: 'Northbound camera',
  RoadwayName: 'N1',
  DirectionOfTravel: 'Northbound',
  Latitude: -26.109,
  Longitude: 28.048,
  Url: 'https://camera.example.org/frames/001.jpg',
  Disabled: false,
  Blocked: false,
};

describe('South African traffic camera catalog', () => {
  it('does not contact SANRAL without written redistribution permission', async () => {
    const fetchImpl = vi.fn();
    const response = await loadSanralCameraFeeds({
      env: { SANRAL_CAMERA_API_KEY: 'secret-dev-key' },
      fetchImpl,
    });
    expect(response).toEqual({ status: 'pending-written-permission', feeds: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not contact SANRAL without a developer key', async () => {
    const fetchImpl = vi.fn();
    const response = await loadSanralCameraFeeds({
      env: { SANRAL_CAMERA_REPUBLICATION_APPROVED: 'true' },
      fetchImpl,
    });
    expect(response.status).toBe('pending-developer-key');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('filters disabled, blocked, unsafe, duplicate and out-of-country cameras', () => {
    const feeds = normalizeSanralCameras([
      sample,
      { ...sample },
      { ...sample, ID: 'blocked', Blocked: true },
      { ...sample, ID: 'disabled', Disabled: true },
      { ...sample, ID: 'internal', Url: 'http://192.168.1.1/snapshot.jpg' },
      { ...sample, ID: 'invalid-host', Url: 'https://localhost/snapshot.jpg' },
      { ...sample, ID: 'far', Latitude: 51.5, Longitude: 0 },
      { ...sample, ID: 'nil-id', ID: '' },
    ]);
    expect(feeds).toHaveLength(1);
    expect(feeds[0]).toMatchObject({
      id: 'sanral-GP-001',
      provider: 'SANRAL i-TRAFFIC',
      mediaType: 'image',
      continuousLive: false,
      verificationStatus: 'unverified',
      lat: -26.109,
      lng: 28.048,
    });
    expect(feeds[0].name).toContain('N1');
    expect(feeds[0].detailsUrl).toBe('https://www.i-traffic.co.za/map');
  });

  it('uses the documented endpoint and does not expose the key in feed data', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => [sample],
    }));
    const response = await loadSanralCameraFeeds({
      env: {
        SANRAL_CAMERA_REPUBLICATION_APPROVED: 'true',
        SANRAL_CAMERA_API_KEY: 'secret-dev-key',
      },
      fetchImpl,
    });
    expect(response.status).toBe('catalogue-received');
    expect(response.feeds).toHaveLength(1);
    const [requestUrl, options] = fetchImpl.mock.calls[0];
    const parsed = new URL(requestUrl);
    expect(parsed.origin).toBe('https://www.i-traffic.co.za');
    expect(parsed.pathname.toLowerCase()).toBe('/api/getcameras');
    expect(parsed.searchParams.get('format')).toBe('json');
    expect(parsed.searchParams.get('key')).toBe('secret-dev-key');
    expect(options.redirect).toBe('error');
    expect(JSON.stringify(response)).not.toContain('secret-dev-key');
  });

  it('fails closed without disclosing upstream URLs or key', async () => {
    const response = await loadSanralCameraFeeds({
      env: {
        SANRAL_CAMERA_REPUBLICATION_APPROVED: 'true',
        SANRAL_CAMERA_API_KEY: 'confidential',
      },
      fetchImpl: vi.fn(async () => { throw new Error('network secret confidential'); }),
    });
    expect(response).toEqual({ status: 'upstream-unavailable', feeds: [] });
    expect(JSON.stringify(response)).not.toContain('confidential');
  });
});
