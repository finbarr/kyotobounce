# Kyoto Station reconstruction

## Latest: floor joins and basement enclosure (28 September 2026)

Hall12/descent12 reconcile source landing plates with both floors while retaining all five openings. Enclosure03 supplies the source well walls and soffits; hidden backing closures and a maximum0.0483mm lower-deck alignment are explicit. Independent floor/source/export proofs and detailed hall/enclosure native ray checks pass. See `STATE.md` and primary research `notes/HALL-BASEMENT-ENCLOSURE.md` for identities, failures and limits. Full station remains courtyard life04/browser04; assembly15 is uninstalled.

## Latest: source bank profiles11 (28 September 2026)

See `STATE.md` and the primary research note `research/kyoto-station/notes/HALL-BANK-PROFILES.md`. Component11 replaces coarse rails/glass/skirts with source profiles and exact support cuts; 45,266 triangles (28.8% fewer), four unchanged moving lanes. Source/closed-shell/export/motion checks pass. Native05 passed 24 walks and four rides on assembly10; exact dedup equivalence proves final11 preserves every collision/rendered triangle corner. Floor-interface overlaps remain unresolved and must be fixed next. The component remains uninstalled; full station stays courtyard life04/browser04.

New construction tools: `prepare-hall-bank-profiles.py`, `clip-hall-bank-metal.py`, `trim-hall-landing-infills.py`; verifiers: `verify-hall-bank-profiles.py`, `verify-hall-normal-dedup.mjs`, `audit-hall-bank-floor-joins.py`. `trim-hall-bank-metal.py` preserves the rejected Boolean diagnostic approach. Shared `component-mesh.mjs` supports explicit normals; its default old descent02 output was verified byte-identical. Full evidence includes failed source-section receipts and floor overlap GeoJSON.

This is the execution record for the user-set reconstruction goal in `research/kyoto-station/LONG-TERM-PLAN.md`. The complete goal remains active. The research folder, source binaries and captured images are local artifacts; they are not shipped in Git or the browser bundle.

## Scope and acceptance

Reconstruct the station's public architecture, both plazas and immediately adjoining street frontages. Retain the Three.js renderer and authoritative native physics. Use September 2026 public-space configuration with leaf-on late-summer vegetation; dated structural photographs can establish permanent architecture but cannot establish current tenants or temporary installations.

The six milestones remain:

1. Registered evidence, mapped boundary and 12 daytime plus three evening comparisons.
2. One central-hall bay and forecourt connection: shape, materials, joints, canopy junction, shop threshold, paving, daylight and reflections.
3. Main station forms and continuous public routes.
4. Both exterior approaches and adjoining street frontages, including distant context at appropriate detail.
5. Upper public spaces, planting, service details and evening appearance.
6. Full visual, native runtime, gameplay and Chrome verification, asset packaging and final report.

Every view must pass shape, surface, light and completeness. Do not mark a camera matched without measured correspondences. High-confidence anchors should be within 25.6 px at the fixed 1280 px width, with uncertainty reported separately. A plan or brochure sheet is not a camera image.

Keep scores authoritative, shot stopping rules unchanged and current course identities intact. Visible physical geometry and collision must come from the same registered source. Rebuild native code when it changes; restart the isolated worker after layout changes. Publication requires separate authorization.

## Current status — 2026-09-26 local / 2026-09-27 UTC

Milestone 1 is **in progress**, not accepted. Milestones 2–6 are pending.

Completed:

- Installed the pinned assets-v7 source pack in the isolated worktree and verified `npm run build:web`.
- Audited the complete Blender source and its exact embedded canonical layout seed.
- Reconciled the city metadata discrepancy and located the original licensed city source on disk; verified its recorded hashes.
- Recorded a fresh full-game Chrome baseline at a fixed 1280×720 drawing buffer.
- Added 15 candidate camera records, source links and six proposed anchor identities per view.
- Captured all 15 candidates from the actual local game, including the three evening variants. Captures had no browser errors or warnings.
- Added separate asynchronous GPU timing and annotated side-by-side local review pages.
- Generated and inspected a recovered northern exterior candidate with matching collision; validated all 31 course placements and five entrance walks.
- Registered official CityGML roof edges and fixed the bounded work area in `scope.json`.

Still required for milestone 1:

- Complete fourteen remaining photo registrations. The north facade now has eleven measured source correspondences within the 2% image tolerance; its camera uncertainty and the current game silhouette failure are recorded below. Other views retain null coordinates and residuals.
- Select a pedestrian Hachijo terrace photograph; its current municipal plan establishes topology only. Crop the south facade photograph from brochure page 6 before registration.
- Verify individual route/public-access boundaries within the mapped work envelope in `scope.json`; the broader authoring envelope is now fixed.
- Resolve conflicting published staircase rise claims without inventing a scale correction.
- Repeat the two failing baseline views with GPU traces and paired trials before attributing the failure to a specific cost. The short inspection captures use different cameras and do not clear those failures.

## Verified source findings

| Item | Evidence and consequence |
| --- | --- |
| Current station source | 60,981 mesh objects; 24 hidden helpers. Embedded layout seed matches canonical layout exactly. No municipal collection or complete city context is present. No municipal boxes, panels or beams appear in the canonical geometry arrays either. |
| Stale city metadata | `architecture.cityContext` and `northForecourt` describe geometry absent from this pack. Treat these claims as stale; the eventual matching source/layout export must replace them with verified installed contents. |
| Reflections | The current game already captures three station-geometry probes. This corrects the research gap's incomplete characterization of the environment. Evening mode still retains the captured daytime reflections. |
| Recovered municipal source | `art-source/KyotoCity-Exterior.blend` in the primary checkout: 3,202 mesh objects, 267,699 vertices and 381,186 polygons. It is a previous converted asset, not new work. There are 579 image datablocks, 548 packed; texture/material cost needs analysis before integration. |
| Municipal coverage | Blender bounds X −519.854…327.213, Y −47.838…389.955, Z −4.159…130.215 m, with Y north and Z up. This selected asset chiefly supplies northern context; it does not complete Hachijo. |
| Scale | Published 470 m length describes the whole building complex, not the ~294 m modeled atrium extent. Extend/register missing wings; do not uniformly scale the existing playable station. |

Recovered source hashes (verified from current files):

- Original municipal ZIP: `1c750860c7e498d09fa19db357eb77942157d2b2ec1ed1d24a8470c134f20244` (640,814,675 bytes).
- Converted exterior Blender: `b04f448471d9d80b341471466f692db5c9afcd3079c7320e02e8e9ceda4d2e64` (143,584,103 bytes).
- Coordinate frame: `841ad51e5808b6e15f483a46c14f6306865e0d5aa25dc3d64c83a33e936852cd`.
- Baseline canonical layout: `232b331fe5f7543bf8b228774e15c6228fffb5ee389c2a538029665827e19cc8`.

