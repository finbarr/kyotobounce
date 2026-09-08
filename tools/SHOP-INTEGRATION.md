# West Exit shop structural integration (K019)

The supplied camera-lane shop has a west-facing entrance at native
(-54,7.35,-18), interior eastward, a6m frontage,4.5m depth and1.8x2.25m open
doorway. Registration is an inferred model fit, not a survey. Its original
identity/map reference register remains in the supplied `colliders.json`.
The standalone builder and course tuning remain camera-owned.

The actual `west-2f-landing` polygon ends at Z-13.5 in this x range. Its broad
bounding box includes the proposed doorway, but the polygon does not. Native
baseline walking from(-55.3,7.35,-12) toward the shop drops to groundY.025;
a matching ball throw reachesY.030 and contacts the concourse. No existing
wall blocks this entrance: the problem is its missing public floor connection.

Import the actual supplied `.blend` after checking its SHA and every mesh's
embedded collider record and world bounds against the accompanying proposals.
Export native triangles from those same visible meshes. Preserve all original
station records, the supplied shop registration and its doorway. Add a bounded
gallery X[-56.6,-54], Z[-21.16,-13.49], topY7.35, thickness.5m matching the
existing landing. Its north end overlaps the true landing edge by1cm. Glass
guards close the west/south edges and the short east edge north of the shop.
At least2.4m of circulation remains clear, leading to the1.8m doorway. No
unrelated floor or façade is cut; the shop is not moved to catch a throw.

## Reproduction and validation

```sh
blender -b GARDEN/KyotoAtrium.blend --python-exit-code 1 --python tools/repair_atrium_structure.py -- --issue shop --layout GARDEN/station-layout.json --shop-handoff HANDOFF --output FINAL
node tools/verify_structural_candidate.mjs GARDEN/station-layout.json FINAL
blender -b --python-exit-code 1 --python tools/verify_shop_candidate.py -- FINAL
KYOTO_WORKER_EXECUTABLE=WORKER node tools/probe_structural_native.mjs FINAL/station-layout.json tools/shop-native-cases.json NATIVE.json
node tools/check_shop_evidence.mjs BEFORE.json NATIVE.json ACCEPTANCE.json
```

Baseline scenarios use the same start(-55.3,7.35,-12), yaw180, four seconds of
walking, and a six-second robot-v4 throw with pitch-65/power.008. The checked
worker is the existing verified dedicated waypoint-timing binary; no native
source change or rebuild is involved. The final probe walks four continuous
checkpoints from the existing landing to gallery, into the shop and back.
Eight throws cover entry, floor, three opaque walls, glazing and gallery guards.
Any Result is checked for actual sleep and zero translation/spin; observation
windows that remain in Flight are not claimed as completed shots.

Static verification covers18,128 floor/headroom samples and27 doorway sphere
samples, plus conservative existing-beam and other nearby structure bounds.
The only nearby original geometry is the preserved landing. Source proposal
bounds and19 new visual/native mesh bounds agree. The Node bounds audit bypasses
image decoding only; real-browser inspection checks the textured full export.

## Coherent browser and hardware export

Coordinator-owned exporters are copied exactly from5a88c1b. The old AST wrapper
is retired. A texture directory must be available alongside the chosen layout:

```sh
ln -s /absolute/path/runtime/textures FINAL/textures
blender -b --python-exit-code 1 --python tools/export_browser_art.py -- --source FINAL/KyotoAtrium.blend --layout FINAL/station-layout.json --output BROWSER
blender -b --python-exit-code 1 --python tools/build_atrium_detail.py -- --layout FINAL/station-layout.json --output BROWSER --source-output HARDWARE_SOURCE
```

Run Blender processes sequentially. `atrium-export.json`, `station.json` and
`atrium-detail.json` identify the exact selected layout; the exporter report
also records the source SHA. The main GLB includes the earlier gap, escalator,
tactile and garden geometry and the shop. Hardware exports use the same final
comb supports. No new product overlay loader is required.

Fleet paths: `artifacts/k019/final/`, `artifacts/k019/browser-final/` and
`artifacts/k019/hardware-source/`. The compact completion receipt records exact
hashes and final checks. Raw native/browser evidence stays under artifacts;
STATUS/RESULT remain local. Canonical assets, historical challenge/replay bytes,
public4173 and the authoritative escalator clock contract remain unchanged.
Root owns publication and new final course proofs. The earlier K010/Catch the
Lift disk conflict still requires new course placement; do not rewrite old
challenges against this collision hash.
