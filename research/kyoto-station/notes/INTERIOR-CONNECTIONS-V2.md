# Interior connections: current defects and repairs

28 September 2026. The user's priority is usable interior architecture and the missing railway/south side. This replaces the shop-detail queue.

## East 4F–7F staircase

**Reproduced defect:** the retained `east-4f-7f` flight ended at Y34.62 m, while the current source-derived East Square floor is approximately Y29.973 m. Its old alignment missed the six-vertex stair opening. In the complete native station, the player stopped at `[80.446922, 27.879538, -8.518473]` against the courtyard slab. This was an actual failed walk, not just a stale route annotation.

The repair replaces the old flight and walking proxy with 52 steps in two flights, a middle landing, a lower connection to the retained 4F terrace, handrails and guards around the courtyard opening. The final tread fits the oblique edge of the existing floor. The courtyard floor supplies the upper landing without a duplicate slab. Old route records for the removed flight and nonexistent lower escalators are retired.

The [operator's 7F diagram](https://www.kyoto-station-building.co.jp/floorguide/7f/) establishes a separate connection to 4F. The saved municipal courtyard geometry supplies the opening and arrival height. The 2.4 m width, 0.182177 m rise, 0.30 m going and intermediate landing are fitted construction dimensions, not as-built measurements. See [the source registration](EAST-COURT-REGISTRATION.md). Adjacent escalators and lower-floor enclosures remain unfinished.

### Checks

- Normal-speed native walking passes from the retained 4F terrace into East Square and back: 1,205 recorded position samples, including both approaches, both flights and the intermediate landing. Both endpoints finish within 0.06 m of their intended floor height.
- Exactly 2,088 obsolete authored staircase triangles are removed from the browser export. The corresponding flight and player proxy are retired from the native layout and editable source.
- All 208 added panels, 7,488 vertices and 2,496 triangles have matching browser/native geometry; flat normals match geometric face normals. Net increase: 408 triangles and three material batches.
- Unrelated native geometry and the retained browser buffer bytes are unchanged.
- The saved Blender scene reopens with the new geometry and valid retained panel/flight bindings.
- Five views inspected in actual Chrome, including the lower approach and courtyard arrival, with no page errors. Core native walking, throw, complete translation/spin rest, recall and home checks pass. Chrome gameplay check is recorded in the component delivery receipt.

Private receipts are retained under `.local/v2/current/components/east-access/`. Asset hashes are pinned in `web/v2/assets.json`. Large generated exports are replaced in place; research images remain outside Git.

### Rebuild tools

Use `extract-east-court-stair.py` with the parent asset manifest to extract the obsolete source triangles. Then run `prepare-east-court-access.mjs`, `build-east-court-access.mjs`, and `web/v2/compose-component.mjs` in order. `verify-east-access-geometry.mjs` checks replacement scope; `verify-east-court-access.mjs` exercises the complete native station. `install-east-court-access.py` integrates the verified result into the editable scene. These are one-time replacement tools and assert the expected parent geometry.

## Ordered remaining defects

1. **Lower eastern circulation:** inspect the ground-to-4F route end to end. Existing lower enclosures and additional stairs still use older geometry. The first Chrome inspection shows abrupt slabs and wall returns around this area. Identify the next blocking surface through native walking before altering it.
2. **Central Gate bridge:** both bridge-end connections remain incomplete. Inspect the west connection to the free passage and the east hotel-lobby connection against the operator's floor plan; preserve their distinct floor levels.
3. **North–south free passage:** an older corridor exists around native X−63, Y7.35, Z−12.5 to −79. Its presence is not proof of a complete station crossing. Audit the entrance, south termination and relationship to the eventual platforms.
4. **Railway and Hachijo side:** the current rear overview shows the station building over a largely empty railway-side area. Conventional platforms/tracks, connecting paid concourses, the Shinkansen/Kintetsu relationships and the south building/forecourt require substantial construction. Use the saved [JR West schematic](https://www.jr-odekake.net/station/img/premises/0610116.pdf), municipal geometry and site plans to establish the full layout before detailing it.

Unfinished restaurant overhead source is safely shelved in Git. Decorative work remains deferred while these structural connections are being repaired.
