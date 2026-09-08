# K027 Furnished 7F East Square

Original, reproducible candidate furniture for the retained East Square court.
The station source, canonical collision layout, exporter, release manifest and
historical assets are coordinator-owned and are never overwritten by this job.

## Evidence and authored interpretation

The [operator plaza guide](https://www.kyoto-station-building.co.jp/service/square/)
identifies East Square as 7F and describes the gazebo. Its
[daytime photograph](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_eastsquare_01.jpg)
shows a predominantly bare branching tree held by crossed timber supports, small
paving fittings around its base, long pale low platforms with short stepped ends,
and a white spherical frame with open sides and ornamental curved ribs. The
[installation diagram](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/special_setting/img/img_aboutlegobrickarea_map.png)
establishes the east-side terrace relationship, not metre-accurate coordinates.

`spec.json` records inferred dimensions, transforms, reserved circulation and the
dormant / late-winter foliage interpretation. Exact photo date and tree species
are unknown. The candidate retains the existing substantial floor/enclosure and
adds only the missing core furniture. The two compact three-tier seat runs are
an authored adaptation to the retained court's actual floor and ramp cutouts.
K029's boundary exhibits are outside this layer.

Native axes are X east, Y up, Z north; Blender uses X east, Y north, Z up. Floor
support is **Y34.62**, tested against upward floor triangles. The garden floor's
bounding box includes a ramp opening at X96..98.2, Z-10.5..-0.5 and unsupported
northwestern space. The generator does not fill either region.

## Reproduce

From the isolated worktree, the support check writes the inferred anchor
proposal to `.local/station-detail/anchors.json` before export:

```sh
python3 web/tests/east-square-support.py
blender -b --python web/station/east-square/build.py
blender -b --python tools/export_browser_art.py -- --source .local/station-detail/candidate/assembled.blend --layout .local/station-detail/candidate/station-layout.json --output .local/station-detail/candidate/browser
blender -b --python tools/build_atrium_detail.py -- --layout .local/station-detail/candidate/station-layout.json --output .local/station-detail/candidate/browser --source-output .local/station-detail/candidate/hardware
npm run build:web
node web/station/east-square/preview.mjs
```

Only one service may use 4283. Stop the task's baseline service before starting
its candidate. The preview runner stages symlinks to unchanged browser code and
copies candidate browser assets into a private serving root. It uses its own
SQLite DB/log and the specified immutable worker. It copies starter definitions
with the candidate identity into that isolated DB for fresh native tests; this
is not a historical migration or permission to release those revisions.

In another shell in the same worktree:

```sh
node web/tests/east-square-geometry.mjs
node web/tests/east-square-preservation.mjs
node web/station/east-square/verify-runtime.mjs
K027_STAGE=after node web/tests/east-square-browser.mjs
node web/station/east-square/receipt.mjs
```

Run the browser script with `K027_STAGE=before` against the untouched baseline
before switching services. It uses real game code, native private-course starts,
DOM walking and read-only telemetry. Reproducible headings use
the game's existing suggested-aim event and existing play-HUD CSS class for
consistent unobstructed captures; the normal scroll zoom selects the close
player-height camera, where the game hides the avatar; reduced-motion preference shortens the
course overview transition without changing geometry or physics. Its transparent Node WebSocket bridge postpones the local server connection
until the browser sends its real hello and answers native heartbeat pings outside
the slow renderer. This avoids shader compilation disrupting the local socket. It does not
synthesize game state, contacts or scoring. Linux SwiftShader timing is evidence
of this software renderer only, not Mac/Metal or hardware acceptance.

## Outputs and contact policy

`east-square.blend` is the isolated `k027-east-square` collection;
`east-square.glb` is its standalone visual. `assembled.blend` is a scratch copy of
the release source plus that collection. `collision-proposal.json` contains exact
native triangles for trunks, roots, substantial branches, braces, paving
fittings, seats and globe tubes. Tiny twigs and buds are decorative and have no
collision. Openings have no hulls, canopy volumes, hidden doorway faces or
independent collision approximations. No new textures or realtime lights.

Generated files, downloaded reference-only images, private data and evidence
stay outside Git. The final local RESULT.md and receipt.json record the actual
checks, hashes, limits and review paths.

Native walking switches from the validated private-course start to free exploration
before moving, so the normal launch-circle constraint does not masquerade as a
physical obstruction. Thin curved ribs cannot hold a planar scoring disk; actual
ball contacts prove their collision. The rib shot accounts for the robot hand's
0.22m lateral release offset.

`node web/station/east-square/rebuild.mjs` runs the listed authoring/export and
geometry checks sequentially. Stop the task preview first.
`node web/station/east-square/verify-runtime.mjs` runs both native suites and binds
the scoring receipt to the worker layout identity checked before and after.
The globe portals connect every clipped rib/hoop to a continuous arched trim,
retaining the 1.35m minimum opening at the ground fittings.

## Final integration handoff

The retained candidate includes the demonstrated gazebo-door correction: continuous
arched portal trims join clipped meridians and hoops. Final exports and native
walking, opening, structure-contact and scoring checks passed on layout
`8c2b2186437e367986e2d9ebe1d2255e41bbfa095bf9fe7fcf58f6de123d9855`.
Submitted transforms are frozen following coordinator registration review: no
K027/K029 AABB overlaps; miniature-to-south-seat separation is 3.555m.
Coordinator Mac review owns final moving-view acceptance and combined circulation,
visual and collision acceptance. Linux software captures remain supporting evidence.
Deployment is authorized for the assembly integrator; this feature session does
not deploy. Keep this one final layer and matching collision proposal for assembly.
