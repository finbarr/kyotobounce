# Kyoto Bounce agent instructions

## Scope and completion

Ship the requested bounded change. Do not resume historical Phase 2/3 checklists or invent endless polish goals. Agree on observable acceptance criteria in the task, implement them, test the relevant runtime, and stop when they pass. Do not create goals, new Codex tasks, or deploy unless the user asks.

## Architecture and invariants

- Browser: `web/public/`; authoritative service: `web/*.ts`; native physics: `KyotoRicochet/Assets/Kyoto/Scripts/`.
- Scores are authoritative and versioned. Preserve immutable historical replays and challenge revisions. Never trust a client-supplied final score.
- A shot finishes only when the ball stops translating AND spinning; no timer finish while it is moving. Recall forfeits.
- Station collision and visual exports must match. The canonical layout is `runtime/station-layout.json`; art sources are supplied by `npm run assets:fetch`.
- Current scoring behavior is documented in `docs/ARCADE-SCORING.md`.
- A native C# change is not running until the worker is rebuilt and the service restarted. Linux deployments require the dedicated-server build, not a normal graphical player.

## Parallel work

Use one Git worktree and branch per independent task. Never have multiple sessions edit this same checkout. See `docs/PARALLEL_DEVELOPMENT.md`.

- Give every running service a separate port, database and worker log (`npm run dev -- PORT` does this).
- Do not share Unity `Library/`, SQLite files, or writable build output across worktrees.
- One active editor/build per Unity project. Limit simultaneous heavy imports/builds; web sessions can reuse an explicitly selected compatible worker binary.
- Keep edits within the task's assigned files. Coordinate before changing shared contracts such as `web/types.ts`, scoring versions, the layout, package manifests or `BrowserSession.cs`.
- One integration session merges PRs and performs explicitly authorized deployments. Feature sessions do not deploy.
- Do not spawn subagents unless the user explicitly asks for delegation or parallel agents in the task.

## Verification and publication

Run `npm run typecheck` and `npm test` for service changes; `npm run build:web` verifies the browser asset set. Test visible changes in a real browser. For physics/protocol/scoring integration, run `npm run test:runtime` against an isolated local server after rebuilding when needed.

Never run record-creating tests on production by default. Never commit `.local/`, `artifacts/`, `web/data/`, secrets, research images, backups or Unity package/runtime binaries. Large original assets belong in a versioned release pack; do not force-add them or silently overwrite local edits. See `docs/ASSETS.md`.
