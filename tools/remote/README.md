# Remote reconstruction checkpoint

Run commands from `/opt/boxhaven/project`. This checkpoint is unfinished research and construction; it is not a production release. `web/station/realism/STATE.md` is the latest architectural handoff. The next delegation goal and assignments are still to be agreed.

## Environment

`bootstrap.sh` installs Blender 5.2.1, Chrome, Xvfb, graphics libraries and a Python environment with NumPy, SciPy, Shapely, Pillow and OpenCV. Source `/etc/profile.d/kyoto-tools.sh` in non-login shells. Install Node dependencies with `npm ci`.

Use `xvfb-run -a node ...` for headed Chrome research captures on Linux. CPU-only Linux defaults to software rendering. On a verified GPU machine set `KYOTO_CHROME_ANGLE=gl` (or `vulkan` with a working Vulkan driver). Set `KYOTO_REQUIRE_GPU=1` for the game smoke test to reject software rendering; the test saves `graphics.json`. These checks establish remote functionality, not laptop GPU frame-rate acceptance. Final performance acceptance stays on the user's Chrome laptop.

The compatible Linux Dedicated Server worker is included privately at `Builds/PhysicsWorkerLinux/KyotoPhysicsWorker.x86_64`. Geometry and course tests use it without Unity Editor. Native C# changes require a compatible licensed Unity Editor and a rebuilt dedicated-server worker; this image does not claim native compiler readiness.

## Source and asset ownership

Each machine gets its own Git checkout, branch, asset files, worker logs and SQLite data. Never edit another machine's checkout or deploy from a feature machine. Keep integration in this local chat. One machine owns each Blender source during an assignment; return code commits and a hashed candidate asset pack.

Private assets are transferred with `checkpoint-pack.py`, which deduplicates file content for transport, verifies SHA-256 and restores separate copies. The archive includes source art, current runtime/browser assets, research media, native worker and reconstruction intermediates. It excludes logs, SQLite data, Python caches and disposable symlinks. Recreate isolated test workspaces with their generators.

Start from `.local/station-realism/station-gate-bank-02`, paired with `gate-bank-browser-02` and `hall-basement-motion-02`. The root game retains the original assets-v7 layout (`232b331fe5f7543bf8b228774e15c6228fffb5ee389c2a538029665827e19cc8`) and matching starter catalog. The earlier courtyard candidate is a separate private workspace (`station-court-life-04`); historic notes calling it active refer to that local preview, not the root runtime files. Do not silently mix those layouts and exports. Both remain subject to the documented unresolved visual/gameplay gates.

## Verification before snapshot and after cloning

- Check the source commit, active and private layout hashes, research catalog files and packed asset hashes.
- Run typecheck, unit tests and browser build.
- Load the private Blender source; verify its embedded native layout; export a fresh GLB with the recorded texture profile and restoration prefixes.
- Run native geometry probes and isolated service/runtime checks with the Linux worker.
- Render the private candidate in Chrome and inspect the resulting screenshot and error report.
- Run a bounded Codex readiness task that reads the handoff and reports its source commit. Do not begin autonomous construction yet.
- Stop test services; remove forwarded credentials and apply BoxHaven's official disposable-image identity cleanup before snapshotting. Forward authentication separately after each clone boots.

## Publication

Research photos and compiled workers stay out of Git. Commit source and methods only. No commit from this checkpoint authorizes an asset release, push, merge or production deployment.

The verified agent launch uses the standard `bh run NAME codex ...` wrapper inside the isolated VM. Explicit nested read-only/workspace bubblewrap modes failed on this Ubuntu image's AppArmor user-namespace policy. No host-wide AppArmor policy was disabled. Keep task prompts bounded and use the VM as the isolation boundary, as BoxHaven's default wrapper does.

For a smaller transport archive, recompress the gzip tar stream using `gzip -dc checkpoint.tar.gz | zstd -3 --long=30 -T2 -o checkpoint.tar.zst`. Restoration supports both formats and verifies each distinct content hash. This does not discard reconstruction versions or evidence.

Direct non-login SSH shells may resolve `/usr/bin/codex` instead of the BoxHaven wrapper. Use `/opt/boxhaven/bin/codex` explicitly for direct SSH launches; `bh run` supplies the normal login environment.


Some source blends reference a Mac system font. Linux includes Noto CJK; load `tools/remote/font-fallback.py` before an authoring/export script to substitute missing editable text fonts in memory. It never saves the original blend. Existing mesh geometry stays intact, but new or edited text has different font metrics and needs visual review. Example: `blender --background --python tools/remote/font-fallback.py --python tools/export_browser_art.py -- ...`.

Historical evidence receipts retain their original absolute file paths and hashes. The image includes two project-only aliases from the former Mac checkout paths to `/opt/boxhaven/project`, so those recorded photo/source paths remain readable without rewriting evidence.

Run full-station Blender exports and full-game Chrome checks sequentially on the 16 GB machines. The seed export used about 13 GB at peak; parallel component authoring happens across machines, not as several heavy exports inside one VM.

The requested GPU fleet targets RTX 4000 Ada machines in Toronto: 8 CPU, 32 GB RAM, 20 GB VRAM, 500 GB disk. BoxHaven listed $1.82/hour per machine during preparation. Provisioning and GPU verification are tracked separately from the completed CPU checks; an intermediate transport snapshot is not a verified final worker image.
