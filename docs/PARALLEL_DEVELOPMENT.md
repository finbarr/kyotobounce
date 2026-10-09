# Parallel Codex development

Default to one active task and checkout. Finish, verify, commit and merge each task into local `main` before starting the next. Start parallel sessions only when the user explicitly requests them. The split below applies to that explicit parallel workflow.

## Suggested split

| Task | Example scope | Preview port | Owned files |
| --- | --- | --- | --- |
| Integration | Review PRs, merge, smoke-test the combined game, deploy when authorized | 4173 | Release decisions and shared contracts |
| Arcade presentation | Menus, audio, score effects, accessibility | 4174 | `arcade*.js`, `arcade.css`, agreed UI sections |
| Robot and controls | Walking animation, camera, aim and release feel | 4175 | `avatar.js`, `game.js`, agreed native control files |
| Challenges and replays | Level designer, leaderboard browsing, replay usability | 4176 | `competition.js`, service/store code and tests |

Physics or station art should be separate focused tasks when needed, replacing a lane above. Assign a single owner to each Blender source. A physics task may need `BrowserSession.cs`; agree on that ownership before running a controls task concurrently.

## Desktop app workflow

1. Save/open this Git repository as a Codex project.
2. Start a new task and select **Worktree**, starting from `main`. Give it a concrete outcome, assigned files, acceptance checks and a preview port.
3. Use **Create branch here** to give the task a branch such as `arcade/target-effects`, then make a focused PR to `main`.
4. Run `npm ci` and `npm run assets:fetch` in the worktree. Build its worker once with `npm run build:worker`, then use `npm run dev -- 4174` (or the assigned port). Reserve heavy Unity imports/builds for one task at a time initially.
5. Leave the main checkout to the integration task. It reviews each PR, merges one at a time, and tests the combined result before an authorized deployment.

Codex's worktree mode supplies independent working files for parallel tasks. Its local-environment setup script can run `npm ci && npm run assets:fetch` automatically; keep the expensive Unity build a deliberate step. See the official [Git worktree documentation](https://learn.chatgpt.com/docs/environments/git-worktrees) and [local environments](https://learn.chatgpt.com/docs/environments/local-environment).

For UI-only work, copying a compatible existing worker into the worktree can avoid a Unity import. An explicit `KYOTO_WORKER_EXECUTABLE` also works, but do not rebuild that shared path while sessions are using it. Any C# change requires rebuilding the task's own worker.

### Keep the desktop usable during local checks

- Browser automation must remain headless and must install `web/tests/background-input.mjs` before opening the game. Headless Chrome can still capture and warp the real macOS cursor through Pointer Lock. Use keyboard controls for these checks; pointer-lock handler behavior is tested in `camera-focus.mjs` without OS input. Older browser scripts need this adaptation before use on the laptop.
- The macOS physics bundle must have `LSBackgroundOnly=true`. `npm run build:worker` prepares and re-signs it, and the service refuses an unprepared bundle. For an existing stopped local build, run `node web/prepare-macos-worker.mjs` (optionally passing its bundle path). This changes packaging only; it does not rebuild physics.
- Stop temporary browser and native verification processes when the check finishes. Do not use desktop mouse automation or bring test windows to the foreground while the user is working.

GitHub Actions runs the portable checks on pushes and PRs. It does not provide Unity behavioral proof or deploy. Native checks and browser playtesting remain part of PR acceptance.

## Task prompt template

> Implement [one player-visible outcome] in this worktree. Own [files/subsystem]; coordinate before editing other tasks' files or shared contracts. Use preview port [4174] and its isolated database. Done means [two or three observable checks]. Run the relevant checks, commit and open a PR to main. Do not deploy or expand into unrelated polish.

## Merge discipline

- Prefer small PRs that can be reviewed and merged the same day. Rebase long-lived tasks after related changes land.
- Split work by files/contracts, not just vague themes. Two tasks editing the same large file still conflict even in separate worktrees.
- Version protocol/scoring changes intentionally. Update browser, Node, native worker and replay compatibility together when needed.
- Keep databases per worktree; never copy production data into feature tasks.
- Asset tasks publish candidate packs only when authorized. A maintainer verifies the matching Blender, collision and GLB outputs and pins a new release manifest. Binary merges are replaced by explicit ownership and review.
- Only the integration task deploys, after merged source, relevant tests and the public worker/health checks agree. Avoid deploying directly from multiple feature branches.

This arrangement is intended to improve throughput without turning every task into a station-wide redesign. A clear stopping condition is part of every assignment.

## Disk retention

Use `.local/v2/current/` for the current private station bundle and at most one temporary candidate. Delete superseded generated scenes, collision layouts, browser exports and compiled builds after verifying the replacement. Preserve editable source, original inputs, current player data and small provenance receipts. Stop obsolete preview servers. Before archiving a finished worktree, move or verify copies of required ignored assets: Git snapshots do not preserve ignored files. Reuse an existing suitable checkout for the next task.
