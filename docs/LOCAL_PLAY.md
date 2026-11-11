# Local development

Use Node 22.23.2 and the current station assets described in [ASSETS.md](ASSETS.md).
Unity is not required. The current asset pack is verified locally and awaits
publication, so a fresh checkout needs its archive path. Modified local assets
stop installation before anything is replaced.

```sh
KYOTO_ASSET_ARCHIVE=/absolute/path/kyoto-assets-v8.tar.gz npm run setup
npm run dev -- 4173
```

`npm start` and `npm run dev` use the same browser-only launcher. Both accept
`-- PORT` or `KYOTO_PORT`; a CLI port wins, and the default is 4173. The server
binds to 127.0.0.1 and serves static game files. It has no gameplay API,
WebSocket, database or native physics process.

The build validates `web/v2/assets.json`, the campaign's layout hash and matching
station/hardware exports. It generates one collision pack and browser worker in
`.local/browser-physics/`. A matching collision receipt is reused only after
checking the compiler fingerprint and file checksum. The large station files
are served in place; preview ports do not create asset copies or layout overlays.
Only the robot GLB is derived from `web/public/assets/ori.glb` during this build.

## Daily work

- Browser JavaScript/CSS: reload the page.
- Physics-worker, station or campaign changes: restart the preview to rebuild.
- Use Ctrl-C to stop the preview. On macOS, `npm stop -- PORT` also works; it
  checks both the process command and checkout before stopping anything.
- Use a separate port and browser profile when separate saved progress is needed.
  Progress, creator drafts and replays live in browser storage for that origin,
  not a local SQLite file.
- `KYOTO_VERIFY_URL` optionally enables the independent online verifier. Leave it
  unset for entirely local play. See [verification](ON-DEMAND-VERIFICATION.md).

`/`, `/index.html`, `/level/ID` and `/replay/ID` all load the browser game.
The served campaign contains all 30 levels. `window.kyotoState` exposes local
playtest telemetry. `/api/health` does not exist: readiness means the actual
browser worker has loaded the station and can play a shot.

## Verification

```sh
npm run typecheck
npm test
npm run build:web
npm run test:browser
npm run test:browser:campaign
npm run test:browser:controls
```

The startup test owns its preview and verifies normal `start`, `dev` and shutdown,
then exercises offline gameplay through the existing rendered acceptance check.
For an already running preview:

```sh
KYOTO_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:local
```

`npm run build:static` packages the browser game; `npm run preview:static -- 4431`
serves only that package. `npm run test:browser:rendered` checks its rendered game
and creator in Chrome, Firefox and WebKit. No command above deploys.

All automated browsers must be headless and install
`web/tests/background-input.mjs` before navigation. Use keyboard controls or the
isolated browser touch protocol, never desktop mouse automation. See
[development isolation](PARALLEL_DEVELOPMENT.md).
