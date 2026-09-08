# Station detail integration

Bounded composition of the reviewed K025 Heart-in, K027 East Square, K028 plaza
landmarks and K029 exhibit layers. Source baseline: `4ee2976`, `assets-v2`, layout
`7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775`.
The feature source commits are `d250b64` (including `f0af622`), `8a76d12`,
`43e4107` and `b1a42b3`. Their source and provenance remain in sibling folders.

The assembler removes only the exact existing `konbini-*` record/object IDs,
retains their supported public gallery, and imports four standalone sources.
All other baseline collision records are compared for exact equality. Substantial
triangle meshes are compared vertex-by-vertex and topology-by-topology against
their native proposals; shop boxes are compared in their oriented local axes.
The final blend embeds the exact chosen `Kyoto runtime seed.json` bytes.

Heart-in materials receive a `k025-` prefix to avoid Blender library naming
collisions. East Square retains `K027 ` labels; plaza and exhibits retain `k028-`
and `k029-` labels. Source colors, roughness, metalness, transparency and emission
are captured as layout metadata. K029's standalone proposal lacks these material
records, so they are extracted from its original Principled shader nodes.
The shared exporter is unchanged; the bounded wrapper preserves source emission,
checks the reopened embedded seed and rejects intersecting solids across features.
All exported materials receive the shared ` | Browser` suffix.

Prepare reviewed standalone outputs under an ignored `INPUT` directory:

| Folder | Required files |
| --- | --- |
| `heart-in` | `WestExitHeartIn.blend`, `colliders.json` |
| `east` | `east-square.blend`, `collision-proposal.json` |
| `plaza` | `PlazaLandmarks.blend`, `collision-proposal.json`, `textures/` |
| `exhibits` | `StationExhibits.blend`, `collision-proposal.json` |

Run Blender 5.2.1 processes sequentially. Use a fresh output directory each time:

```sh
python3 web/station/assembly/archive.py --source BASELINE_CHECKOUT --output ARCHIVE
blender -b -t 2 --python-exit-code 1 --python web/station/assembly/build.py -- --inputs INPUT --output CANDIDATE
blender -b -t 2 --python-exit-code 1 --python web/station/assembly/export-browser.py -- --source CANDIDATE/KyotoAtrium.blend --layout CANDIDATE/station-layout.json --output CANDIDATE/browser
blender -b -t 2 --python-exit-code 1 --python tools/build_atrium_detail.py -- --layout CANDIDATE/station-layout.json --output CANDIDATE/browser --source-output CANDIDATE/hardware-source
npm run build:web
node web/station/assembly/check-native.mjs CANDIDATE direct
node web/station/assembly/serve.mjs CANDIDATE
```

With that private service running on 4288:

```sh
node web/station/assembly/check-native.mjs CANDIDATE service
python3 web/station/assembly/receipt.py CANDIDATE
```

The native adapter reuses feature assertions against the combined collision hash,
changing only paths, output locations and the isolated service port. It verifies
the immutable worker assembly SHA before executing. Original native source and
the shared worker are unchanged. Its direct checks prove shop circulation/rest
and plaza openings/walking/contact; its service checks prove East Square walking,
globe passage/full-rest contacts and all exhibit approaches/solid contacts.
These checks create private local test records only. The coordinator owns final
starter migration and hardware-browser acceptance.

`archive.py` checks all 34 assets-v2 manifest files before copying, and rechecks
the copied bytes. The old collision, browser assets and editable sources remain
separate from the candidate. Publication must preserve the complete old bundle
and archive registry; this task does not publish a release or deploy.

Handoff files: `KyotoAtrium.blend`, `station-layout.json`, `textures/`, `browser/`,
`hardware-source/`, `assembly.json`, `receipt.json`, `browser/cross-feature.json`
and `evidence/`. Receipt render costs are static triangles/material batches/bytes;
they are not hardware frame-rate measurements. Generated binary files stay out
of Git and belong in the coordinator's next versioned release pack.

The requested bounded capacity smoke is `node web/station/assembly/capacity.mjs
CANDIDATE`. It runs the existing benchmark once at 1 and 16 sessions, with a
10-second observation and 2-second warmup, using its own port 4283, database and
logs. It stages a private First Bank fixture without modifying the source catalog.
Its receipt explicitly labels the run geometry-only: the assembly lane does not
include the coordinator's latest browser/avatar changes.

The inherited Hiragino warning belongs to the hidden `Kyoto Theatre | Editable
lettering source` FONT object. The visible Japanese lettering is already mesh
geometry. `audit-fonts.py` records the dependency without replacing it or packing
a proprietary font. `compare-browser.py` proves all 578 non-shop position, normal,
index and transform buffers equal assets-v2. 575 batches also preserve every UV
byte; three untextured East canopy groups have only one-ULP UV rounding (maximum
5.96e-8). No visible glyph relies on a Linux font fallback.
