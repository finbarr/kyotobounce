# Connected subway reconstruction

29 September 2026. Delivered to the local playable station.

This replaces the misplaced subway halls as one connected structure. The North
and Central 1 cores use the [checked city-plan registration](SUBWAY-CITY-CONTROL-V2.md).
The reconstruction includes the other two gate areas, a shared island platform,
track beds, three street stairs, three operating lifts, four escalators and
receiving approaches to Porta, the retained JR gates and the Hachijo underpass.

## Evidence and construction limits

- North and Central 1 stair centers and orientations follow the registered city
  outlines. Exit 3, 4 and 5 approaches use the same registration. Their surface
  heights come from the retained municipal paving triangles.
- The city's K11 diagram and the operator's Kotochika map establish four gate
  areas, the reversed South stair direction, two platform lifts and an unpaid
  passage beside the southern paid areas. These diagrams are not scale drawings.
- Central 2 at native X97/Z−23 and South at X99/Z−65 are fitted construction
  positions. The island is about 207 meters long and 14.2 meters wide. Neither
  dimension is a surveyed platform measurement. The separate public passage
  continues much farther south; its city-plan extent does not determine the
  boarding-platform length.
- The JR approach passes around the northern end of the existing underground
  passage and reaches its working gate bank. It preserves all six existing
  conventional-platform stairs and the Shinkansen transfer route. This local
  receiving arrangement remains fitted to the retained railway reconstruction.
- Porta's retained B2 floor is approximately 2.514 meters below the new
  concourse. A guarded stair makes this change explicit. Both B1 shopping
  streets meet the replacement at the same elevation.
- Track service stairs and the continuous base beneath the island are fitted
  construction. They prevent gaps beside the rails or a fall onto the track bed
  from trapping the player. Detailed platform equipment and tenant interiors
  remain unfinished.

Primary references are retained in the research folder:

- `maps/north-plaza-city-study-2026.pdf`, page 12, for registered northern access
  and the public southern passage.
- `maps/kotochika-kyoto-2026.pdf` and `maps/subway-kyoto-plan.pdf`, for circulation,
  gate order, stair direction and lift relationships.
- [Hachijo crossing evidence](HACHIJO-CROSSING-V2.md), for the receiving street
  lifts, sunken garden and Avanti connection.

## Replacement boundaries

The replacement explicitly retires 4,065 old authored panels and one municipal
surface wholly inside a new street opening. Shared western Porta geometry is
clipped at X55, keeping 55 closed fragments and six rebuilt slab records,
including the ceiling aperture and its noncolliding trim. The retired indoor southern stair opening is closed in
the retained foyer. JR subgrade and the Hachijo forecourt remain intact.

The old municipal North stair and Exit 5 lift openings are restored from their
original GLB triangles, including the original slopes, UVs and normals. The
three new street stairs and street lift receive matching visual/native cuts.
These operations retain unrelated municipal surface geometry.

The station and editable source replace the existing files under
`.local/v2/current/`. Receipts and the small rebuild component are retained in
`.local/v2/current/components/subway-rebuild/`; temporary full station copies
are removed after promotion. Asset hashes are pinned in `web/v2/assets.json`.

## Checks

- All four gate-to-platform stairs pass in both directions in the complete
  native station: eight walks.
- Twenty-six complete-station walks pass across the three street stairs,
  retained Porta B2 and B1 floors, JR gate, Hachijo lobby, southern public
  passage, Exit 5 street-lift threshold and both track service stairs.
- Twelve further walks connect all four lower stair landings and both platform
  lifts to the island aisles. The final total is 46 complete-station route walks.
- All three lifts pass five native checks each: entry, doorway obstruction,
  grounded travel and exit, closed empty-shaft doors, and a called round trip.
  All four escalators carry an idle player uphill and allow exit at the top.
- Both platform aisles passed end to end in both directions in the initial
  integrated station. The final track base and service stairs add recovery
  access below the boarding floor.
- All 2,614 component panels, 182,064 vertices and 60,688 triangles match the
  browser at float32 precision, including winding and flat normals. The paving
  tool checks the removed triangles against the browser, restores 92.36 square
  meters from original textured triangles and modifies nineteen municipal
  surfaces for the new openings.
- Eleven final views render in actual Chrome with no page errors or growth in
  texture/reflection allocations. The Porta stair's four obsolete ceiling
  strips are removed. Short 1440 by 900 samples show a 16.7 ms median and
  16.8 ms p99; these are brief view checks, not a performance soak.
- Native gameplay passes configured spawn, walking, home, full translation and
  spin rest, unsaved exploration results and recall forfeiture. Chrome gameplay
  also passes. A complete collision/motion identity check connects the earlier
  browser and interface receipts to the final visual-only ceiling cleanup.
- The editable Blender scene saves and reopens with all added static geometry,
  UVs, normals, retained bindings, three lift assemblies and four animated step
  chains verified. Old moving chains are removed in full.
- `npm run build:web` passes. Source syntax and `git diff --check` pass.

## Construction tools

`prepare-subway-rebuild.py` records the geometric assumptions and interfaces.
`prepare-subway-integration.py` identifies retired panels and clips retained
Porta solids. `build-subway-rebuild.mjs` builds matching native/browser geometry.
The existing exact-removal and component composer are reused, followed by
`integrate-subway-rebuild.mjs` and `rebuild-subway-paving.mjs`.
`install-subway-rebuild.py` carries the final geometry, three lifts and four
animated step chains into the same editable Blender station.
