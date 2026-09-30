# Isetan eighth-floor northern entrance and lift

30 September 2026. The northern public stair landing now opens into the eighth-floor hall network, and the existing north lift continues through 8F.

## Evidence and construction

The operator’s [8F Isetan plan](https://www.kyoto-station-building.co.jp/floorguide/8f/?tenant=isetan) shows the northern entrance beside the public stairs and lift banks. The [store directory](https://www.mistore.jp/store/kyoto/shops/floor8.html) supplies the floor context. The saved plan is retained in the preceding eighth-floor component’s private receipts.

A short framed passage connects the retained public landing to the north hall. It adds 2.14 m² of missing floor. Ten bounded façade cuts clear the passage and its stair approach. Both eighth-floor public entrances, the café and central escalators connect through the existing halls.

The north lift retains its position and all ten previous stops, parts and trips. An eleventh stop serves 8F. Fitted floor and ceiling openings extend its shaft to 47.71 m of travel. The new landing has protected doors, a sill, frame and controls. Rebuilt floor faces retain their world-aligned tile coordinates.

The plan establishes the connections; passage dimensions, individual car positions and finishes are fitted approximations. Further cars, upper store floors and tenant interiors remain unfinished. The next priority is the atrium-to-rooftop-garden journey. Older printed lift service ranges can be updated with later wayfinding work.

## Verification

- Thirty-two added/replacement panels contain 528 triangles. Five old surfaces and 160 browser triangles are retired. Browser and collision geometry match, including retained UVs and normals.
- Independent floor and shaft checks pass across all eleven doorways. The other thirteen lifts, all 48 escalators and public stairs remain exact. Passenger headroom checks pass across 524 route volumes and 68 beam segments.
- Ten native walks pass with 1,862 samples, including both entrance directions, hall approaches, the retained seventh-floor landing and the northern stair connection.
- Six Chrome walks pass with 84 checked waypoints. Four Chrome views were inspected. Short 1440×900 samples record 16.7 ms median and 16.8 ms p99 across 480 frames; this is a visual smoke check.
- The editable source saves and reopens with matching geometry, UVs, materials, all 36 moving lift parts and retained bindings. Export normals remain exact. Blender’s viewport encoding differs by at most 0.063°, within the existing 0.1° angular tolerance used for fitted floor geometry.
- All 65 Chrome lift checks pass, including eleven destinations, grounded arrivals and exits, protected transit doors, floor-picker input, private-session isolation and throwing/recalling during descent.
- Twenty-two native lift journeys pass: every adjacent stop in both directions and both full-height trips. Unknown destinations are rejected; empty landing doors block the shaft; calling the car opens the requested landing.
- Native gameplay, Chrome gameplay and `npm run build:web` pass, including full translation/spin rest, free outcomes, recall and home.

## Rebuild and delivery

`prepare-isetan-eighth-north.py` derives the openings and infill. `build-isetan-eighth-north.mjs` creates the component and extended lift. `extract-isetan-eighth-north.py` records retired source surfaces. The existing replacement, composition and lift-integration tools produce the candidate. `verify-isetan-eighth-north.py` independently checks the floors, shaft and retained lift definitions; `install-east-transfer.py` installs and reopens the editable source.

The native lift verifier now derives arrival timeouts from each trip’s sampled duration. The full 47.71 m journey plus door operation exceeds its former fixed one-minute limit.

Asset identities are pinned in `web/v2/assets.json`. Private receipts live in `.local/v2/current/components/isetan-eighth-north/`. Delivery replaces the existing local bundle and removes the full temporary source, exports and preview overlay.
