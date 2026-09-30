# Isetan sixth-floor northern entrance and lift

30 September 2026. Join the northern public stair landing to the sixth-floor store hall and extend the existing north lift to 6F.

## Evidence and construction

The station operator’s [6F Isetan plan](https://www.kyoto-station-building.co.jp/floorguide/6f/?tenant=isetan) places the northern entrance beside the public stairs and the store’s northern lift halls. The [store directory](https://www.mistore.jp/store/kyoto/shops/floor6.html) confirms the sixth-floor facilities. The saved operator overlay is in the preceding sixth-floor component’s private receipts.

The retained landing supplies the doorway edge and sixth-floor elevation. A short enclosed passage bridges its northern edge to the previously sealed store hall. The floor adds only the missing 0.67 m²; the retained landing and existing floor sheets are preserved. A fitted portal and lintel open the former solid hall wall, and bounded façade cuts clear the passage.

The lift remains at X−96/Z30. Its shaft extends from the former fifth-floor cap to the sixth floor, with openings through the intervening ceiling and slab, a new sill, protected landing doors and floor controls. It now serves nine stops, B3 through 6F, over 37.818416 m. All previous stops, car parts, landing doors and travel paths remain exact. New trips connect each previous stop to 6F.

The plan supports these connections; individual car placement, passage dimensions and finishes remain fitted approximations. Further lift cars, floors 7F–11F, western connections and tenant interiors remain unfinished.

## Verification

- Thirty-two added/replacement panels contain 588 triangles. Five old surfaces and 216 browser triangles are retired; ten retained façade panels receive bounded cuts. Browser and collision geometry match, including retained UVs and normals.
- Both shaft openings preserve all slab area outside the cut. Independent checks verify the entrance floor, unchanged public landing, sill, complete shaft travel and every doorway. The other thirteen lifts, all 44 escalators and public stairs remain exact.
- Passenger headroom checks pass across 319 route volumes and 95 beam checks. Ten native walks pass with 1,216 samples, including both directions through the new entrance and along the northern stairs, the hall bypass and the retained fifth-floor landing.
- Six Chrome walks pass with 77 checked waypoints, including ascent and descent on the northern stairs. Four inspected views show the entry, return passage, new lift landing and retained landing below. Short 1440×900 samples record 16.7 ms median and 16.8 ms p99 across 480 frames; these are a visual smoke check rather than a sustained benchmark.
- The source saves and reopens with matching geometry, UVs, materials, thirty-two moving lift parts and retained bindings. Stored export normals remain exact; the maximum Blender preview-normal difference is 0.055°.
- Native gameplay passes walking, full translation/spin rest at 7.81 seconds, free outcomes, recall and home. Chrome gameplay and `npm run build:web` pass. The served geometry, hardware, 44 escalators and 14 lifts match their candidate identities.
- All 55 Chrome lift checks pass: nine destinations, grounded arrivals and exits, closed doors in transit, rendered-part correspondence, floor-picker input handling, private-session isolation and mid-descent throw/recall. The browser test walks from the hall spawn to the call control before requesting the car.
- Eighteen native lift journeys pass, covering every adjacent stop in both directions and both full-height journeys. Further checks verify rejection of an unknown destination, closed empty-landing doors and calling the car to that landing.

## Rebuild and delivery

`prepare-isetan-sixth-north.py` derives the openings, passage infill and façade cuts. `build-isetan-sixth-north.mjs` creates the geometry and the extended lift definition. `extract-isetan-sixth-north.py` records the five retired source surfaces. The shared retirement, opening, composition and lift-integration scripts produce the candidate. `verify-isetan-sixth-north.py` independently checks its floors, shaft and retained lift behavior; `install-east-transfer.py` installs the result in the editable source and verifies it after reopening.

The current private bundle is replaced in place after verification. Asset hashes are pinned in `web/v2/assets.json`; receipts live in `.local/v2/current/components/isetan-sixth-north/`. Full candidate source/exports and the temporary preview overlay are removed at delivery.
