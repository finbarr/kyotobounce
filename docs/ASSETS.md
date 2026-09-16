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

## Browser delivery build

`npm run build:web` derives `web/public/assets/runtime/` from the original three GLBs. It removes exact duplicate vertex records, encodes geometry with lossless meshopt, and uses lossless WebP for eligible PNG textures when smaller. It preserves triangle order, normals, UV seams, material definitions, rigs and texture dimensions. Profiled textures and unsupported source depths/formats remain in their original encoding. No geometry quantization, simplification or texture downscaling is performed by this build.

The browser loads these generated delivery GLBs. The release packager checks their build-manifest hashes and excludes the duplicate authoring GLBs. Keep the originals in the asset pack for editing and reproducible builds; generated delivery files and `.local/texture-cache/` are ignored. Source, tool and dependency changes invalidate the build cache. `node web/tests/lossless-assets.mjs --full` checks the decoded output against every original triangle. See [the rendering benchmark](../web/benchmarks/README.md) for browser texture checks and measured download/frame-rate results.

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

The browser exporter clips covered, coplanar architectural faces throughout the station using `tools/coplanar_surfaces.py`. It resolves wall returns, overlapping floor finishes, tactile bases, frame intersections and slab caps within 0.25 mm. Authored trim wins over backing, and floors win over slab-edge caps; exposed rims, curved/sloped geometry and the canonical collision layout stay unchanged. The export receipt records removed area per source object. Run `node web/tests/station-overlaps.mjs` to check wall, floor, tactile, landing and skyway seam coverage in the actual GLB. These surfaces no longer rely on material-wide depth offsets.

The exporter reads textures beside the selected layout and writes its audit receipt
inside the selected output. With no options, the original paths remain unchanged.
Review both candidates, then copy the layout/textures into `runtime/` and the
matching browser exports into `web/public/assets/`. Geometry changes alter the layout hash. Verify all current starter routes and update their definitions to match. Startup removes courses and scores from retired layouts/rules; it does not migrate them.

`art-source/phase3/robot/build_robot.py` generates the original rig; `tools/build_atrium_detail.py` generates hardware. `tools/build_stair_materials.py` generates textures using Python, NumPy and Pillow. The Blender source remains the editable authority for manually authored station geometry.

For a new release, run `npm run assets:pack -- assets-v8` (increment the current `assets-v7` version), review the archive allowlist and changed manifest, attach the archive from `artifacts/open-source/` to a public GitHub release with the matching tag, and commit the manifest alongside its code changes. Publish a new version instead of replacing an existing archive. Do not add multi-hundred-megabyte binaries to Git history.

## Provenance and boundaries

The atrium is an independently modeled interpretation informed by public photographs and architectural research, not an official survey, CAD export or dimensionally exact replica. Referenced research photos, embedded camera-photo references, and third-party municipal exterior datasets are excluded from the public pack. The distributed textures are original procedural/baked material maps, not crops of research photographs.

The robot and station hardware are project-created Blender geometry. In-game sound effects and music are synthesized by `web/public/arcade-audio.js`; no Tony Hawk game recordings or other commercial audio are included.

The ball calibration data under `art-source/physics/` records extracted numerical observations with a citation to Rod Cross, “Oblique bounce of a rubber ball,” Experimental Mechanics 54 (2014), DOI [10.1007/s11340-014-9938-3](https://doi.org/10.1007/s11340-014-9938-3). The paper and figure images are not distributed. The high-speed robot game model extends beyond those measured experimental conditions.

Package dependencies are fetched from npm and Unity's registry under their respective licenses. Unity editor integrations, Unity Library caches, compiled Unity runtimes, personal credentials and private player data are not part of the open-source archive.

## Site identity and share previews

The small site identity assets are tracked with the website:

- `web/public/favicon.svg` is the editable robot mark, drawn to match the character picker. `favicon.ico` contains 16, 32, and 48 pixel PNG representations; `apple-touch-icon.png` is 180 pixels.
- `web/public/brand/kyoto-bounce-social.jpg` is the final 1200 × 600 promotional illustration, encoded as a 249 KB JPEG. The large generation original is not shipped.
- `web/social-metadata.ts` owns the home, level, and replay metadata. `npm run build:web` writes the default block into the static home page; public level/replay handlers replace that whole block with their own escaped titles, descriptions, and canonical URLs. Every page uses the same cover and an explicit Twitter large-image card. Image dimensions and alt text follow the [Open Graph image fields](https://ogp.me/#structured).

The cover was created with the built-in image-generation tool on September 13, 2026, using this prompt:

> Use case: ads-marketing. Create the final social sharing cover art for KYOTO BOUNCE, a Japanese arcade ricochet browser game set inside Kyoto Station. Produce a WIDE 2:1 landscape image, ideally 1536 by 768 pixels. Premium illustrated arcade cabinet / late-1990s Japanese game box art, deliberate graphic composition rather than a screenshot. Huge bold condensed slanted cream-and-gold title reading exactly "KYOTO BOUNCE" stacked on the LEFT, occupying about 45% of the image; title completely readable in a small Twitter card. Small clean text below it exactly "ONE BALL. ENDLESS ANGLES." Along the bottom small text exactly "KYOTOBOUNCE.COM". On the RIGHT a charming expressive ivory enamel robot: rounded rectangular cream head, red circular ear discs, small dark navy neck and joints, ivory limbs, dark navy chest panel with red horizontal vents, red shoulder blocks. It is dramatically throwing a small glowing orange ball toward the viewer, excited celebratory pose, believable articulated toy robot, no humanoid skin. The ball leaves a bold curling electric mint and hot orange ricochet trajectory across the frame with a few angular impact flashes and celebratory gold arcade sparks. Background recognizable Kyoto Station soaring steel-and-glass lattice atrium and grand staircase, rendered as intricate navy and teal architectural illustration. Deep midnight navy, warm cream, golden yellow, vermilion, and mint palette matching the game. High contrast, confident shapes, polished premium editorial illustration, energetic but uncluttered, clean silhouette, spectacular motion. Typography and robot are the visual anchors. Keep all title and important imagery within the central 90% of the image with generous outer safe margins so a slight social-card crop is safe. No score numerals, no extraneous text, no watermark, no third-party logos.
