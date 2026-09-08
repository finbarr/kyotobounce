# K028 plaza landmarks candidate

This additive station layer contains three separately named landmarks: 朱甲舞 on
west 4F Muromachi Square, Space on east 4F Karasuma Square, and the permanent
KYOTO letters at its north viewing end. The station operator establishes those
areas; `specification.json` records reference links and the **inferred**, unsurveyed
placement decisions. East support comes from `east-4f-terrace` at Y20.5, not the
west Y19.5859649 datum. No native code, canonical layout, shared Blender source,
shared exporter, historical bundle, or release manifest is edited.

`build.py` authors curved armor plates with seams, tubular fork and open loop;
an uneven pale stone frame with colored circular inserts; and five solid beveled
letters with original mathematical seasonal pigment artwork. No research-photo
pixels or third-party models are used. Its three collection/GLB layer names are
`k028-shukobu`, `k028-space`, and `k028-kyoto`. All substantial visible meshes
supply the actual native triangle collision, including bevels and openings.

## Reproduce

From the worktree root, with assets-v2 and Blender 5.2.1 LTS installed:

```sh
blender -b -t 2 --python web/station/plaza-landmarks/build.py -- --assemble
python3 web/tests/plaza-landmarks-geometry.py
python3 web/station/plaza-landmarks/assemble.py
node web/station/plaza-landmarks/prepare-preview.mjs
node web/tests/plaza-landmarks-native.mjs
npm run build:web
```

Generated files stay under `artifacts/station-detail/plaza-landmarks/candidate/`.
`PlazaLandmarks.blend` is the final editable layer; `AssembledCandidate.blend` is
an isolated full source copy. `collision-proposal.json` contains only additions;
`station-layout.json` is the complete test layout. `anchors.json` includes the
occupied volumes and 187 actual source-triangle support samples per landmark.

`assemble.py` preserves the release GLB binary prefix and appends the generated
layer with remapped indices. It deliberately rejects animation, compression and
other unsupported GLB extensions. Retained hardware bytes are unchanged: every
original collision entry and transform remains identical. Its derived metadata
states that relationship explicitly. This avoids re-exporting unrelated station
geometry and inherits neither a new font substitution nor a new baseline mesh.
The scratch Blender still reports the release source's missing macOS Hiragino
font when opened on Linux; the new letters use Blender's built-in font.

The preview preparer creates `.local/station-detail/preview/` with read-only
symlinks to shared code and retained assets and links to the candidate browser
assets. Its local-only course fixtures include three inspection starts and a
candidate First Bank revision for the existing runtime regression. It prints the
layout-specific isolated DB path. Start the **only** task server on 4284 from
that scratch directory using absolute `KYOTO_LAYOUT`, `KYOTO_DATA_DIR`,
`KYOTO_WORKER_LOG`, and `KYOTO_WORKER_EXECUTABLE` paths. The worker must be
`/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64`;
the native test verifies the required managed assembly SHA before starting it.
Do not repoint the existing public proxy or use a production database.

```sh
node web/tests/plaza-landmarks-browser.mjs candidate
KYOTO_TEST_ORIGIN=http://127.0.0.1:4284 KYOTO_TEST_OUTPUT=artifacts/station-detail/plaza-landmarks/scoring-runtime.json npm run test:runtime
```

For baseline captures, run the unmodified game on 4284 with its own DB and
canonical layout before switching to the scratch candidate, then run the browser
test with `baseline`. Camera transforms in `views.json` use Three coordinates
(native Z negated). Test-only interception fixes the inspection camera while
retaining the full game, material treatment, shadows and native session. Render
submission pauses between captures to prevent software GPU queues starving
screenshots; the captured frames themselves use the complete game renderer.
Linux SwiftShader observations are not Mac/Metal or hardware performance claims.

The task receipt and RESULT/STATUS files under `.local/station-detail/` identify
final hashes, evidence, check results, exact launch commands and remaining review
limitations. Integrating or deploying this candidate is a coordinator action.

After candidate browser capture, encode the 54 sampled camera frames as a nine
second inspection video. Set `FFMPEG` if ffmpeg is not on PATH:

```sh
python3 web/station/plaza-landmarks/encode-movement.py
node web/station/plaza-landmarks/receipt.mjs
```

The browser test also measures three paired camera positions with the new layer
visible and hidden, after two warmups. It records eight GPU-synchronized draw
samples per condition, calls and triangles. These small diagnostic samples and
the offline camera movie do **not** measure interactive hardware frame rate.

To refresh a bounded subset of views after correcting an obstructed inspection
camera, set `K028_VIEWS` to comma-separated view IDs. The test merges those
records into existing evidence, preserves performance/movement results, and adds
HUD-free viewport captures alongside the required full-game screenshots. Baseline
refreshes still require the canonical-layout local service, never a visual/native
layout mismatch. `python3 web/station/plaza-landmarks/review.py` writes the local
baseline/candidate comparison page after capture.

Long software-renderer captures save checkpoints after each view, measurement
pair and camera frame. `K028_RESUME=1 node web/tests/plaza-landmarks-browser.mjs
candidate` resumes an interrupted run on the same candidate layout. The receipt
refuses partial evidence. When using a remote command runner, keep the capture
in a live terminal session until it exits; the local HTTP service is separate.
