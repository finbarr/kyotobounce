# Development isolation

Continue sequential improvements in one checkout unless the user explicitly asks
for parallel agents. Finish, verify and merge one bounded change before starting
the next. Do not create duplicate station projects or worktrees for sequential
work. Use `codex/` branch names and preserve unrelated local edits.

If parallel work is explicitly requested, give independent tasks separate
worktrees and assigned files. One integration session merges and verifies their
changes. Coordinate shared physics/scoring contracts, campaign/layout versions
and package manifests before edits. Feature sessions never deploy.

## Browser previews

`npm run dev -- PORT` and `npm start -- PORT` serve the current browser game.
There is no Unity process, gameplay WebSocket or SQLite database. Separate ports
and browser profiles isolate local progress. The station bundle is read in place;
startup uses one generated collision pack per checkout, not a per-port full layout
or duplicated geometry. See [local play](LOCAL_PLAY.md) and [assets](ASSETS.md).

Do not rebuild shared generated files while another session is verifying them.
On-demand verifier tests require independent emulator state and ports. Native
comparison tools remain during migration; if used, isolate their databases,
worker logs and writable outputs. Never share Unity `Library/` directories or
run multiple editors/builds against the same Unity project.

## Keep the desktop usable

- Every automated browser is headless and installs
  `web/tests/background-input.mjs` before navigation. Headless Chrome can otherwise
  capture and move the real macOS cursor through Pointer Lock.
- Use keyboard input or isolated browser touch events. Never use desktop mouse
  automation or bring a test window forward.
- Any deliberately launched macOS native worker must pass the background-only
  bundle check. Browser gameplay does not require that worker.
- Stop temporary servers and browsers when their checks finish. Poll running
  process handles; an observation timeout is not proof that a process stopped.

Source CI does not deploy. Verify visible behavior in the rendered browser and
score changes against independent reconstruction; never create test records on
production by default. See [contributing](../CONTRIBUTING.md).

## Disk retention

Keep `.local/v2/current/` as the current station bundle and at most one temporary
art candidate. Preserve editable sources and small evidence receipts. Replace
superseded generated collision and static packages in their existing directories.
Do not accumulate per-task asset copies, screenshots, native builds or archives.
Never commit private data, credentials, research images or large binaries.
