# A bounded plan for a more realistic Kyoto Station

> **Superseded execution plan (28 September 2026):** use [V2-ITERATION-PLAN.md](V2-ITERATION-PLAN.md). The user has retired all existing levels as constraints. The architectural/reference scope below remains useful; its course-preservation requirements and all-at-once completion gates do not govern v2 iterations.

## Intended result

A convincing reconstruction of the station's public architecture, northern and southern plazas, and immediately adjoining street frontages, with evidence for the visible details and stable play on this laptop in Chrome. Keep the current Three.js browser renderer and native authoritative physics unless a measured requirement demonstrates a need to change them.

The scope below assumes the station plus immediate streets. It does not require modeling every hotel room, every shop interior, an entire walkable Kyoto neighborhood, or operational railways. Distant streets and rail infrastructure can be scenery. The initial research collection made no game changes. The subsequent user-set reconstruction goal is active in an isolated worktree; generated candidates remain local until the acceptance checks pass.

## 1. Freeze evidence and acceptance views

- Use this library as the starting register; retain dates, provenance, source type and uncertainty. Choose a current reference period and one consistent vegetation season.
- Reconcile loaded city geometry with the canonical layout metadata before duplicating existing work.
- Establish drawing scale and local coordinates from multiple independent anchors. Schematic maps establish adjacency; they do not establish metric dimensions. Record what is measured, inferred and still uncertain.
- Match 12 reference cameras: central hall; Grand Staircase; canopy/Skyway junction; Skyway outward; East Square; roof garden; West Square; north–south passage; north facade/forecourt; north street facing Tower; Hachijo terrace; southern facade/plaza. Add three evening variants.
- Keep a fixed screenshot size and camera configuration. Fit at least six durable architectural landmarks per reference where possible. Suggested initial alignment tolerance: within 2% of image width for high-confidence anchors; report uncertainty separately rather than moving geometry to fit a distorted photograph.

**Done when:** all 15 comparisons have source links, dates, camera parameters and an annotated baseline, and the target boundary is mapped. An unavailable construction drawing does not justify inventing precision.

## 2. Prove one representative area

Improve one central-hall bay and its connection to the forecourt: stone/metal/glass palette, panel joints, a canopy junction, a shop threshold, paving and daylight/reflections. Reuse the existing scene and collision pipeline. Use the [recent bay photographs and original lighting findings](notes/CENTRAL-HALL-LIGHTING.md) to resolve recess depth and intentional light/shadow contrast; the abandoned winter mirror concept is excluded from built geometry.

Resolve the [basement opening and route evidence](notes/CENTRAL-HALL-BASEMENT.md) before installing the sample floor: keep all three openings, reconstruct complete guards and descents, use the [official B1F turnback and separate B2F descent](notes/BASEMENT-ROUTE-UPDATE.md), establish the missing lower geometry, and reconcile affected course footprints.

Evaluate this area at normal walking distance and close-up before applying the material system everywhere. Use independently authored or licensed textures; photographic references do not automatically become texture assets.

**Done when:** the selected before/after cameras show correct large forms and believable finishes, and the performance gates below pass. Save the reusable materials, detail meshes and measured cost.

## 3. Correct the station's large forms and public routes

Work through G01/G03–G05/G09–G11/G13: outer facades, canopy and bridges, hall, staircase, free passage and West Square. Use the new sections/elevations to resolve proportions before adding tiny details. Preserve existing course identities and scoring behavior.

**Done when:** the corresponding acceptance views pass, public routes remain continuous, and visuals/collision derive from the same registered geometry.

## 4. Complete both outdoor approaches

Work through G02/G06–G08/G19/G20: register municipal building footprints, rebuild the near facades, complete Karasuma and Hachijo pedestrian spaces, then add bus/taxi infrastructure, pavement, signs and planting. Model the adjoining street edges to the detail visible from the station and plazas. Distant blocks use a cheaper level of detail.

**Done when:** both approaches read as complete places in pedestrian and elevated views, without empty horizons or abrupt ground seams; each prominent facade/fixture group has a cited reference and current date check.

## 5. Finish upper public spaces and evening appearance

Work through G12/G14–G18/G21: roof vegetation, East Square, South Promenade/Wood Square, Stone Museum, shopfront/service details and night appearance. Check all existing landmarks before adding anything. Original light-show content remains original unless licensed replacements are obtained.

**Done when:** all 12 daylight and three evening comparisons meet the rubric below. Optional ambient life or rain can be proposed separately; they are not prerequisites for this goal.

## 6. Verify, package and stop

For each zone, keep an evidence receipt with source IDs, edited files, screenshot pairs, collision checks and cost. Run browser asset validation after asset changes; service tests for service changes; rebuild the native worker and run isolated runtime integration tests whenever physics/layout changes require it. No record-creating tests on production.

Store original assets in the versioned release pack; keep research media outside Git and the game bundle. Produce one final report covering every scoped gap and any justified deferrals. Deployment requires a separate explicit instruction.

## Performance gates

These are proposed acceptance targets for the future goal, not claims that the present release already meets them.

1. Record a fresh baseline on this laptop in Chrome with power mode, display refresh, browser version, viewport, fixed drawing-buffer resolution, scene/asset hashes and audio state. Keep the same settings for paired runs.
2. Profile the complete game, not only a static viewer. Use the established aim, throw, flight, replay, escalator and camera-turn scenarios plus new exterior routes. Track frame intervals and main-thread/GPU time separately.
3. Aim for 60 FPS: at a fixed 1280×720 drawing buffer on a 60 Hz test display, proposed p95 frame interval ≤20 ms and p99 ≤33.4 ms after warmup. If the baseline cannot meet that, first fix the limiting cost or explicitly revise the target; do not silently lower image quality or resolution to claim success.
4. No sustained music slowdown, WebGL context loss, or repeatable stalls over 200 ms during a 20-minute representative play session. Investigate sporadic stalls with traces rather than hiding them in averages.
5. At equivalent resolution and scenes, no reproducible p95 regression over 5% versus the accepted preceding milestone; repeat paired trials before attributing a small difference to a change. Record load time, asset transfer, draw calls, triangles, texture allocation estimates and memory alongside frame timings.
6. Allocate per-zone budgets after the representative-area measurements. Reuse meshes and materials, batch appropriate static objects, cull by visibility, use levels of detail and compressed textures, and avoid continuously updating reflections or shadows for the whole station. Texture resolution follows screen coverage. Keep detail that affects collision physically consistent; tiny decorative detail should not create excessive collision shapes.

## Visual completion rubric

Each acceptance view must pass all four categories:

- **Shape:** correct silhouettes, circulation, floor relationships, opening positions and landmark placement, with uncertainty recorded.
- **Surface:** coherent texture scale and joints; visible distinction between stone, concrete, steel and glass; plausible weathering concentrated where evidence supports it.
- **Light:** believable indoor/outdoor contrast, contact shadows and reflected surroundings; no blown-out signs, black unexplained cavities or floating fixtures.
- **Completeness:** all prominent features in the chosen reference are present or documented as temporary/private/out of scope; no duplicate landmarks or abrupt facade/ground boundaries.

Use annotated comparisons to justify each pass. “Photorealistic” alone is not a completion test. After the scoped views, runtime invariants and performance gates pass, stop; additional city blocks or weather modes require a new bounded task.
