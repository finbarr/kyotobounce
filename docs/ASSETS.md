# Assets and authoring

Project-created game code, models, textures and synthesized audio are MIT licensed. Third-party dependencies retain their original licenses. Unity itself is proprietary and must be installed separately.

## Public asset pack

`assets-manifest.json` identifies a GitHub release archive by SHA-256 and lists each file's size and checksum. Run `npm run assets:fetch` to install it. Downloads are cached under `~/.cache/kyotobounce` for reuse across worktrees. Existing modified assets cause an explicit stop, so art edits are never silently replaced.

The pack includes:

- `art-source/atrium/KyotoAtrium.blend`: current editable atrium and packed original procedural textures. The embedded `Kyoto runtime seed.json` text is required for collision export.
- `art-source/phase3/robot/ORI.blend`: editable robot rig and animation source.
- `art-source/phase3/atrium-detail/AtriumHardware.blend`: editable station fixtures and signs.
- `art-source/materials/stairs/`: original generated stair/escalator texture maps.
- `runtime/station-layout.json` and `runtime/textures/`: canonical native collision layout and material maps.
- `web/public/assets/layouts/<hash>/`: immutable prior collision and browser assets for historical revisions and replay viewing.
- `web/public/assets/`: exported GLBs, station metadata and hardware metadata used by the browser.

The initial runtime layout retains its existing byte-for-byte SHA-256 so deployed challenges and old replays keep the same layout identity. Some provenance strings inside it refer to historical authoring paths; these are metadata, not files required to run the public project.

## Rebuild art

Use Blender 5.2.1 LTS. Replace `blender` with your executable path if necessary.

```sh
blender --background --python tools/export_browser_art.py
blender --background --python tools/build_atrium_detail.py
blender --background --python art-source/phase3/robot/export_browser.py
npm run build:web
```

To export collision geometry after editing the atrium, use a fresh output directory:

```sh
blender --background art-source/atrium/KyotoAtrium.blend --python tools/export_atrium_layout.py -- --output artifacts/layout-candidate
```

Export a matching browser candidate without replacing current assets:

```sh
blender --background --python tools/export_browser_art.py -- \
  --source path/to/candidate/KyotoAtrium.blend \
  --layout artifacts/layout-candidate/station-layout.json \
  --output artifacts/browser-candidate
```

The exporter reads textures beside the selected layout and writes its audit receipt
inside the selected output. With no options, the original paths remain unchanged.
Review both candidates, then copy the layout/textures into `runtime/` and the
matching browser exports into `web/public/assets/`. Geometry changes alter the layout hash and therefore need challenge/replay compatibility review. Never replace a layout underneath existing scoreboards without a deliberate revision/migration plan.

`art-source/phase3/robot/build_robot.py` generates the original rig; `tools/build_atrium_detail.py` generates hardware. `tools/build_stair_materials.py` generates textures using Python, NumPy and Pillow. The Blender source remains the editable authority for manually authored station geometry.

For a new release, run `npm run assets:pack -- assets-v2` (increment the version), review the archive allowlist and changed manifest, attach the archive from `artifacts/open-source/` to a public GitHub release with the matching tag, and commit the manifest alongside its code changes. Publish a new version instead of replacing an existing archive. Do not add multi-hundred-megabyte binaries to Git history.

## Provenance and boundaries

The atrium is an independently modeled interpretation informed by public photographs and architectural research, not an official survey, CAD export or dimensionally exact replica. Referenced research photos, embedded camera-photo references, and third-party municipal exterior datasets are excluded from the public pack. The distributed textures are original procedural/baked material maps, not crops of research photographs.

The robot and station hardware are project-created Blender geometry. In-game sound effects and music are synthesized by `web/public/arcade-audio.js`; no Tony Hawk game recordings or other commercial audio are included.

The ball calibration data under `art-source/physics/` records extracted numerical observations with a citation to Rod Cross, “Oblique bounce of a rubber ball,” Experimental Mechanics 54 (2014), DOI [10.1007/s11340-014-9938-3](https://doi.org/10.1007/s11340-014-9938-3). The paper and figure images are not distributed. The high-speed robot game model extends beyond those measured experimental conditions.

Package dependencies are fetched from npm and Unity's registry under their respective licenses. Unity editor integrations, Unity Library caches, compiled Unity runtimes, personal credentials and private player data are not part of the open-source archive.

## Historical station bundles and layout revisions

Before replacing current exports, preserve the five browser assets under
`web/public/assets/layouts/<old-layout-sha256>/`. `web/layout-assets.json` pins their
sizes and SHA-256 checksums; both metadata files must name the same layout hash.
Store `station-layout.json` alongside them; its checksum must equal that hash.
Preserve the old collision JSON and Blender/source release pack too. Archive files
belong in the next versioned asset pack, never Git. Package this directory
recursively, including nested compression sidecars, and include the registry,
`layout-assets.ts`, `layout-migration.ts`, `layout-proofs.json` and browser
`station-bundles.js` in source/build manifests. Procedural station additions must
be driven by that bundle's metadata; do not add new structures unconditionally to
old metadata.

Earlier revisions remain discoverable in the course menu with their original
boards. `/?replay=<attempt>` fetches a read-only bootstrap, verifies the complete
matching bundle, and loads its full scene before playing the saved timeline. It
creates no WebSocket or physics session. Missing/corrupt bundles fail explicitly;
there is no current-geometry fallback. Closing the archive returns to the current
station. Normal same-layout replays retain the existing in-place path.

On native readiness, current rules courses from other layouts are validated by
the actual worker against its actual layout file. Every start/destination/waypoint
must remain valid, and a required route surface must still exist. Successful
migration appends a new revision with separate boards; neither old challenge JSON
nor replay JSON is updated. Failed courses stay archived. Their creators can
choose **Revise for current station**, replace invalid placements, and save a new
validated revision. Migration is idempotent and retries failed candidates after
proofs or geometry change. Unverified custom hints are removed.

Station-authored starter courses additionally require a matching entry in
`web/layout-proofs.json` (`{"proofs":[]}` by default):

```json
{"id":"starter-id","revision":1,"fromLayout":"<old hash>","toLayout":"<actual new hash>","physics":"<worker physics>","status":"pass","nativeRest":true,"destinationReached":true,"receipt":"<reviewed native test receipt>","hint":{"yaw":90,"pitch":15,"top":0,"kick":0,"holdMs":260,"powerRange":"precision","note":"Verified release"}}
```

Only add proof entries after real shots on the final rebuilt worker stop both
translation and spin, satisfy the required route, and reach the destination.
Verify the hint too. The registry is operator-reviewed evidence, not a client
claim or an automatic solvability assertion. A validation raycast alone cannot
prove a starter route. Re-run final starter proofs whenever geometry changes.

Verification: `node web/tests/layout-archive.mjs` covers immutable JSON,
append-only/idempotent migration, invalid placements, missing surfaces, proof
hash binding and corrupt assets. Against an isolated service with an existing
native replay, run `KYOTO_TEST_ORIGIN=http://127.0.0.1:4197
KYOTO_TEST_ATTEMPT=<attempt> node web/tests/archive-browser.mjs` on one shell line.
The browser check verifies matching asset requests, scrub/return controls and zero
live connections. Final changed-geometry starter shots remain a separate native
acceptance gate.
