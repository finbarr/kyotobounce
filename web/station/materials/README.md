# K026 original station finishes

Scope: runtime materials and static daylight only. All geometry, UVs, collision,
score rules, sign art, tactile relief and stair/nosing textures remain authored assets.
The actually loaded GLTF (including archived material names) is dressed at startup.

## Reference provenance

Reference-only operator photographs inspected on 2026-09-08:
- https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_skyway_01.jpg — pale painted trusses, smooth satin handrails, cool transparent glazing.
- https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_muromachisquare_01.jpg — mineral paving, dark stair cheeks, coated blue-green facade reflections and shaded metal cladding.
- https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_oozorahiroba_01.jpg — pale paving/dark insets, open daylight and readable perimeter guards.
- https://www.kyoto-station-building.co.jp/service/square/ — area relationships.

No photograph pixels are included in runtime textures. Finish scales, roughness,
probe locations and sky are authored approximations, not measured station data.

Technical references:
- https://threejs.org/manual/en/color-management.html — sRGB color; linear data maps.
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html — dielectric IOR/Fresnel, satin roughness and the cost of transmission.
- https://threejs.org/docs/pages/PMREMGenerator.html — roughness-filtered static radiance.

The source generator is `web/public/station-materials.js`: deterministic original
periodic mineral grains and directional steel microstructure, created synchronously
as mipmapped textures. This avoids asynchronous readiness races, image downloads,
binary asset changes and release-pack edits. `station-lighting.js` owns fixed
station-derived reflection captures. `station-look.js` retains shadow and practical
light logic and integrates the finish helpers.

## Integration

No `game.js` change is needed: the existing synchronous `dressStation()` and
`captureEnvironment()` hooks run after all GLTF textures resolve. Generated data
textures exist before capture; PMREM capture forces their upload. The helper finds
the already attached hardware GLTF by its exported materials and leaves gameplay
objects alone. Only architecture is captured; moving actors, practical lights and
targets are excluded. The existing practical lights still update normally.

`coordinator-build.patch` is a proposed two-module addition to the coordinator-owned
browser-build allowlist. Apply during integration. The direct local server already
serves both modules. No binary asset pack changes, asset release or geometry patch
is required. Package/release files and `game.js` are unchanged in this branch.

Reflection selection is spatial in the fragment shader because some exported
batches span the hall and rooftop. Smooth fixed world-space transitions avoid
camera-driven material changes or lighting pops. Most fragments read one PMREM;
transition regions read two. Capture is idempotent, runs exactly once per zone,
and disposes cube scratch targets and the PMREM generator. No transmission pass,
new geometry, new shadow-casting light or per-frame texture upload is introduced.

The clear and coated glass families use a thin-sheet approximation with dielectric
Fresnel coverage and separately preserved specular energy. They do not refract or
simulate thickness. Facade glass is deliberately more reflective than clear guards.
Large non-planar transparent batches retain normal object-level depth sorting;
this job does not split geometry. This is an approximation to PBR glass, not a
claim of path-traced optics.

## Reproduction

Use task port 4282 with the pinned compatible native worker; no production tests.
The preparation inputs under `.local/station-detail/` are the provided K026 task
and native inspection views. Save `git show 4ee2976:web/public/station-look.js` to
`.local/station-detail/baseline-station-look.js` before baseline capture.

- `node web/tests/station-pbr-contract.mjs` — loaded/archived family coverage, texture data, immutable assets, shadow/pool preservation.
- `node web/tests/station-pbr-shaders.mjs` — real WebGL material compilation/rendering and idempotent capture/resources.
- `node web/tests/station-pbr-browser.mjs baseline` then `PLAYWRIGHT_BROWSERS_PATH=.local/station-detail/playwright node web/tests/station-pbr-browser.mjs candidate` — six native full-game starts, matched still/moving views and a return transition at fixed 1280×800. The test-only response hook disables adaptive resolution, supplies aim and native course selection, and skips the menu intro animation. It does not teleport the camera or change assets/physics. Sparse Linux frame samples are diagnostic, not hardware acceptance.
- `node web/tests/station-pbr-archive.mjs seed` then without `seed` — a separate old-layout native worker records a real scored replay; the current task service reads its exact stored bytes with archived assets and no live WebSocket.
- `npm run build:web` — existing browser asset manifest.

Final Mac/Metal gate remains coordinator-owned: 600 warmed frames at a fixed
resolution, median ≤18 ms and p99 ≤25 ms. Never infer that gate from Linux software
rendering or adaptive resolution.

Texture budget detail: the retained granite pair is originally 4096² each. Only
that pair is resampled to 1024² for upload (same texture objects, UVs, color-space
annotations and base/nosing information); the new meter-scaled 512² mineral
albedo/surface atlases carry near-field grain. Stair, sign and tactile maps are
untouched. This avoids roughly 160 MiB of extra legacy granite GPU storage. The
rendering resolution is not reduced. Three RGBA8 micro-detail textures occupy
3 MiB including mipmaps. Probe accounting is reported from actual PMREM target
width/height and RGBA16F storage, separately from transient cube scratch memory.

The optional candidate video needs the task-local encoder installed with
`PLAYWRIGHT_BROWSERS_PATH=.local/station-detail/playwright npx playwright install ffmpeg`.
The inspection transport relays unchanged messages through Node so protocol pings
remain responsive while software rendering stalls Chrome. The original six-view
baseline used direct browser WebSockets and lost its connection on the return
check; its error evidence is retained. This transport difference and candidate
video recording mean sparse Linux timing samples are diagnostic, not a controlled
hardware performance comparison. Real native starts, layouts and score handling
remain the same.

A later software-renderer disconnect also interrupted the first candidate run.
The final capture harness coalesces redundant input intents to approximately
30 Hz; it forwards all other protocol messages unchanged and records upstream
close reasons. This is test transport only, with no service-limit changes. The
candidate can resume using `K026_RESUME=1` without changing its material sources.
Existing moving-tread buffers upload lazily because they are deliberately absent
from the static probes. Geometry allocation counts may therefore rise as new
views expose treads; checks bound them by the unchanged baseline scene, while
texture count and the three probe captures remain fixed.

## Completed integration handoff

Six matched baseline/candidate views, three candidate near views, six moving
clips and the hall return are preserved locally. Camera mismatch is at most
17 mm; candidate textures stay at 43 and captures at three. Candidate geometry
allocations are 833–854 across resumed sessions, bounded by the unchanged scene.
The software-renderer baseline and candidate both encountered transport stalls.
The final return assertions completed; the process was manually stopped after a
test-relay cleanup hang. The subsequent cleanup fix is syntax checked but has not
been recaptured. No normal-WebSocket hardware acceptance is claimed.

The old-layout native replay and subsequent local stored-byte/score checks pass.
An archive browser attempt loaded matching assets with zero WebSockets and
scrubbed, but timed out on an optional screenshot before writing a final receipt.
The follow-up was stopped for integration priority. Full archive browser acceptance
is therefore pending with the coordinator, alongside Mac visual/timing acceptance.
No further software captures are required by this handoff.

To reconstruct the local inspection input before the commands above:
`mkdir -p .local/station-detail && cp web/station/materials/inspection-views.json .local/station-detail/inspection-views.json`.
Start the isolated service with
`KYOTO_WORKER_EXECUTABLE=/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64 npm run dev -- 4282`.
After captures, run `node web/station/materials/report.mjs` to regenerate the
comparison page and cost receipt. `compact-video.mjs` stream-copies bounded
motion excerpts, verifies them, then removes superseded raw video. Existing
completed evidence should be preserved rather than overwritten during integration.
