# B1 turnback, Porta B2 and subway connection

29 September 2026. Connect the existing central basement to a second escalator bank, B2 shopping aisles and the public subway passage.

## Evidence and fitted construction

The [operator's navigation guide](https://www.porta.co.jp/navigation), checked again today, describes the central gate route down to B1, the turn beside Ogaki Bookstore, and a second descent into B2 South. The saved route photographs `porta-b2-route-04.jpg` through `porta-b2-route-06.jpg` show the turn, the lower bank beneath the first bank, glazed rails, pale arrival floor and framed shop entrances.

Pages 2–3 of the saved `maps/porta-shopguide-2026.pdf` and the station's saved `floor-b1.svg` and `floor-b2.svg` establish the separate basement levels, parallel B2 aisles, cross-passages and eastern subway link with stairs and a marked ramp. The maps are schematic. They do not establish surveyed elevations, lengths or tenant boundaries.

The lower banks are fitted 3.8 m below the source-derived B1 datum, at a 30-degree slope. Four moving lanes reuse the original bank orientations, widths and direction pairing. The B1 deck is cut around them, with guards along the exposed edges. Existing first-bank pits and combs remain. The new B2 deck has matching lower-pit openings; its ceiling is cut around both banks.

Two shopping aisles and cross-passages connect the arrival area to the east. Glazed fronts, shallow shop interiors, ceiling joints, fixtures and original bilingual direction labels establish the public route. The eastern connection has fifteen steps and a separate 1:20 ramp rising to the existing subway passage at Y−6.2 m. The passage's former wall is opened at both arrivals. The B2 datum is approximately Y−8.714 m.

### Repaired obstruction at the eastern upper bank

The complete route test reproduced a retained defect at the eastern descending lane: the player's feet stayed at Y0.008 m while the escalator dropped below Y−0.387 m. `tactile-concourse-branch-raised` still crossed the open well. Its raised bars supplied a floating floor that prevented descent. The bars and their flat yellow backing are now intersected with the actual hall-deck footprint; the unsupported portions are removed from collision, browser geometry and the editable source. Seventy-one supported raised pieces remain, retaining their original yellow material and 5 mm height. This also removes the unsupported portions over the central opening.

The starting-circle validator separately rejects circles that straddle the edge of the retained tactile strips. The test starts beside the strips and walks across them to the landing. It does not weaken the placement rules or change the player controller.

The floor heights, 162 m mall footprint, shop modules, stair/ramp dimensions, finishes and light positions are fitted approximations. Tenant-specific shops, detailed ceiling services, lifts and the connection onward to plaza Porta B1 remain unfinished. The existing 360-video notes were consulted; the video was not rewatched for this increment. Reference photographs stay outside the shipped assets.

## Rebuild and verification

Use `prepare-porta-connection.py` with Shapely to extract the B1 deck and cut the lower-bank openings. Then run `prepare-porta-base.mjs`, `build-porta-connection.mjs`, `web/v2/compose-component.mjs` and `integrate-porta-motion.mjs`. The last step coordinates native paths, browser lane records and eight comb endpoints. The unchanged hardware GLB keeps its original source provenance.

`verify-porta-geometry.mjs` checks retained data and exact browser/native vertices, triangles, normals and sign UVs. `verify-porta-motion.mjs` compares visible treads to native step-box heights and checks continuous coverage between combs over 80 phases. `verify-porta-walks.mjs` exercises the full hall/B1/B2 turnbacks, idle conveyor rides, both B2 aisles and both subway approaches. Fixed starting positions must be on landings; the test walks onto each moving lane before checking its idle carry.

`install-porta-connection.py` adds the component and four editable moving chains to the existing Blender source, then saves and reopens it to verify geometry, normals, UVs, bindings and animation. Generated chassis auxiliaries are hidden from render because matching public casings already exist in the static component. `inspect-porta-chrome.mjs` checks actual camera positions, tread movement and stable resource counts while capturing the affected views.

### Verified result

- Native runtime: 20 walks with 8,503 position samples and four idle conveyor rides passed. These cover both directions through all four escalator lanes, both shopping aisles, the stairs, the ramp and the retained subway passage. Every walk ends grounded. Public-route and eastern descending-lane checks remain valid after the final render-only backing repair: an exact comparison confirms unchanged collision, motion, materials and lights.
- Geometry: 1,580 panels, 46,680 triangles and 140,040 vertices match between the new native and browser geometry. Nine retired panels and 2,879 corresponding browser triangles are removed. The retained geometry is checked separately.
- Motion: 128,000 tread samples passed across four lanes and 80 phases, with maximum height error below 0.000001 m. The editable Blender source was reopened and checked for geometry, UVs, normals, material bindings and all four moving chains.
- Chrome: 15 affected views were inspected; camera placement, moving treads and stable resource counts passed without page errors. Walking, a complete shot, recall, home and menus passed. Short frame samples were around 16.7 ms; this is not a sustained performance benchmark.
- `npm run typecheck`, `npm test` and `npm run build:web` passed. After promotion, `npm run test:runtime` passed on the main local preview: grounded spawn, a 1.35 m walk, full ball rest at 13.93 s, recall and home. The component uses 12 static material batches and 37 fixtures with the existing two-light pool. Browser geometry grows by 5,875,868 bytes.

The current source layout is `14242d6e61a0998f7ed3c746c6750d42fe65b8eff3bfa65897c1b44b3d23173a`; the browser geometry is `62cc8734c6ef0484a01dc88df196c90d2902bd09fb0edda7da2b0f7f8b74298f`. The Blender source is `6b0059717d5fd7fa9b48aa0e449e1b209b618a497f06e54738d2b49a90e6eb72`. The dev launcher changes only the entry position, so its overlay layout has a separate hash.

Private receipts live under `.local/v2/current/components/porta-connection/`. Current assets were replaced in place. Superseded full candidate scenes and the stopped candidate preview's generated overlay were removed after launch verification. The playable entry is now the B2 escalator arrival. Shops and dimensions remain fitted approximations; lifts and the onward plaza B1 connection remain on the defect list.

## Junction alignment update

The [eastern transfer delivery](EAST-TRANSFER-V2.md) subsequently moves the fitted subway stair/ramp junction 14 m north, clearing the separate paid JR underpass. It shortens both mall approach corridors while retaining their entrances, elevations and slopes. New route checks cover the relocated stairs and ramp in both directions. The coordinates and hashes above record the original delivery; `web/v2/assets.json` identifies the current integrated station.
