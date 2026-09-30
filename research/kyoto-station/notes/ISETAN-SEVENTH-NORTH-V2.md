# Isetan seventh-floor northern entrance and lift

30 September 2026. Connect the northern public stair landing to the seventh-floor store hall and extend the existing north lift to 7F.

## Evidence and construction

The saved station operator’s [7F Isetan plan](https://www.kyoto-station-building.co.jp/floorguide/7f/?tenant=isetan) shows the northern entrance beside the public stairs and lift halls. The [store directory](https://www.mistore.jp/store/kyoto/shops/floor7.html) supplies the floor context. The original plan overlay remains in the preceding seventh-floor component’s private receipts.

The new passage starts at the northern edge of the retained public landing between flights 06 and 07. It joins the store hall through a framed opening in the former solid wall. Only 1.97 m² of missing floor is added; the existing floor and public landing remain in place. Six bounded façade cuts clear the entrance. Both seventh-floor public entrances, the central escalators and the north lift now connect through the hall network.

The lift keeps its X−96/Z30 position and all nine previous stops, parts and journeys. A tenth stop serves 7F. Fitted openings through the floor and sixth-floor ceiling extend its shaft to 42.662584 m of travel. The new landing has a sill, protected doors, frame and controls. Rebuilt floor faces retain the world-aligned tile coordinates.

The plan supports these connections; passage dimensions, individual car placement and finishes are fitted approximations. Further lift cars, floors 8F–11F and tenant interiors remain unfinished. Older landing signs still have their earlier printed service ranges; they are recorded in the queue.

## Verification

- Thirty-two added/replacement panels contain 568 triangles. Five old surfaces and 204 browser triangles are retired. Browser and collision geometry match, including retained UVs and normals.
- Independent floor/shaft checks pass, including complete travel and all ten doorways. The other thirteen lifts, all 46 escalators and public stairs remain exact. Passenger headroom checks pass across 414 route volumes.
- Ten native walks pass with 1,548 samples, covering the entrance, hall network, retained sixth-floor landing and northern stairs in both directions.
- Six Chrome walks pass with 79 checked waypoints, including northern stair ascent and descent. Four Chrome views were inspected. Short 1440×900 samples record 16.7 ms median and 16.8 ms p99 across 480 frames; this is a visual smoke check.
- The source saves and reopens with matching geometry, UVs, materials, all 34 moving lift parts and retained bindings. Export normals remain exact; the maximum Blender viewport-normal difference is 0.056°. Lift meshes now use Blender’s data API, avoiding a full-scene dependency update for each part.
- Native gameplay, Chrome gameplay and `npm run build:web` pass, including full translation/spin rest at 7.80 seconds, free outcomes, recall and home.
- Twenty native lift journeys pass, covering every adjacent stop in both directions and both full-height journeys. Unknown destinations are rejected, empty landing doors block the shaft, and calling the car opens the requested landing.
- All 60 Chrome lift checks pass: ten destinations, grounded arrivals/exits, closed transit doors, rendered-part correspondence, floor-picker input handling, private-session isolation and mid-descent throw/recall. The served preview matches the candidate geometry and hardware hashes, all 46 escalators and 14 lifts.

## Rebuild and delivery

`prepare-isetan-seventh-north.py` derives the openings, passage infill and façade cuts. `build-isetan-seventh-north.mjs` creates the geometry and extended lift definition. `extract-isetan-seventh-north.py` records the retired source surfaces. Shared retirement, opening, composition and lift-integration scripts produce the candidate. `verify-isetan-seventh-north.py` independently checks its floors, shaft and retained lift behavior. `install-east-transfer.py` installs and verifies the editable source after reopening.

Asset identities are pinned in `web/v2/assets.json`; private receipts live in `.local/v2/current/components/isetan-seventh-north/`. Delivery replaces the existing local bundle and removes the full candidate source, exports and temporary preview overlay.
