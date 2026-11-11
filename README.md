# Kyoto Bounce

A robot, a bouncing ball, and a Kyoto Station inspired atrium. Build a line through stairs, glass, stone and moving escalators; land near the target to cash out a growing arcade combo.

**[Play Kyoto Bounce](https://kyotobounce.com)** · [Local setup](docs/LOCAL_PLAY.md) · [Contributing](CONTRIBUTING.md) · [Parallel Codex workflow](docs/PARALLEL_DEVELOPMENT.md)

- Walk the atrium, aim with the mouse, set topspin/backspin and sidespin, then hold and release a throw.
- A smart orbit camera follows the ball while you keep control of the view.
- Create named challenges with start and target radii. Compete asynchronously through scoreboards and recorded replays.
- Score live with surface and active-time multipliers, a green target-hit celebration, distance rings and original synthesized arcade audio. The shot ends when the ball stops moving and spinning.

## Run locally

The Three.js game runs its physics in a dedicated browser worker. Walking, all
30 levels, the creator, scores and replays work offline after loading. Optional
online scores are independently reconstructed by the on-demand verifier.
Unity is not needed for browser development or play.

Use **Node.js 22.23.2**. The current `assets-v8` pack is verified locally but
awaits publication. For a fresh checkout, obtain the prepared archive and supply
its path below. No Unity editor or Blender installation is required. See
[asset availability and authoring](docs/ASSETS.md).

```sh
KYOTO_ASSET_ARCHIVE=/absolute/path/kyoto-assets-v8.tar.gz npm run setup
npm run dev -- 4173
```

Open **http://127.0.0.1:4173/**. `npm start` uses the same browser-only launcher.
`npm run setup` installs packages and builds/verifies the browser worker, current
collision pack and delivery assets. It does not install or launch Unity.
Reload after browser source edits; restart after physics-worker, catalog or art
changes. Stop with Ctrl-C, or `npm stop -- 4173` on macOS.

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D, Shift | Walk / move faster |
| Mouse | Aim and rotate the camera; click the play area to capture the pointer |
| Arrow keys | Orbit the camera |
| Hold click or Space, release | Wind up and throw |
| Hold Space during flight | Play the shot at 2× speed |
| Enter / Skip to result | Skip the remaining flight and show the settled result |
| Q / E, Z / C | Adjust top/backspin and sidespin |
| X | Clear spin |
| H | Apply the challenge hint when available |
| P | Switch between precision (12 m/s) and robot (100 m/s) power before charging |
| R | Recall the ball and forfeit the current attempt |
| Escape | Release the mouse / cancel the windup |

Precision throws use a compact arm motion. Robot power uses a wider staggered stance, a deeper wind-up and a forceful follow-through. Both release from the same authoritative launch point.

Skip to result is also available on touch screens and while recording a design ball. It waits for the physics worker to finish calculating real rest, including spin. The score and full replay are preserved. While it says “Finishing shot…”, you can still recall to forfeit.

Replays open with an orbit camera. Press F for free camera: WASD flies, Q/E moves down/up, and Shift boosts speed. Click to capture the mouse or right-drag to look. Hold Space for 2× playback, including faster music and effects; release it to return to normal speed. Pause/Play and the timeline remain in the replay panel, and Recenter returns the camera to the shot. The camera also moves while playback is paused. Escape releases the mouse for the controls.

Fast ball flight adds peripheral motion blur above 45 m/s, reaching full strength at 90 m/s and fading as the ball slows. The ball and interface stay readable; reduced-motion settings disable the effect, and replay playback speed scales it.

## Source and assets

| Location | Responsibility |
| --- | --- |
| `web/public/` | Three.js rendering, controls, menus, audio, local persistence and browser physics |
| `web/public/physics/` | Dedicated worker, walking, ball contacts, spin and scoring |
| `web/verification.mjs`, `web/online-*.mjs` | Independent online verification and optional score/course service |
| `web/v2/assets.json` | Current station source, visual exports and hashes |
| `tools/` | Art exports, collision compilation and asset packaging |
| `deploy/browser-package.mjs`, `deploy/verification/` | Static game bundle and on-demand verifier packaging |

Large assets stay outside Git. Build and preview the distributable static game
with `npm run build:static` and `npm run preview:static -- 4431`. See
[asset authoring](docs/ASSETS.md), [migration evidence](docs/BROWSER-PHYSICS.md)
and [deployment preparation](docs/DEPLOYING.md). These commands do not deploy.

## Checks

```sh
npm run typecheck
npm test
npm run build:web
# With the current station installed and local Chrome available:
npm run test:browser
npm run test:browser:campaign
npm run test:browser:controls
```

The startup check starts the normal game, verifies offline desktop/mobile play,
full rest, recall, saved results and replays, and stops its own preview. Browser
checks remain headless and cannot capture the desktop pointer. Hosted CI runs
source and verifier-emulator checks; rendered station tests run locally.
Legacy native source/tools remain during migration, but are not used by the
normal setup, start or build commands.

## License

Project source and project-created art/audio are **MIT licensed**. Parts of the v2 station adapt Kyoto City's municipal model under **CC BY 4.0**; see [credits](web/public/credits.html). Dependencies retain their own licenses; Unity is an external proprietary tool/runtime and is not included in the source release. The station is an independently developed approximation, with no affiliation with Kyoto Station, its operators, or its architect. Research photographs are not distributed. See [asset provenance](docs/ASSETS.md).
