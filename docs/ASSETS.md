# Assets and authoring

Project-created game code, models, textures and synthesized audio are MIT licensed. Third-party dependencies retain their original licenses. Unity itself is proprietary and must be installed separately.

## Current station availability

The current playable station is pinned by `web/v2/assets.json`. Its canonical
layout is `.local/v2/current/source/station-layout.json`, with the station's
layout path symlinked to that file. The manifest also pins the delivered station
and hardware GLBs, metadata and exploration spawn. `deploy/station.mjs` validates
these against the 30-course campaign before any browser build or local launch.
`KYOTO_V2_ASSETS` selects a different manifest for a deliberately isolated art
candidate; its layout must still match the current campaign.

**The current bundle is not yet available in the public asset archive.**
`assets-manifest.json` and `npm run assets:fetch` still describe `assets-v7`, which
contains a retired station. They are retained as authoring tools during migration
and are not part of normal `npm run setup`. Do not use that archive as proof that
a fresh clone has the current game. Current assets must already be installed at
the manifest paths; setup reports missing files and stops if they are absent.
Preparing a checksum-pinned, distributable current asset pack remains required.

The robot's original export is `web/public/assets/ori.glb`; its editable source is
`art-source/phase3/robot/ORI.blend`. The original public pack contains that robot.
Do not overwrite modified art to install a pack. Keep one current station bundle
and at most one temporary candidate, with original editable sources preserved.

## Browser delivery build

`npm run build:web` verifies the current station, checks the browser import graph,
bundles the dedicated physics worker and builds the compact collision asset.
It does not build Unity or regenerate the retired root station. The current
station and hardware GLBs are already optimized and are read in place.

The collision build uses the validated canonical layout plus the configured
exploration spawn without writing a second full layout. The generated
`.local/browser-physics/station.collision.bin` is reused only when its source hash,
compiler fingerprint and byte checksum match. Generated files stay ignored.

The robot delivery GLB is derived losslessly from its original export. The
optimizer retains triangle order, normals, UV seams, materials, rigs and texture
dimensions. It deduplicates exact vertices and uses meshopt/lossless WebP when
appropriate; it does not quantize or simplify geometry. The general optimizer
remains available to art exporters, but normal startup only builds the robot.

`npm run build:static` runs the same preparation and produces one static package
under `.local/browser-release/`, replacing its previous generated contents.
Oversized station/collision files are split into checksum-verified delivery
chunks. Editable Blender files, research media, native binaries, databases and
credentials never belong in that package. See [deployment](DEPLOYING.md).

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
Review both candidates, then promote the matching source and visual exports into
the current station bundle and update `web/v2/assets.json`. Do not replace only
one side of that pair. Geometry changes alter the layout hash; verify all current
starter routes and update their definitions before publishing a changed station.

`art-source/phase3/robot/build_robot.py` generates the original rig; `tools/build_atrium_detail.py` generates hardware. `tools/build_stair_materials.py` generates textures using Python, NumPy and Pillow. The Blender source remains the editable authority for manually authored station geometry.

The existing `assets:pack` allowlist also targets the retired root station. It
must be updated and verified against the current bundle before publishing a new
asset version. Publish immutable versioned archives rather than replacing a
published archive, and never add large binaries to Git history.

## Provenance and boundaries

The atrium is an independently developed interpretation informed by public photographs and architectural research, not an official survey, CAD export or dimensionally exact replica. The v2 station includes adapted Kyoto City municipal geometry under CC BY 4.0; its source, license and modifications are acknowledged on the shipped [credits page](../web/public/credits.html). Referenced research photos and embedded camera-photo references are excluded from runtime releases. The distributed textures are original procedural/baked material maps, not crops of research photographs.

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
