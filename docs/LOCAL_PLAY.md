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

`npm test` needs no worker. `npm run test:runtime` checks the configured v2 spawn, walking, full translation/spin rest, free results, recall and home against an isolated local server. `npm run test:v2:browser` checks the playable Chrome controls. Set `KYOTO_TEST_ORIGIN` for a different local port.

## Current reconstructed v2 station

From the main checkout, run `npm run build:web`, then:

```sh
KYOTO_WORKER_EXECUTABLE='/path/to/compatible/worker' npm run dev:v2
```

Open http://127.0.0.1:4425. Pass another port with `npm run dev:v2 -- 4426`. Omit the worker variable if this checkout has its own worker in the default build path.

The current spawn is inside Isetan 4F, south of the central aisle. Walk west
toward the central escalators to travel between 3F, 4F and 5F. The fifth-floor
hall also opens onto the Grand Stairway through its retained doorway; see the
[fifth-floor notes](../research/kyoto-station/notes/ISETAN-FIFTH-V2.md) and
[3F–4F escalator notes](../research/kyoto-station/notes/ISETAN-ESCALATORS-V2.md).
Both fourth-floor entrances lead to Muromachi Square. The internal northern
stair connects 3F to the lower store floors. The Isetan north lift continues to
serve B3, B2, B1, ground and 2F; see the
[north lift notes](../research/kyoto-station/notes/ISETAN-LIFT-V2.md).
Both B3 parking aisles and the central public lift remain connected.
The western railway head concourse and platforms 30–34 remain connected at
ground level around the buffered track ends; see the
[western platform notes](../research/kyoto-station/notes/WESTERN-PLATFORMS-V2.md).
The Porta west lift remains beside its cross-passage, with both shopping
streets and the B2 stair accessible; see the
[Porta west lift notes](../research/kyoto-station/notes/PORTA-WEST-LIFT-V2.md).
The South subway lift connects the platform and paid gate hall; see the
[South lift notes](../research/kyoto-station/notes/SUBWAY-SOUTH-LIFT-V2.md).
The northern Hachijo Street lift connects the underpass to the station forecourt.
Follow the underpass
south to the open-air garden, southern street lift, stair and Avanti entrance
lobby; see the [Hachijo crossing notes](../research/kyoto-station/notes/HACHIJO-CROSSING-V2.md).
The Exit 5 lift remains available at the north end of the public passage,
connecting to the northeast forecourt; see the
[Exit 5 notes](../research/kyoto-station/notes/EXIT-FIVE-LIFT-V2.md).
The public passage also connects to North Street and both East Porta aisles;
see the [Porta East notes](../research/kyoto-station/notes/PORTA-EAST-V2.md).
The Central 1 passenger lift remains available on the subway island platform.
Walk inside and press **E** to ride, or use its nearby button
with the mouse released. The lift connects the platform and Central 1 concourse;
its landing doors remain closed while the car is elsewhere. This requires a
worker rebuilt with `lifts-v1` support; see the
[lift notes](../research/kyoto-station/notes/SUBWAY-LIFT-V2.md).
Four upward escalators connect the platform to the
four gate halls, with the stairs usable alongside them; see the
[escalator notes](../research/kyoto-station/notes/SUBWAY-ESCALATORS-V2.md).
Six conventional-platform stairs, the eastern Shinkansen transfer gate and the
public Underground East gate remain connected. The neighboring Porta stairs and
ramp remain public; see the [eastern connection notes](../research/kyoto-station/notes/EAST-TRANSFER-V2.md).
The western approach, Grand Stairway, restaurant and central Skyway remain
connected, as recorded in the [western route notes](../research/kyoto-station/notes/WESTERN-UPPER-CONNECTION-V2.md).

`web/v2/assets.json` identifies the current private reconstruction under `.local/v2/current/`. Its layout and GLB hashes are checked before launch, along with escalator and comb-support correspondence. An optional hardware GLB is also hash-checked. Only the spawn metadata changes; large geometry stays symlinked. The launch command creates a public asset overlay, matching browser manifest, native layout and asset receipt under `.local/v2/PORT/`. It also keeps the database and worker log there, separate from published saves.

To validate the single temporary candidate without changing the current manifest, run `KYOTO_V2_ASSETS=.local/v2/candidate/assets.json npm run dev:v2 -- 4426`. Stop that preview after promotion and remove its generated overlay/layout; keep only useful small receipts.

Small v2 additions can be emitted by their checked-in component builder and appended with `web/v2/compose-component.mjs`. `sourceComponents` in the asset manifest identifies the editable components. Major replacements can be installed in the base Blender scene; small additions can remain appended. Use their installation or composition receipts when rebuilding. The composition receipt preserves the parent manifest, original encoded buffers and matching native panels.

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
