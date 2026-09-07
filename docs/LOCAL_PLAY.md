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

`GET /api/health` reports service/worker status. Read the checkout's worker log if physics is unavailable. `web/public/debug.js` implements the development inspection surface. Production blocks `/api/debug/*` at the proxy.

`npm test` needs no assets or worker. `npm run test:runtime` needs a running game and writes its receipt under ignored `artifacts/`; it exercises full native throws, score/replay agreement and client score-spoof rejection. It creates persistent test records, so keep its database disposable.

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
