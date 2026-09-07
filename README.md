# Kyoto Bounce

A robot, a bouncing ball, and a Kyoto Station inspired atrium. Build a line through stairs, glass, stone and moving escalators; land near the target to cash out a growing arcade combo.

**[Play Kyoto Bounce](https://kyotobounce.com)** · [Local setup](docs/LOCAL_PLAY.md) · [Contributing](CONTRIBUTING.md) · [Parallel Codex workflow](docs/PARALLEL_DEVELOPMENT.md)

- Walk the atrium, aim with the mouse, set topspin/backspin and sidespin, then hold and release a throw.
- A smart orbit camera follows the ball while you keep control of the view.
- Create named challenges with start and target radii. Compete asynchronously through scoreboards and recorded replays.
- Score live with surface and active-time multipliers, a green target-hit celebration, distance rings and original synthesized arcade audio. The shot ends when the ball stops moving and spinning.

## Run locally

The browser uses Three.js. A Node.js service owns challenges, SQLite storage and score validation. A native Unity worker runs the authoritative ball physics. This is **not a static-only website**.

The tested development platform is macOS with **Node.js 22.23.2**, **Unity 6000.3.23f1** and its macOS build support. Install and activate Unity through Unity Hub. Blender **5.2.1 LTS** is only needed for art changes. Linux production uses Unity's dedicated-server build.

```sh
git clone https://github.com/finbarr/kyotobounce.git
cd kyotobounce
npm run setup
npm run dev -- 4173
```

Open **http://127.0.0.1:4173/**. The first Unity import/build can take several minutes. Set `UNITY_EDITOR` if the editor is installed at a different path. Windows development is not currently verified.

`npm run setup` installs packages, downloads the pinned art pack, builds the physics worker and checks browser assets. Subsequent JavaScript/UI changes need a page reload; server changes need a restart; C# changes need `npm run build:worker` followed by a restart.

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D, Shift | Walk / move faster |
| Mouse | Aim and rotate the camera; click the play area to capture the pointer |
| Arrow keys | Orbit the camera |
| Hold click or Space, release | Wind up and throw |
| Q / E, Z / C | Adjust top/backspin and sidespin |
| X | Clear spin |
| H | Apply the challenge hint when available |
| R | Recall the ball and forfeit the current attempt |
| Escape | Release the mouse / cancel the windup |

## Source and assets

| Location | Responsibility |
| --- | --- |
| `web/public/` | Rendering, robot, controls, menus, audio and effects |
| `web/*.ts` | Server, challenge protocol, score calculation, persistence |
| `KyotoRicochet/Assets/Kyoto/Scripts/` | Native physics, walking, spin/contact dynamics and sessions |
| `art-source/`, `runtime/` | Editable Blender sources, original textures and canonical collision layout |
| `tools/` | Art exports, asset packaging and isolated local previews |
| `deploy/` | Linux dedicated worker, Node, Caddy and backup deployment |

Large `.blend` and `.glb` files live in a **versioned GitHub release**, not Git history. `assets-manifest.json` pins their checksums; `npm run assets:fetch` installs them and caches the download across worktrees. The pack includes the editable station and robot source, not just the rendered models. See [asset authoring](docs/ASSETS.md).

## Checks

```sh
npm run typecheck
npm test
npm run build:web
# With an isolated local server running:
KYOTO_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:runtime
```

The runtime test creates test guests/challenges and takes real native shots; use a disposable local database. Hosted CI runs the TypeScript and pure Node tests. Native Unity behavior is verified locally because it requires an installed, activated editor.

## License

Project source and project-created art/audio are **MIT licensed**. Dependencies retain their own licenses; Unity is an external proprietary tool/runtime and is not included in the source release. The station is an independently authored approximation, with no affiliation with Kyoto Station, its operators, or its architect. Research photos and third-party municipal models are not distributed. See [asset provenance](docs/ASSETS.md).
