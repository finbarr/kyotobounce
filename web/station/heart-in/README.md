# K025 source and provenance

The 2F West Exit Heart-in is an inferred model registration, not the separate
Central Gate shop. Threshold (-54, 7.35, -18), west-facing doorway, 1.8 m opening,
guarded approach and 0.9 m receiving disk remain fixed.

Reference-only photographs (retrieved 2026-09-08):
- https://tblg.k-img.com/restaurant/images/Rvw/315672/640x640_rect_68479f8f2baae313a3c38213a8c8b312.jpg
- https://tblg.k-img.com/restaurant/images/Rvw/269911/640x640_rect_296a09a8450be46537281eed6daf9a04.jpg
- https://www.dailyservice.co.jp/shop/detail/4828
- https://www.jr-odekake.net/station/img/premises/0610116.pdf

Exterior photographs show dark metal sliding frames, orange/green/red luminous
transom stripes, a white-backed 7 mark with ELEVEN and Heart-in underneath,
waist-height white window strips, bright linear ceiling lights, and densely
stocked displays visible through glazing. Original geometry and typography
interpret those features; no photographic pixels or downloaded models are used.
The wider horizontal dual-name sign is a gameplay readability adaptation.
Shelving, checkout placement, dimensions and product arrangements are authored
approximations, not surveyed interior claims. Products use original colored
packaging blocks and category signs. Material color values are linear data;
roughness/metalness remain physical values, with no baked shadow textures.

Reproduction (Blender 5.2.1 LTS; fresh output directories):

```sh
blender -b --threads 2 --python-exit-code 1 --python web/levels/build-konbini.py -- --output .local/station-detail/layer
node web/levels/audit-konbini.mjs .local/station-detail/layer
node web/tests/heart-in-clearance.mjs .local/station-detail/layer
blender -b --threads 2 --python-exit-code 1 --python web/station/heart-in/assemble.py -- --layer .local/station-detail/layer --output .local/station-detail/candidate
ln -s ../../../runtime/textures .local/station-detail/candidate/textures
blender -b --threads 2 --python-exit-code 1 --python web/station/heart-in/export-browser.py -- --source .local/station-detail/candidate/KyotoAtrium.blend --layout .local/station-detail/candidate/station-layout.json --output .local/station-detail/candidate/browser
```

Run Blender commands sequentially. `assemble.py` replaces only shop objects in a
scratch release copy and retains every other collision record. The browser
export wrapper adds emission handling for the fixture/sign material definitions
without changing the coordinator-owned exporter. Two ceiling light records use
the existing bounded practical-light pool; no extra runtime light allocation.

Native checks (immutable worker must match the task's Assembly-CSharp SHA):

```sh
KYOTO_WORKER_EXECUTABLE=/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64 node tools/probe_structural_native.mjs .local/station-detail/candidate/station-layout.json web/station/heart-in/native-cases.json .local/station-detail/evidence/native-final.json
node web/tests/heart-in-native-check.mjs .local/station-detail/evidence/native-final.json
```

The standalone layer is the integration handoff. The assembled scratch blend is
for full-scene verification, with its sibling collision proposal as the selected
native authority; it does not replace the canonical embedded collision seed.

For the matched local preview, rebuild hardware sequentially after the main export:

```sh
blender -b --threads 2 --python-exit-code 1 --python tools/build_atrium_detail.py -- --layout .local/station-detail/candidate/station-layout.json --output .local/station-detail/candidate/browser --source-output .local/station-detail/candidate/hardware-source
node web/tests/heart-in-assembly-check.mjs
node web/station/heart-in/serve.mjs .local/station-detail/candidate
node web/tests/heart-in-seed.mjs
node web/tests/heart-in-browser.mjs final
node web/tests/heart-in-scoring.mjs
node web/tests/heart-in-browser.mjs gameplay
```

`serve.mjs` creates an ignored static-root adapter from the unchanged service
source and symlinks browser assets into the candidate directory. It binds only
4281 with the task DB/log and selected collision proposal. It leaves the original
asset directory and public proxy intact. Browser evidence uses the real full game
with a camera inspection override. A Node WebSocket bridge forwards native state
unchanged and responds to heartbeat pings during long SwiftShader stalls; the
430ms gameplay release is scheduled in this bridge for accurate input timing.
This software-rendered capture is not a hardware frame-rate acceptance claim.

The scoring regression suite needs a local First Bank revision on the new layout:
stop only this task's service, run `node web/tests/heart-in-runtime-seed.mjs`, then
restart it and run `KYOTO_TEST_ORIGIN=http://127.0.0.1:4281 KYOTO_TEST_OUTPUT=.local/station-detail/evidence/runtime.json npm run test:runtime`.
The seed appends a revision in `.local/4281/data/kyoto.sqlite` only; historical
rows remain immutable. This is a private test fixture, not a published course.
