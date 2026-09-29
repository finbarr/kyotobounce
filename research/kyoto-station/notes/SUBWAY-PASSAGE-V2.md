# Public underground passage

29 September 2026. Connect the Hachijo East foyer to the north-side street through a continuous public underground route, with usable stairs at both ends.

## Evidence and construction

The [city subway plan](https://www2.city.kyoto.lg.jp/kotsu/tikadia/img/map/sta/pdf/k11map.pdf), [station-building B2 diagram](https://www.kyoto-station-building.co.jp/floorguide/b2f/) and pages 3–4 of [Kintetsu's illustrated subway route](https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_03.pdf) were rendered and visually inspected. They establish the public north–south passage, its Hachijo connection, northern exits and separate paid subway areas. The city station page still links the saved subway diagram; its historical The CUBE label is not evidence of current tenants. `sources.json` records the inspected files and hashes.

The new Hachijo descent sits beside the existing JR through-route. Its floor opening replaces one foyer floor panel. Two eighteen-step flights and a landing reach a fitted floor at Y−6.2 m. The southern lobby opens into a 144 m passage, which turns west at the north end and reaches a second two-flight stair. This stair meets the existing sloping municipal paving at approximately Y−0.1795 m.

The north opening removes exactly 82.92 m² in plan from one paving surface. The surrounding slopes, texture coordinates and normals are interpolated from the retained browser mesh. The editable source keeps the original material slots and assigns the cut paving to its existing textured slot. Retaining walls, upper guards, stair handrails and enclosure above the lower entrances finish both wells. The JR route stays open beside the southern descent.

The public route includes tactile strips, original bilingual labels, basic ticket machines, a closed subway gate boundary, wall finishes and ceiling fixtures. The 27 emitters use the existing limit of two active lights. Stair fixtures mount on the well walls.

All new dimensions, alignments, stair counts, finishes and the northern exit placement are fitted approximations. The existing central B1 deck at Y−4.913583 m is a separate level. Its B2/Porta connection, subway paid concourse, platform tracks, lifts and escalators remain unfinished. This increment establishes public circulation; it does not complete the subway station.

## Verification and cost

The export check covers all 435 new panels, 15,720 vertices and 5,240 triangles. It independently checks the paving aperture, unchanged surface coverage, interpolated texture coordinates and normals. Twelve old foyer triangles are removed; the cut paving has 186 triangles in place of 158. All other native records remain unchanged. The appended component costs 706,888 bytes and twelve material batches; the paving update reuses its existing browser batch and material.

The saved Blender scene reopens with matching geometry, UVs, normals, material assignments and retained object bindings. `npm run build:web` passes. Core native gameplay passes a 1.35 m walk, full translation-and-spin rest in 13.96 seconds, a free result, recall and home. Chrome gameplay passes entry, walking, a complete throw, result handling, recall during flight and menu/home navigation.

Twelve final Chrome views cover both stair wells, the street opening, public corridor, ticket lobby and retained JR route with no page errors. The short 1440×900 sample records 1,080 frames, a 16.7 ms median and approximately 16.8 ms p99/maximum, with at most two active lights. This is a short check, not a sustained performance or audio soak.

All ten final native route walks pass, recording 6,171 positions: both directions through each stair and the full passage, both directions beside the new opening to the JR gate, and the ticket-machine approach. Each endpoint finishes within 0.06 m of its intended floor height. Private receipts are retained under `.local/v2/current/components/subway-passage/`.

The verified source and playable station replace the current bundle in place. The prepared, composed and Blender full-station candidates and port 4426 browser overlay are removed. The normal exploration spawn remains unchanged.

## Rebuild

Against the Hachijo East parent, run `prepare-subway-passage.mjs`, `build-subway-passage.mjs` and `web/v2/compose-component.mjs`. `subway-passage-scope.mjs` defines the retired panel and northern paving aperture. `verify-subway-geometry.mjs` checks matching exports, the retained paving surface, interpolated UVs/normals and the empty opening. `verify-subway-passage.mjs` walks the passage, stairs, retained JR route and ticket approach in both directions. `install-subway-passage.py` integrates the geometry into the editable Blender station and verifies it after reopening.
