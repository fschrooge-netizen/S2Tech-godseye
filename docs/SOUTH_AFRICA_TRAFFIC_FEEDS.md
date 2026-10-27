# South African road traffic cameras | Source registry and onboarding

Checked: 2026-10-27 (Africa/Johannesburg). Owner: S2 Tech Security.
Scope: **road traffic CCTV**, not private property cameras, neighbourhood surveillance, device discovery or any unauthorised RTSP/ONVIF access.
Target requested: `https://ci.s2tech.co.za` (current route/deployment **not verified**).

## Source registry

| Source | Authoritative entry | Geographic scope | Technical access | Republishing status | Enabled |
| --- | --- | --- | --- | --- | --- |
| SANRAL i-TRAFFIC | https://www.i-traffic.co.za/developers/help/api/get-api-getcameras_key_format | Gauteng, KwaZulu-Natal, Western Cape national roads | Documented `GET /api/getcameras?key=...&format=json`; returns still-image URLs and coordinates; developer key required; published cap 10 calls per 60 seconds | **Prior express written consent required** for redistribution/republication/embedding; automated extraction also restricted in published terms | **No, awaiting consent and key** |
| ARGOS ATLAS | https://argosatlas.com/en/cameras/south-africa/ | Commercial directory of South African publicly viewable cameras; listings can change | Browser camera catalogue; not a verified redistribution API | **Unknown / no S2 licence verified**; its count is not a licensed camera inventory | **No** |
| N3 Toll Concession | https://www.n3tc.co.za/ | N3 toll route | Route notifications published publicly; no authorised raw camera feed API verified | **Unknown / no camera licence verified** | **No** |
| TRAC N4 | https://www.tracn4.co.za/ | N4 toll route | Route information website, not a camera API entitlement | **Unknown / no camera licence verified** | **No** |
| Bakwena | https://www.bakwena.co.za/ | N1/N4 toll routes | Operator portal, camera feed API unverified | **Unknown / no camera licence verified** | **No** |

Do not silently aggregate images from sites offering public viewing, scrape undocumented endpoints, use a user's logged-in session or present an embedded viewer as authorised. Link to each source's permitted public home page or traffic map when appropriate.

SANRAL's official terms (https://www.i-traffic.co.za/termsandconditions) prohibit content republication/embedding without prior express written consent. They permit linking to the home or traffic map subject to their conditions. SANRAL's FAQ (https://www.i-traffic.co.za/faq) says recorded footage is not generally released to the public.

## Implemented adapter (permission-gated, disabled by default)

- `server/services/southAfricaTraffic.mjs` normalises the documented SANRAL `GetCameras` JSON result into the application's existing CCTV map schema (IDs, still-image URL, latitude, longitude, provider, provenance).
- `server/routes/cctv.mjs` merges permitted SANRAL catalogue records into `GET /api/cctv/sources`. The existing `CameraLayer` already consumes this endpoint. No separate frontend camera parser or third-party CDN is required.
- **Disabled until both** `SANRAL_CAMERA_REPUBLICATION_APPROVED=true` and `SANRAL_CAMERA_API_KEY=<server-held key>` are configured. Set the boolean only after S2 legal/operations records the provider's **written** consent, permitted use, polling and retention terms.
- Never place the key in a `VITE_` setting, URL shown to users, public environment file, GitHub Actions logs or repository. The key is included only in the upstream server request.
- The server sources response is cached for 30 minutes. The optional adapter performs at most one SANRAL catalogue GET per cache rebuild; do not introduce per-browser direct upstream calls.
- Individual camera images are **still images**, not continuous streaming video. The availability of a catalogue record does not prove the image is reachable or fresh. The app flags them `unverified` and they must not be presented as operational or archived evidence until independently checked.
- Failed key, network or upstream requests return an empty, explicit unavailable status, without leaking the key.
- Only HTTPS public hostname image endpoints are permitted by this adapter. Image proxying/recording remains separately gated by provider terms and a security review.

## Activation and acceptance checklist

1. Obtain SANRAL written permission naming S2, `ci.s2tech.co.za`, use cases, camera imagery republication, public/private audience, API entitlement, cache/recording limits and revocation process. Store the agreement privately, not in GitHub.
2. Obtain a SANRAL developer key and confirm live API response, format, camera count, latency, restrictions, actual HTTPS image hosts and rate limits through an authorised test. Do not assume all catalogued cameras work.
3. Confirm **which application is deployed at ci.s2tech.co.za**. The separate private `fschrooge-netizen/s2-crime-intelligence` repo currently describes a static, nonfunctional login site; `fschrooge-netizen/S2Tech-godseye` contains the globe/CCTV application. Do not overwrite the login site or point its domain at another image without reviewed auth and deployment routing.
4. Run the new mapping/gate unit tests, security review (including existing `/api/cctv/frame?url=` SSRF exposure), TypeScript, lint, complete build, smoke tests and visual/role QA. An existing open URL image proxy must not allow LAN/private-network fetches, credential leaks or licence bypass.
5. Only after approval: set the two **server-only** environment values on the right application; verify the `southAfrica.status`, expected camera points, refresh timestamps, offline behaviour and outbound request rate. Record source terms and expiry/revocation.
6. Release through a reviewed immutable image, dedicated Coolify target registration, health/TLS tests, public content checks and rollback. Git commit or PR **does not** mean live deployment.

## Explicitly excluded
Private CCTV streams; credentials guessed from camera hardware; RTSP/ONVIF scans; recorded footage; ANPR, facial recognition or person tracking; site camera feeds not licensed for redistribution; synthetic or guessed camera coordinates. South Africa's publicly accessible camera count must never be represented as S2's imported/live count.
