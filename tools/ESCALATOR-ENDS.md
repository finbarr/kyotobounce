# Escalator end repair (K011)

Build after the K007/K016 gap candidate. Twenty authored lanes retain their
exact native/renderer paths, speed, tread count, step dimensions and timing.
No `escalators.js` or C# change is needed. The existing worker loads the new
panels through its existing collision schema.

Each side now has one connected, smoothly shaded handrail sweep (16-sided
96 mm section, 48 subdivisions per 250 mm-radius return curve), replacing the
old separately capped segments. Matched solid end pockets surround the entire
return-tread envelope, with bottom, side, end and roof panels. Their depth also
accounts for the half-pitch corners on an inclined return. These are real steel
pockets extending beneath the thin concourse slab, visible from below; treads
are never culled or independently retimed. Matching visible casing represents
the native worker's existing BuildDeck solids without duplicate colliders.

The top and bottom transfer plates use the same dimensions verified for K016.
End-pit covers finish 2 mm below existing floors, preserving challenge disk
surface identity. Short transfer plates finish 2 mm above them. The full-cycle
check includes all critical box corners and actual browser instance transforms,
not just path centres. Every lane end has native ball-contact evidence.

```sh
blender -b artifacts/gap-candidate/KyotoAtrium.blend --python tools/repair_atrium_structure.py -- --issue escalators --layout artifacts/gap-candidate/station-layout.json --output artifacts/escalator-candidate
node tools/verify_structural_candidate.mjs artifacts/gap-candidate/station-layout.json artifacts/escalator-candidate
node tools/verify_escalator_envelopes.mjs artifacts/escalator-candidate
node tools/probe_structural_native.mjs artifacts/escalator-candidate/station-layout.json tools/escalator-transition-cases.json artifacts/escalator-transitions.json
node tools/check_escalator_transitions.mjs artifacts/escalator-candidate/station-layout.json artifacts/escalator-acceptance.json artifacts/escalator-transitions.json
node tools/probe_structural_native.mjs artifacts/escalator-candidate/station-layout.json tools/structural-gap-cases.json artifacts/lift-after-escalators.json
blender -b --python tools/export_structural_browser.py -- artifacts/escalator-candidate/KyotoAtrium.blend artifacts/escalator-candidate/station-layout.json artifacts/escalator-browser
```

The candidate-only browser export wrapper uses the station owner's exporter
with explicit paths and `use_active_scene=True`. The pinned exporter otherwise
includes an unused authoring scene (49,858 root objects), bloating the original
GLB. The wrapper does not edit that shared source. Coordinator/station should
review adding this export option independently. It fails if path assignments
change and never overwrites an existing output directory.

Verified fleet evidence: `artifacts/k011/candidate-v3/` is the reviewed collision
and Blender pair; `browser-v4/` is its full browser export. Candidate v2 is
superseded because its raised pit covers interfered with challenge placement.
Geometry checks: 356 matching added meshes, all unrelated records unchanged;
316,800 continuous-motion box-corner checks; 37,706 actual renderer poses.
Forty transitions are covered by 41 native throws, plus four Catch the Lift
backspin phases and three native walking traversals. Matched browser views
`top-after.png` and `entry-under-after.png` were inspected with real orbit/motion
input. Compare with K007's `entry-under-before.png` and K016's `top-before.png`.

Integrate the saved source and collision together through a NEW reviewed asset/
layout revision. Rebuild the full browser GLB: an additive overlay alone cannot
remove the old rail segments. Align station-owned decorative comb grooves to
`*-comb-transfer`. No canonical layout, release manifest, challenge revision,
public service or deployment was changed by this task.
