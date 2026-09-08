# Structural gap candidates (K007 / K016)

These tools produce review candidates, not an in-place layout migration. Keep the
canonical layout, challenge revisions, replay bytes and asset manifest unchanged.
The baseline release layout is `650fed69aa6ab63af523f8f8aa8819858672ffd3994a1be6c2e9ea1aaa7731d2`.

## Reproduction and bounded inventory

A 20 cm vertical grid over the full 210 × 70 m concourse (367,500 rays) found four
intentional moving-entry slab apertures. Native robot-v4 throws reached their
moving treads without escaping. All authored routes were sampled at <=10 cm;
remaining zero-width boundary ray misses alone were not treated as ball gaps.

The concrete **Catch the Lift** regression uses current local revision 6, its
existing start `(17.919998,0,6.373336)`, yaw 90, pitch -30, precision range,
343/2800 power, and backspin -130 instead of the hint's -100. Release phase near
0.2 seconds of the 0.7900353-second pitch period reproduces the failure. The ball
rides uphill, then enters the solid upper landing: `(29.54169,5.49243,6.15334)`
at about 24.53 seconds, below the landing's y=5.5 surface. Native diagnostics
recorded 48 overlap recoveries. It subsequently dropped to the concourse.

The tread centre starts its downward return before its trailing half-pitch has
cleared the fixed landing edge. A real transfer plate must pick up the ball
before that descent. The candidate adds a steel plate at both ends of the two
east lower lanes: overlap = half tread pitch + 60 mm, outer floor overlap 20 mm,
thickness 37 mm, finished top 2 mm above floor. Speed, path and physics stay fixed.

Three additional missing apron strips beside/between those lanes occupy
x=28.6–29.5, y=4.9–5.5, z=5.65–5.94 / 7.06–7.39 / 8.51–9.4. They continue the
existing architectural landing and retain both moving channels. Native throws
from `(30.7,5.5,8.55)` or `(30.7,5.5,5.53)`, yaw -90, pitch -65, robot-v4 power
0.012 drop through the missing approach. After repair they contact the apron;
a ball can still travel off its open x=28.6 edge. That is not penetration of the
repaired footprint, nor is this a claim of station-wide external containment.

## Rebuild and verify

```sh
blender -b art-source/atrium/KyotoAtrium.blend --python tools/repair_atrium_structure.py -- --issue gaps --output artifacts/gap-candidate
node tools/verify_structural_candidate.mjs runtime/station-layout.json artifacts/gap-candidate
blender -b --python tools/audit_atrium_gaps.py -- runtime/station-layout.json artifacts/gap-audit
node tools/probe_structural_native.mjs runtime/station-layout.json tools/structural-gap-cases.json artifacts/gap-before.json
node tools/probe_structural_native.mjs artifacts/gap-candidate/station-layout.json tools/structural-gap-cases.json artifacts/gap-after.json
```

The native probe starts a dedicated worker with a separate log and writes no
service records. The separate service/browser probes only accept localhost.
`check_gap_evidence.mjs` checks an observed baseline slab breach against four
repaired top-transfer phases and three apron contacts. It requires physical rest
with zero translation and spin for the four successful top-transfer shots.

Verified evidence in this fleet run lives under `artifacts/k007/` and
`artifacts/k016/` (uncommitted). Candidate v3 has seven matching meshes, 6,601
matching GLB/collision rays, four -130 phase trials settling on the upper landing,
and native walking across the north apron and both comb transitions. Matched
browser views are `artifacts/k016/top-before.png` / `top-after.png`. These are
actual rendered GLBs inspected with browser orbit input. Full game input also
runs on 4273; software rendering does not establish Mac GPU performance.

## Integration

Review `candidate.json` checksums, the saved Blender source, collision JSON and
`repair-overlay.glb` together. The overlay contains only additions; combine it
with the pinned original station or rebuild the full browser export from the
candidate source. Preserve the original textures from the pinned asset pack.

A new layout revision/asset release and challenge migration are coordinator
work. Earlier transfer changes final landing distance, so review the hint/target
on a new challenge revision. Decorative comb grooves must align with the new
`*-comb-transfer` rectangles; do not move collision to follow the old flat decal.
No native C# change or worker rebuild was needed for these mesh-only candidates.
