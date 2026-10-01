# Station and forecourt boundary

30 September 2026. Retain the first row of buildings around the forecourt,
including Kyoto Tower and its hotel base, while ending the world behind them.
This is the first delivery in the station simplification plan. Elevator removal
and the reduction of deep interiors remain separate work.

## Delivered scope

- A fixed fog band conceals geometry at the edge of the world. It follows world
  coordinates, so moving the camera closer does not reveal the city beyond it.
- A convex camera boundary includes the atrium, basement, railway, upper public
  routes, forecourt and tower. It applies to scout movement, focus jumps and the
  final camera position after orbit, briefing or replay updates.
- The north camera limit is native Z = 212 m. The fog begins 16 m inside the
  boundary. The tower's modeled rear is below Z = 200 m and its top is about
  130.2 m. The camera ceiling is 145 m; the basement limit is −18 m.
- Day and evening backgrounds match their fog color so there is no visible
  horizon seam where the city ends.
- Remove 1,018 distant building objects and 181 road objects from Blender and
  native collision, along with their rendered geometry. Station objects are
  classified separately and retained. Keep intersecting source objects intact;
  fog conceals their distant edges. No neighboring building interiors were added.

These limits are game boundaries fitted to the existing municipal model, not
surveyed property lines. The source attribution remains Kyoto City, CC BY 4.0.

## Asset reduction

| Asset | Previous bytes | Current bytes |
| --- | ---: | ---: |
| Browser station GLB | 279,111,436 | 155,759,312 |
| Native layout JSON | 524,904,895 | 515,932,539 |

The browser file is 44.2% smaller. It contains 135,539 fewer rendered triangles,
with 3,085,404 retained. The repack drops unreferenced buffers, vertices, materials
and image payloads; it does not quantize the retained geometry. File reduction
is not a claim about frame-rate improvement.

The source exporter had already split or culled 56 overlapping source triangles.
Their remaining 193 rendered fragments were matched by material, plane and
triangle containment, with a 0.1 mm allowance for float32 export rounding.
Every retained primitive passed a check of its ordered, decoded triangle
attributes, including positions, normals and UVs. Retained native records are
unchanged. The Blender file was reopened and its embedded layout and object
bindings checked.

The removal tool batches object deletion and loads the layout text directly.
Inserting the 500 MB JSON through Blender's text editor was profiled and found
to spend its time adding individual characters; direct loading avoids that path.

## Verification

Verification receipts are kept with the current private bundle under
`components/station-boundary/`. Large source/runtime assets remain local and are
referenced by `web/v2/assets.json`; they are not committed to Git.

The following checks passed before promotion:

- Chrome: tower, forecourt, garden and atrium views; no shader or page errors;
  boosted movement, focus jumps, altitude bounds, and day/evening fog.
- Native walks: upper landing to rooftop garden, head concourse to platform 30,
  and north entrance through the atrium.
- Native tower rays from both sides and a real forecourt throw: contact with
  `municipal-building-3207476640` at native (30.226, 66.377, 176.771), at
  23.32 m/s, 1.422 s into the shot.
- Normal native exploration: movement, home, a shot ending only after translation
  and spin stopped (22.96 s), and recall forfeiture.
- Normal Chrome gameplay: movement, full throw, result presentation, recall,
  menu and home.
- `npm run typecheck`, `npm test`, `npm run build:web`.

The repeated Chrome check loaded in 4.47 s; the first check took 19.18 s. The
final five views had frame p50 around 16.7 ms and p95 of 16.7–16.8 ms at
1440 × 900. These short local samples include warm caches and are not a
controlled performance comparison.

The unused full central-planting candidate was removed;
its unfinished code remains in a targeted Git stash.
