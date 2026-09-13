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
- `web/public/assets/`: exported GLBs, station metadata and hardware metadata used by the browser.

The game is pre-launch. Only the current station bundle ships; old geometry, rules and course revisions are discarded. Current high scores and same-version replays remain supported.

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

Build matching hardware with `tools/build_atrium_detail.py -- --layout
artifacts/layout-candidate/station-layout.json --output artifacts/browser-candidate
--source-output artifacts/hardware-source` on one command line after Blender's
`--background --python` options.

The browser exporter clips duplicate west-wing slab-edge and substrate top caps against the supporting floor slabs. It preserves exposed rims and vertical sides; the canonical collision layout stays unchanged. Its audit receipt records the removed coplanar area per object to catch regressions in this camera-dependent edge flicker.

The exporter reads textures beside the selected layout and writes its audit receipt
inside the selected output. With no options, the original paths remain unchanged.
Review both candidates, then copy the layout/textures into `runtime/` and the
matching browser exports into `web/public/assets/`. Geometry changes alter the layout hash. Verify all current starter routes and update their definitions to match. Startup removes courses and scores from retired layouts/rules; it does not migrate them.

`art-source/phase3/robot/build_robot.py` generates the original rig; `tools/build_atrium_detail.py` generates hardware. `tools/build_stair_materials.py` generates textures using Python, NumPy and Pillow. The Blender source remains the editable authority for manually authored station geometry.

For a new release, run `npm run assets:pack -- assets-v6` (increment the current `assets-v5` version), review the archive allowlist and changed manifest, attach the archive from `artifacts/open-source/` to a public GitHub release with the matching tag, and commit the manifest alongside its code changes. Publish a new version instead of replacing an existing archive. Do not add multi-hundred-megabyte binaries to Git history.

## Provenance and boundaries

The atrium is an independently modeled interpretation informed by public photographs and architectural research, not an official survey, CAD export or dimensionally exact replica. Referenced research photos, embedded camera-photo references, and third-party municipal exterior datasets are excluded from the public pack. The distributed textures are original procedural/baked material maps, not crops of research photographs.

The robot and station hardware are project-created Blender geometry. In-game sound effects and music are synthesized by `web/public/arcade-audio.js`; no Tony Hawk game recordings or other commercial audio are included.

The ball calibration data under `art-source/physics/` records extracted numerical observations with a citation to Rod Cross, “Oblique bounce of a rubber ball,” Experimental Mechanics 54 (2014), DOI [10.1007/s11340-014-9938-3](https://doi.org/10.1007/s11340-014-9938-3). The paper and figure images are not distributed. The high-speed robot game model extends beyond those measured experimental conditions.

Package dependencies are fetched from npm and Unity's registry under their respective licenses. Unity editor integrations, Unity Library caches, compiled Unity runtimes, personal credentials and private player data are not part of the open-source archive.
