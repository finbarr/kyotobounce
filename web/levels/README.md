# Course authoring tools

Production definitions and hints have one source: `web/starter-challenges.json`. `proof-inputs.json` contains only the native sampling inputs for the three new/changed courses. The former candidate catalog, preview seeder, overlay loader and provisional journals have been removed.

All three courses passed five identical native shots and three neighboring inputs on collision `7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775`. Normal browser completion, saved replay, scrub and retry also passed. Destinations are optional bonuses: Last Order's browser delivery collected both waypoints and banked609,881points without its destination bonus. Native samples separately proved the bonus is reachable. See [the final design](../../docs/LEVEL-DESIGN.md) and [delivery queue](../../docs/FLEET_QUEUE.md) for scope and verification limits.

## Native reproduction on Linux

Use a compatible dedicated Linux worker. The verified Assembly-CSharp SHA256 is `9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef`. Generate a fixture from the canonical course and retained sampling inputs:

```sh
node --input-type=module - atrium-last-order <<'JS'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const proof=JSON.parse(readFileSync('web/levels/proof-inputs.json'));
const sample=proof.courses.find(c=>c.id===process.argv[2]);
assert.ok(sample,'Choose a course listed in proof-inputs.json');
const challenge=JSON.parse(readFileSync('web/starter-challenges.json')).find(c=>c.id===sample.id&&c.revision===sample.revision);
assert.equal(challenge.layout,proof.layout);
mkdirSync('.local/proofs',{recursive:true});
writeFileSync('.local/course-fixture.json',JSON.stringify({preliminary:false,challenge,shots:[...Array.from({length:sample.repeat},()=>structuredClone(sample.shot)),...sample.neighbors]},null,2));
JS
KYOTO_WORKER_EXECUTABLE=/absolute/dedicated/Linux/worker \
node web/levels/native-proof.mjs .local/course-fixture.json .local/proofs/fresh
node web/levels/check-proof.mjs .local/proofs/fresh
```

Use a new output directory for each run. These are real charge/release and full native stepping probes; a timeout is inconclusive and recalls the shot. They cannot substitute for browser-input checks. The harness records the actual worker, layout, input, contacts, full rest and replay; it does not connect to a running service.

## Browser reproduction on Linux

Start a separate local game with `npm run dev -- 4284`, an explicit compatible `KYOTO_WORKER_EXECUTABLE`, and that worktree's own database/log. The helper uses Google Chrome at `/usr/bin/google-chrome` and only connects to localhost4284:

```sh
node web/levels/browser-proof.mjs 'Last Order' .local/browser/fresh 820.3015075376884,820.3015075376884
```

It uses the briefing, hint key, normal charge/release, saved replay controls and retry, with at most one retry. Positive authoritative waypoint completion is required; an optional destination miss is reported honestly. Linux software rendering can delay input events, so inspect the recorded authoritative power before drawing conclusions about hint timing. These measurements do not establish Mac GPU or WAN performance.

## Shop source

```sh
blender -b --python web/levels/build-konbini.py -- --output .local/konbini/fresh
node web/levels/audit-konbini.mjs .local/konbini/fresh
```

The builder creates an independent blend, GLB, collider records and preview. Ten solid meshes matched within2.36µm; nine doorway clearance samples passed. The canonical station includes this source and its supported gallery; no extra browser asset loader is needed. `konbini-registration.json` records source references, inferred model placement and gameplay adaptations. Geography and structural integration are documented in [LEVEL-DESIGN.md](../../docs/LEVEL-DESIGN.md) and [SHOP-INTEGRATION.md](../../tools/SHOP-INTEGRATION.md). Research images and generated binaries are excluded from Git.
