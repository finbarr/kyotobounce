# Assets and authoring

Project-created game code, models, textures and synthesized audio are MIT licensed. Third-party dependencies retain their original licenses. Unity itself is proprietary and must be installed separately.

## Current game asset pack

`assets-manifest.json` pins the versioned `assets-v8` game pack by archive and
per-file SHA-256. The [published release](https://github.com/finbarr/kyotobounce/releases/tag/assets-v8)
was downloaded and verified against that checksum on November 12, 2026.
`npm run setup` installs dependencies, downloads and validates the pack, and
builds browser physics. `npm run assets:verify` checks the installed files
without downloading anything. Changed local assets are never overwritten.

The pack has exactly six inputs, totaling 159,537,468 compressed bytes:

- `.local/v2/current/source/station-layout.json`: the canonical station layout.
- `.local/v2/current/station/atrium.runtime.glb` and `station.json`: matching
  delivered station geometry and metadata.
- `.local/v2/current/motion/atrium-detail.runtime.glb` and `atrium-detail.json`:
  matching hardware and moving-escalator metadata.
- `web/public/assets/ori.glb`: original robot export for the lossless browser build.

`web/v2/assets.json` pins their relationship and exploration spawn. Station and
motion now use the same canonical layout path; installation needs no layout
symlink or duplicate file. The asset manifest also pins this configuration's
checksum. The build validates it against all 30 campaign courses.

Downloads are cached under `~/.cache/kyotobounce` (override with
`KYOTO_ASSET_CACHE`). For an unpublished pack or an offline transfer, use the
existing archive directly, without making another cached copy:

```sh
KYOTO_ASSET_ARCHIVE=/absolute/path/kyoto-assets-v8.tar.gz npm run setup
```

The installer validates the archive hash, exact file allowlist and regular-file
entry types before extraction. It verifies every extracted file before installing
missing ones, rejects destination symlinks, and removes its temporary staging
files. An interrupted install can resume without replacing existing assets.

The pack contains game inputs only. Editable Blender originals and authoring
textures remain in the maintained source bundle, outside this runtime archive;
they are needed only for art changes. `sourceScene` in the station manifest is
an authoring reference, not a game setup dependency. The robot's editable source
is `art-source/phase3/robot/ORI.blend`. Preserve those originals and keep at most
one temporary art candidate. Research images, credentials, player data, native
binaries and retired station exports must never enter the game pack.

`KYOTO_V2_ASSETS` can select a deliberately isolated art candidate, whose layout
must still match the campaign. Promote a candidate into `web/v2/assets.json`
before packaging a new game asset version.

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

Art work requires the original Blender scenes and textures; installing the game
pack alone is not an authoring setup. From the maintained source bundle, export
a matching candidate pair without replacing current game assets:

```sh
blender --background .local/v2/current/source/KyotoAtrium.blend \
  --python tools/export_atrium_layout.py -- --output artifacts/layout-candidate
blender --background --python tools/export_browser_art.py -- \
  --source .local/v2/current/source/KyotoAtrium.blend \
  --layout artifacts/layout-candidate/station-layout.json \
  --output artifacts/browser-candidate
```

Build matching hardware with `tools/build_atrium_detail.py -- --layout
artifacts/layout-candidate/station-layout.json --output artifacts/browser-candidate
--source-output artifacts/hardware-source` on one command line after Blender's
`--background --python` options. Robot changes use the preserved ORI source and
`art-source/phase3/robot/export_browser.py`.

The browser exporter clips covered, coplanar architectural faces throughout the station using `tools/coplanar_surfaces.py`. It resolves wall returns, overlapping floor finishes, tactile bases, frame intersections and slab caps within 0.25 mm. Authored trim wins over backing, and floors win over slab-edge caps; exposed rims, curved/sloped geometry and the canonical collision layout stay unchanged. The export receipt records removed area per source object. Run `node web/tests/station-overlaps.mjs` to check wall, floor, tactile, landing and skyway seam coverage in the actual GLB. These surfaces no longer rely on material-wide depth offsets.

The exporter reads textures beside the selected layout and writes its audit receipt
inside the selected output. With no options, the original paths remain unchanged.
Review both candidates, then promote the matching source and visual exports into
the current station bundle and update `web/v2/assets.json`. Do not replace only
one side of that pair. Geometry changes alter the layout hash; verify all current
starter routes and update their definitions before publishing a changed station.

`art-source/phase3/robot/build_robot.py` generates the original rig; `tools/build_atrium_detail.py` generates hardware. `tools/build_stair_materials.py` generates textures using Python, NumPy and Pillow. The Blender source remains the editable authority for manually authored station geometry.

## Pack and verify a new version

Run `npm run assets:pack -- assets-vN` with a new version. The packager validates
the current station/campaign, archives the six explicit regular files, checks
that none changed during compression, and updates `assets-manifest.json`.
It writes `.local/asset-pack/kyoto-assets-vN.tar.gz` and refuses to overwrite an
existing archive. Review the manifest, then run `npm run test:assets:setup`.

That check creates one disposable source-only install, runs the real setup
command against the prepared archive, regenerates collision data and exercises
offline browser play. It includes no Unity project, source art, preinstalled
node_modules or generated collision files. It removes the temporary install
and keeps only small receipts under `.local/asset-setup-test/`.

Publish the verified archive on the matching versioned GitHub asset release;
this supplies source-checkout setup and does not deploy the live game. Verify
the published download against the manifest. Never replace a published archive
or add the binary to Git history. Keep one current local archive; obsolete
generated packs can be removed after their replacement is verified.

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
