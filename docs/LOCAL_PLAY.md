# Local development

See the [README](../README.md) for first-time installation. Node 22.18+ is required for native TypeScript and SQLite; the tested version is 22.23.2. Unity 6000.3.23f1 is pinned in `KyotoRicochet/ProjectSettings/ProjectVersion.txt`.

## Daily workflow

```sh
npm run dev -- 4174
```

This starts a native worker and browser service for this checkout. Each port gets its own database under `.local/PORT/data/` and worker log under `.local/PORT/worker.log`. Stop it with Ctrl-C. Use a different port for every simultaneous session. The older `npm start` command uses port 4173 and `web/data/`; that path is also ignored by Git.

- Browser JavaScript/CSS changes: reload the page.
- Node/TypeScript changes: stop and restart the service.
- Native C# changes: stop the service, run `npm run build:worker`, restart.
- Art changes: export the relevant assets, run `npm run build:web`, reload. Geometry changes must keep the collision layout and visible station in agreement.

For a non-default editor location:

```sh
UNITY_EDITOR='/path/to/Unity' npm run build:worker
```

The build script currently supports macOS development and `npm run build:worker -- --linux` for the Linux dedicated server. Add the matching platform support modules through Unity Hub. Close any editor already using this checkout before a batch build; never open the same Unity project concurrently in two editor processes.

## Browser and game debugging

Use Chrome for captured-pointer playtesting. Escape releases the mouse. The in-app browser can be useful for viewing menus, but its pointer-lock support may differ.

V2 starts in free exploration. The retired campaign is empty; fresh levels will be built around completed station areas. Walking, throws and recall use the authoritative native worker. Free throws do not create ranked scores.

The loading bar weights the five station/model downloads by decoded byte size from `browser-build.json`; rebuild browser assets after changing art. Missing size metadata shows indeterminate progress until downloads finish. The splash and robot/name setup remain available while downloads and scene preparation run.

`GET /api/health` reports service/worker status. Read the checkout's worker log if physics is unavailable. `web/public/debug.js` implements the development inspection surface. Production blocks `/api/debug/*` at the proxy.

`npm test` needs no worker. `npm run test:runtime` checks the v2 courtyard spawn, walking, full translation/spin rest, free results, recall and home against an isolated local server. `npm run test:v2:browser` checks the playable Chrome controls. Set `KYOTO_TEST_ORIGIN` for a different local port.

## Current reconstructed v2 station

From this worktree, run `npm run build:web`, then:

```sh
KYOTO_WORKER_EXECUTABLE='/path/to/compatible/worker' npm run dev:v2
```

Open http://127.0.0.1:4425. Pass another port with `npm run dev:v2 -- 4426`. Omit the worker variable if this checkout has its own worker in the default build path.

`web/v2/assets.json` identifies the current private reconstruction. Its layout and GLB hashes are checked before launch, along with escalator and comb-support correspondence. Only the spawn metadata changes; large geometry stays symlinked. The launch command creates a public asset overlay, matching browser manifest, native layout and asset receipt under `.local/v2/PORT/`. It also keeps the database and worker log there, separate from published saves.

Small v2 additions can be emitted by their checked-in component builder and appended with `web/v2/compose-component.mjs`. `sourceComponents` in the asset manifest identifies these editable additions; the base Blender scene remains their station context. The composition receipt preserves the parent manifest, original encoded buffers and matching native panels.

The private asset files must already be present at the manifest paths; this candidate has not been published as a release pack. Browser source changes require a reload. Metadata or service changes require restarting this command. When geometry changes, update the manifest to matching exported assets and rerun the relevant checks.

## Useful overrides

| Variable | Purpose |
| --- | --- |
| `KYOTO_PORT` | Browser service port |
| `KYOTO_DATA_DIR` | SQLite directory; use an independent path per service |
| `KYOTO_WORKER_LOG` | Independent native worker log |
| `KYOTO_WORKER_EXECUTABLE` | Explicit prebuilt native worker path |
| `KYOTO_LAYOUT` | Alternate collision layout; defaults to `runtime/station-layout.json` |
| `KYOTO_ASSET_CACHE` | Download cache; default `~/.cache/kyotobounce` |
| `KYOTO_TEST_ORIGIN` | Server tested by the runtime test |
| `KYOTO_TEST_OUTPUT` | Separate runtime-test receipt path |

UI-only sessions can point `KYOTO_WORKER_EXECUTABLE` at a known compatible prebuilt worker, provided nobody rebuilds that binary while it is in use. Copy it into the worktree for stronger isolation. This shortcut is inappropriate for C# or physics/protocol changes, which require a fresh worker build.
