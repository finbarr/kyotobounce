# Garden structural integration (K008)

Consumes the station lane's `RoofGardenCandidate.blend` and
`garden-candidate.json`; the decorative builder remains station-owned. Do not
copy its implementation. This stage builds on the K010 combined candidate,
retaining all earlier collision records and the garden datum Y54.498245614035106.
The original sources, canonical layout and public service remain untouched.

## Actual fit and access repair

The handoff rectangle X[-168,-142], Z[-35,-9] was an inferred envelope. The actual
landing14 polygon is narrow and curved: at Z-34 it occupies approximately
X[-153.665,-151.770], entirely away from the proposed X[-157.2,-154.8] stair foot.
Its sampled widths range about1.77–2.11m, not the width of its bounding box.
Existing north/south building floors and façades also intersect the original
outer garden rectangle, with another floor overhead. Those building surfaces
are preserved.

The supplied garden mesh is fitted inside the actual straight façade segments
with >=0.35m planned separation. Straight fitted boundaries keep deck edges,
long glass/rail members and intermediate posts aligned. The original x envelope
is retained. The fit transforms the source mesh directly; collision panels are
exported from those exact transformed meshes, including furniture and guards.
Woody bamboo and solid lamp parts have mesh contact; foliage remains decorative.
The source's independent float32 deck box seams are welded before fitting.

The stair moves3m in +Z, from Z[-34,-25.32] to[-31,-22.32], retaining28 rises of
0.175438596491228m, 0.31m treads and both original elevations. This creates room
for a supported turn clear of the south façade. Structural stair/slot width is
2.6m, leaving >=2.4m between side fixtures. Sloped glass infill closes the gaps
between access posts. The upper deck retains the full corresponding stair
opening; no floor is drawn across moving/walkable geometry.

The lower turn X[-157.3,-154.7], Z[-33.6,-31] is supported at Y49.585965 by a
western extension joined to the actual landing14 polygon. Its eastern edge
preserves the original landing/flight14 junction. Glass closes exposed turn
edges while retaining entry from the existing landing and exit onto the stair.
The native test walks continuously from(-153.5,49.586,-32.3), turns at x-156,
climbs all28 steps and continues across the garden. No teleport occurs between
its three verified walking checkpoints.

The [operator's description](https://www.kyoto-station-building.co.jp/service/square/)
identifies the rooftop terrace reached from the grand stair and gives59.8m for
the observation point. That prose is not used to rebase the retained game datum.
The resulting geometry is an inferred game interpretation, not surveyed data.

## Rebuild and verify

Use the station-owned source handoff and matching metadata as `HANDOFF`.
The directory is an input, not another maintained decorative generator.

```sh
blender -b artifacts/tactile-candidate/KyotoAtrium.blend --python-exit-code 1 --python tools/repair_atrium_structure.py -- --issue garden --layout artifacts/tactile-candidate/station-layout.json --garden-handoff HANDOFF --output artifacts/garden-final
node tools/verify_structural_candidate.mjs artifacts/tactile-candidate/station-layout.json artifacts/garden-final
blender -b --python-exit-code 1 --python tools/verify_garden_candidate.py -- artifacts/garden-final
KYOTO_WORKER_EXECUTABLE=/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64 node tools/probe_structural_native.mjs artifacts/garden-final/station-layout.json tools/garden-native-cases.json artifacts/garden-native.json
node tools/check_garden_evidence.mjs artifacts/garden-native.json artifacts/garden-acceptance.json
blender -b --python-exit-code 1 --python tools/export_structural_browser.py -- artifacts/garden-final/KyotoAtrium.blend artifacts/garden-final/station-layout.json artifacts/garden-browser
```

The native worker input is explicitly selected, isolated and immutable for this
run. Verified archive SHA256:
`7dda5a50df0b432ae0def01f1b2b7f0c6dfd1caeecdc510f8a2884dbdaaf82ec`.
Verified Assembly-CSharp.dll SHA256:
`9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef`.
No activation/license workaround or native rebuild was needed here. The
escalator renderer and authoritative stationTime/motion contract are unchanged.
Camera-owned jitter/history fixes and waypoint-level authoring are separate work.

## Evidence and handoff

Fleet final candidate: `artifacts/k008/final/`; complete browser pair:
`artifacts/k008/browser-final/`. Candidate metadata records exact files/hashes,
fitted boundaries, original handoff metadata and imported source object names.
The garden overlay is additive to K010; the complete browser asset includes all
prior gap, rail, enclosure, tactile and garden source geometry.

Checks:63 matching meshes with unrelated canonical records preserved;55,186
garden support rays,700 tread support/headroom samples over2.4m clear width,
625 lower-turn samples and conservative façade half-space checks all pass.
Native evidence `native-final.json` / `native-acceptance.json` proves continuous
walking and eight shots covering four deck sections and all four perimeter sides.
Every observed ball stays above the garden floor. Any native Result is checked
for sleep and zero translation/spin. Other observation windows are not reported
as completed shots. A finite grid is supplemented by actual native trials.

Read the local fleet RESULT/STATUS for final browser evidence and exact hashes.
Superseded exploratory builds/captures are removed once final receipts exist;
original assets, final-stage candidates and acceptance/reproduction evidence
are retained. Completed diagnostic services are stopped. Public4173 is unchanged.

Coordinator owns versioned asset publication and canonical integration. K019
level owner on kyoto-camera consumes these final candidates for new level proof.
The previously documented tactile/Catch the Lift disk overlap remains relevant:
new level placement/hints must be reviewed for the new layout. No old challenge
or historical replay bytes are rewritten here. Station integration must remove
old painted tactile relief planes when using the actual raised source meshes.
