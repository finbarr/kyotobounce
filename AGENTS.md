# Kyoto Bounce agent instructions

## Scope and completion

Ship the requested bounded change. Do not resume historical Phase 2/3 checklists or invent endless polish goals. Agree on observable acceptance criteria in the task, implement them, test the relevant runtime, and stop when they pass. Do not create goals, new Codex tasks, or deploy unless the user asks.

## Architecture and invariants

- Browser: `web/public/`; dedicated physics worker: `web/public/physics/`; independent on-demand score verification: `web/verification.mjs` and `web/online-*.mjs`. Normal setup/start/build require no Unity runtime.
- This game is pre-launch. Keep only the current station, courses and scoring rules; discard retired development data instead of maintaining archives or compatibility migrations. Current scores remain authoritative; never trust a client-supplied final score.
- A shot finishes only when the ball stops translating AND spinning; no timer finish while it is moving. Recall forfeits.
- Station collision and visual exports must match the current `web/v2/assets.json` manifest and campaign hash. Its configured layout is canonical; `npm run assets:fetch` installs the pinned current game pack. The root layout and assets-v7 pack are retired. See `docs/ASSETS.md`.
- Current scoring behavior is documented in `docs/ARCADE-SCORING.md`.
- A native C# change is not running until the worker is rebuilt and the service restarted. Linux deployments require the dedicated-server build, not a normal graphical player.

## Parallel work

Use one Git worktree and branch per independent task. Never have multiple sessions edit this same checkout. See `docs/PARALLEL_DEVELOPMENT.md`.

- Give every browser preview a separate port (`npm run dev -- PORT`). Browser storage is per origin/profile; previews do not create databases or duplicate station assets. Isolate verifier-emulator state and ports separately.
- Do not share Unity `Library/`, SQLite files, or writable build output across worktrees.
- One active editor/build per Unity project. Limit simultaneous heavy imports/builds; web sessions can reuse an explicitly selected compatible worker binary.
- Keep edits within the task's assigned files. Coordinate before changing shared contracts such as `web/types.ts`, scoring versions, the layout, package manifests or `BrowserSession.cs`.
- One integration session merges PRs and performs explicitly authorized deployments. Feature sessions do not deploy.
- Do not spawn subagents unless the user explicitly asks for delegation or parallel agents in the task.

## Verification and publication

Run `npm run typecheck` and `npm test` for service changes; `npm run build:web` verifies the browser asset set. Test visible changes in a real browser. For browser integration run `npm run test:browser`; physics/campaign changes also require `npm run test:browser:campaign`, and online scoring requires the verifier integration checks. The native `test:runtime` suite only applies when deliberately changing the legacy native runtime.

Keep the user's desktop usable during verification. Local browser checks must be headless and install `web/tests/background-input.mjs` before navigation so they cannot capture or move the desktop pointer. Use keyboard controls; do not bring test windows forward or use desktop mouse automation. macOS physics workers must pass the background-only launch check. See `docs/PARALLEL_DEVELOPMENT.md`.

Never run record-creating tests on production by default. Never commit `.local/`, `artifacts/`, `web/data/`, secrets, research images, backups or Unity package/runtime binaries. Large original assets belong in a versioned release pack; do not force-add them or silently overwrite local edits. See `docs/ASSETS.md`.