The [Kyoto City source](https://data.city.kyoto.lg.jp/resource/?id=21224) is attributed to Kyoto City, CC BY 4.0. The retained conversion applies a local frame, selects buildings/terrain/shelters, excludes municipal station root 3520856608, and adds an entrance transition and authored ground finishes. Its old installation metadata does **not** prove that it is installed in the current game. Reverify joins, texture dependencies, collision and visual alignment before reuse.

The frame uses EPSG:6674, projected origin (−22002.870355756913, −112472.45119380913), construction reference elevation 28.79554171294777 m, and local XY matrix `[[1.0000911357079671,-0.002412082220518444],[0.002412081238079407,1.0000911348601587]]`. Previous FBX/GDB agreement supports coordinate interpretation, not independent survey accuracy. Verify new anchor registrations against the current station.

## Initial performance receipt

Baseline revision `47f98c63b83006bc718f20e8eb1c8927a72e92fd`; Chrome 153.0.8010.53; Apple M2; AC power; low-power mode off; fixed 1280×720; measured refresh about 59.88 Hz. Other desktop applications were running and their sampled activity is retained in the raw receipt.

Five recorded-native gameplay scenarios plus four fixed diagnostic views ran with 5 s warmup and 20 s measurement each. The fixture reproduces recorded simulation states; this is not a new native runtime proof or the required 20-minute live soak.

| Scenario | Frame p95 / p99 (ms) | CPU callback p95 (ms) | Draw calls p95 |
| --- | --- | --- | --- |
| Aim | 17.3 / 17.6 | 4.5 | 383 |
| Walk | 17.4 / 17.6 | 4.6 | 383 |
| Camera turn | 17.3 / 17.6 | 4.7 | 592 |
| Flight | 17.3 / 17.6 | 5.0 | 659 |
| Fast-forward | 17.2 / 17.6 | 5.4 | 619 |
| Hall | 17.3 / 17.6 | 4.3 | 380 |
| Escalators | 17.2 / 17.6 | 4.0 | 381 |
| Garden | **33.9 / 49.5** | 7.2 | 1,036 |
| Concourse | **33.8 / 50.0** | 8.6 | 259 |

No measured stage had a frame over 200 ms, hidden frames, a WebGL context loss or skipped music steps. Cold load included long tasks; those are not erased by the warmed result. Two views fail the proposed p95 ≤20 ms / p99 ≤33.4 ms targets. Do not call the baseline accepted.

Separate short captures at the 15 new candidate poses recorded GPU timers without disjoint events or dropped queries. Their GPU p95 ranged from 3.26 to 15.36 ms, while CPU render submission p95 was lower. These are diagnostic timings, not isolated shader-cost attribution or a substitute for paired full-game runs. GPU queries follow the [Khronos extension contract](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/): poll asynchronously, bound outstanding queries and reject disjoint intervals.

### Repeat of the two failing views

A subsequent 20 s GPU-instrumented repeat used the original camera positions, targets, 55° vertical field of view and fixed 1280×720 buffer. Draw calls and triangle counts matched the first run exactly. Garden frame p95/p99 was 17.5/17.7 ms, with GPU p95 14.15 ms. Concourse was 17.4/17.8 ms, with GPU p95 8.95 ms. There were no disjoint events or dropped timer queries. This did not reproduce the first failure and does not explain it; retain both results and investigate background workload/thermal and longer-run behavior. Do not manufacture a rendering fix from the first run alone.

The repeat receipt is `.local/station-realism/legacy-gpu-baseline/capture.json`; its frozen two-camera manifest is alongside it. `KYOTO_REVIEW_MANIFEST` selects a diagnostic manifest without modifying the 15 acceptance candidates. `KYOTO_REVIEW_WARMUP_MS` and `KYOTO_REVIEW_MEASURE_MS` control diagnostic durations.

The local comparison gallery passed Chrome checks at 1440 px and 390 px widths: 15 sections, 30 loaded images, no broken images, no horizontal overflow or page errors. Desktop and mobile screenshots are retained beside the gallery.

## Reproduce

Use an isolated local service and a compatible recorded fixture. Default capture port is 4392. Start it with the worktree's separate data directory and selected compatible worker; see `docs/LOCAL_PLAY.md`. Never point record-creating tests at production.

```sh
# Read-only Blender audit
blender --background --threads 2 --python-exit-code 1 \
  --python web/station/realism/audit-source.py -- \
  --source art-source/atrium/KyotoAtrium.blend \
  --layout runtime/station-layout.json \
  --output .local/station-realism/baseline/source-audit.json

# Fixed-resolution full-game benchmark
KYOTO_TEST_ORIGIN=http://127.0.0.1:4392 \
KYOTO_BENCH_WIDTH=1280 KYOTO_BENCH_HEIGHT=720 \
KYOTO_BENCH_FIXTURE=.local/stability/native-fixture.json \
KYOTO_BENCH_STAGE_MS=20000 KYOTO_BENCH_WARMUP_MS=5000 \
node web/benchmarks/stability.mjs realism-baseline --views

# Full-game diagnostic captures; no score submissions after fixture disconnect
node web/station/realism/capture.mjs views-baseline
node web/station/realism/review-gallery.mjs .local/station-realism/views-baseline research/kyoto-station
```

`views.json` is the editable camera register. `make-views.py` seeds candidates from the layout and local research catalog; do not rerun it over solved registrations. Camera coordinates use browser X east, Y up, Z south. `review-notes.json` records observations from the baseline contact sheet. `capture.mjs` preserves the actual drawing buffer, camera quaternion, source hashes, audio state and timing receipt.

Local evidence:

- `.local/stability/realism-baseline.json`: full-game timing samples and environment receipt.
- `.local/station-realism/baseline/source-audit.json`: current station source inventory.
- `.local/station-realism/baseline/city-source-audit.json`: recovered city inventory.
- `.local/station-realism/views-baseline/index.html`: 15 annotated comparisons.
- `.local/station-realism/views-baseline/capture.json`: short capture timings and image hashes.

No game geometry, materials, service rules or production deployment have changed in this initial evidence milestone.

## Restored northern exterior candidate — 27 September

This is local candidate work, not an accepted milestone or published asset change. The complete six-milestone goal remains active.

### Source and geometry

`restore-city.py` combines the recovered, attributed municipal exterior with the pinned station in a fresh output directory. It verifies the original city hash and exact embedded station seed, checks the entrance footprint, and emits both visible source meshes and native collision triangles from the same vertices. Existing station geometry, routes and course definitions remain unchanged. Municipal metadata now describes what is actually installed in this candidate.

Candidate `.local/station-realism/city-candidate-03/` contains 3,202 added municipal meshes and 430,886 nondegenerate collision triangles. Its canonical layout SHA is `077e85ceca3963efc8f4b1847f317735ebf58be364b02300336436144593c98b`. The source Blender SHA is `9270013827a90dd07b6594c9b29896b85a972cf4ff251ba28c482e6d9b8644b4`. Candidate 02 produced byte-identical layout data; its native ray receipt therefore applies to this layout, although its Blender save was interrupted and must not be used as a source.

The browser exporter now places municipal batches by their world-space bounds; the original FBX object origins were shared and could not establish useful culling cells. It also converts the source R-metallic/A-smoothness masks into glTF G-roughness/B-metallic. The completed export includes all three municipal ground mask materials and four existing stair material masks that the old browser exporter omitted. Independent inspection of all seven exported images found zero byte error in the metallic and roughness channels. Thus the paired render is a combined exterior/mask-export comparison, not an isolated city-only measurement.

### Native checks

- `verify-city.mjs`: 29 collision probes, including 24 entrance probes and five material-category surface probes. Expected source-triangle hits were within 2 cm. This checks ray hits; some waypoint placement requests at seams were correctly rejected even though a surface was found. It does not prove that every seam accepts a waypoint.
- `prepare-candidate-courses.mjs`: all 31 existing course definitions passed native placement validation with the candidate layout hash. IDs, revisions, start/target geometry, hints and rules are retained. This is not a completed-shot proof.
- Five real native walking routes crossed the entrance from z=27 to z=34 and back at x=−40, 0, 30, 60 and 100 m. The test checks bounded floor height and lateral drift. It does not establish all exterior routes.
- The candidate game uses port 4395, its own database and worker log. The initial empty catalog was the expected layout-version filter: checked-in courses reference the original layout. Only the isolated database was seeded with the validated candidate-bound copies. Do not change maintained campaign data or production records based on this partial proof.

### Texture and delivery cost

Original municipal textures remain in the candidate source. `prepare-city-textures.mjs` generated explicit browser derivatives capped at 1024 px for initial inspection. It changed 73 of 267 unique municipal maps and left the existing station maps unchanged. This limit is provisional; nearby storefront lettering and facade detail still need review and may require different assets.

The browser export has 2,230,820 triangles and 1,883 batches. Lossless delivery compression reduces 282,331,940 bytes to 115,668,284 bytes; the latter SHA is `7f2643f3a0cf015912116bac52c534b84f49c760bbdea2af1d3271a01a67a330`. The unchanged station delivery asset is 75,819,344 bytes, 1,799,415 triangles and 859 batches.

The exported atlas estimates are **836.9 MiB RGBA plus mipmaps**, versus 198.7 MiB for the unchanged station. This is an allocation estimate, not measured total GPU process memory; other game textures, render targets and buffers add cost. Compression of downloaded files does not remove this allocation. Allocate near/far texture budgets and investigate GPU texture compression before accepting the exterior budget.

### Visual findings and remaining issues

Five static Chrome views show the recovered Tower, bus shelters, forecourt and northern street faces. They are useful context but remain below the target for close pedestrian detail. The main station facades are still plain/incomplete; vegetation and southern context are missing. The candidate is not photorealistic or photo-registered.

The global shadow fit expands to 990×780 m, or about 24×19 cm per shadow texel at 4096². This reduces station shadow precision and some distant casters can lie behind the existing light camera. A measured shadow coverage solution is required; do not accept this as an incidental visual regression.

The static inspector recorded no browser errors. It is separate from the full-game captures, and its timing is not an acceptance result. `.local/station-realism/city-fullgame-03/` contains seven actual-game camera captures with 5 s warmup and 20 s measurement each. No record-creating production tests were run. These fixed fixture views do not replace aim/throw/flight/replay coverage or the required 20-minute live session.

### Registered exterior evidence

`fetch-plateau.py` acquired official CityGML tile 52353680 with byte-range, ETag, ZIP CRC and SHA validation. `inspect-plateau.py` registers 2,634 roof edges plus per-object LOD2 geometry bounds in the retained municipal frame. `scope.json` fixes the detailed station/plaza/street-front envelope and overlapping work zones, with explicit limitations. The source data and map are also in the primary research library under `geodata/plateau-2024/`.

The main northern complex is `26100-bldg-466068`, about 478 m across its LOD2 bounding box and local roof maximum 65.126 m. Three distinct records share the name 京都駅; use IDs, not names. The southern station/rail geometry extends far beyond the current model, so the current Hachijo camera candidates require repositioning. Roof edges do not identify ground thresholds or public access.

The [PLATEAU policy](https://www.mlit.go.jp/plateau/site-policy/) permits use under PDL1.0 and CC BY 4.0 with source and modification credits. This applies to the city dataset, not unrelated reference photographs. Retain Kyoto City / MLIT PLATEAU attribution and our transformation note in the eventual asset pack.

The staircase rise remains unresolved: the operator's [square page](https://www.kyoto-station-building.co.jp/service/square/) gives 35 m; its [tour page](https://www.kyoto-station-building.co.jp/tour/) also contains a 30 m race description. The [race organizer](https://www.jrw-union.gr.jp/news_050224.html) gives about 30 m for 171 steps. These may describe different endpoints. No arbitrary vertical scale correction has been made.

### Candidate reproduction

```sh
# Each script requires a fresh output directory where indicated.
blender --background --threads 2 --python-exit-code 1 \
  --python web/station/realism/restore-city.py -- \
  --station art-source/atrium/KyotoAtrium.blend --layout runtime/station-layout.json \
  --city /Users/finbarr/code/games/kyoto/art-source/KyotoCity-Exterior.blend \
  --output .local/station-realism/NEW-CANDIDATE
node web/station/realism/prepare-city-textures.mjs \
  .local/station-realism/NEW-CANDIDATE .local/station-realism/NEW-BROWSER-INPUT
# Export with tools/export_browser_art.py, selecting the candidate Blender source
# and identical-layout browser-input directory; compress with optimizeGLB from
# tools/optimize-browser-assets.mjs into atrium.runtime.glb.
```

Use `KYOTO_REVIEW_ASSETS` to point `capture.mjs` at the candidate directory with `station.json` and `atrium.runtime.glb`, and `KYOTO_TEST_ORIGIN` at its matching isolated worker/server. The capture receipt records both asset hashes and retains a screenshot/diagnostic state on failure. Never bypass layout checks to mix visible and native station versions.

### First paired full-game diagnostic result

Same seven cameras, fixed drawing buffer, browser version, source JS and recorded fixture; 5 s warmup and 20 s measurement per view. No hidden frames, browser errors, timer disjoints or dropped GPU queries. No frame p95 increased by more than 1.10% in this one pair. Repeated paired trials, full gameplay and the live soak remain required.

| View | Frame p95 before → candidate (ms) | GPU p95 before → candidate (ms) | Draw calls before → candidate |
| --- | --- | --- | --- |
| hall-entrance | 18.60 → 18.20 | 4.07 → 9.32 | 56 → 627 |
| tower-street | 18.50 → 18.60 | 2.84 → 9.75 | 28 → 518 |
| forecourt-west | 18.30 → 18.50 | 13.53 → 14.45 | 524 → 1131 |
| north-facade | 18.60 → 18.60 | 13.97 → 14.30 | 1077 → 1165 |
| garden-context | 18.80 → 18.50 | 12.51 → 15.30 | 249 → 983 |
| legacy-garden | 18.50 → 18.20 | 14.05 → 15.48 | 1036 → 1685 |
| legacy-concourse | 18.70 → 18.50 | 9.05 → 9.06 | 259 → 262 |

The original shadow fit was 337×267 m (8.2×6.5 cm per texel), versus the candidate 990×780 m. The local seven-pair gallery is `.local/station-realism/city-comparison/index.html`; its JSON links the exact source and image receipts. The gallery passed Chrome checks at 1440 px and 390 px, with 14 loaded images and no overflow or page errors. Browser asset validation (`npm run build:web`), syntax checks and whitespace checks passed.

## Recovered station wings — 27 September

The retained municipal source also includes the complete station shell, root `Building.095` / municipal ID `3520856608`. Its 1,037 mesh descendants span X −289.499…188.756 m, northing −43.867…49.324 m and elevation −4.995…66.971 m in the registered local frame. The recovered inspection Blender file SHA is `34ebbd14cc05debdd8e07896622b71ab8e915686550c1ba3c971336ed07db149`. It is existing Kyoto City source evidence, licensed CC BY 4.0, rather than a newly authored survey. Its coarse opaque roof cannot replace the playable atrium wholesale.

`restore-station-wings.py` starts with the restored city candidate, checks the shared coordinate frame, and retains the municipal shell only beyond the existing western and eastern ends: X ≤ −169.477757 m and X ≥ 125 m. These clipping planes are temporary integration boundaries, not surveyed joints. It preserves original UVs/materials and produces both visible meshes and native triangles from the same vertices. No native code or scoring rule changed.

Candidate `.local/station-realism/station-wings-02/` adds 307 meshes and 72,682 collision triangles (33,127 west; 39,555 east). Existing core/city geometry and route arrays remain unchanged. Hashes:

- Layout: `35851a50b3cdab6f7921375e5fea7fe2e6dd8e6504a3bcee3888793aae433468`.
- Blender source: `ec35acada49a78ed6b6a09e5677e2a79e18a75c565c2873aee9f9f0733e7634f`.
- Input layout: `077e85ceca3963efc8f4b1847f317735ebf58be364b02300336436144593c98b`.

The browser output in `.local/station-realism/wings-browser-02/` contains 2,303,933 triangles, 1,909 batches, 457 materials and 282 images. Its raw GLB is 290,328,448 bytes; lossless delivery is 119,201,856 bytes. Relative to the previous city candidate this adds 26 batches, 73,113 visible triangles and 3,533,572 delivery bytes. Three new source images remain original in the source candidate; the browser derivatives use the provisional 1024 px cap. All seven packed roughness/metallic masks retain exact expected channel values.

### Gameplay and native evidence

- `.local/station-realism/wings-courses-02/`: all 31 existing course placements and five entrance walks pass. Candidate course copies differ from maintained definitions only in the layout hash.
- `.local/station-realism/wings-campaign-02/`: **31/31 exact authored inputs pass**, collecting every required waypoint/destination and finishing with zero translation, zero spin and native sleeping state. This run does not include neighboring-input tolerance trials. `campaign-proof.mjs` now accepts paired local candidate layout/catalog inputs, verifies that all other course fields are unchanged, and records the canonical proof-input layout separately.
- `.local/station-realism/wing-native-surfaces-02/`: twelve probes sample six face-normal directions on each wing. The maximum source/native surface discrepancy is 0.00001531 m; all probes hit added wing surfaces. This establishes sampled collision correspondence, not universal waypoint placement or full pedestrian access.
- Port 4397 runs the wing layout with an isolated database and log. Its database contains the validated candidate course copies. Its default HTTP asset directory still contains baseline assets: use the explicit candidate override in `capture.mjs` for matched visual/native inspection.
- The first integration run passed entry/tutorial, walking, recovery, scoring and three campaign courses, then timed out because the standalone finale process had no compatible worker executable selected. After selecting the worker, its hardcoded original layout hash caused a version rejection. `campaign-runtime.mjs` now binds the unchanged authored finale to the explicitly selected local worker layout and reports worker failure immediately. The corrected run passes the 38 m/s finale, all eight waypoints, destination and full rest at 5,174,538 authoritative points. These were test-configuration failures; their logs are retained.
- All remaining runtime checks pass: same-contact target collection, partial/zero-target completion rules, concurrent replay reads and sharing, 2× playback parity, saved designer routes and proof-tampering rejection, cancellation/restart and rapid recall. Combined with the initial successful checks and corrected campaign run, the complete runtime suite has passed on this isolated candidate. Logs and hashes are indexed in `.local/station-realism/wings-runtime-validation-02.json`.

No record-creating check used production. `npm run typecheck`, `npm test`, `npm run build:web`, syntax checks and `git diff --check` pass for the current tooling changes.

### Visual evidence and next corrections

`.local/station-realism/wings-evidence-02/index.html` is the six-view local review gallery; `record-wing-review.mjs` verifies image and layout hashes before assembling it. The underlying Chrome inspection recorded no page errors. The gallery loaded all six images at 1440 px and 390 px widths with no horizontal overflow or page errors. The east ground camera is obstructed and cannot establish facade completeness. These requested static poses can be adjusted by the inspector's camera-obstacle handling; they are not registered reference cameras or exact before/after performance comparisons.

The recovered facades establish the broad outer-wing shape and some recess/window detail, but the candidate fails the intended visual standard:

1. Source atlases are visibly blurred at pedestrian distance. Texture resolution needs to follow screen coverage, with authored facade detail replacing unsuitable baked imagery.
2. The central plain walls meet the textured wings abruptly. Their setbacks disagree; reconcile source sections, photographs and public-route boundaries before altering the core.
3. The hotel/theatre connection needs the referenced glazing, facade rhythm and threshold detail; a blank central mass remains.
4. Existing roof planting is sparse and repeated, with flat bed finishes. It remains below the target despite passing nearby native route checks.
5. The previous city's texture-allocation and global-shadow-coverage problems remain unresolved. No wing-specific full-game performance acceptance or 20-minute live soak is claimed.
6. Southern rail/Hachijo coverage and all fifteen measured reference registrations remain unfinished.

Source-shell diagnostics live in `.local/station-realism/station-shell/`. `extract-station-shell.py` provides a maintained extraction path; the present diagnostic GLB was generated by the equivalent retained local inspection scripts. Do not mislabel an unexecuted extraction-helper run as validation.

The research library in the primary checkout remains authoritative. G02 now records the verified missing municipal installation; G09 correctly records the three existing station reflection probes and the unresolved evening state. No milestone has been accepted and no candidate has been installed, committed or deployed.


## First measured photograph registration — north facade

`registrations/north-facade.json` stores the permanent feature identities, original image pixels, exact municipal mesh vertices, source hashes and rejected correspondences for Kanebako photograph `structure-594`. The image has no EXIF calibration. The fitted projection uses square pixels, a centered principal point and zero lens distortion; the original 800×600 photograph is enlarged uniformly to 1280×960 and cropped 120 pixels from its top and bottom. No image warp or geometry deformation is used.

Nine landmarks constrain position, rotation and focal length. Two additional landmarks are excluded from optimization and reviewed as checks. At the 1280×720 comparison frame:

- Fitted RMS: **8.865 px**; fitted maximum: **18.981 px**.
- Check maximum: **14.149 px**, below the 25.6 px target.
- Independent projection through Three.js agrees with the SciPy result to **3.18e−13 px** across all eleven points.
- The camera solver also recovered a known Three.js pose from synthetic projected points to numerical precision.
- Four initial guesses converge to the selected result. The selected camera is approximately `(18.183, 23.628, −185.875)`, 32.529° vertical FOV and −0.655° roll, in browser coordinates.

This is an image registration on approximate municipal source geometry, not a surveyed camera or acceptance of the current game. Sixty-four deterministic perturbations within ±3 original-image pixels show substantial distance/focal sensitivity: the 5th–95th percentile camera north–south position is about −284 to −168 m and FOV 19.9–36.7°. These are sensitivity ranges for manual picks, not survey confidence intervals; source geometry, lens and crop errors are additional uncertainty. Do not use this single view to derive precise metre-scale corrections.

The first six-point solution was misleading despite low fitted error. Two apparent canopy junctions were occlusion boundaries rather than fixed vertices, and a foreground balustrade point was confused with an inner opening threshold. Those correspondences are retained as rejected records. Adding the rear rooftop and front/back parapet pairs constrains depth more usefully. Review checks are excluded from optimization but were inspected during refinement; they are not a blind statistical holdout.

### Reviewable comparison

`.local/station-realism/north-registration/measured/index.html` lets the reviewer switch between the municipal source and the actual game candidate over the same photograph. The source controls are marked in both layers; their residuals do not score the game's geometry. Both overlays were visually inspected. The gallery passed Chrome checks at 1320 px and 390 px: eleven landmark rows, working layer control, no overflow or page errors.

The inferred camera is inside the opaque municipal Kyoto Tower base. The normal full-game capture in `.local/station-realism/wings-north-registered-01/` records that obstruction. A separate, explicitly labeled architectural cutaway in `.local/station-realism/wings-north-registered-cutaway-01/` clips the first 60 m to exclude the unmodeled private interior. The requested position, rotation and field of view remain exact. This cutaway is useful for station comparison; it is not a public gameplay view or performance acceptance. Capture receipts now record the near/far planes and the inspection note. Ordinary review views retain their original near plane.

The cutaway's 20-second diagnostic recorded frame p95/p99 18.4/18.7 ms, GPU p95 14.35 ms and 1,058 draw calls, without errors or disjoint timer queries. These numbers are retained for diagnostics only; no performance gate is cleared by a clipped, fixed view.

### What this changes next

The registered comparison contradicts the current north-envelope fidelity. Canopy and pier silhouettes are displaced, the central glazing is too visually transparent, facade masses lack the referenced recesses/window rhythm, and the west opening lacks the correct exterior treatment. Correct these forms using multiple registered views and the municipal source; do not apply a uniform whole-station scale from this camera.

A source audit also identifies a concrete material issue: the canonical `Glass - placeholder` material is assigned to 5,698 canopy panels as well as 524 other panels and 21 boxes, including guards, storefronts and Skyway glazing. `stationMaterialFamily()` currently routes that shared material to the guard shader (0.07 base coverage). The three reflection captures are inside the hall/gallery/garden, with no north-exterior probe. A canopy-specific material and suitable exterior reflection need separate authoring and visual/performance validation; globally changing this shared glass would also change unrelated guards and shopfronts.

Reproduction tools: `project-source.mjs` renders exact cameras and reads source vertices without moving the camera around obstacles; `fit-photo.py` fits the explicitly registered points; `photo-overlay.mjs` makes the comparison artifact. The numerical method follows the camera-coordinate/reprojection conventions in the [OpenCV pose documentation](https://docs.opencv.org/4.x/d5/d1f/calib3d_solvePnP.html) and uses [SciPy bounded least squares](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.least_squares.html). Generated media, photographs and fit receipts remain under `.local/` and in the ignored primary research library.

The acceptance register now has one measured source camera and fourteen provisional views. No reconstruction milestone is complete. Geometry, physics and maintained materials were not changed in this registration pass.

## Canopy glass split and first reflection comparison — 27 September

The exporter now splits `canopy-glazing-*` objects **only when their source material is `Glass - placeholder`**, before material/spatial batching. Objects with the same prefix and steel materials remain steel. This is a semantic browser material override, recorded in `station.json`; it does not edit the Blender source, native layout or geometry. The first overly broad prefix-only assertion stopped the build on a steel panel; the corrected export uses both conditions and completed successfully with Blender `--python-exit-code 1`.

Candidate `.local/station-realism/canopy-browser-01/` derives from the same wing source and browser texture inputs as `wings-browser-02`. It separates 5,698 source objects / 117,272 triangles into `Canopy envelope glazing`. Totals: 2,303,933 triangles, 1,910 batches, 458 materials, 282 images. Lossless delivery is 119,204,516 bytes, just 2,660 bytes above the preceding candidate; SHA-256 `65d5c4d8826ea76445c0cccc779923fc7529a522395d65546075a0819a7a0529`. Layout remains `35851a50b3cdab6f7921375e5fea7fe2e6dd8e6504a3bcee3888793aae433468`; Blender source remains `ec35acada49a78ed6b6a09e5677e2a79e18a75c565c2873aee9f9f0733e7634f`.

`verify-canopy-split.mjs` independently compares the old/new raw GLBs. Positions, normals, winding and all glass UVs match exactly. Three unrelated east canopy finish batches contain 72 UV component rounding differences, maximum 5.96e-8; these are recorded and bounded to 1e-7, not described as byte-identical. All seven exported packed maps again pass channel verification. No physics/course change or worker rebuild is needed for this material-only step.

The dedicated material family uses provisional F0 .12, roughness .08 and base coverage .38; these are appearance-calibration values, not measured glass specifications. Its exterior side uses one static 256 px probe at renderer coordinates `[-5,30,-45]`; its inner side uses the original hall/gallery/garden probes. Source glass bounds are X −100.599…103.001, Y 18.933…59.511, Z −12.440…21.002, so the new probe is north of the envelope. The side classification aligns source normals with the north/up hemisphere. Guard/shop materials retain their existing family and coefficients. Existing asset sets without the dedicated family still allocate only three reflection targets.

### Actual-game comparison

`.local/station-realism/canopy-before-01` uses HEAD browser sources and the wing assets. `canopy-after-01` uses the working browser sources and split candidate. The comparison verifies that only the three material/lighting modules differ, and that browser, fixture, viewport, cameras and native layout hashes match. Both use port 4397's isolated backend. Manifest: `.local/station-realism/canopy-glazing/views.json`.

| View | Frame p95 before → after (ms) | GPU p95 before → after (ms) | Calls |
| --- | --- | --- | --- |
| Registered north cutaway | 18.60 → 18.30 | 14.00 → 14.29 | 1058 → 1059 |
| Plaza | 18.60 → 18.40 | 14.00 → 14.07 | 928 → 929 |
| Hall interior | 18.60 → 18.30 | 14.06 → 14.06 | 202 → 203 |

Chrome 153 on M2 Metal, fixed 1280×720, 5 s warmup + 20 s per view. Frame p99 ≤18.9 ms; no page errors, warnings, hidden frames, GPU disjoints or dropped queries. Reflection PMREM storage grows 18→24 MiB; one-time measured capture execution 986→1283 ms, not total loading time. This is one diagnostic pair, not evidence of a speedup or completion of repeated-pair/live-play/20-minute acceptance. The elevated reference camera still has the explicitly labeled 60 m architectural cutaway.

`compare-canopy.mjs BEFORE AFTER OUT` generates the gallery and verifies input identity plus screenshot hashes. `.local/station-realism/canopy-comparison/index.html` passed Chrome QA at 1440 px and 390 px with six loaded images, no overflow and no page errors. A copy is available in the main research library at `notes/canopy-comparison/index.html`. `capture.mjs` now records reflection target counts, bytes and capture execution time. Browser build, module syntax and whitespace checks pass.

### Reference and remaining defects

The primary library gained ten FUJISASH/FACING ONLINE resources: a project page, one full curtain-wall drawing and eight 2000 px photographs. The whole drawing and all eight photos were visually inspected; exact hashes and rights are recorded in the 164-entry catalogue (149 downloaded files). [Manufacturer source](https://www.facing-online.com/detail.php?id=226); local interpretation in `notes/CANOPY-GLAZING.md`. The drawing supplies profiles, brackets and joint/bay labels, not canopy optical coefficients. Historical plaza construction and former THE CUBE signs must not be copied into the current configuration.

Visual inspection shows broader exterior reflections and reduced transparency, with readable but darker glass inside. The current frame density, envelope/pier silhouette, reflection detail and parallax still fail the reference. A single exterior probe and uncalibrated optical values are provisional. Evening mode still reuses daytime captures and remains unresolved. Next work should correct the core envelope using additional registered views and source geometry, then revisit glass/frame balance and probe placement. No visual milestone is accepted by this pass; the goal remains active. Generated GLBs, photographs, PDFs and receipts remain ignored local assets.


## North frontage restoration and canopy registration — 27 September

`restore-station-frontage.py` restores the source north facade around the central glazed opening, starting from `station-wings-02`. Its municipal source Blender hash is pinned to `34ebbd14cc05debdd8e07896622b71ab8e915686550c1ba3c971336ed07db149`. It clips registered source triangles into west X −169.477757…−53.6 and east X 40.5…125, with Blender northing ≥18 and height ≥0. These rectangular boundaries are temporary integration seams, not surveyed joints. Existing core, city, wings and route arrays remain unchanged. Source materials and images retain their provenance; the municipal CC BY 4.0 attribution must accompany a released asset pack.

Candidate `.local/station-realism/station-frontage-01/` adds **417 meshes and 104,342 native triangles** with five source textures. Its layout hash is `f8819d54b5170ef2975bc1455acd6c5ec3806846a344e35b3f3e9e584335a995`; Blender hash is `5128ea4af320d63b308ca4c0926590ccf3a58801b428e085206453a8ca05fbed`.

`.local/station-realism/frontage-browser-01/` uses the canopy semantic split and provisional 1024 px municipal texture derivatives. It contains **2,409,149 triangles, 1,941 batches and 464 materials**. Runtime GLB: **123,934,880 bytes**, SHA-256 `2b6857a92270a1fb3dc587822a1fa56e8b6c34b0407cd98f4ac49a0d51ed8311`. Relative to the preceding canopy candidate: +105,216 visible triangles, +31 batches and +4,730,364 delivery bytes. All seven packed masks pass exact channel verification. The browser texture set has 282 files, including 77 resized derivatives; estimated RGBA allocation plus mipmaps is **846.21 MiB**. Original source images remain preserved. This is a provisional cost and quality problem, not an accepted texture budget.

### Native and gameplay validation

- All **31 current course placements** pass. Candidate course copies retain every authored field except the required candidate layout hash.
- All **31 exact authored shot inputs** pass in `frontage-campaign-01/summary.json`, reaching their required targets/completion conditions at native rest. Neighboring-input tolerance trials were not run.
- `verify-frontage-surfaces.mjs` confirms all retained boxes, beams, flights, escalators, additions, routes and original panels are unchanged. Twelve sampled source/native facade hits, covering six normal directions per wing, agree within **0.00001028 m**. These are numerical parity checks on the source model, not a survey-accuracy claim.
- The **complete runtime suite passes** on isolated port 4398: entry/tutorial, walking, disconnect recovery, scoring, campaign/finale, overlapping targets, partial/zero completion, replay concurrency/sharing, fast-forward parity, designer proof validation and 64 rapid-recall throws. The exact Grand Slam yields 5,174,538 authoritative points at full rest.
- Three central entrance out-and-back walks pass at X −40, 0 and 30. The trial start at **X 60, native northing 27 is rejected for insufficient room**; X 100 was not attempted after that failure. The restored eastern facade now occupies space treated as open in the preceding model. Determine the real public doorway and route from references before altering this geometry; do not carve an invented opening to pass the old walk probe.

Receipt `.local/station-realism/frontage-runtime-validation-01.json` hashes the candidate, campaign, placement/native reports and full runtime log. The first runtime attempt stopped on catalog binding: server startup replaced an earlier candidate seed with canonical courses. Synchronizing unchanged candidate course copies after startup resolved it. The unsuccessful log remains retained. Port 4398's default HTTP assets remain baseline; actual-game capture requires the explicit candidate asset override. No record-creating checks used production.

### Source canopy section discrepancy

`measure-canopy-registration.mjs SOURCE_GLB LAYOUT OUT` intersects source triangles with X −40, 0 and 30 planes and compares the current canopy profile. It records input hashes, intersection segments and limitations in `.local/station-realism/canopy-shape/measured/sections.json`.

Source crown north offsets relative to the authored canopy are **11.99, 12.65 and 13.14 m**; height differences are approximately **−0.592 m**. Comparing the front roof surfaces at equal heights 25, 35 and 45 m gives offsets of **11.45–13.88 m**. These measure disagreement between two models. Municipal geometry is approximate, so decimal output must not be interpreted as surveyed precision. A lower frontage balustrade is a different feature and must not be fitted to the authored roof toe.

The roof has not moved in this frontage candidate. Correcting it requires coordinated registration of the interior, Skyway, supports and public connections. The north photograph alone is too sensitive to camera distance/focal assumptions to justify a uniform whole-station scale. The main research library contains `notes/CANOPY-REGISTRATION.md` and the section diagram/data.

### Visual status

The actual game now shows the north facade's projecting hotel windows, recessed openings, pier outlines and the western sculptural tower. An old plain interior mass protrudes at the inner west seam; the facade joins need integration. Municipal facade textures remain blurred at close distance, and the current roof/frame geometry remains displaced. The east entrance is unresolved. No visual milestone is accepted and no generated candidate replaces the maintained asset set.


### Paired full-game fixed views

The fresh `frontage-before-01` and `frontage-after-01` captures use identical working browser sources, fixed cameras, 1280×720 buffer and native fixture. They differ only in candidate assets and corresponding backend layout. Heavy native tests finished before capture. Chrome 153 / M2 Metal, 5 s warmup + 20 s measurement per view:

| View | Frame p95 before → after (ms) | GPU p95 before → after (ms) | Calls before → after |
| --- | --- | --- | --- |
| Registered north cutaway | 18.50 → 18.20 | 14.20 → 14.29 | 1059 → 1079 |
| Plaza | 18.40 → 18.30 | 14.00 → 14.12 | 929 → 944 |
| Interior | 18.60 → 18.40 | 13.73 → 13.95 | 203 → 215 |

No page errors, warnings, hidden frames, disjoints or dropped queries; frame p99 ≤19 ms across both candidates. This is one diagnostic pair, not repeated-pair performance acceptance or a live gameplay soak. The photo camera still uses a labeled 60 m cutaway; the other two views use ordinary clipping. The earlier one-second concurrent-runtime preview is explicitly visual-only and is excluded from performance evidence.

`compare-frontage.mjs` verifies source, camera, fixture and viewport identity, distinct candidate layouts and screenshot hashes before assembling `.local/station-realism/frontage-comparison-01/index.html`. The primary research copy at `notes/frontage-comparison/index.html` also contains complete capture/runtime receipts. Visual review of all three new images confirms improved facade form but exposes coarse textures and dark baked recess undersides at pedestrian distance; interior frame density remains excessive. Continue coordinated geometry and material correction before accepting this candidate.

The primary frontage gallery passed Chrome checks at 1440 px and 390 px: all six images and receipt/reference links load, with no horizontal overflow or page errors. `notes/frontage-comparison/gallery-validation.json` records the checks. The mobile gallery screenshot and all three candidate game views were visually inspected.


## Facade return correction — candidate 02

The first frontage clipping limits cut through the source's inner return walls. Exact Blender sightlines at four pixels in the registered north camera hit the broad draft `west-north-terminal-pier`; the same rays in the original municipal shell hit `Untitled.199` / `Untitled.203` return surfaces at X approximately −53.4…−52.85 m. The old −53.6 m cutoff had removed those faces. The east cutoff likewise excluded the source return near X 39.7…40.15 m.

`restore-station-frontage.py` now accepts explicit inner clipping limits. Candidate 02 uses **west −52.4 m, east 39 m**, retaining the complete return walls. It also removes `west-north-terminal-pier` from both Blender and native boxes. These integration cutoffs remain provisional; they are not surveyed wall dimensions. Other retained geometry is unchanged. Source and current rays are saved under `.local/station-realism/frontage-seams/`; `registrations/frontage-returns.json` records four fixed source samples. The source wall probes are separate from photo alignment residuals.

- Authoring output: `.local/station-realism/station-frontage-02/`; **433 meshes / 109,214 native triangles**.
- Layout hash: `bee80de912911f8fd39451a436d92a51e13b62d13f29fc76a1a07752fd7d0d92`.
- Blender hash: `6d73267e1951a96df94479404f1de4a98664e4a5f76c07af4c9eba5959ce1497`.
- Browser output: `.local/station-realism/frontage-browser-02/`; **2,413,985 triangles, 1,945 batches, 464 materials**.
- Runtime GLB: **124,155,088 bytes**, SHA-256 `2bf14b08bb4d39e3628c2fd6b521b8d48776cea5e2714972215f6fd8026f47d2`.
- Change from candidate 01: +4,836 visible triangles, +4 batches, +220,208 delivery bytes. Texture policy/allocation remains provisional at 846.21 MiB; all seven packed masks pass.

### Course revision caused by the real opening

The initial candidate 02 proof passed 30 of 31 unchanged courses. `kyoto-terracedrop` (display name **Sculpture Square Slingshot**) collected all six waypoints, then rolled through the passage instead of banking on the removed draft pier. Its original bank was at native `(−57.1735, 0.0232, 20.4988)`. Source rays through that region at heights 0.023–5 m find no wall until approximately X −119.18 m, whereas upper surfaces start near X −58.52 at 8 m. This supports the open lower passage; restoring an invisible collision box would contradict it.

The isolated candidate revises this course from **2 to 3**, with destination `(−68.55, 0, 23.55)` on the concourse and unchanged 0.75 m radius. All six waypoints, launch hint, course identity, chapter/order and scoring rules remain unchanged. `prepare-frontage-course.mjs LAYOUT NEW_OUTPUT NATIVE_TRACE` validates the revised course, floor support and a real capsule walk from the last waypoint to the new destination and back. The declared change is stored in `frontage-course-revision-02/proof-inputs.json`. The display distance changes **182.3→190.8 m**, computed from the native trace; its metadata-only update is recorded separately.

`campaign-proof.mjs` accepts explicit local `KYOTO_PROOF_INPUTS` only with a candidate layout/catalog. It requires a recorded source revision/goal, increments the revision once, preserves the destination radius, and rejects changes to waypoints, scoring, hints or identities. An optional display-distance change must exactly match the rounded length of a hashed native trace on that candidate layout. The canonical maintained catalogue is unchanged until asset integration.

### Verification

- **31/31 authored shots** pass after the destination revision; the earlier 30/31 failure remains retained.
- The revised course passes twice more and its existing +0.05° yaw neighbor also clears all targets and destination at full rest.
- **16 native surface probes** pass, including four locations on the restored return. Maximum source/native error: 0.00001028 m.
- **20 public routes** pass all 430 floor-support samples, head-clearance probes and actual capsule walks, including Skyway, East Square, roof garden and southern promenade.
- **Complete isolated runtime suite**, typecheck, unit tests and browser build pass. Runtime used port 4399 and candidate layout; it ran before the one destination revision. The revised course was then checked separately through native proofs and the actual service, with score/replay persistence and full rest.
- The service saved a complete revised-course shot at **1,315,250 authoritative points**; its replay retained revision 3 and the new goal and reproduced scoring. Its browser-facing catalogue exposes the measured **190.8 m** route length.
- The arbitrary eastern trial start at X 60 / northing 27 remains blocked; this does not invalidate the separately passing twenty authored public routes. A complete registered exterior entrance survey is still needed.

### Chrome and visual status

`frontage-after-02` uses the same sources, cameras, fixture and 1280×720 buffer as `frontage-after-01`. It was captured after the heavy native checks finished. Five seconds warmup, twenty seconds per view, Chrome 153 / M2 Metal. Frame p95 is **18.3 ms** in all three views; p99 ≤18.7 ms. GPU p95 is **14.39 / 14.12 / 13.76 ms** for north cutaway / plaza / interior. Calls: **1084 / 947 / 215**. No browser errors, hidden frames or disjoint timer queries. One plaza GPU query reached 31.75 ms without a corresponding long frame; retain it as a diagnostic outlier. These fixed views do not establish repeated-pair/live-play/soak acceptance.

All three actual-game images were visually inspected: the projecting old block and exposed inner cavities are repaired. Coarse baked textures, residual side fragments, displaced canopy/Skyway geometry, dark/dense roof framing and unfinished lighting remain visible. This is progress toward the visual rubric, not an accepted milestone. `compare-frontage-seams.mjs` generates the matched comparison. No generated candidate is committed, installed as the maintained asset set or deployed.

The primary `notes/frontage-seams/` gallery passed Chrome checks at 1440 px and 390 px: six loaded images, all evidence links reachable, no horizontal overflow or page errors. Its desktop layout was visually inspected. The compact continuation pointer is `web/station/realism/STATE.md`.


## Full central roof fit and measured western bridge

`audit-roof-attachments.mjs` identifies near-horizontal municipal faces around the elevated routes without treating every horizontal face as a floor. `fit-canopy-section.mjs` derives a 54-point central outer-envelope construction input and records the western bridge floor corners. `measure-canopy-registration.mjs` accepts explicit section X values as its fourth argument; the −25/15 checks are excluded from the fit. See STATE.md and primary `notes/ROOF-BRIDGE-REGISTRATION.md` for exact receipts and limits.

The central fit reduces the sampled source-profile max/RMS discrepancy from 3.821/1.212 m for a crown-only translation to 0.117/0.016 m. Independent transverse cuts agree within ≈0.122 m. These are residuals against coarse source geometry, not survey confidence. The western municipal bridge spans 29.429 m instead of the current authored 39.296 m; its endpoints require different shifts. The central profile cannot be extrapolated through the flared mouths, nor can its crown locate the interior Skyway. This step does not alter the playable candidate, whose coordinated roof/bridge/support correction remains open.


## Western roof construction component

`build-west-roof.mjs SOURCE_GLB BASE_LAYOUT LOCAL_OUTPUT` reconstructs the twelve identified western flare faces with explicit outer framing and closed glazing. It preserves the source envelope and exports matching GLB/native triangles. It is not a complete structural model or integrated station.

`verify-roof-component.mjs BASE_LAYOUT COMPONENT_DIR LOCAL_OUTPUT component-only` probes the emitted browser geometry against a private native worker. Use `with-station` to retain the current station and expose interference. The verified component passes 24 isolated rays; the retained station currently fails one because `west-north-floor-09` crosses the new roof. Both receipts remain available. See STATE.md and the primary `notes/west-roof-construction/index.html` for hashes, limitations and next integration work.


## Western upper-floor envelope repair — candidate 01

The source-aligned western roof component exposed a collision with draft floor 09. Horizontal municipal sections and the picked rear-wall plane show that floors 09/10 extend south beyond the building, while floor 11 spans far outside the upper hall. `trim-west-upper-floors.py` trims the first pair only within the observed wall span and intersects the top slab with the measured outer hall loop at 59.4 m. It verifies closed meshes, reduced positive volumes, and matching Blender/native bounds before generating native triangles from the edited Blender mesh. Existing floor heights are retained; these are model envelope corrections, not an interior floor survey.

Construction inputs are preserved with Kyoto City CC BY 4.0 attribution in `registrations/west-upper-slab-repair.md` and its two adjacent JSON files. The source wall has 21 nearly coplanar faces with maximum deviation 7 mm; the upper hall outer loop has 63 points and area 748.246 m². About 4,066 m² of excess slab plan area is removed. The highest slab keeps only the intersection with its existing footprint; missing floor areas are not inferred from this operation.

Candidate source: `.local/station-realism/station-roof-clearance-01/`. Layout SHA-256 `242d3a58f5b7d4f0833da1e6feeaebf5e016b6f4409dfc6de288e30c2e78d7f1`; runtime GLB SHA-256 `ff6bec03725a43538ea2a85c3d6dfb3cde2b3d6f548bc7c3fcc564b668123352`. Runtime delivery is 124,154,592 bytes, with unchanged totals of 2,413,985 triangles, 1,945 batches and 464 materials. The new roof component is **not installed** in this playable candidate; existing roof and bridge await coordinated replacement.

### Verification

- All 24 roof component rays now pass with the repaired station present, max error 0.00000948 m. `verify-roof-component.mjs` accepts a repaired base only when its parent hash and explicit repair provenance match, and all other layout records remain identical to that parent.
- All 31 authored course shots pass at full rest. The already revised concourse course stays at revision 3 and 190.8 m, with the same launch, six waypoints, goal and scoring as frontage candidate 02. Its floor support and two native walks pass.
- Full isolated runtime suite, typecheck, unit tests and browser asset build pass. Port 4400 uses this layout and local database.
- Twenty-two exported floor-cut samples match native triangle centres. One municipal facade triangle sits 2.97 mm ahead of the cut: the initial nearest-scene-hit assertion failed, while the diagnostic proves the expected floor face is present exactly. The receipt preserves both hits; no nearest-surface parity is claimed.
- Matched three-view Chrome capture, 1280×720, 5 s warmup and 20 s measurement: frame p95 before 18.5/18.4/18.4 ms, after 18.1/18.1/18.2 ms; after p99 ≤18.7 ms. GPU p95 changes 15.05/15.19/13.90 → 15.16/15.40/13.84 ms. Draw calls remain 1181/1268/215. No errors, warnings, hidden frames, disjoints or dropped queries. One 32.23 ms GPU outlier remains recorded without a corresponding long frame. One fixed-view pair does not establish repeated-pair, full-game or soak acceptance.

`compare-upper-slabs.mjs` checks source, camera, fixture and buffer identity plus image hashes before building the diagnostic gallery. The primary research copy is `notes/upper-slab-repair/index.html`. Actual-game images show the expected courtyard opening and increased light beside the bridge; they also reveal unfinished rear walls and retained roof/bridge misalignment. The interior frame density and lighting remain unresolved. No milestone is accepted and this candidate is not deployed.

The primary gallery passed Chrome checks at 1440 and 390 px: nine images and fifteen local evidence links load, with no horizontal overflow or page errors. All six actual-game frames and the desktop gallery were visually inspected.


## Eastern flared roof construction

`build-east-roof.mjs SOURCE_GLB CURRENT_LAYOUT OUTPUT` builds an independent component from `registrations/east-roof-envelope.json`. It retains 248 source surface triangles and their attachment openings as closed glazing prisms, with an outer radial grid clipped to the source triangles. Native triangles and browser coordinates/winding are checked after export. The component contains 27,064 triangles; the grid and member dimensions are provisional, while its asymmetrical outer envelope comes directly from the municipal source.

All 272 isolated native probes pass. The full-station check encounters the already imported north-facing portion of this roof: 151 coincident or adjoining hits within 1 mm, and two intervening source attachment faces. `audit-roof-overlap.mjs` identifies those source surfaces independently. The retained full-station failures must not be presented as passes, nor should the source attachments be removed merely to satisfy component-only expectations.

The post-clipping triangle-removal diagnostic finds non-planar source polygons were retriangulated, causing several millimetres of surface differences and five unresolved partial overlaps. `map-roof-replacement.mjs` marks such maps incomplete and fails its readiness assertion. Prefer rebuilding the affected frontage object from the triangulated original source with selected roof faces excluded before clipping. Preserve source UVs/materials and native/visual agreement. See STATE.md for exact hashes, receipts and the next integration step.

The primary `notes/east-roof-construction/` gallery shows municipal before/after context, operator/engineering reference links, construction data, isolated/native-with-station receipts and the incomplete boundary diagnostic. This is construction progress only; the playable upper-floor repair candidate is unchanged, and inner framing, Skyway integration, full-game performance and final visual acceptance remain open.


## Eastern roof interface candidate 01 — 27 September 2026

The eastern component now belongs to a local station candidate at `.local/station-realism/station-east-interface-01/`. `rebuild-east-roof-interface.py` recreates only `municipal-station-frontage-east-Untitled.203` from the original triangulated municipal source, omitting the registered 248 eastern roof faces before clipping. It preserves source attachments and `Untitled.201`, reuses the frontage material, and derives native geometry from the same Blender mesh. This supersedes the incomplete post-clipping mask; failed masks and their triangulation evidence remain available.

Source-first reconstruction changes that frontage panel from 1,592 to 1,438 triangles. The source UV transform is verified against 3,020 uncut corners, maximum difference 2.98e−8. Original corner normals are interpolated barycentrically for clipped triangles and normalized; recorded pre-normalization lengths are .41435656–1.00023883. Two initial Blender attempts failed before saving the final candidate; their logs are retained as `roof-registration/rebuild-east-interface-01.log` and `01b.log`. The successful build uses `--python-exit-code 1` and is recorded in `01c.log`.

The new candidate adds 248 closed glazing prisms and 2,090 outer-grid pieces. The glazing uses the dedicated canopy export material; the frame adds one provisional steel material. The older authored canopy, inner framing and Skyway remain pending coordinated replacement. This is a construction step, not a completed roof or visual milestone.

### Verification

- `east-interface-native-01/report.json`: all 272 comparisons pass between actual exported scene first hits and native geometry. 269 hit the new roof; two hit retained `Untitled.203` attachments and one retained `Untitled.201`. Maximum position difference .000166322 m. The candidate layout differs from the parent only in the declared frontage panel, added roof panels/material and provenance.
- `east-interface-campaign-01/summary.json`: 31/31 authored shots pass at full native rest. All course fields except the layout hash match the parent candidate, including the revision-3 destination and 190.8 m display distance.
- `east-interface-courses-01/report.json`: destination support and two native walks pass. Candidate courses are synchronized into port 4401's isolated database after startup; restart requires resynchronization.
- `east-interface-review-01/runtime.log`: the complete isolated runtime suite passes, including scoring, connection recovery, replay, 2× playback, course creation/solution validation and 64 rapid throw/recall checks. Browser asset validation also passes. No native C# change or worker rebuild is involved.
- Browser output: 2,440,895 triangles, 1,946 batches, 465 materials. Runtime asset 125,513,696 bytes, an increase of 1,359,104 bytes over the parent. Texture allocation policy remains provisional at 846.208 MiB.

Hashes: layout `36927470d62f429ff0b31f884f9bd1db616b689508db6e7416b653ef24bd48ba`; Blender `68e1c7e428d13ade91188dbcbce1c8ad41706ec0e3634344fa293d18c18aae5e`; source export `f4633530b2639166c38a8da66695e78a2c44633eabda9f8700fe3cff090cd03f`; optimized GLB `2dc0816346c29f2359ab7a9d8ffab5170037f21585352874e116e7f02fc4af4c`.

### Actual-game review and new obstruction evidence

Matched Chrome 153 / Apple M2 Metal captures use 1280×720, AC power, five seconds warmup and twenty seconds per fixed view. `compare-east-interface.mjs` verifies matching source/camera/fixture/buffer hashes, distinct layout hashes, screenshot hashes and the corresponding native/course receipts. Main pair: `east-interface-before-01` / `east-interface-after-01`. Supplementary clear roof view: `east-interface-supplement-before-01` / `east-interface-supplement-after-01`; that supplementary pair was captured in candidate-then-parent order. Neither pair is a repeated performance acceptance trial.

- Overview frame p95 18.4→18.3 ms; interior control 18.5→18.2 ms; supplementary northern view 18.5→18.2 ms. The blocked lower view stays 18.5 ms. Candidate frame p99 ≤18.8 ms across all four views.
- GPU p95: overview 14.61→14.42 ms; control 13.84→13.55 ms; supplementary 15.27→15.39 ms. The blocked view rises 7.91→9.18 ms despite unchanged frame p95; retain that resource cost rather than omitting it. Overview has one 28.37 ms GPU maximum without a corresponding long frame.
- No page errors, warnings, hidden frames, GPU disjoints or dropped queries in any capture. These fixed poses do not cover gameplay motion, long-term music stability or the 20-minute soak.
- The proposed lower camera at renderer `[98,31.7,-10]` is below the East Square slab (underside 32.9 m). Its images are retained and explicitly rejected as roof inspection views. A clearer architectural camera at `[108,55,-25]` exposes the new curved glazing/grid, with visible retained old structure and coarse materials.
- Native centre rays from the overhead capture identify `east-north-roof` at 59.55 m as the large slab hiding much of the new roof. Its box spans native X63.574397–112.639391, northing8.826107–19.826107 and height59.27–59.55. `east-north-upper-backing` spans the same X range, northing9.021107–9.271107, height37.1–59.55. `east-interface-review-01/obstructions.json` records these camera-ray hits. Source-led correction is required; no broad deletion has been applied.

The primary review gallery is `research/kyoto-station/notes/east-roof-interface/index.html`, with four matched image pairs and copied native, course, runtime, optimization and obstruction receipts. All eight game images were visually inspected. The new outer grid is visible in the close view, but old roof/backing geometry, intersecting retained structure, coarse textures and lighting prevent visual acceptance.

**Next construction:** register the retained eastern roof/backing boundaries against the municipal envelope and published sections, correct both visual/native geometry together, then integrate the measured central section, both roof ends, inner structure and Skyway. The interior Skyway route/eastern landing and final structural member sizes still require evidence. All fifteen visual acceptance views, exterior/material/planting work, and full gameplay/soak performance gates remain governed by LONG-TERM-PLAN.md; only the north-facade source camera has passed registration so far. No candidate is committed or deployed.

The primary eastern-interface gallery passed Chrome QA at 1440 and 390 px: eight images and seventeen local targets load, with no horizontal overflow or page errors. The desktop gallery was visually inspected. The main research register was also revalidated: all 149 source files match their hashes, and `notes/validation.json` now reflects all 164 catalogue entries. Current official station/floor-guide and engineer pages remain accessible; the original-architect archive database still returns HTTP 403, recorded in `notes/SOURCE-RECHECK.md`.


## Eastern roof opening candidate 01 — 27 September

Two source-contradicted draft boxes, `east-north-roof` and `east-north-upper-backing`, are removed from Blender and native layout. Municipal section/intersection evidence is in `east-envelope-audit-01/`; published drawings and structural dimensions are in primary research `notes/CANOPY-PUBLISHED-STRUCTURE.md`. Maintained builders/registration: `audit-east-envelopes.mjs`, `remove-east-draft-envelopes.py`, `registrations/east-upper-envelopes.{json,md}`.

- Seven sections, 70 rays, no source triangles in the old roof volume; no parallel source wall in the backing volume. Backing intersects curved roof and attachments. Independent published axonometric corroborates the open courtyard.
- Construction receipt: `station-east-clearance-01/envelope-repair.json`. All other native geometry/course fields remain unchanged.
- First builder assertion safely rejected stale Blender seed indices. Selection now uses stable surface IDs and checked world bounds. Remapped 6,783 formerly box-tagged objects: 6,782 current box indices and one already-converted panel. No claim that every other historical seed family is audited.
- `east-clearance-native-openings-01/report.json`: 278/278 exported visual/native first-hit probes pass; max position error .000166322m. Includes three rays formerly blocked by removed geometry and three controls. Earlier 272-probe receipt remains retained.
- `east-clearance-campaign-01/summary.json`: 31/31 authored shots pass at full rest. Durations, waypoint hits, final positions and destination results match the parent exactly. Existing revision3 goal/190.8m course distance retained.
- Final course report validates floor support and two native walks. Full isolated runtime suite and browser asset build pass; logs in `east-clearance-review-01/`.
- Asset: 2,440,709 triangles, 1,946 batches, 465 materials, runtime125,510,924bytes. Texture allocation remains provisional at846.208MiB.
- Matched actual-game captures: `east-clearance-before-01` / `east-clearance-after-01`; comparison `east-clearance-comparison-01/`. Chrome153, AC power,1280x720,5s warmup +20s/view; candidate frame p95 18.2–18.3ms, p99≤18.8ms. GPU p95 14.60→14.87 /15.33→15.36 /13.81→13.90ms. No errors/warnings, hidden frames, disjoints or dropped queries. GPU maxima41.86ms before/38.12ms after retained without corresponding long frame. One diagnostic pair establishes no performance improvement or full-game acceptance.
- All six screenshots inspected: curved eastern roof and sky exposed; adjacent source facade retained. Old dense framing, coarse textures and lighting remain visibly unfinished.
- Primary gallery: `notes/east-roof-opening/index.html`; source sections, screenshots and verification receipts included. Real Chrome gallery QA passes at 1440/390px: seven images, sixteen local targets, no overflow or errors. Desktop full-page rendering inspected.



## Western Skyway component 04 — 27 September

The playable candidate remains `station-east-clearance-01`. New standalone construction: `.local/station-realism/west-skyway-04/`, built by `build-west-skyway.mjs` from the existing measured bridge anchors and `registrations/west-skyway.json`. Do not use the component ray-test layout as the station candidate.

- Source footprint: 29.429086 m long, 3.073467 m outer width, approximately Y 44.9426 m floor, 3 m coarse floor-to-top envelope. Arched glazing and continuous ribs follow the inspected 24 July 2014 western-bridge photograph. The .55 m rise, 23 bays, .08 m rib section and other small dimensions remain explicit authoring hypotheses.
- 419 closed panels, 69 glazed panels, 303 frame members, 16,684 browser triangles and four materials. All shells pass welded-edge manifold and positive-volume checks. A deterministic rebuild matches the native-tested output bytes (`manifold-rebuild.json`). No photographic textures are embedded.
- GLB SHA-256: `334a39e20ec0a0b3fc044f28be75f80828056585321770ff7e9b121fa17f89c2`; native panels SHA-256: `ccd770cea3b04fc14e3831d82c0e091111ccc501c48b327af201ef23f4e8ee1e`.
- `west-skyway-native-04/report.json`: 185 component-only visual/native rays pass, including samples across each curved pane; maximum error .000015418 m. `verify-roof-component.mjs` now handles explicit browser material indices and additional per-panel probe triangles, retaining old roof cases.
- `west-skyway-walk-04/report.json`: 42 floor/head-clearance pairs and six actual capsule walks across centre and side lanes pass. Head-clearance uses the raw ray hit, because disk-placement validity on a narrow pane is a different question. The initial placement-only diagnostic is retained under `west-skyway-walk-03`.
- `west-skyway-with-station-04/report.json`: 183/185 probes reach the component first. Two hit old `canopy-glazing-west-016-20` / `canopy-glazing-west-013-22`, at .1220 / .1185 m difference. Keep this failure; integrate the western roof with the bridge instead of accepting the component alone.
- `audit-west-bridge.mjs` reproduces selection of source `Untitled.203` faces 9,10,3225,3226,3227,3228,10522,10523 inside the measured bridge envelope. Receipt: `west-skyway-source-01/source-faces.json`. Source-context rendering removes only these eight faces and adds the component. Future playable integration still needs the source frontage interface rebuilt explicitly.
- Initial component02 had duplicate spring beams; the strict native test caught one surface-ID mismatch. Component03 removes those and sweeps continuous ribs. Component04 also replaces individually capped glass facets with continuous curved panes. Earlier receipts are retained; component04 is authoritative.
- Component interior and municipal-context images inspected in Chrome; no source-view errors. Research gallery QA passes at 1440/390 px: six images, ten local targets, no overflow/errors; desktop rendering visually inspected. Inspection lighting and materials remain unfinished. No registered photo comparison or final visual acceptance.
- Primary research: `notes/SKYWAY-CONSTRUCTION.md` and `notes/west-skyway-construction/index.html`. Official 10F SVG and all twelve dated Skyway/Tower photos added; library now 178 resources / 163 verified downloads. The schematic establishes three northern viewing bays and eastern escalators, not metric coordinates.
- Browser asset build and script syntax checks pass. No current game asset set, service or C# change; no new full-game performance acceptance. The parent candidate's 31-course/runtime checks remain parent evidence.

Next: resolve central/eastern Skyway registration and integrate the roof, bridge, hangers, source facade and approaches together. Western roof component02 already exists, so reuse its registered envelope. Do not translate the corridor solely from the canopy crown or rescale it to a published total length. Full LONG-TERM-PLAN scope remains active.


## Central canopy component 02 — 27 September

This turn made concrete progress. The full reconstruction goal remains active, and no final visual milestone is accepted. The playable candidate is still `station-east-clearance-01`.

### Construction

New tools: `audit-central-roof.mjs`, `build-central-roof.mjs`, and `registrations/central-roof-envelope.{json,md}`. The component verifier also accepts `central-roof.glb`.

The 30° connected selection from source `Untitled.203`, seed face 13162, contains 113 roof faces: 65 main, 24 western transverse and 24 eastern transverse. The 40° expansion adds twelve vertical side faces, which are explicitly preserved. The selected surface has 97 vertices, 79 boundary edges and 7,210.997 m² mesh area. Separate flares remain separate.

Component `.local/station-realism/central-roof-02/` has continuous closed glazing, exact outer coordinates, and a provisional 24 mm inward normal offset. Three grid regions have maximum profile projection residuals of 7.36 / 2.83 / 1.80 mm. These are numerical fit distances, not survey accuracy.

There are 3,155 closed native panels, 38,232 triangles and two material batches. The first draft had 9,110 panels and 109,692 triangles; keeping each straight run continuous within a source facet retains grid density at lower cost. This does not establish a frame-rate improvement. Fabrication joints, inner truss, supports, seals and drainage remain unfinished.

- GLB SHA-256: `c7e27820fe6de340a2b7177040cb4f4ae7ecac45ce3f67e85c25c4cd4d70c912`.
- Native panels SHA-256: `edca363c353d7b3bd52cd4213ac1802bf77823e487d0c2c22a92b908608ff6c9`.
- Independent `central-roof-repeat-02` reproduces GLB, native panels and report byte for byte.
- All panels pass closed-manifold and positive-volume checks. Maximum exported coordinate difference is 0.000004234 m.

### Verification and retained failures

`central-roof-native-02/report.json`: all 250 probes pass, with maximum error 0.000373735 m. These cover every outer and inner glass triangle plus 24 frame samples.

`central-roof-with-station-02/report.json`: 231/250 expectations pass. Sixteen hits identify nearly coincident duplicate surfaces in imported east/west frontage. Three hit old canopy geometry: `canopy-glazing-051-19`, `canopy-depth-strut`, and `canopy-glazing-120-29`, at 0.1973 / 0.0945 / 0.1342 m difference. Retain these failures for coordinated integration.

Three Chrome source-context views were inspected. Aerial and western-junction views expose the selected shape. The municipal inner shell still obstructs the hall view, which cannot pass material or lighting review. These are not actual-game or photograph-matched views.

Primary notes: `notes/CENTRAL-ROOF-CONSTRUCTION.md`; gallery: `notes/central-roof-construction/index.html`. Gallery checks at 1440 and 390 px pass: four images, twelve local links, no overflow or browser errors. The desktop page was visually inspected. The research library remains at 178 resources and 163 verified downloads.

Syntax checks, `git diff --check`, browser asset build and deterministic rebuild pass. No service, C# or playable asset change; no new full-game runtime or performance acceptance. An initial profile-section assertion caught signed-zero duplicate keys before output; section-plane keys now explicitly use Z=0.

### Next integration

Rebuild both imported frontage interfaces from original triangles, preserving the installed eastern 248-face exclusion and the twelve vertical faces. Coordinate removal of old canopy geometry with the western roof, bridge, central corridor and inner structure. Do not promote a component ray-check layout into the playable scene.

All fifteen reference views, materials and lighting, both plazas and adjoining streets, upper spaces, vegetation, evening appearance, and full-game performance/runtime gates remain required by LONG-TERM-PLAN.

## Central roof interface candidate — 27 September

`station-central-interface-01` integrates the registered central roof and rebuilds both imported frontage meshes from original source triangles. The earlier eastern roof exclusion and vertical side faces are preserved. Sixteen duplicate imported-roof conflicts are resolved; three conflicts with the retained old canopy remain. See STATE.md for authoritative hashes and current scope.

`verify-central-interface.mjs` proves the exact allowed layout changes and passes 528 exported/native probes. All 278 eastern controls keep identical native hit positions and surface IDs. The complete runtime suite passes with the compatible worker explicitly selected; the first runtime attempt's missing-worker error is retained separately.

The full authored-shot check passes 30/31 courses. Skyway Trapdoor hits the new glass at 0.5611119s and misses banks3–5. Its first two banks still belong to the old Skyway/canopy, so this is an unresolved assembly dependency. All other authored shots have unchanged durations, hits, final positions and destination results. The failed trace and collision analysis are in `central-interface-course-impact-01.json`; do not waive this regression or cut an unsupported roof opening.

Three matched full-game views show the new transverse branch and the retained old structure together. Candidate frame p95 is18.3–18.4ms at1280×720, with no errors, warnings, hidden frames, dropped queries or disjoints. Single GPU maxima above40ms are retained; this diagnostic pair does not meet the broader repeated-trial and audio-soak acceptance requirement. All six images were inspected.

Primary gallery: `research/kyoto-station/notes/central-roof-interface/index.html`; maintained comparison helper: `compare-central-interface.mjs`. The candidate is not ready for promotion. The verified playable predecessor remains `station-east-clearance-01`. Next: coordinate the source inner truss, old roof removal and metric central/eastern Skyway registration, then revalidate the affected authored route and the complete station scope.

## Central roof04 inner structure — 27 September 2026

The optional `--truss` variant of `build-central-roof.mjs` adds a nominal 2m inner lattice, depth struts and alternating diagonals to the exact registered envelope. `registrations/central-roof-truss.json` records published dimensions and explicit authoring assumptions. The initial node-to-chord gap was corrected by splitting curved chords at lattice joints. Candidate04 has21,933closed panels/263,568triangles,826passing isolated native/browser probes and deterministic output; default outer-only geometry is unchanged. See STATE.md for hashes and current integration limits. Primary research: `notes/CENTRAL-ROOF-TRUSS.md` and its visual gallery. Uninstalled; current scene remains central-interface01.

## Central Skyway03 — 27 September 2026

Built a provisional central corridor, three viewing bays, and the arched bridge connection from municipal bridge/roof anchors. The 290 component probes and 666 assembly rays agree with native physics. Twelve native corridor/connection walks pass. The bays retain 14 sampled clearance failures and 96/97/97 intersecting inner members; outer glass and steel are clear after the guard setback correction. The roof needs purposeful bay opening frames, supports and the eastern descent before full-station integration. See STATE.md for exact hashes, tools and limitations, and the primary research `notes/CENTRAL-SKYWAY-CONSTRUCTION.md` for the visual study. No final acceptance or deployment.


## Skyway bay framing04 — 27 September 2026

The three provisional northern viewing spaces now have perimeter frames and ties around their openings. All exterior glass and outer steel remain exactly unchanged. The final component passes 1,210 native/browser collision probes; the five-component assembly passes 666 support/head rays and 36 native walks. Earlier glass-clash and overlapping-tie drafts remain as rejected evidence. See STATE.md for authoritative hashes and scope; primary gallery `notes/skyway-bay-framing/index.html` and note `notes/SKYWAY-BAY-FRAMING.md`.

Reproduce from repository root (use fresh `.local` output names):

```sh
node web/station/realism/reframe-skyway-bays.mjs .local/station-realism/central-roof-04 .local/station-realism/central-skyway-03 .local/station-realism/central-roof-bays-04-repeat
node web/station/realism/verify-bay-framing.mjs .local/station-realism/central-roof-04 .local/station-realism/central-roof-bays-04 .local/station-realism/central-skyway-03 .local/station-realism/central-roof-bays-check-04.json
node web/station/realism/compose-roof-skyway.mjs .local/station-realism/roof-skyway-assembly-06 .local/station-realism/central-roof-bays-04 .local/station-realism/west-roof-02 .local/station-realism/east-roof-01 .local/station-realism/west-skyway-04 .local/station-realism/central-skyway-03
node web/station/realism/audit-skyway-bay-volumes.mjs .local/station-realism/roof-skyway-assembly-06 .local/station-realism/central-skyway-03 .local/station-realism/central-skyway-bay-interference-06.json
node web/station/realism/verify-component-serialization.mjs .local/station-realism/roof-skyway-assembly-06 .local/station-realism/roof-skyway-serialization-06.json
```

The native commands require `KYOTO_WORKER_EXECUTABLE` pointing to the compatible local worker and their own output/log directories:

```sh
node --experimental-strip-types web/station/realism/verify-roof-component.mjs .local/station-realism/station-east-clearance-01/station-layout.json .local/station-realism/central-roof-bays-04 .local/station-realism/central-roof-bays-native-04 component-only
node --experimental-strip-types web/station/realism/audit-skyway-assembly.mjs .local/station-realism/station-east-clearance-01/station-layout.json .local/station-realism/roof-skyway-assembly-06 .local/station-realism/central-skyway-03 .local/station-realism/roof-skyway-clearance-07
```

The framing verifier checks saved mesh connections and complete new-member/glass intersections independently of the builder. Longest-first tie reuse prevents physically redundant overlapping surface IDs; the native verifier retains its strict surface-ID check. The bay audit covers eight walks per bay in addition to the twelve existing corridor/approach walks. These checks establish the component's geometry and tested walking paths, not structural adequacy or station integration. Materials, support details, photographic alignment and eastern descent remain open. No final visual acceptance or deployment.


## Eastern Skyway01 — 27 September 2026

The central corridor now connects to an isolated pair of operating escalators. The municipal source court is near Y29.973 m, while the current game uses an inferred Y33.5 m arrival and a different bank northing. This candidate follows the source-anchored corridor and coarse court envelope; exact local levels and placement remain provisional. It adds two moving lanes and 73 closed static panels. Fourteen native walks, two standing rides, geometry/envelope checks and 64,000 browser tread/oracle samples pass. The untouched source retains two closure faces across the upper route boundary, recorded for the interface rebuild. See STATE.md for hashes and scope, and primary research `notes/EAST-SKYWAY-CONSTRUCTION.md`.

Reproduce with fresh output names:

```sh
node web/station/realism/audit-east-skyway-source.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/east-skyway-source-01
node web/station/realism/build-east-skyway.mjs .local/station-realism/station-central-interface-01/station-layout.json .local/station-realism/central-skyway-03 .local/station-realism/east-skyway-source-01/audit.json .local/station-realism/east-skyway-01
node web/station/realism/verify-east-skyway-geometry.mjs .local/station-realism/east-skyway-01 .local/station-realism/central-skyway-03 .local/station-realism/east-skyway-source-01/audit.json .local/station-realism/east-skyway-geometry-01.json
node web/station/realism/verify-east-skyway-motion.mjs .local/station-realism/east-skyway-01 .local/station-realism/east-skyway-motion-01.json
node web/station/realism/audit-east-skyway-source-clearance.mjs .local/station-realism/east-skyway-01 .local/station-realism/east-skyway-source-01/audit.json .local/station-realism/east-skyway-source-clearance-01.json
```

Compose the five prior assembly06 inputs plus `east-skyway-01` into assembly07. With `KYOTO_WORKER_EXECUTABLE` explicitly selecting the compatible local worker:

```sh
node --experimental-strip-types web/station/realism/audit-east-skyway.mjs .local/station-realism/station-central-interface-01/station-layout.json .local/station-realism/roof-skyway-assembly-07 .local/station-realism/east-skyway-01 .local/station-realism/east-skyway-native-04
```

The native audit uses a private layout/database-free worker and its own log. Static serialization checks cover all meshes; moving treads use the unchanged game renderer and matching native path. The fixed-target placement API is not a moving-floor ray API: actual native walking and standing ride displacement prove moving support. Neither an isolated pass nor a coarse source floor establishes full courtyard or station completion. Full integration, course/runtime and Chrome performance gates remain open. No deployment.

## Complete-station roof replacement — 27 September

`station-registered-roof-01` replaces the obsolete canopy in a full station candidate. It removes 5,866 old panels and 33,293 old beams, replaces 3,155 previously inserted central outer-roof panels, and installs 22,002 framed central-roof panels plus 1,080 western-roof panels. The existing eastern registered roof, municipal imports, route records, materials, lights and other station geometry remain unchanged. The old Skyway remains pending its coordinated access-route replacement. This is an intermediate construction candidate, not a playable release.

`install-registered-roof.py` checks the exact removal inventory against Blender objects, then resolves retained beam bindings by stable surface ID, mesh center and principal direction. Old numeric seeds are stale; crossing diagonals can share both an ID and center, so direction is necessary. Batch removal avoids repeated scene updates. All 1,470 retained beams match exactly one native record.

```sh
blender -b --python-exit-code 1 --python web/station/realism/install-registered-roof.py -- \
  --candidate .local/station-realism/station-central-interface-01 \
  --inventory .local/station-realism/central-interface-old-canopy-inventory-01.json \
  --central .local/station-realism/central-roof-bays-04 \
  --west .local/station-realism/west-roof-02 \
  --output .local/station-realism/NEW-STATION-ROOF
node web/station/realism/prepare-city-textures.mjs \
  .local/station-realism/NEW-STATION-ROOF .local/station-realism/NEW-ROOF-BROWSER-INPUT
blender -b --python-exit-code 1 --python tools/export_browser_art.py -- \
  --source .local/station-realism/NEW-STATION-ROOF/KyotoAtrium.blend \
  --layout .local/station-realism/NEW-ROOF-BROWSER-INPUT/station-layout.json \
  --output .local/station-realism/NEW-ROOF-BROWSER
# Use optimizeGLB from tools/optimize-browser-assets.mjs to save atrium.runtime.glb.
# Explicitly select the compatible KYOTO_WORKER_EXECUTABLE before native checks.
node --experimental-strip-types web/station/realism/verify-installed-roof.mjs \
  .local/station-realism/station-central-interface-01/station-layout.json \
  .local/station-realism/NEW-STATION-ROOF/station-layout.json \
  .local/station-realism/NEW-ROOF-BROWSER/atrium.glb \
  .local/station-realism/NEW-ROOF-NATIVE \
  .local/station-realism/central-roof-bays-native-04/report.json \
  .local/station-realism/west-roof-native-02/report.json \
  .local/station-realism/central-interface-native-01/report.json
```

Final browser candidate is `registered-roof-browser-02`. Export 01 mistakenly used original municipal texture resolutions; it is retained as diagnostic evidence and excluded from comparison. Export 02 uses the same provisional 1024 px municipal limit as its parent. All 284 embedded images have identical encoded bytes, pixels and dimensions. Triangle count drops from 2,493,236 to 2,119,809; runtime delivery drops from 127,358,644 to 117,482,232 bytes. Texture memory remains provisional at 846.208 MiB; this is not a finished texture budget.

`registered-roof-native-02/report.json` passes 1,762 full-export/native rays (maximum error 0.000373734 m). The verifier now uses the native API's actual 250 m ray length: removal of an old surface may expose a farther surface. The first verifier attempt assumed the former surface distance and stopped before starting a worker; its diagnostic log is retained. All three former old-canopy conflicts resolve to the intended central glass. Four new-truss hits precede expectations from the old outer-only component; four remaining interfaces involve the imported inner shell or eastern cladding and still need inspection. See `registered-roof-interface-impact-01.json`.

`registered-roof-campaign-01` passes 30/31 authored shots. Skyway Trapdoor's old waypoint no longer validates because its target surface was removed. The thirty executed shots reach full rest and retain duration, hits and destination results. 28 complete pose sequences are identical; Ceiling Service keeps identical positions but differs in other pose fields; Cafe Carom has maximum position drift of 0.00016156 m. The existing terrace destination revision and two passage walks are revalidated against a fresh trace. No failed course is waived.

`audit-installed-east-entrance.mjs` corrects the earlier source-only closure interpretation. Both upper-entrance volumes have zero intersections with all 740 municipal station panels actually installed. The frontage is clipped farther north. No source wall was cut. The corrected research page passes Chrome desktop/mobile QA with six images and 15 links.

See STATE.md for final capture/runtime status, hashes and next work. No commit, push or deployment.


## Inner roof source interface01

Current candidate and verified hashes are in STATE.md. Research explanation: `/Users/finbarr/code/games/kyoto/research/kyoto-station/notes/INNER-ROOF-INTERFACE.md`. The cut removes only source polygons covered by the registered roof and retains uncovered transitions/vertical returns. It resolves two eastern probes; the western boundary, eastern cladding and Skyway Trapdoor remain open.

Reproduction order (all outputs under `.local/station-realism`; do not overwrite original sources):

1. `audit-inner-roof-interface.mjs SOURCE PARENT_LAYOUT PARENT_NATIVE_REPORT AUDIT_DIR` traces installed hits back to source faces and grows the connected inner shell.
2. `map-inner-roof-coverage.mjs SOURCE AUDIT_DIR web/station/realism/registrations/central-roof-envelope.json MASK_JSON` partitions source faces by their normal projection onto the registered envelope.
3. `verify-inner-roof-mask.mjs SOURCE MASK_JSON REGISTRATION_JSON AUDIT_DIR/audit.json CHECK_JSON` independently ray-checks325 points per selected source face. It distinguishes covered and retained conflict points.
4. Blender `--background --python-exit-code 1 --python web/station/realism/rebuild-inner-roof-interface.py -- --candidate PARENT_DIRECTORY --source SOURCE --mask MASK_JSON --check CHECK_JSON --output CANDIDATE_DIRECTORY` rebuilds only the two imported meshes, preserving UVs and normals.
5. Run `prepare-city-textures.mjs`, then the normal Blender export and browser optimizer. The derivative layout must be passed explicitly to export; exporting the original municipal maps changes the texture budget.
6. `sample-inner-roof-boundaries.mjs CANDIDATE_LAYOUT MASK_JSON BOUNDARIES_JSON` samples retained fragments. `node --experimental-strip-types web/station/realism/verify-inner-roof-interface.mjs PARENT_LAYOUT CANDIDATE_LAYOUT RAW_BROWSER_GLB OUTPUT_DIR PARENT_NATIVE_REPORT BOUNDARIES_JSON` compares all exported/native first hits using the API's250m ray.
7. Fresh terrace proof, `prepare-frontage-course.mjs`, all authored hints and the isolated runtime suite verify gameplay. Current isolated server4405 has its own database/log; synchronize the candidate catalog again after server restart.
8. `summarize-inner-roof.mjs` validates exact-parent trajectories, classifies first-hit changes and compares embedded texture/material bytes. `compare-inner-roof.mjs BEFORE_CAPTURE_DIR AFTER_CAPTURE_DIR OUTPUT_DIR` prepares the linked inspection gallery after matched actual-game captures.

The initial coarse coverage test, initial overstrict all-three-conflicts mask assertion and material-suffix assertion failures are retained. No mask, source boundary or course failure is waived to obtain a clean report. The separate west-approach source audit is a lead for route registration, not permission to treat roof/underside triangles as public floors.

Final inner-roof captures use `inner-roof-before-02` and `inner-roof-after-02`; the gallery is `inner-roof-comparison-02`. The first pair is retained but power switched after the initial AC reading. `capture.mjs` now records power source at capture start/end and before/after each view plus power settings. The comparison refuses mismatched source/settings. The accepted pair stays on battery with low-power mode off. `plot-inner-roof-mask.py MASK_JSON OUTPUT_SVG` draws the actual frontage-clipped source polygons; its independent clipped-area sum agrees with the installed cut within0.001m².


## Western restaurant construction and bridge datum

Current results, hashes and limitations are in STATE.md. Primary research note: `notes/WESTERN-APPROACH.md`, gallery `notes/western-approach/index.html` under `/Users/finbarr/code/games/kyoto/research/kyoto-station/`.

Reproduction (output names are examples; keep prior failed receipts):

```sh
node web/station/realism/register-west-approach.mjs SOURCE_APPROACH_AUDIT FIT_JSON OPERATOR_MAP OUTPUT_REGISTRATION_DIR
node web/station/realism/build-west-skyway.mjs FIT_JSON BASE_LAYOUT NEW_BRIDGE_DIR OUTPUT_REGISTRATION_DIR/registration.json
node web/station/realism/build-west-restaurant.mjs OUTPUT_REGISTRATION_DIR/registration.json NEW_BRIDGE_DIR NEW_RESTAURANT_DIR
node web/station/realism/compose-roof-skyway.mjs NEW_ASSEMBLY_DIR NEW_RESTAURANT_DIR NEW_BRIDGE_DIR
node web/station/realism/verify-component-serialization.mjs NEW_ASSEMBLY_DIR SERIALIZATION_JSON
python3 web/station/realism/verify-west-datum.py NEW_RESTAURANT_DIR NEW_BRIDGE_DIR DATUM_CHECK_JSON
# Select the compatible worker executable via KYOTO_WORKER_EXECUTABLE first.
node --experimental-strip-types web/station/realism/audit-west-restaurant.mjs BASE_LAYOUT NEW_ASSEMBLY_DIR NEW_RESTAURANT_DIR NATIVE_AUDIT_DIR NEW_BRIDGE_DIR
```

`verify-west-datum.py` compares against the source approach audit01 and old bridge04 in `.local/station-realism`; it tests actual selected floor triangles, not their bounding rectangle. The new optional bridge datum changes the floor plane/deck while retaining roof world geometry. Consumers must use `floorEndpointsRenderer` when present; `sourceEndpointsRenderer` remains the original underside evidence.

`component-mesh.mjs` builds closed browser/native slabs and beams. It improves internal triangulation by flipping convex interior diagonals when the minimum angle increases; boundary vertices and holes remain fixed. This corrects a near-collinear floor sliver that made a native hit inaccurate. It does not alter the operator map to manufacture clearance. Native shared-edge ties are explicitly retained and checked against the actual rendered triangles at a 1e-5m tolerance. Earlier ID-only failures and the off-ray sliver failure remain diagnostics.

The final walking test uses source-aligned starting lanes at the skewed threshold, then three path offsets through the corridor, vestibule and bridge. It samples first-hit support/headroom and performs actual native capsule walks both ways. Passing an isolated component does not validate full-station connections, current course targets, source dimensions, photographic appearance or game performance.


## Aligned Skyway datum and revised viewing-bay boundaries

Current authoritative component receipts are in STATE.md under assembly09. The central builder accepts an optional final western-bridge directory. It validates the bridge's source fit and bytes, uses its finished-floor endpoints, and reduces relative screen height so the approach roof/screen tops remain at the previous world elevation. Rail heights stay relative to the walking floor. Default behavior retains the old component bytes.

The eastern builder accepts an optional final specification path. `registrations/east-skyway-raised-floor.json` pins central04's native bytes while retaining the existing template/source requirements. The lower courtyard plane remains the source plane; rise/run and moving-step path are recomputed.

```sh
node web/station/realism/build-central-skyway.mjs SOURCE_GLB FIT_JSON BASE_LAYOUT CENTRAL_OUTPUT WEST_BRIDGE_DIRECTORY
node web/station/realism/build-east-skyway.mjs TEMPLATE_LAYOUT CENTRAL_OUTPUT EAST_SOURCE_AUDIT EAST_OUTPUT web/station/realism/registrations/east-skyway-raised-floor.json
node web/station/realism/reframe-skyway-bays.mjs .local/station-realism/central-roof-04 CENTRAL_OUTPUT FRAMING_OUTPUT web/station/realism/registrations/skyway-bay-framing-raised-floor.json
node web/station/realism/verify-bay-framing.mjs .local/station-realism/central-roof-04 FRAMING_OUTPUT CENTRAL_OUTPUT CHECK_JSON
```

Framing's optional `openToOuterRoof` removes the top clipping plane only for inner-lattice members. Protected exterior glass/grid remain identical. Boundary frames and ties connect every interrupted endpoint; independent verification checks those saved meshes and exterior glass intersections. The frontal frame lies behind the guard, outside the unchanged occupied clearance volume. Use `audit-skyway-bay-volumes.mjs` to check complete roof triangles against those volumes; vertical ray samples alone missed the former edge conflict.

Compose all seven inputs listed in STATE.md, verify serialization, and run `audit-skyway-assembly.mjs`, `audit-west-restaurant.mjs` and `audit-east-skyway.mjs` with the compatible worker selected. The eastern fixed-target RPC rejects moving treads, including their extension into comb transitions: emitted fixed deck endpoints delimit the region requiring actual native walking proof. Keep fixed-support probes and moving-support trials distinct.

`inventory-skyway-replacement.mjs LAYOUT OUTPUT_JSON` records exact named dependencies and record hashes without modifying the station. It is a starting inventory, not an approved or spatially exhaustive removal manifest. Stairs/courtyard, fixtures and metadata remain necessary before complete installation.


## Eastern courtyard footprint / official 7F schematic

Current research: `east-court-source-03` and `east-court-registration-03`. The regional plane selection is checked against every matching upward face in the source object: 53 triangles, one connected component, one outer boundary and one preserved hole. Earlier 37/51-face sets were regionally truncated. This is a reference footprint only; garden/steps/ramp and public room connections remain to be built. Official map topology is useful, but the tentative metric fit fails an independent southern control by14.462m. See STATE.md and primary research note `notes/EAST-COURT-REGISTRATION.md`.

```sh
node web/station/realism/audit-east-court-source.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/east-court-source-03
node web/station/realism/register-east-court.mjs .local/station-realism/east-court-source-03/audit.json .local/station-realism/east-skyway-02 /Users/finbarr/code/games/kyoto/research/kyoto-station/maps/official-7f-station-map.svg .local/station-realism/east-court-registration-03
```

The second command verifies connected directed-edge topology, triangle/boundary area parity, whole-object selection completeness and99apron samples. It saves exact renderer loops, source face IDs, source/report/map hashes, the failed schematic alignment and a reference SVG. No source photographs/maps become game textures. No game geometry, services or physics protocol changed in this step.


## Eastern courtyard garden connections03

Uninstalled component:40panels/680triangles,sourcefloor with preserved opening,provisional21×18.5m raised garden,two seven-step stairs,ramp/landing/rails. Exact dimensions and remaining scope are in `registrations/east-court.json`, STATE.md and primary `notes/EAST-COURT-CONSTRUCTION.md`. Current court03 changes only verifier waypoints from01; all three geometry hashes are identical.

```sh
node web/station/realism/build-east-court.mjs .local/station-realism/east-court-registration-03/registration.json .local/station-realism/east-skyway-02 .local/station-realism/east-court-03
node web/station/realism/compose-roof-skyway.mjs .local/station-realism/east-court-assembly-03 .local/station-realism/east-skyway-02 .local/station-realism/east-court-03
node web/station/realism/verify-east-court.mjs .local/station-realism/east-court-03 .local/station-realism/east-court-registration-03/registration.json .local/station-realism/east-court-geometry-03.json
node web/station/realism/verify-component-serialization.mjs .local/station-realism/east-court-assembly-03 .local/station-realism/east-court-assembly-serialization-03.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-east-court.mjs .local/station-realism/station-inner-roof-01/station-layout.json .local/station-realism/east-court-assembly-03 .local/station-realism/east-court-03 .local/station-realism/east-court-native-03
```

The last run uses a private layout and worker log;14 normal-speed walks/230rays pass. The audit retains shared-edge surface ties and requires endpoint levels. Native behavior follows visible stair/ramp meshes; no C# change. This does not establish measured geometry, full public access, final materials or whole-game performance. `project-source.mjs` now accepts optional `exposure` for inspection, default1unchanged. Final source-context/overview/ramp cameras and receipts are saved in eastern court assembly03.


## Current-reference stone seats and original granite

`east-court-seats-01` adds two provisional three-tier seats with 12 mm bevels: six closed meshes, 200 triangles, one shared material. Three original 512×512 maps use a 0.6 m tile and a fixed seed. No photo pixels. See STATE.md and primary `notes/EAST-COURT-STONE-SEATS.md` for reference dates, dimensions, costs and remaining scope.

```sh
node web/station/realism/build-east-court-seats.mjs .local/station-realism/east-court-03 .local/station-realism/east-court-seats-01
node web/station/realism/compose-roof-skyway.mjs .local/station-realism/east-court-furnished-01 .local/station-realism/east-skyway-02 .local/station-realism/east-court-03 .local/station-realism/east-court-seats-01
node web/station/realism/verify-component-serialization.mjs .local/station-realism/east-court-furnished-01 .local/station-realism/east-court-furnished-serialization-01.json
node web/station/realism/verify-component-textures.mjs .local/station-realism/east-court-furnished-01 .local/station-realism/east-court-seat-textures-01.json
node web/station/realism/verify-east-court-seats.mjs .local/station-realism/east-court-assembly-03 .local/station-realism/east-court-03 .local/station-realism/east-court-seats-01 .local/station-realism/east-court-furnished-01 .local/station-realism/east-court-native-03/report.json .local/station-realism/east-court-seat-clearance-02.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-seat-component.mjs .local/station-realism/station-inner-roof-01/station-layout.json .local/station-realism/east-court-seats-01 .local/station-realism/east-court-seats-native-01 component-only
```

Composer accepts embedded PNG textures and adjusts image, sampler, texture and material references. The previous untextured assembly stays byte-identical. The texture verifier resolves references to image bytes and compares UV buffers and material semantics; a distinct-input fixture checks nonzero offsets. Native seat audit probes all 200 triangles. The route verifier preserves parent geometry and checks recorded capsule paths against new seat bounds; it does not claim a new walking run. The full station remains unchanged and has not passed final visual/performance gates.

## East Square / NIWA photo camera — 27 September

`registrations/east-court-niwa.json` supplies eight equipment/roof corners and one foreground tower edge. `fit-photo.py` fits six points plus line distance and checks two withheld points. Use the cached SciPy environment `/private/tmp/kyoto-realism-uv/archive-v0/21yfhkH4gNwSmIUK4k4eN/bin/python` (system/bundled Python lacks SciPy).

```sh
python web/station/realism/fit-photo.py web/station/realism/registrations/east-court-niwa.json .local/station-realism/east-court-photo-registration-02
node web/station/realism/project-source.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/east-court-photo-registration-02/camera.json .local/station-realism/east-court-photo-registration-02/render
python web/station/realism/verify-photo-fit.py .local/station-realism/photo-fit-verification-01
node web/station/realism/photo-overlay.mjs .local/station-realism/east-court-photo-registration-02/fit.json .local/station-realism/east-court-photo-game-02
```

The optional `lineConstraints` array names `use: fit|check`, `worldPoints`, `imageEndpoints` and image-pick uncertainty. Points on a line constrain perpendicular distance, not image endpoint identity. Sensitivity trials perturb both point picks and line endpoints. `toleranceWidthFraction` defaults0.02; previous1280-wide north camera is byte-identical after this change. `verify-photo-fit.py` recovers an independent synthetic camera and tests withheld outliers and scaling.

`photo-overlay.mjs` takes `reference.viewId` and `reference.displayTitle`, with old north defaults. Optional game capture must match position, field of view, quaternion and drawing buffer. It checks image hashes.

Latest primary review: `notes/east-court-photo-registration/index.html`; detailed evidence: `notes/EAST-COURT-PHOTO-REGISTRATION.md`. Source fit passes at1224×816(max9.69px; withheld5.92px; threshold24.48px). The game still fails visibly: camera sits0.474m below old east-square slab. The isolated furnishedcourt01 view exposes wrong seat positions. Registration is evidence for correction, not visual acceptance or permission to integrate incomplete routes.

## Foreground stone bench — 27 September

`fit-east-court-seat.py` takes camera-registration directory, court-component directory and ignored output directory. It requires NumPy, SciPy and Shapely; the cached interpreter `/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python` provides them. The geometry remains conditional on the assumed garden plane and seat levels. Reprojection of traced outlines is construction input, not independent visual acceptance.

```sh
python web/station/realism/fit-east-court-seat.py .local/station-realism/east-court-photo-registration-02 .local/station-realism/east-court-03 .local/station-realism/east-court-seat-photo-fit-05
node web/station/realism/build-east-court-seats.mjs .local/station-realism/east-court-03 .local/station-realism/east-court-seats-03 .local/station-realism/east-court-seat-photo-fit-05/seat-spec.json
node web/station/realism/compose-roof-skyway.mjs .local/station-realism/east-court-furnished-03 .local/station-realism/east-skyway-02 .local/station-realism/east-court-03 .local/station-realism/east-court-seats-03
node web/station/realism/audit-seat-component.mjs runtime/station-layout.json .local/station-realism/east-court-seats-03 .local/station-realism/east-court-seats-native-03 component-only
node web/station/realism/audit-east-court.mjs runtime/station-layout.json .local/station-realism/east-court-furnished-03 .local/station-realism/east-court-03 .local/station-realism/east-court-furnished-native-03 .local/station-realism/east-court-furnished-03/routes.json
```

Set `KYOTO_WORKER_EXECUTABLE` to the compatible primary Mac worker for native checks. `routes.json` records the u35 detour around the foreground seat; it preserves the original route starts/ends. The other six routes are unchanged. The old straight-path clearance failure is retained. Native420 seat probes and14 fresh courtyard walks pass. Source-context gallery: `notes/east-court-seat-correction/index.html`; details: `notes/EAST-COURT-SEAT-CORRECTION.md`. No full-station installation or final visual acceptance yet.

## NIWA frontage research and dimensional hypotheses — 27 September

See primary `research/kyoto-station/notes/NIWA-FRONTAGE-RESEARCH.md` and `notes/niwa-frontage/index.html`. Four inspected photographs add timber/stair/planter/drainage evidence. No geometry candidate changes.

```sh
node web/station/realism/measure-niwa-frontage.mjs \
  .local/station-realism/east-court-photo-registration-02 \
  .local/station-realism/east-court-03 \
  .local/station-realism/niwa-frontage-study-02
```

The tool back-projects manual picks onto explicitly hypothetical planes; it does not fit a facade. A one-metre assumed frontage shift changes the inferred roof height by about18cm. The lowest stair edges lie forward of the facade, so their facade-plane intersections must not be used as actual heights. Second-view registration and matching durable stair/planter features are the next construction prerequisite. Repeat receipts match exactly; desktop/mobile research-gallery checks pass.

## NIWA second camera and joint construction dimensions

Primary review: `notes/niwa-frontage-registration/index.html`; method: `notes/NIWA-FRONTAGE-REGISTRATION.md`. This is an additional view of East Square, not another accepted target area. No game geometry changed.

```sh
node web/station/realism/verify-photo-anchor-source.mjs \
  web/station/realism/registrations/east-court-niwa-rurubu.json \
  .local/station-realism/niwa-rurubu-registration-01/fit/anchor-source-check.json

# Requires NumPy/SciPy. Original camera renders must already exist.
python web/station/realism/triangulate-niwa-frontage.py \
  .local/station-realism/east-court-photo-registration-02 \
  .local/station-realism/niwa-rurubu-registration-01/fit \
  .local/station-realism/east-court-03 \
  .local/station-realism/niwa-frontage-stereo-01

python web/station/realism/fit-niwa-stereo.py \
  web/station/realism/registrations/east-court-niwa.json \
  web/station/realism/registrations/east-court-niwa-rurubu.json \
  .local/station-realism/east-court-photo-registration-02 \
  .local/station-realism/niwa-rurubu-registration-01/fit \
  .local/station-realism/niwa-frontage-stereo-01/study.json \
  .local/station-realism/niwa-frontage-joint-01
```

The joint solve keeps all original source checks and a partly occluded fifth planter corner outside optimization. Four shared planter corners assume a vertical rectangular shape. The inferred1.581×1.499×1.193m planter and lower walkwayY30.807 are construction hypotheses; camera/source/lens uncertainty remains. Original source-only camera outputs and court03/seat03 are preserved. SeeSTATE.md for residuals, retained mismatches and next construction step.


## NIWA frontage construction06 — 27 September 2026

Build the provisional entrance from the joint camera study and current court basis:

```sh
node web/station/realism/build-niwa-frontage.mjs .local/station-realism/niwa-frontage-joint-01 .local/station-realism/east-court-03 .local/station-realism/niwa-frontage-06
node web/station/realism/compose-roof-skyway.mjs .local/station-realism/niwa-entrance-assembly-06 .local/station-realism/niwa-frontage-06
node web/station/realism/verify-component-serialization.mjs .local/station-realism/niwa-entrance-assembly-06 .local/station-realism/niwa-frontage-serialization-06.json
node web/station/realism/verify-component-textures.mjs .local/station-realism/niwa-entrance-assembly-06 .local/station-realism/niwa-frontage-textures-06.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-niwa-component.mjs .local/station-realism/station-inner-roof-01/station-layout.json .local/station-realism/niwa-frontage-06 .local/station-realism/niwa-frontage-native-06 component-only
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-east-court.mjs .local/station-realism/station-inner-roof-01/station-layout.json .local/station-realism/niwa-entrance-assembly-06 .local/station-realism/niwa-frontage-06 .local/station-realism/niwa-entrance-walk-06
node web/station/realism/project-source.mjs .local/station-realism/niwa-frontage-06/niwa-frontage.glb .local/station-realism/niwa-frontage-joint-01/jr/camera.json .local/station-realism/niwa-frontage-views-06/jr
node web/station/realism/project-source.mjs .local/station-realism/niwa-frontage-06/niwa-frontage.glb .local/station-realism/niwa-frontage-joint-01/rurubu/camera.json .local/station-realism/niwa-frontage-views-06/rurubu
```

Component06 has148 closed parts/1816triangles/eight materials; all1816triangleprobes and four normal-speed stair walks pass. Repeat build, serialization and embedded materials/textures pass. Research gallery `notes/niwa-frontage-construction/index.html` contains the two exact-camera comparisons and linked receipts, checked at1440/390px. Detailed geometry assumptions, retained native/traversal failures and hash provenance are in primary research `notes/NIWA-FRONTAGE-CONSTRUCTION.md` and STATE.md. No full-station installation, final visual acceptance or performance gate is implied by these isolated checks. All temporary processes stopped; no commit/push/deploy.


## NIWA timber and stone refinement08 — 27 September 2026

The latest component adds the photographed open timber band, opts into flat hard-face normals and uses original granite maps. Current primary gallery: `research/kyoto-station/notes/niwa-frontage-detail/index.html`; evidence: `notes/NIWA-FRONTAGE-DETAIL.md`. Exact beam dimensions and glazing layout remain provisional; the rejected roof-line fit is preserved. No full-station installation or final acceptance is implied.

```sh
node web/station/realism/build-niwa-frontage.mjs .local/station-realism/niwa-frontage-joint-01 .local/station-realism/east-court-03 .local/station-realism/niwa-frontage-08
node web/station/realism/compose-roof-skyway.mjs .local/station-realism/niwa-entrance-assembly-08 .local/station-realism/niwa-frontage-08
node web/station/realism/verify-flat-component-normals.mjs .local/station-realism/niwa-frontage-08 .local/station-realism/niwa-frontage-normals-08.json
node web/station/realism/verify-component-serialization.mjs .local/station-realism/niwa-entrance-assembly-08 .local/station-realism/niwa-frontage-serialization-08.json
node web/station/realism/verify-component-textures.mjs .local/station-realism/niwa-entrance-assembly-08 .local/station-realism/niwa-frontage-textures-08.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-east-court.mjs .local/station-realism/station-inner-roof-01/station-layout.json .local/station-realism/niwa-entrance-assembly-08 .local/station-realism/niwa-frontage-08 .local/station-realism/niwa-entrance-walk-08
node web/station/realism/project-source.mjs .local/station-realism/niwa-frontage-08/niwa-frontage.glb .local/station-realism/niwa-frontage-joint-01/jr/camera.json .local/station-realism/niwa-frontage-views-08/jr
node web/station/realism/project-source.mjs .local/station-realism/niwa-frontage-08/niwa-frontage.glb .local/station-realism/niwa-frontage-joint-01/rurubu/camera.json .local/station-realism/niwa-frontage-views-08/rurubu
```

Native triangle evidence is the fresh07 run plus `niwa-frontage-native-applicability-08.json`, which proves byte-identical geometry/native panels07→08 despite the granite texture changes. All2,332rayprobes and four fresh08walks pass. Defaults of the shared mesh helper reproduce old06 bytes. Component08 repeat, hard normals, serialization, embedded textures, browser build and desktop/mobile gallery checks pass. All temporary processes stopped. Remaining court interfaces and full goal gates are recorded in STATE.md.


## Joined NIWA court and exterior terrace — assembly03

The current isolated court candidate combines eastern Skyway02, court04, seat/terrace06 and NIWA08. The former court/NIWA floor overlap is removed, with a shared18.5m paving boundary. Floor coplanarity, stair counts and terrace dimensions remain explicit hypotheses. See primary research `notes/EAST-COURT-NIWA-INTERFACE.md` and `notes/east-court-niwa-interface/index.html` for comparisons, retained rejected geometry and verification limits.

```sh
node web/station/realism/derive-niwa-court-interface.mjs web/station/realism/registrations/east-court.json .local/station-realism/east-court-03 .local/station-realism/niwa-frontage-08 .local/station-realism/east-court-niwa-interface-01
node web/station/realism/build-east-court.mjs .local/station-realism/east-court-registration-03/registration.json .local/station-realism/east-skyway-02 .local/station-realism/east-court-04 .local/station-realism/east-court-niwa-interface-01/court-spec.json
/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/fit-east-court-seat.py .local/station-realism/niwa-frontage-joint-01/jr .local/station-realism/east-court-04 .local/station-realism/east-court-seat-photo-fit-06
node web/station/realism/build-east-court-seats.mjs .local/station-realism/east-court-04 .local/station-realism/east-court-seats-06 .local/station-realism/east-court-seat-photo-fit-06/seat-spec.json .local/station-realism/niwa-frontage-08
node web/station/realism/compose-roof-skyway.mjs .local/station-realism/east-court-niwa-03 .local/station-realism/east-skyway-02 .local/station-realism/east-court-04 .local/station-realism/east-court-seats-06 .local/station-realism/niwa-frontage-08
node web/station/realism/niwa-court-routes.mjs .local/station-realism/east-court-04 .local/station-realism/niwa-frontage-08 .local/station-realism/east-court-niwa-03 .local/station-realism/east-court-furnished-03/routes.json .local/station-realism/east-court-niwa-03/routes.json .local/station-realism/east-court-seats-06
/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/verify-niwa-court-interface.py .local/station-realism/east-court-03 .local/station-realism/east-court-04 .local/station-realism/niwa-frontage-08 .local/station-realism/east-court-seats-06 .local/station-realism/east-court-niwa-interface-03.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-seat-component.mjs .local/station-realism/station-inner-roof-01/station-layout.json .local/station-realism/east-court-seats-06 .local/station-realism/east-court-seats-native-06 component-only
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-east-court.mjs .local/station-realism/station-inner-roof-01/station-layout.json .local/station-realism/east-court-niwa-03 .local/station-realism/east-court-04 .local/station-realism/east-court-niwa-walk-03 .local/station-realism/east-court-niwa-03/routes.json
```

Final assembly03 passes540 seat/terrace native probes,28 fresh normal-speed walks, serialization and texture checks. Old defaults and current repeat outputs match byte-for-byte. Browser asset build and desktop/mobile comparison QA pass. Exact joint-camera captures are under`east-court-niwa-views-03`; diagnostic before views under`east-court-niwa-before-views-01`. These checks do not establish full-station integration, photographic completion or the final performance gate. No commit/push/deploy.


## Full-station courtyard integration 03

See STATE.md and the primary research note `notes/EAST-COURT-CONTEXT.md`. The final candidate passes all 28 declared courtyard walks and both actual-game fixed-camera inspections; all wider visual, course and performance gates remain open.

Reproduce with fresh output directories. Parent and component hashes are pinned by the construction tools:

```sh
blender -b --python-exit-code 1 --python web/station/realism/install-east-court-context.py -- --candidate .local/station-realism/station-inner-roof-01 --source .local/station-realism/station-shell/municipal-station.glb --assembly .local/station-realism/east-court-niwa-03 --court .local/station-realism/east-court-04 --inventory .local/station-realism/east-court-interface-inventory-01/inventory.json --output FRESH_CONTEXT02
blender -b --python-exit-code 1 --python web/station/realism/clip-east-court-draft-enclosures.py -- --candidate .local/station-realism/station-east-court-context-02 --output FRESH_CONTEXT03
node web/station/realism/verify-east-court-draft-clip.mjs .local/station-realism/station-east-court-context-02/station-layout.json .local/station-realism/station-east-court-context-03/station-layout.json .local/station-realism/east-court-draft-scope-03.json
```

Browser03 uses the same 1024px municipal texture profile as browser02; its input directory contains an exact copy of context03 layout plus the established resized textures. Export with `tools/export_browser_art.py`, then `optimizeGLB` from `tools/optimize-browser-assets.mjs`. Only `doubleSided` handling was added to the exporter in this pass; records without that field keep existing behavior.

```sh
node web/station/realism/verify-installed-court-materials.mjs .local/station-realism/east-court-niwa-03/assembly.glb .local/station-realism/east-court-context-browser-03/atrium.glb .local/station-realism/east-court-context-materials-verified-04.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-installed-court.mjs .local/station-realism/station-east-court-context-03/station-layout.json .local/station-realism/east-court-context-browser-03/atrium.glb .local/station-realism/east-court-niwa-03 .local/station-realism/east-court-04 .local/station-realism/east-court-installed-walk-05 .local/station-realism/east-court-niwa-03/routes.json
```

Actual-game captures require an isolated server with context03 `KYOTO_LAYOUT`, its own `KYOTO_DATA_DIR` and `KYOTO_WORKER_LOG`, and explicit worker executable. Use `KYOTO_REVIEW_LIVE=1 KYOTO_REVIEW_ASSETS=.local/station-realism/east-court-context-browser-03 KYOTO_REVIEW_MANIFEST=.local/station-realism/east-court-context-game-03/jr-manifest.json KYOTO_TEST_ORIGIN=http://127.0.0.1:4497 node web/station/realism/capture.mjs FRESH_LABEL`. The Rurubu manifest is adjacent. The live mode avoids importing a historical fixture whose course/layout is incompatible; it does not bypass the fixture guard or establish course acceptance.


## NIWA entrance and visible interior — component11 / context05

See STATE.md and primary research `notes/NIWA-ENTRANCE-INTERIOR.md`. This extends the existing full-station court candidate with a closed entrance and shallow interior context. All 28 courtyard walks and 2,676 component samples pass; the full visual, course and performance gates remain open.

Use fresh output paths when repeating construction. The builder intentionally uses court03 for its original registered coordinate frame; current court04 is a separate assembly component.

```sh
node web/station/realism/build-niwa-frontage.mjs .local/station-realism/niwa-frontage-joint-01 .local/station-realism/east-court-03 FRESH_NIWA entrance
node web/station/realism/compose-roof-skyway.mjs FRESH_ASSEMBLY .local/station-realism/east-skyway-02 .local/station-realism/east-court-04 .local/station-realism/east-court-seats-06 FRESH_NIWA
node web/station/realism/niwa-court-routes.mjs .local/station-realism/east-court-04 FRESH_NIWA FRESH_ASSEMBLY .local/station-realism/east-court-furnished-03/routes.json FRESH_ASSEMBLY/routes.json .local/station-realism/east-court-seats-06
blender -b --python-exit-code 1 --python web/station/realism/replace-court-assembly.py -- --candidate .local/station-realism/station-east-court-context-03 --old-assembly .local/station-realism/east-court-niwa-03 --assembly FRESH_ASSEMBLY --output FRESH_CONTEXT
node web/station/realism/verify-niwa-entrance-detail.mjs .local/station-realism/niwa-frontage-08 FRESH_NIWA .local/station-realism/east-court-niwa-03 FRESH_ASSEMBLY FRESH_PROOF.json
node web/station/realism/verify-court-assembly-update.mjs .local/station-realism/station-east-court-context-03 FRESH_CONTEXT .local/station-realism/east-court-niwa-03 FRESH_ASSEMBLY FRESH_SCOPE.json
```

Final artifacts are `niwa-frontage-11`, `east-court-niwa-05`, `station-east-court-context-05` and `east-court-context-browser-05`. Browser export keeps the previous 1024px municipal texture profile. Export and optimize as for context03, using the new layout and Blend. Final verification receipts: `niwa-frontage-native-12/report.json`, `niwa-entrance-detail-proof-11.json`, `court-assembly-update-scope-05.json`, `east-court-installed-walk-06/report.json`, `east-court-context-materials-verified-06.json`, `niwa-frontage-repeat-proof-11.json`.

```sh
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-niwa-component.mjs .local/station-realism/station-east-court-context-03/station-layout.json .local/station-realism/niwa-frontage-11 FRESH_PROBES component-only
node web/station/realism/verify-installed-court-materials.mjs .local/station-realism/east-court-niwa-05/assembly.glb .local/station-realism/east-court-context-browser-05/atrium.glb FRESH_MATERIALS.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-installed-court.mjs .local/station-realism/station-east-court-context-05/station-layout.json .local/station-realism/east-court-context-browser-05/atrium.glb .local/station-realism/east-court-niwa-05 .local/station-realism/east-court-04 FRESH_WALKS .local/station-realism/east-court-niwa-05/routes.json
```

Actual game captures use an isolated context05 server, the previous joint-camera manifests, browser05 and `KYOTO_REVIEW_LIVE=1`. Current capture labels are `east-court-context-game-jr-05` and `east-court-context-game-rurubu-05`. Failed intermediate geometry and precision reports are retained; read the primary note before interpreting shared-edge or Float32 allowances. No broad movement tolerance was relaxed.


## Courtyard hotel facade — component06 / visual preview05

See primary research `notes/HOTEL-COURT-FACADE.md` and STATE.md. This is an isolated architectural component with a browser-only contextual preview. Context05 remains the authoritative full station; do not run gameplay with this preview and an unchanged collision layout.

```sh
/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/fit-hotel-court-facade.py FRESH_FIT_DIR
/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/prepare-hotel-court-facade.py FRESH_FIT_DIR/facade-spec.json FRESH_FIT_DIR/construction.json
node web/station/realism/build-hotel-court-facade.mjs FRESH_FIT_DIR/construction.json FRESH_COMPONENT
node web/station/realism/preview-hotel-court-facade.mjs .local/station-realism/east-court-context-browser-05/atrium.glb FRESH_COMPONENT FRESH_FIT_DIR/facade-spec.json FRESH_PREVIEW
node web/station/realism/verify-component-serialization.mjs FRESH_COMPONENT FRESH_SERIALIZATION.json
node web/station/realism/verify-flat-component-normals.mjs FRESH_COMPONENT FRESH_NORMALS.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-hotel-court-component.mjs .local/station-realism/station-east-court-context-05/station-layout.json FRESH_COMPONENT FRESH_NATIVE component-only
node web/station/realism/project-source.mjs FRESH_PREVIEW/preview.glb .local/station-realism/niwa-frontage-joint-01/jr/camera.json FRESH_PREVIEW/jr
node web/station/realism/project-source.mjs FRESH_PREVIEW/preview.glb .local/station-realism/niwa-frontage-joint-01/rurubu/camera.json FRESH_PREVIEW/rurubu
```

Current files: `hotel-court-fit-01`, `hotel-court-facade-06`, `hotel-court-preview-05`. Final native receipt06 passes8,608rays with max0.1251mm position error.05render/normal/texture evidence applies to06 because their GLBs are identical; explicit physical labels differ, hence the fresh final native run. Final repeat proof: `hotel-court-repeat-06.json`. Initial triangulation failures, rejected checkerboard03 and unused-material04 failure remain local. Widths/depths/material pattern and glass reflections are still provisional. Full integration, routes/courses and performance remain unfinished.


## Hotel wall integration — component08 / station03

Current summary is in STATE.md; primary research `notes/HOTEL-COURT-INTEGRATION.md` contains the scope, runtime setup failures, successful resumed checks and actual-game comparisons. Final03 supersedes context05. Use fresh output directories when reproducing.

```sh
blender -b --python-exit-code 1 --python web/station/realism/install-hotel-court-facade.py -- --candidate .local/station-realism/station-east-court-context-05 --component .local/station-realism/hotel-court-facade-08 --spec .local/station-realism/hotel-court-fit-01/facade-spec.json --output FRESH_STATION
/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/verify-hotel-court-install.py .local/station-realism/station-east-court-context-05 FRESH_STATION .local/station-realism/hotel-court-facade-08 .local/station-realism/hotel-court-fit-01/facade-spec.json FRESH_SCOPE.json
node web/station/realism/verify-installed-court-materials.mjs .local/station-realism/hotel-court-facade-08/hotel-court-facade.glb .local/station-realism/hotel-court-browser-03/atrium.glb FRESH_MATERIALS.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-installed-hotel-court.mjs .local/station-realism/station-hotel-court-03/station-layout.json .local/station-realism/hotel-court-browser-03/atrium.glb .local/station-realism/hotel-court-facade-08 FRESH_RAYS
```

Browser03 export uses the final layout and Blend, the same1024px municipal texture profile as context05, and new512px hotel textures. The preserved input is `hotel-court-browser-input-03`. Export/optimize via the existing tools. No exporter or verifier threshold changes were needed for the hotel UV correction. Component08 omits unused UVs on untextured materials and uses a local origin on the ceramic maps.

Prepare a private runtime workspace under `.local`; existing output paths are deliberately rejected:

```sh
node web/station/realism/prepare-runtime-workspace.mjs .local/station-realism/station-hotel-court-03/station-layout.json .local/station-realism/hotel-court-browser-03 .local/station-realism/FRESH_RUNTIME
```

The receipt contains the server path, working directory and absolute KYOTO_LAYOUT/KYOTO_DATA_DIR/KYOTO_WORKER_LOG paths. Start server.ts from that working directory with those variables, an explicit compatible KYOTO_WORKER_EXECUTABLE and **KYOTO_PORT=4499**. The helper only rebinds course layout hashes in the private catalog; it does not validate or publish the courses.

Run the runtime suite from the worktree with KYOTO_TEST_ORIGIN=http://127.0.0.1:4499 and **KYOTO_TEST_DATA_DIR equal to that private workspace's data directory**. Without it, waypoint-completion looks for the wrong SQLite file. Current passing evidence ran installed02; exact native equivalence proves the UV/provenance-only final03 revision keeps its physics. Preserve the main and resumed logs rather than claiming an uninterrupted suite.

Actual-game capture commands:

```sh
KYOTO_TEST_ORIGIN=http://127.0.0.1:4499 KYOTO_REVIEW_LIVE=1 KYOTO_REVIEW_ASSETS=.local/station-realism/hotel-court-browser-03 KYOTO_REVIEW_MANIFEST=.local/station-realism/east-court-context-game-03/jr-manifest.json node web/station/realism/capture.mjs FRESH_JR_LABEL
KYOTO_TEST_ORIGIN=http://127.0.0.1:4499 KYOTO_REVIEW_LIVE=1 KYOTO_REVIEW_ASSETS=.local/station-realism/hotel-court-browser-03 KYOTO_REVIEW_MANIFEST=.local/station-realism/east-court-context-game-03/rurubu-manifest.json node web/station/realism/capture.mjs FRESH_RURUBU_LABEL
```

Serial captures on the final03 server pass without browser errors. They are short diagnostics, not repeated720p gameplay or a soak. The historical parent p95 values are lower; repeat matched trials before accepting the performance gate. The previous Skyway Trapdoor failure and full31-course proof remain open.


## Adjacent courtyard walls — component04 / visual preview02

This component reconstructs seven municipal wall patches adjacent to the installed hotel facade: the perpendicular return, foreground tower, pale vent enclosure, dark service walls and upper return. Full station hotel-court03 stays unchanged. See STATE.md and primary research `notes/COURT-ADJACENT-WALLS.md` for evidence and limits.

Use fresh output paths under `.local`:

```sh
/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/prepare-court-adjacent.py FRESH_SPEC_DIRECTORY
node web/station/realism/build-court-adjacent.mjs FRESH_SPEC_DIRECTORY/spec.json .local/station-realism/hotel-court-facade-08/hotel-court-facade.glb FRESH_COMPONENT_DIRECTORY
node web/station/realism/verify-component-serialization.mjs FRESH_COMPONENT_DIRECTORY FRESH_SERIALIZATION.json
node web/station/realism/verify-flat-component-normals.mjs FRESH_COMPONENT_DIRECTORY FRESH_NORMALS.json
KYOTO_WORKER_EXECUTABLE='/Users/finbarr/code/games/kyoto/Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker' node --experimental-strip-types web/station/realism/audit-hotel-court-component.mjs .local/station-realism/station-hotel-court-03/station-layout.json FRESH_COMPONENT_DIRECTORY FRESH_NATIVE_DIRECTORY component-only
node web/station/realism/preview-court-adjacent.mjs .local/station-realism/hotel-court-browser-03/atrium.glb FRESH_COMPONENT_DIRECTORY FRESH_SPEC_DIRECTORY/spec.json FRESH_PREVIEW_DIRECTORY
node web/station/realism/project-source.mjs FRESH_PREVIEW_DIRECTORY/preview.glb .local/station-realism/niwa-frontage-joint-01/jr/camera.json FRESH_JR_DIRECTORY
node web/station/realism/project-source.mjs FRESH_PREVIEW_DIRECTORY/preview.glb .local/station-realism/niwa-frontage-joint-01/rurubu/camera.json FRESH_RURUBU_DIRECTORY
```

Current outputs: `court-adjacent-spec-05`, `court-adjacent-04`, `court-adjacent-preview-02`. Both before images are rerendered from hotel03 with the same camera and static lighting. The preview clips source planes/bounds and checks each projected area; it is not a native scene replacement.

Final04 changes the tested03 dark-joint browser material assignment only. Verify that bridge with:

```sh
node web/station/realism/verify-court-adjacent.mjs .local/station-realism/court-adjacent-spec-05/spec.json .local/station-realism/hotel-court-facade-08/hotel-court-facade.glb .local/station-realism/court-adjacent-04 .local/station-realism/court-adjacent-03 FRESH_MATERIALS.json
```

This checks texture bytes/semantics, every ceramic UV and all native fields except browserMaterial indices. Component03 passed all8,892 rays; final04 serialization and normal checks pass. Repeated final04 generation matches GLB/native bytes. Full installation and actual-game checks are next, not implied by these results. Reuse the six existing hotel material records and add distinct IDs for the three service materials during installation.


## Courtyard adjacent-wall installation02 / browser03

Current construction checkpoint; full visual, campaign and performance acceptance remain open. See `STATE.md` and primary research `notes/COURT-ADJACENT-INTEGRATION.md`.

```sh
blender --background --python-exit-code 1 --python web/station/realism/install-court-adjacent.py -- \
  --candidate .local/station-realism/station-hotel-court-03 \
  --component .local/station-realism/court-adjacent-04 \
  --spec .local/station-realism/court-adjacent-spec-05/spec.json \
  --output FRESH_NATIVE_DIRECTORY

/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/verify-court-adjacent-install.py \
  .local/station-realism/station-hotel-court-03 FRESH_NATIVE_DIRECTORY \
  .local/station-realism/court-adjacent-04 .local/station-realism/court-adjacent-spec-05/spec.json FRESH_SCOPE.json

# Keep the existing 1024 municipal browser texture profile. The input directory
# stores the exact installed layout and resolved textures from that profile.
blender --background --python-exit-code 1 --python tools/export_browser_art.py -- \
  --source .local/station-realism/station-court-adjacent-02/KyotoAtrium.blend \
  --layout .local/station-realism/court-adjacent-browser-input-02/station-layout.json \
  --output FRESH_BROWSER_DIRECTORY \
  --restore-attributes-prefix 'Registered courtyard | hotel-' \
  --restore-attributes-prefix 'Registered courtyard | court-'

# Shared names require both source components. Composition verifies each input hash.
node web/station/realism/compose-roof-skyway.mjs FRESH_MATERIAL_SOURCE_DIRECTORY \
  .local/station-realism/hotel-court-facade-08 .local/station-realism/court-adjacent-04
node web/station/realism/verify-installed-court-materials.mjs \
  FRESH_MATERIAL_SOURCE_DIRECTORY/assembly.glb FRESH_BROWSER_DIRECTORY/atrium.glb FRESH_MATERIAL_REPORT.json
python3 tools/test_export_attributes.py

# Supply the compatible worker executable through KYOTO_WORKER_EXECUTABLE.
node --experimental-strip-types web/station/realism/audit-installed-court-adjacent.mjs \
  .local/station-realism/station-court-adjacent-02/station-layout.json \
  .local/station-realism/court-adjacent-browser-03/atrium.glb \
  .local/station-realism/court-adjacent-04 .local/station-realism/court-adjacent-spec-05/spec.json FRESH_RAY_DIRECTORY
```

Optimize the raw GLB with `optimizeGLB` before `prepare-runtime-workspace.mjs`. Current outputs are `station-court-adjacent-02`, `court-adjacent-browser-03`, `court-adjacent-installed-walk-01` and `court-adjacent-installed-rays-02`. Installed probes include all four windows/eight vent recesses and every twelfth opaque panel per patch; decorative glass bands are covered only by the prior component audit.

For **both server and runtime-test processes**, use all `environment` and `testingEnvironment` values from the private `candidate-runtime.json`, plus `KYOTO_WORKER_EXECUTABLE`. Set the server port with `KYOTO_PORT` and tests with `KYOTO_TEST_ORIGIN`. The campaign test launches its own worker for the finale; setting the executable/layout only on the HTTP server is insufficient. Use the private workspace as the server working directory. Never run these tests on production.

The exporter prefix option recomputes UVs at Float32 cut points and restores authored corner attributes after Blender's normal quantization. It proves that only selected NORMAL/TEXCOORD_0 bytes change. It does not relax the independent material verifier or alter collision geometry. The option defaults to off. Both new Python helper files are included in the maintained source allowlist.

Paired fixed-camera receipts are in `.local/station-realism/court-adjacent-paired-01/{measurements,summary}.json`: two pairs per registered view, ABBA order, 5 s warmup / 20 s measurement, fresh Chrome each run. Use its saved JR/Rurubu manifests with `capture.mjs`, `KYOTO_REVIEW_LIVE=1` and the appropriate matching private service/assets. All eight browser source receipts and power settings match. These diagnostics preserve the separate full-game and twenty-minute soak requirements. The primary gallery is `notes/court-adjacent-integration/index.html`.


## Folded courtyard facade04 — uninstalled

The new dated references and uncertainty are documented in primary research `notes/COURT-FOLDED-FRONTAGE.md`. Current full-station parent remains adjacent02/browser03. Use fresh output paths beneath `.local/station-realism` for every reconstruction.

```sh
/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/prepare-court-folded-frontage.py FRESH_SPEC_DIR
node web/station/realism/build-court-folded-frontage.mjs FRESH_SPEC_DIR/spec.json FRESH_COMPONENT_DIR
node web/station/realism/verify-component-serialization.mjs FRESH_COMPONENT_DIR FRESH_SERIALIZATION.json
node web/station/realism/verify-court-folded-normals.mjs FRESH_COMPONENT_DIR FRESH_NORMALS.json
# Set KYOTO_WORKER_EXECUTABLE to the compatible local worker.
node --experimental-strip-types web/station/realism/audit-hotel-court-component.mjs   .local/station-realism/station-court-adjacent-02/station-layout.json   FRESH_COMPONENT_DIR FRESH_RAYS_DIR component-only
node web/station/realism/preview-court-folded-frontage.mjs   .local/station-realism/court-adjacent-browser-03/atrium.glb   FRESH_COMPONENT_DIR FRESH_SPEC_DIR/spec.json FRESH_PREVIEW_DIR
```

Reference hashes are pinned when preparing the spec. A circle fit is diagnostic; the build interpolates the nine original curved anchors. Component04 uses shared miters at outer corners and square interior sheet cuts. The curved front/back normals are smooth; caps and straight folds stay flat. `verify-court-folded-normals.mjs` independently checks the saved normals against geometric faces and adjacent segment continuity. The generic flat-only verifier does not apply to curved faces.

Final04 passes4,692 component rays, serialization, normal checks and exact repeat generation. Preview clips36triangles/195.375091m². It is visual-only and must not be used with unchanged native gameplay. Render using `project-source.mjs` and the saved `niwa-frontage-joint-01/{jr,rurubu}/camera.json`; `court-folded-frontage-preview-01/overview-camera.json` is an unregistered inspection camera. Full station installation, route/runtime checks and actual-game reflections are next.

## Folded courtyard facade installation01

Native/Blender output: `station-court-folded-01`; browser output: `court-folded-browser-01`. Parent: `station-court-adjacent-02` and `court-adjacent-browser-03`. The installer pins the parent, specification and component hashes and writes a fresh output directory.

```sh
blender --background --python-exit-code 1 --python web/station/realism/install-court-folded-frontage.py -- \
  --candidate .local/station-realism/station-court-adjacent-02 \
  --component .local/station-realism/court-folded-frontage-04 \
  --spec .local/station-realism/court-folded-frontage-spec-01/spec.json \
  --output FRESH_NATIVE_DIRECTORY

/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/verify-court-folded-install.py \
  .local/station-realism/station-court-adjacent-02 FRESH_NATIVE_DIRECTORY \
  .local/station-realism/court-folded-frontage-04 \
  .local/station-realism/court-folded-frontage-spec-01/spec.json FRESH_SCOPE.json
```

Browser export uses the new layout/Blend and the preceding texture profile. Copy the layout into a fresh browser-input directory and reuse `court-adjacent-browser-input-02/textures` without resizing. Supply the same two `--restore-attributes-prefix` arguments shown for adjacent-wall integration. The saved final input is `court-folded-browser-input-01`.

Compose the hotel, adjacent-wall and folded-facade components for `verify-installed-court-materials.mjs`; shared material names require the combined source. Current source assembly: `court-folded-material-source-01`. All 90,669 checked vertices across eighteen material names pass the unchanged limits.

```sh
# Set KYOTO_WORKER_EXECUTABLE to the compatible local native worker.
node --experimental-strip-types web/station/realism/audit-installed-court-folded.mjs \
  .local/station-realism/station-court-folded-01/station-layout.json \
  .local/station-realism/court-folded-browser-01/atrium.glb \
  .local/station-realism/court-folded-frontage-04 \
  .local/station-realism/court-folded-frontage-spec-01/spec.json FRESH_FRONT_PROOF_DIR

node --experimental-strip-types web/station/realism/audit-installed-court.mjs \
  .local/station-realism/station-court-folded-01/station-layout.json \
  .local/station-realism/court-folded-browser-01/atrium.glb \
  .local/station-realism/east-court-niwa-05 .local/station-realism/east-court-04 \
  FRESH_WALK_PROOF_DIR .local/station-realism/east-court-niwa-05/routes.json
```

Installed proof covers all 243 cladding/glazing/plinth fronts and all 28 declared courtyard walks. Optimize with `optimizeGLB`, then use `prepare-runtime-workspace.mjs` for matching assets and a private catalog/database. Both server and tests need the recorded environment plus the compatible executable; tests also need `testingEnvironment`. All twelve runtime scripts pass on port4500 with the isolated candidate workspace. This does not prove every authored course.

`station-look.js` recognizes only the four new reflective material names for a local courtyard environment. `station-lighting.js` captures a 512px cube once at renderer (110,32,1), then assigns its PMREM texture without changing authored color/roughness. It adds 24 MiB of calculated target storage and no per-frame capture. Other station materials keep their existing environments. Static cubemap parallax and current dark reflections remain visual limitations. The fixture capture tool now records final capture counts and local material maps/parameters, and rejects repeated captures during camera changes.

Initial actual-game lighting comparisons: `court-folded-game-{hall,local}-probe-01`. Controlled paired runs: `court-folded-paired-01`, using the unchanged JR/Rurubu camera manifests, ABBA order, five seconds warmup and twenty seconds measurement. These retain the wider 720p gameplay and twenty-minute audio/context soak requirements. See primary research `notes/COURT-FOLDED-INTEGRATION.md` for final receipts and remaining work.

## Courtyard paving finishes

`prepare-court-paving.mjs` back-projects two visible pale/dark paving boundary picks from the unchanged registered JR camera onto the current garden plane. The line continuation, 1.2 m pale/0.6 m dark tile modules, palette and UV phase remain explicit estimates. The NIWA walkway stays pale. Six pale-floor points in the independently registered Rurubu view require a wider aisle; its hidden edge is provisionally u=40.3. Candidate01 was rejected because it stopped the pale finish at the narrower walkway mesh. `build-court-paving-textures.mjs` creates original periodic albedo/normal/canonical-mask maps; it does not read source photographs.

```sh
node web/station/realism/prepare-court-paving.mjs FRESH_SPEC
node web/station/realism/build-court-paving-textures.mjs FRESH_SPEC/spec.json FRESH_TEXTURES
blender --background --python-exit-code 1 --python web/station/realism/install-court-paving.py -- \
  --candidate .local/station-realism/station-court-folded-01 \
  --spec FRESH_SPEC/spec.json --textures FRESH_TEXTURES --output FRESH_NATIVE
```

The installer changes only two visible floor meshes and adds two authored finishes. All native physics records, including all 34,800 panels, remain exact. The raised-garden top is split along the finish boundary; the existing native slab still describes the same occupied volume. Other faces keep their materials and attributes. This finish-only tessellation does not introduce a physical obstacle or floor overlay.

Export with the existing two attribute-restoration prefixes. Start from `court-folded-browser-input-01/textures` (the same 1024 municipal / 512 hotel profile), add the six paving PNGs, and use the new native layout. After export:

```sh
/Users/finbarr/.cache/uv/archive-v0/BZqv7mAIFzsdHjm2-2KMT/bin/python web/station/realism/verify-court-paving.py \
  .local/station-realism/station-court-folded-01 FRESH_NATIVE \
  .local/station-realism/court-folded-browser-01/atrium.glb FRESH_BROWSER/atrium.glb \
  FRESH_SPEC/spec.json FRESH_SCOPE.json
```

This independent check compares every native record, all unaffected render attributes, old-material faces outside the top patch, visible top-surface coverage, normal direction and metric UVs. Unused UVs are excluded only for materials without textures; Blender resaving can change their storage. Normals use the existing 0.05-degree rule. Coverage tolerates at most 0.001 m² added, removed or overlapping area after Float32 export; UVs at cut points must be within 0.00001.

Current output directories: `court-paving-spec-02`, `court-paving-textures-02`, `station-court-paving-02`, `court-paving-browser-input-02`, `court-paving-browser-02`. Use the normal optimizer and matching private runtime workspace, then courtyard route checks and unchanged registered game cameras. Final visual, full-game and long soak gates remain separate.


## Courtyard life construction and integration

`prepare-court-life.py` fits five sculpted terrace front outlines using the two registered 2025 photographs and records inferred heights/closures. It selects the September dining arrangement, not the June promotional layout. `build-court-life.mjs` creates the original tables, chairs, umbrella shells/ribs, concrete planter, gravel and two leaf canopies. Current component07/spec04 includes a 0.4 m front-table shift to retain an established walking endpoint.

```sh
python-with-numpy-scipy-shapely web/station/realism/prepare-court-life.py FRESH_SPEC
node web/station/realism/build-court-life.mjs FRESH_SPEC/spec.json FRESH_COMPONENT
node web/station/realism/verify-component-serialization.mjs FRESH_COMPONENT FRESH_SERIALIZATION.json
# Set KYOTO_WORKER_EXECUTABLE to the compatible local worker.
node --experimental-strip-types web/station/realism/audit-hotel-court-component.mjs \
  .local/station-realism/station-court-paving-02/station-layout.json \
  FRESH_COMPONENT FRESH_COMPONENT_RAYS component-only
blender --background --python-exit-code 1 --python web/station/realism/install-court-life.py -- \
  --candidate .local/station-realism/station-court-paving-02 \
  --component FRESH_COMPONENT --spec FRESH_SPEC/spec.json --output FRESH_NATIVE
python3 web/station/realism/verify-court-life-install.py \
  .local/station-realism/station-court-paving-02 FRESH_NATIVE FRESH_COMPONENT \
  FRESH_SPEC/spec.json FRESH_SCOPE.json
```

Native04 stores exact component corner normals in `kyoto_authored_normal` (a Blender CORNER/FLOAT_VECTOR attribute). The browser exporter reads it only for an opted-in material prefix, then its existing byte-scoped restoration preserves those values after GLB export. Other meshes use their existing corner normals. This corrects Blender's normal encoding on thin rods/pebbles; it does not change position, triangle or physics data. Leaf front/back rims have separate shading vertices to prevent zero normal fans while preserving the closed shell's shape.

Export with the same resolved browser textures as paving02 and these three prefixes:

```sh
--restore-attributes-prefix 'Registered courtyard | hotel-' \
--restore-attributes-prefix 'Registered courtyard | court-' \
--restore-attributes-prefix 'Registered courtyard | niwa-white-gravel'
```

`verify-court-life-export.py` checks unrelated batch attributes and all 304 original images exactly. The cafe threshold's old/new triangulations are compared by planar union (3.166e-6 m2 difference, existing 0.001 m2 limit). `verify-installed-court-materials.mjs` uses a composed source containing court-life07, east-court-seats06 and niwa-frontage11 because granite/concrete/gravel names are shared. Native04/browser04 pass all 18 source material checks and 459,840 vertices without changing the verifier's tolerances.

Use `prepare-court-life-routes.py` with the existing east-court-niwa05 routes. The seven main paths remain exact; six additional access paths follow the changed terrace/planter/dining arrangement. Routes05 starts each terrace test entirely within a single supported floor and approaches the staggered steps at u41.85. The pale western aisle ends at v31.3 before the existing raised floor ends; a route beyond that floor was rejected. Walk/runtime/Chrome evidence and final status are recorded in STATE.md and primary research `notes/COURTYARD-LIFE.md`.


Final courtyard life evidence is complete in `court-life-walk-proof-05.json`, `court-life-runtime-result-04.json` and `court-life-paired-04/summary.json`. Route proof combines unchanged full-run paths with targeted terrace reruns only when final points, asset hashes and forward/reverse targets match. The auditor's optional `KYOTO_COURT_ROUTE_IDS` selects named routes; omitting it still tests all paths. All 28 final walks and twelve runtime scripts pass. Eight Chrome comparisons remain within the 5% incremental frame gate; GPU cost is measured separately. The full reconstruction goal and its final visual/course/gameplay/soak gates remain open.


## Central hall bay study: failed registration retained

Primary `notes/CENTRAL-HALL-BAY.md` and its interactive gallery record four new references, exact source/current geometry differences and two rejected camera fits. The current station asset remains courtyard life04. `central-hall-registration-01` retains every diagnostic. `views.json` is unchanged.

```sh
node web/station/realism/audit-central-hall-bay.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/station-court-life-04/station-layout.json .local/station-realism/central-hall-registration-01/bay-discrepancy.json
node web/station/realism/audit-photo-visibility.mjs .local/station-realism/central-hall-registration-01/south-gates-fit-01/fit.json .local/station-realism/central-hall-registration-01/visibility-01.json
node web/station/realism/audit-photo-visibility.mjs .local/station-realism/central-hall-registration-01/south-gates-fit-02/fit.json .local/station-realism/central-hall-registration-01/visibility-02.json
```

Visibility is separate from reprojection: first fit passes numerical residual but all14anchors are occluded; second is visible but exceeds the original9.60px tolerance. The audit emits `pass:false` in its report without aborting diagnostic collection; consumers must inspect that field. It treats rendered BLENDfaces conservatively and does not simulate texture alpha/transmission. Fourteen exact source vertices and independent Python/Three projections were verified. Do not call either fit an accepted view or adjust the uncertain lowerpierpoints just to make it pass. Use the second photograph/section before constructing the representative bay.

## Latest research: hall detail and original lighting design

27 September 2026. Research-only progress; courtyard life04/browser04 remains the current full station. No accepted new registration, geometry, lighting, native, service, course or scoring changes. No commit/push/deploy.

- Primary library now contains **231 entries / 215 downloaded source files**, all hashes verified:21 PDFs,130 reference images,6 SVGs,7 video and6 panorama entries. Videos/panoramas remain indexed links, not inspected playback. Three unavailable downloads are labeled, including the new historical photo's HTTP429.
- Added July2026 MaedaAkihiko concourse photo (2665×1777, declaredCC0) and November2019 AnotherBeliever roof/bay photo (4000×3000,CCBYSA4). Both individually inspected. Upper bays have deep returns and recessed glazing that the city mesh flattens; do not treat its textured facade as finished construction. Source-page camera metadata is only an initial estimate; the2026 file records processing.
- Added LPA's original publication and project gallery. PDF publication date **2005-05-30**, project1997; inspected page2credits and complete PDF21–22/printed66–69. The north-facing roof, dark granite floor and selective elevated spotlights establish the original intent. The winter mirror section describes an **abandoned proposal**. Gallery has5historical building photos(individually inspected),1painted study and1physical concept model(contact-sheet inspected). Do not turn the concept images into built features or infer current lamp technology.
- New primary notes/gallery: `notes/CENTRAL-HALL-LIGHTING.md`, `notes/hall-lighting/index.html`; generator `scripts/build-hall-lighting.py`. README, brief, gap analysis and representative-bay plan link the findings. Full source rights/dates/hashes recorded.
- `.local/station-realism/central-hall-second-view-01` and `central-hall-maeda-01` contain initial exact-camera city renders only; no new fit or accepted correspondences. Earlier two portrait fits remain rejected unchanged. Fifteen-view acceptance count unchanged.
- `project-source.mjs` optional `pickObjects` restricts source-vertex suggestions only; geometry and visibility rays remain complete. `central-hall-maeda-01/pick-filter-proof.json` verifies identical camera/render/image hash for default versus filtered picks,230265→11626 suggested-source vertices,all retained candidate objects within filter,zero errors. Syntax passes. No runtime rerun warranted for research-only changes.
- Gallery Chrome153 QA at1440/390px:11images,15local links,no overflow/errors/failedrequests;both full-page screenshots visually inspected. The generator preserves original media and labels PDF previews as derived reference images. Browser and local QA server closed normally.

**Next:** resolve a central-hall camera and bay depth from independent features in the new photographs. Require residual, visibility and visual identity checks; preserve the old failed receipts. Then build one original material/geometry sample with explicit gate, roof and forecourt interfaces. Keep the broader goal active; do not resume courtyard microdetail.


## Latest construction: central hall bay03, uninstalled

27 September 2026. **This turn: progress.** The previous research pass supplied the clearer photographs and lighting source; this turn creates a real gate/upper-bay component and native proof. Full station remains courtyard life04/browser04. No final visual milestone, new broad acceptance view, commit or deployment.

### Camera and specification

- `.local/station-realism/central-hall-maeda-01/correspondences-02.json`: six fitted plus two withheld source vertices in the July2026 Maeda photograph. Fit02 RMS7.09008px, max fit11.68462, max withheld22.09159 against24px at1200width. All8 vertices exact and visible; independent projections agree9.31e-13px. Photo SHA409d5f0b4f8d52b3a9564a500f417139d317bd2258692910d6a92de8b42f202e; municipal SHA0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1.
- Initial new fit01 was capped at2000 original-image focal pixels. `fit-photo.py` now allows explicit `focalBoundsPixels`, reports focal estimate and optimizer active bounds, retaining defaults[150,2000]. Fit02 uses[600,6000], returns2104.746593px with no active bounds. Observation pixels and24px tolerance unchanged. `fit-tool-regression.json` proves earlier default portrait camera/residuals/anchors reproduce exactly.
- Camera(-28.98113996,6.64251742,-9.20240044), target(68.00191421,19.84135119,11.29340376), FOV45.76550986,roll2.04851495.100pick-perturbation samples:FOVp05–p95 44.3359–47.1139deg. Excludes source/lens/crop errors. Nearly coplanar anchors and broader floor/column disagreement remain; **supplementary diagnostic pose only, thirteen broad registrations still open**. Older portrait failures remain unchanged.
- `prepare-central-hall-bay.mjs` creates `.local/station-realism/central-hall-bay-spec-01/spec.json`, SHA4ca750ac05e97e8712690dd04ecd85cd6f287801ffdbc78c71dc187c4688a492. Source gate opening16.999005m/head10.714659m. Upper bayX[6.502737,10.702188],base19.116598,glazing23.11–26.210268,head28.810678. Three withheld side-edge pixels back-project to5.5463–5.6940m return depth on the inherited west plane; use provisional5.6m. That spread is not a confidence interval. No claim of survey accuracy.

### Component and verification

- `build-central-hall-bay.mjs` → `.local/station-realism/central-hall-bay-03`: gate piers/lintel, one upper bay with actual side opening/returns, glazing/mullions, stone panels/joints, soffit cells/lights, grilles and bounded floor sample.8materials,9original512px color/normal/roughness maps; no copied reference pixels.7800triangles/23400vertices,650closedpanels/537colliding. Raw2728412bytes,12MiB calculatedRGBA+mips. Resource counts are not gameplay timings.
- Final GLB SHA5c6f786b95290ceaa515f878cd86c5eb2e0239f96dc81d65b3414f54e33a7024; native SHAb55bb2d2d078e3f583e4226101dc945c9da24b0cdc0df7bd4c021b6fa9301a29. Component02 contains a rejected periodic stone pattern;03 changes texture pixels only, native hashes identical. Component01 rejected a tiny remainder tile before asset output; even cell partitioning fixes it.
- `serialization.json`: every vertex/index/winding matches, max1.034728µm. `normals.json`:7800faces pass,minimumdot0.9999999716. Fit/visibility/spec/construction/native hashes independently checked as one chain.
- `audit-hotel-court-component.mjs` now permits this component and omits the unrelated original concourse only for its component-only probe layout. Native02 checks6444triangles; two failures came from origins within0.2µm of another surface. Probe preparation now advances only an origin whose browser hit is within0.1mm, by0.0317m, max4tries; retains1mm hit tolerance. Exactly two origins changed, recorded in receipt. No geometry changed to fix the test.
- `.local/station-realism/central-hall-bay-native-03/report.json`: all6444native probes pass; max2.845064µm,0sharedboundaryexceptions. Private compatible worker/layout/log only; no service or scoring writes. Earlier failed report retained. This does not prove route/campaign behavior after installation.
- Chrome153 photo/close/walking-eye-height images inspected. Close view7visiblebatches/7656triangles. Sharp corners, bright grazing seams, uniform interior illumination and glass response remain visually unfinished. Hiddenclosures/thicknesses/modulephase and currentfixturelocations remain explicit assumptions.
- Primary research `notes/CENTRAL-HALL-CONSTRUCTION.md`, `notes/central-hall-construction/index.html`; generator `scripts/build-central-hall-construction.py`. Gallery1440/390QA:3HTMLimages+2SVGlayers,13locallinks,controls work,nooverflow/errors/failedrequests;bothscreenshotsinspected. Initial QA harness rejected `.7` range input, corrected to`0.7` without page change. Syntax and diff checks pass. Library remains231entries/215verifieddownloads.

**Next bounded integration work:** resolve additional depth landmarks and inventory every affected current hall/source layer and course path. Coordinate gate-wall replacement with roof bearing, adjacent bays, public passage and forecourt interfaces. Component lacks complete gate jamb returns, adjacent architecture, canopy junction, gate equipment and shop/forecourt coverage; do not blindly translate the old whole facade or declare the representative-area milestone done. Preserve courtyardlife04 and earlier failing SkywayTrapdoor evidence. Full-game/runtime/soak gates remain open. Keep the full goal active.


## Latest integration check: central hall dependencies and native floor mismatch

27 September 2026. **This turn made progress:** a spatial inventory and two private native query runs identify concrete integration work. Component bay03 and the full station life04/browser04 remain unchanged. No new registered view, final visual acceptance, service/scoring change, commit or deployment.

- New `inventory-central-hall-interface.mjs` reads the life04 layout, hall spec01, bay03 and canonical 31-course catalog. Output: `.local/station-realism/central-hall-interface-02/inventory.json`, SHA `026fb9a90c894e873cd96b5b34606cb3528fda4b0a91e415322af3d7c15a7d95`. Revision01 is retained; 02 only classifies `central-roof-*` as roof instead of neighbor. Geometry, route and course results match exactly.
- Four declared review regions contain 2,664 records: 1,609 panels, 968 boxes, 29 beams, one flight and 57 light positions. Groups: 436 old hall, 118 gate equipment, 1,130 roof, one shared concourse and 979 neighbors. Every row records kind, index, stable ID and exact serialized hash. Panels use triangle/box intersection; rotated boxes also check containment. Beams/flights/escalators use conservative envelopes, lights use positions. No escalator envelopes or installed municipal triangle surfaces intersect these regions.
- All 537 colliding component parts are verified as boxes in the local gate frame. Zero existing panel-surface/box contacts with the actual new solids. Thirty-nine roof parts cross the broader component bounds only. This does not test containment inside arbitrary closed panel meshes, swept-player clearance or gameplay.
- Eleven nominal routes cross the regions, including hall in/out, east connections, 3F promenade, 4F wooden walkway and Skyway. Five segment crossings have both endpoints outside. Seven nearby courses: Ticket, Cafe, Pillar Carom, Balcony, Terrace Drop, Skyway Trapdoor and Cross Station. Eleven others share the concourse ID outside the feature region; this does not mean all are affected. No measured ball trajectories were tested.
- New `probe-central-hall-floor.mjs` produced `.local/station-realism/central-hall-floor-probe-01/report.json`. Two fresh compatible workers loaded unchanged life04 and a diagnostic additive overlay (hash `e087795b9a6b178e93019a22251b865f59913d95edcecf4fe4a0d586cd6f77c5`). Five downward rays at Balcony waypoints in each: current support is concourse Y=0; overlay support is hall-bay-floor-slab Y=0.2366. All ten queries returned expected results; maximum delta error 1.82152e-8 m. This confirms the sample covers the authored waypoint plane; **it is not an executed course failure**. No throws, service, database or production writes. Both workers stopped; overlay remains uninstalled.
- Component backing bottom Y=0.0366 explains zero overlap despite changed support. The source 0.2366 floor level is not a surveyed datum. Preserve the continuous shared floor pending explicit replacement and transitions. Do not install the sample above it, silently raise course targets, invent a step or accept coincident browser surfaces.
- Current gate body depth is roughly 21.8–23.3 m behind the source wall, versus the new wall at local depth 0 and provisional return 5.6 m. Register equipment separately. Existing 3F and 4F walks behind the wall are dependencies, not newly registered architecture. Complete the adjacent wall, passage and roof interfaces together.
- Primary evidence: `notes/CENTRAL-HALL-INTERFACE.md`, gallery `notes/central-hall-interface/index.html`, generator `scripts/build-central-hall-interface.py`. Independent readback checks all 2,664 records, 11 routes, 18 course hashes, input hashes and native chain. Chrome153 gallery QA at 1440/390 px: two SVG images, nine links, no overflow/errors/failed requests. Section label spacing was corrected after visual inspection. Source library remains 231 entries/215 verified downloads. Tool syntax and diff checks pass.

**Next bounded construction:** resolve the inherited floor datum and additional independent depth landmarks, then complete gate jamb returns, passage paving, neighboring bays and roof bearing with explicit 3F/4F interfaces. Use the inventory as dependency data, not a deletion set. A fresh installation must preserve courtyard life04 and the shared floor before actual-game appearance, native walks, courses, runtime and performance checks. The earlier Skyway Trapdoor failure and wider goal requirements remain open. Keep the full goal active.


## Latest construction: central hall passage07, uninstalled

27 September 2026. **This turn made progress:** corrected the unsupported floor interpretation, preserved source floor cutouts, constructed gate returns and a continuous passage, and passed actual native walks. Current full station remains courtyard life04/browser04. No new broad registration, final visual milestone, service/scoring/C# change, commit or deployment.

- `audit-central-hall-floor-source.mjs` -> `.local/station-realism/central-hall-floor-source-01/audit.json`, SHA `29c967a3cb2b6e9689e9833264de2bec00c61d88613515a45039743bf60e2ab9`. Reviews horizontal faces of source `Untitled.200` in renderer bounds X[-20,32],Y[-.8,1],Z[-12,45]. Finds 189 main upward-facing floor triangles at Y0.036578–0.036588. No qualifying face at 0.2366; the earlier sample's floor choice was unsupported. Other .1366 faces are ledges, not a continuous floor.
- `prepare-central-hall-passage.py` -> `central-hall-bay-spec-03/spec.json`, SHA `6e8e0ece48f72e7cb244de1d9bc0f18e09bd1b7923487ca15f13328178164bc8`. Shapely union/clip uses actual source floor faces and retains cutouts:187.419 m² approach,26.216 m² excluded from old rectangle; inferred 95.194 m² passage to 5.6 m depth. Initial source coordinates snap to 10 µm grid; tile clipping then runs at full precision to avoid pushing edges outside. Floor uses existing playable Y=0; source 3.66 cm difference is an explicit datum assumption, not a surveyed step or global translation.
- Updated `build-central-hall-bay.mjs` adds 88 stone return panels, 222 clipped paving slabs and 2 mm recessed joints. Final `central-hall-bay-07`:581 closed records,468 colliding, 9,884 triangles, 29,652 vertices, eight materials, nine original 512 px maps, 2,952,640 GLB bytes, 12 MiB calculated texture storage. GLB SHA `f12f487493c4999c85e79af0dc1e153f6d108fd6fff82115e7a372c8f5389296`; native SHA `24144a18702024958534f5bb080219ebbdb47fbabe1884294ff7bea127aaf6b1`.
- Floor parts share one native surface `hall-bay-floor-surface`, in material2. Browser tile geometry remains. Separate IDs caused the first native walk to reject a center-lane start circle crossing a joint; `BrowserCompetition.cs` requires the same SurfaceId on its radial floor checks. No validation or radius change. The failed run `central-hall-passage-walk-01` is retained, with two west-lane walks completed before failure.
- `verify-central-hall-floor.py` passes for 07: backing footprint symmetric difference 1.16e-14 m²; tile area outside 0. Revision05 failed the unchanged 1e-6 m² limit with 5.408e-6 m² outside from a second coordinate snap; `central-hall-bay-05/floor-proof-failure.json` retains it. Spec03/revision06 fixes clipping. Revision07 changes only floor grouping/backing material from 06. Earlier04/05 native receipts are valid for their own assets but not final acceptance.
- Final07 serialization verifies every vertex/index/winding, max 1.035 µm. All 9,884 normals pass. `central-hall-bay-native-07/report.json`: 8,528 triangle probes pass, max 5.161 µm, four independently checked shared-boundary hits. Worker used a private component-only layout and stopped.
- `verify-central-hall-passage.mjs` -> `central-hall-passage-walk-02/report.json`: 12 floor supports, nine inside-gate head checks, six actual capsule walks (three lanes, forward/back) and an expected native miss in a cutout. Lanes X=west+0.75, 0, east−0.75; depth −1.5 to 4.5 m, start radius 0.25 unchanged. This is isolated passage proof, not station/campaign acceptance. Worker stopped. Its cutout failure response explicitly means no fixed hit; layout has no moving geometry.
- `notes/central-hall-passage/course-footprint.json`: Balcony patch-1, patch-2, patch-5 centers are outside the new source-derived floor, respectively 0.256, 0.427, 0.259 m from its boundary; patch-3/4 inside. This is a geometric dependency, not an executed course failure. Missing area includes basement voids and their curb/edge footprints; complete these before course reconciliation. Do not claim corrected height alone preserves the old course.
- Final07 Chrome overview and walking-height render inspected. Sharp edges, distant joint aliasing, simple glass and indirect light remain unfinished. Both cameras are unregistered inspection poses. Primary `notes/CENTRAL-HALL-PASSAGE.md`, gallery `notes/central-hall-passage/index.html`, generator `scripts/build-central-hall-passage.py`. Gallery QA at 1440/390 px checks three images and all local links with no overflow/errors/failed requests. Source library unchanged: 231 entries/215 verified downloads.

**Next bounded work:** register/build the basement guards, curbs and descending circulation around the source cutouts, and resolve additional independent hall depth landmarks. Then finish gate equipment/offices, adjacent bays, roof bearings and 3F/4F interfaces as a connected replacement. Clip/replace the shared browser/native floor together; additive installation would fill the holes and duplicate surfaces. Inventory02 was built for bay03's box-only solids; do not run its component-box assertion against07's merged polygon floor without adapting that exact-contact test. Preserve courtyard life04 and the existing gameplay until the full candidate has course/runtime/walk and actual-game visual/performance proof. Earlier Skyway Trapdoor failure and all wider goal requirements remain open. Keep the full goal active.



## Central hall basement research follow-up

See primary research `notes/CENTRAL-HALL-BASEMENT.md` and `notes/central-hall-basement/index.html` for complete source floor openings, official B1F/B2F maps and route photographs. Three openings are retained; first lower-landing identity and central oval purpose are unresolved. The official route destination B2F does not identify the first modeled landing. This follow-up changes research only; passage07 and the full station remain unchanged. Reproducible geometry audit and numeric receipts live with the research.


## Complete central-hall well openings and guards11

Final candidate: `.local/station-realism/central-hall-bay-11`, specification07. It adds the three complete openings, 370 floor slabs, three source curbs, three glass bodies and three metal caps. All 1,616 original guard triangles are preserved, with the shared interfaces closed.

Source, footprint, serialization and normal checks pass. All 13,620 native ray probes pass (maximum 20.366 µm), as do eighteen capsule walks. A nearly collinear gate-join vertex was coalesced after native10 showed a 1.907 mm hit discrepancy; the outline moves only 0.2873 µm, and unchanged tolerances pass. The failed receipt is retained.

The full station remains courtyard life04/browser04. Moving descents, lower landing/lining, glass decoration, materials and course integration are still required. See primary `notes/CENTRAL-HALL-WELLS.md` and `notes/central-hall-wells/index.html` for hashes, failed receipts and matched Chrome views. No deployment.

## Latest construction: hall basement descents02 / assembly02, uninstalled

28 September 2026. This turn made progress by building four moving lanes and their lower floor/landing plates. The full station remains courtyard life04/browser04; the goal remains active. No final visual milestone, full-game performance claim, game installation, commit or deployment.

- Inputs: `hall-descents-spec-01/spec.json`, measured from municipal tread1541/2070 and housing1601/1471; `hall-descents-spec-01/joins.json` derives fixed infills against hall11 and the source lower deck. Both banks have approximately 30.09° incline, 8.480 m run, 4.913583 m rise, 1.234 m flats and 0.98456 m lane width. Fit residuals are 1.36/1.55 mm within the coarse source, not survey accuracy.
- Source plate heights are aligned to adjacent floor (about 18 mm difference). Speed ±0.5 m/s, phase, direction, easing, chain/pit/casing dimensions remain game settings inherited from the original axis-aligned Skyway template. No browser or native escalator code changed.
- `hall-descents-02`: 125 closed records, 63,576 triangles, 73,986 vertices, four material batches. GLB `91d4eab38640e01cb7c27a5cb2d10db2c1d897ea0caee9b189c10188b046b976`; native `b25a46d4e9df1a45bbf1cf48782633b491c7c70a9b90cfe520ab26541fa6c1b7`.
- `hall-descents-assembly-02`: unchanged hall11 plus descent02, 715 records, 5,996,356-byte GLB `4b78716613e0215b744e253fb61b732aae81508041934f54f5a59e763d4ce2f5`; native `96f08f702acd6e943cd0e2be4b4584e076dbd67a03d0ed343ef781aad1cf8fc8`. All 590 hall11 records compare exactly. No old continuous concourse is added to the isolated layout.
- Lower floor: 157.810488 m² at Y=−4.913583, retaining two holes. Four source-derived plate infills close the fixed landing strips; upper outlines extend at most 6 cm toward the measured hall floor, clipped against it. Assumed floor depth .18 m and infill depth .06 m.
- `joins-proof.json`: lower footprint and infill polygons match; maximum numerical floor overlap 1.03e−9 m² under 1e−6 m² tolerance. Serialization maximum error .536 µm, indices/winding exact. Closed-shell and return-envelope checks pass, 4,904 corner checks per lane.
- `motion-proof.json`: actual browser tread function, 128,000 samples over 80 phases; max height error .241 µm and join error .909 µm under unchanged 10 µm limits.
- `hall-descents-native-03/report.json`: final assembly passes 324 support/headroom points, 24 through walks (four lanes × three offsets × both directions) and four standing rides. No native/browser head-ray mismatch. Worker stopped; separate layout/log. No full course/runtime integration acceptance.
- Retained `hall-descents-native-01` failure: six placement replies rejected a moving tread over a fixed cover. Verifier now classifies only that exact response within the actual half-pitch tread envelope as requiring native walking. No height/headroom/position tolerance changed. Native02 passed candidate01; native03 repeats all walks/rides on final02 after infills.
- Final overview and close images in `hall-descents-assembly-02/{overview,close}` inspected in actual Chrome. Overview camera is unchanged from hall11. Geometry remains visibly unfinished: inherited handrails, shared bank cladding, well walls, lower retail/ceiling, glass decoration, surfaces and lighting. No registered photographic match or final visual pass.
- Primary gallery `notes/hall-descents/index.html`; evidence `notes/HALL-DESCENTS.md`; generator `scripts/build-hall-descents.py`. Gallery QA passes at 1440/390 px: three images, all local links, no overflow or page errors; desktop capture inspected. All three native workers and render/gallery sessions are stopped; primary cleanup receipt records empty log handles. Source library remains 238 resources with all 221 downloaded hashes verified. Browser asset build and diff check pass. No C#/service change.

### Next connected construction

Complete the source-specific bank casing and handrail/glass profiles, well walls and supported lower route. The operator B2F destination and photographed B1F sign still do not establish this first deck's label; source geometry ends above −5 m. Resolve that independently rather than inventing a deeper route. Reconcile Balcony support before installing any hall floor. Keep courtyard life04 and all wider plan gates intact.


## Latest construction: provisional B1 frontages04 / assembly19, uninstalled

28 September 2026. Previous goal turn made progress by resolving B1F/B2F route identity and refreshing the library to 247 entries/230 verified downloads. This turn makes construction progress: six lower portals, shallow shop recesses, floor connections and native doorway walks. The full station remains courtyard life04/browser04. No final visual milestone, installation, commit or deployment.

- Source spec `hall-b1-frontages-spec-05/spec.json`, SHA `58b0b3524af39fae0894e09a42155b2effb5acd705f3075890792fb318936bcb`. Uses enclosure spec08 and descent floor spec12. Removes 16.06013239 m³ of lower wall in six intentional openings; volume partition error 7.39e-13 m³. Source geometry outside openings stays exact; final vertex cleanup moved zero vertices.
- Shop widths8.8/5.9/8.8m per side,2.4m recess depth,1.8m door clear width and50mm header beneath source soffit are explicit provisional assumptions. Floor remainsY=-4.913583;portal head=-1.55. These are not measured tenancies. Blue lining/dark stone/glass/light materials are construction placeholders, not photographic completion.
- Frontage04:111closedrecords,5,424triangles,8materials. GLB `29efb3368997cf0aa238434bac60173c6fafd3dd3684326cc22f9f207d55b95c`;native `4bc20f81a605b2389b1e6c8537271aba84a67f0deb50d9b0652765485223370f`.
- Assembly19:786records,65,866triangles,133,872vertices,20materials,6,212,968bytes. GLB `d5b169d74ba74555abfd8d39ed42ac983957ff610dc2aa3c94c893a08d508a54`;native `70bd805113e89151caf4ae9b578bcc98ed3dfe56d06f76888ec13e98292f9849`. Serialization agrees,1.035µm maximum Float32 error,indices/winding exact.
- Independent interface proof retains all675hall/descent records and4mechanisms exactly. Six new floor areas add112.8m²,old-floor overlapmax1e-15m²; complete seams checked against both boundaries. Analytical box endpoints replace intermediate Float32 box dimensions for exact native seams.
- Final native03 directly checks frontage04:5,160probes,maximum0.0984604mm,zero failures,seven validated shared-boundary ties. Final walks03 directly checksassembly19:24floor/headroom positions,12actualcapsulewalks through6doors,allpass. No full-game/course/performance claim.
- Chrome before/after use identical north-side camera; closefrontage additionally viewed. Current pictures expose bulky existing escalator housings, missing B2returnflight, simple bare interiors and unresolved optical response. Browser asset build anddiffcheckpass;noC#/servicechange.
- Retained failures:cut at-1.5produced6–8collapsedmicrofaces; cleanedcomponent02 had10nativeerrors(max25.04mm). Near-soffit alignment spec04 failedclosedmesh,producedno candidate. Final50mmheaderavoidsnear-coplanarcutswithno tolerance change. Walk01 incorrectly requiredceilingoveropenwell; finalverifiercomparesnativeupwardraysagainstserializedbrowsergeometry andrequiresmatchingclearanceorabsence. Source/code/errorsremainintheirrevisiondirectories.
- Primary `notes/B1-FRONTAGES.md`, gallery `notes/b1-frontages/index.html`, publisher `scripts/build-b1-frontages.py`. New tools `prepare-hall-b1-frontages.py`, `build-hall-b1-frontages.mjs`, `verify-hall-b1-interfaces.py`, `verify-hall-b1-walks.mjs`. Component native auditor accepts this asset and uses fully isolated layout.

### Next connected construction

Register B1 corridor landmarks before accepting opening widths or shop materials. Inspect source bank bodies and return housings against Porta photo05; current walking-height renders reveal excessive apparent bulk and the missing second flight. Reconstruct supported B2 geometry and real B1 passages, then reconcile hall/course connections before installation. Do not substitute generic completed-looking shops for dated photographic evidence. All broader station/plaza/street/vegetation/light and full-game performance/soak requirements remain active.


## Latest construction: underside cladding01 / assembly20, uninstalled

28 September 2026. Previous goal turn made progress on provisional B1 shop portals and native doorway checks. This turn audits the apparent bank bulk and adds source-supported underside finish. The full goal remains active; full station remains courtyard life04/browser04. No installation, commit, deployment or accepted final visual milestone.

- Ray identification locates the bulky visible faces in the existing source bank bodies. Eight central vertical sections measure1.45006–1.45025m thickness; working return extension uses roughly1.2m. This is source/mechanism geometry, not photographic survey. No thickness correction is established, so casing is retained. Audit `hall-descents-assembly-20/casing-audit.json`.
- Porta photo05 supports panel joints and perforated underside. Spec `hall-bank-cladding-spec-01/spec.json`, SHA `1916a4e4a4759e2bbded9ce52122be73c763d927dafe070230653b055bb1718b`, attaches to body sourcefaces22/23 in eachbank. Two columns/sixrows perbank yield24nominalpanels,36closedpieces,440triangles. Source slightly noncoplanar faces preserved. Outerfaceoffset3mm,thickness2mm,gaps6mm,pitch18mm,hole diameter5mm are provisional finish dimensions.
- Component01 GLB163316bytes,SHA`78644f02f51849fc235b78f8d29360a70d5f28bcf3237b66155987f0632dd18c`;native`bc262fe4c03b311395424cec11283bc9622efdef72c90baa67b3749dcf886f79`. Three original512pxmaps,color/normal/metalroughness; no source pixels; opaque shaded recesses rather than alphaholes. Estimated4MiBRGBAmipstorage,onebatch.
- Assembly20:822records,66,306triangles,135,192vertices,21materials,6,376,028bytes. GLB`7e307489a18e2ba6d559094d9155992c913773b347261d75163f584f81e3c4fd`;native`64c22829b3e7dffd8706b0c5bc951ebdf96db2d988792cd7c702515fe1cc105a`. Size +163060bytes fromassembly19. Serialization complete,indices/windingexact,maxFloat32err1.035µm.
- `attachment-proof.json` independently proves all786parentrecords exact,including639collidingrecords and4mechanisms. Every36newpiece hascollisionfalse andremains insideits sourceprojection,offset1–3mm. NativeStationWorld.cs162honorscollisionfalse. Priorassembly19native/walkproofs remain relevant to unchanged physicalinputs; no fresh native/full-game runclaimed.
- Both finalChromeinspectionviews examined,plusmatchedbeforeview. Mainundersidepanelingreadsbetter;materials/lighting/photoalignment andmoving-cameraaliasing remainopen. Browserbuild/diffcheckpass. NoC#/servicechange;no worker startedthisturn;allrenderprocesses terminal.
- Primary `notes/BANK-CLADDING.md` andgallery `notes/bank-cladding/index.html`; library247resources/230verifieddownloads unchanged. Tools `prepare-hall-bank-cladding.py`, `build-hall-bank-cladding.mjs`, `verify-hall-bank-cladding.py`.

### Next connected construction

Resolve lower circulation and adjoining hall connections. Seek independent B2 elevation/flight evidence and register B1 corridor landmarks before accepting current shop widths. Avoid further small escalator-detail passes until these architectural dependencies move. Full-station integration/course reconciliation, all15visualviews, materials/lighting/planting/plazas/streetfronts, repeatedactualgameperformance and20minaudiocontextsoak remain open.



## Latest construction: continuous B1 aisles / assembly21, uninstalled

28 September 2026. Previous turn made research progress by ruling out a usable B2 elevation from the new section leads. This turn changes local B1 circulation: two continuous outer aisles replace six isolated shallow recesses. Full station remains courtyard life04/browser04. The overall goal remains active.

- Operator B1 map and route photo03 support an outer public aisle. Its 3 m width, 2.4 m shop depth and six bay widths remain provisional. Ends need Isetan/service/stair connections; B2, tenancy boundaries, finishes and lighting remain unfinished.
- A full-source horizontal-face audit in Y[-5.05,-4.8], X[-45,45], Z[-35,30] finds only the existing lower-well floor and installation surfaces. It does not rule out adjoining surfaces at other heights or slopes. Receipt `hall-b1-source-extent-01`.
- Four-corner bank camera hypothesis rejected: maximum residual29.71px at672px image width, roll-21.38deg, eye-height bound active, partly occluded coplanar corners. No source geometry changed from this fit. Receipt `hall-b1-registration-03`.
- Spec `hall-b1-corridors-spec-01/spec.json`, SHA `8f040dc14ab59b6ed2e45dc0308cca013b69a68b7a25b8c5490ced712fde6f5a`. New component123records/5568triangles/9materials. Component GLB `a382b23948cc9d1f1320f03ccdd7d1a7efb545dacf842b3672c4837d851078d2`, native `467908228c2b02e66dd0c2752ae9ae7e5558650c069d5d3073ebd946cf07d994`.
- Assembly21:834records,66,450triangles,135,624vertices,22materials,6,388,960bytes. GLB `647aa0b4b53ec24c28fbf6790995611ab025325dba1e001a3c1f356788412e59`;native `c1e2cefc1a734c0ca076da4447edfe253a2275714cb108a75ca6384a0997b6e3`. Delta +144triangles,+1material,+12,932bytes. No measured frame-time claim.
- Serialization indices/winding exact, max1.035micrometre Float32 error. Independent interface proof retains711non-frontage records and4mechanisms (material index shift for cladding only). Eight floors cover281.99322m² beyond core,169.19322m² more than previous candidate. Maxpair overlap4.10e-15m²; entire core/aisle and six shop seams checked at unchanged tolerances.
- Native component01:5304probes,0failures,max0.0984604mm,25verified boundaryties. Walks01:50support/headroom points and16actual capsulewalks through6portals andbothaisles pass. Worker handle terminal and stopped. No full-game/course/soak pass claimed.
- Same-camera Chrome before/after inspected. Browser asset build/diffcheckpass. Materials and lighting remain plain construction placeholders. Rejected west approach was blocked by end wall; no accepted photographic camera this turn.
- Research note `notes/B1-CORRIDORS.md`, gallery `notes/b1-corridors/index.html`, publisher `scripts/build-b1-corridors.py`. Library249references/231verifiedsavedfiles.

### Next architectural work

Resolve B1 end connections and source/photo registration before accepting aisle/shop dimensions. Lower B2 connection still needs defensible rise and opening geometry. Avoid adding decorative polish to these provisional shops. The wider station/plazas/streetfronts,15visualviews, full-game performance and20minute soak remain required. No installation, commit or deployment.



## Latest construction: western B1 return / assembly23, uninstalled

28 September 2026. Previous turn made progress on two continuous outer aisles. This turn connects both aisles and the well floor around the western end. Full station remains courtyard life04/browser04; the complete goal remains active.

- Operator B1 plans and route photo05 support an open western approach adjoining Isetan. New return depth3m and opening Z span[-7.15,-2.05] remain provisional. Western frontage, service links, eastern approach, B2 and accepted photo registration are unfinished.
- Lower western source pier is partitioned into two retained jambs plus1.7091097999084477m³ intentional removal; volume error3.0065e-13m³ at unchanged1e-7 tolerance. Upper source enclosure remains exact.
- New floor37.0703620847m² joins core and both aisle ends along6.149638/3/3m seams; no footprint overlap. Initial convex-hull verifier was inappropriate for shallow concavity; replaced with actual top-triangle union without changing geometry or tolerances.
- Chrome revealed a coplanar ceiling seam in assembly22. Final spec02 subtracts upper source projection, removing0.63281772785m² from ceiling only. Independent emitted-triangle proof finds zero remaining overlap and zero difference from the intended subtraction. Final Chrome return view confirms seam removed. Assembly22/native01/walk01 remain intermediate evidence.
- Final spec `hall-b1-west-return-spec-02/spec.json`, SHA `779734ea90e73967fa8369ca3e3704f04dfe40e1bc732a78c8b3401cecad8133`. Component `hall-b1-corridors-03`:131records,5850triangles. GLB `7f08c85a3e4e1f1802244732ff6fa18e8f0acae2fb51c5dba650f88753e3d230`; native `fdfe7944a46fdee722a8f3da76e705179bb97e14020f54a63f7aff02cba6a85a`.
- Assembly23:842records,66,732triangles,136,470vertices,22materials,6,412,656bytes. GLB `301736df7384dad06e82ff63e3be3be985731d3aa41a56e7fc299c3b370e97c4`; native `bf82feafc84e35d7afb8daa447a0e1e8b1e4de762b5fc78044821535627c6754`. Delta fromassembly21:282triangles,8records,23,696bytes,noaddedmaterial.
- All833unaffected parentrecords and4movinglanes exact. Serialization agrees,max1.035µm. Native02:5526probes,zero failures,max0.0984604mm,24verified boundaryties. Walks02:35support/headroom samples and10actual walks pass across3floor joins and2well-entry paths. Finalworker handleterminal/stopped. No C#/service change.
- Final west/return Chrome images inspected; before image is the existing identical-camera assembly21 capture. Browserbuild/diffcheckpass. Inspectionlighting andprovisionalplainmaterials; no final photo/performance acceptance.
- Research `notes/B1-WEST-RETURN.md`, gallery `notes/b1-west-return/index.html`, original route diagram `plan.svg`, publisher `scripts/build-b1-west-return.py`. Sources remain249entries/231verifieddownloads.

### Next architectural work

Use the official route video/panoramas and stronger source anchors to resolve B1 bank/aisle dimensions and the B2 turnback before further generic extensions. The accepted source geometry does not establish hidden floor heights. Isetan/service/eastern connections, full-station hall integration/course reconciliation, all15visualcomparisons, materials/light/planting/plazas/streetfronts, pairedgameplayperformance and20minuteaudio/contextsoak remain required. No install, commit or deployment.


## Shared concourse cut and course dependencies — 28 September 2026

`hall-concourse-assembly-02` joins assembly23 to a cut of the original concourse, preserving its exterior and western opening. The complete109.82m interface has zero floor overlap;28support/headroom samples and8actual walks pass. Course-center validation finds10conflicts across4courses plus10surface-identity changes. These are retained failures, not completed course validation. Full station remains courtyardlife04/browser04. See STATE.md and primary research `notes/HALL-CONCOURSE-JOIN.md` for identities, proof limits and the next integration work.


## Hall floor physics correction and paired course evidence — 28 September 2026

Current private candidate is native/browser05; see the top of STATE.md and primary research `notes/HALL-PHYSICS-INTEGRATION.md`. Independent per-triangle clipping passes. The hall floor now uses the original concourse granite response rather than an unrecognized `floor` key silently falling back to stone. All ten fresh B1 return walks pass. The original Pillar Carom shot clears before integration and hits the source-backed oval-well glass afterward, even after surface rebinding and material correction; no course repair is accepted. Geometry, references and the broader visual/performance requirements remain intact. No publication.
