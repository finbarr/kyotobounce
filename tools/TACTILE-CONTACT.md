# Raised tactile contact candidate (K010)

The current station detail renders warning dots and directional bars as painted
flat planes. There are no corresponding raised collision surfaces. This repair
adds matching native and visible mesh profiles at the actual supporting floor
datum, retaining the 40 warning-pad footprints in `atrium-detail.json`, two
concourse directional strips and their 600 mm-square dot junction.

## Profile and sources

Dots: 12 mm top / 22 mm base diameter, 5 mm height, 60 mm centres. Bars: 17/27 mm
top/base width, 280/290 mm top/base length, 5 mm height, 75 mm transverse pitch
and 300 mm tile pitch. Sloped geometric sides engage the ball. Dot circles use
16 facets (maximum radial approximation error 0.212 mm); bars are trapezoidal
prisms. These are visible geometric approximations, not an accessibility survey
or certification. No new texture, friction modifier, random force or energy
adjustment is introduced. Each patch inherits its supporting floor's physical
material; its yellow appearance is separate.

Primary references for the numerical profile:

- [MLIT-hosted Japanese road design report](https://www.mlit.go.jp/sogoseisaku/inter/keizai/gijyutu/pdf/road_design_j2.pdf), printed pp. 133–134: warning/directional patterns; 12/22 mm dots, 5 mm height and 55–60 mm spacing.
- [RTRI, Mizukami et al., 2005, Fig. 1](https://www.jstage.jst.go.jp/article/rtriqr/46/1/46_1_40/_pdf): experimental dot and bar dimensions, including 17/27 mm widths and 280/290 mm lengths. Its rounded experimental bar ends differ from JIS. This candidate uses an explicitly simplified trapezoidal end profile.
- [Mitani et al., 2007](https://www.jstage.jst.go.jp/article/sicetr1965/43/3/43_172/_article/-char/en): experimental white-cane detection of 5 mm-high JIS blocks.

## Rebuild and verify

Build after the reviewed K007/K011 source/collision pair. The build refuses an
existing output directory or an unsupported warning-pad floor datum.

```sh
blender -b artifacts/escalator-candidate/KyotoAtrium.blend --python tools/repair_atrium_structure.py -- --issue tactile --layout artifacts/escalator-candidate/station-layout.json --metadata web/public/assets/atrium-detail.json --output artifacts/tactile-candidate
node tools/verify_structural_candidate.mjs artifacts/escalator-candidate/station-layout.json artifacts/tactile-candidate
node tools/verify_tactile_profile.mjs artifacts/tactile-candidate
node tools/probe_structural_native.mjs artifacts/escalator-candidate/station-layout.json tools/tactile-contact-cases.json artifacts/tactile-before.json
node tools/probe_structural_native.mjs artifacts/tactile-candidate/station-layout.json tools/tactile-contact-cases.json artifacts/tactile-after.json
node tools/check_tactile_evidence.mjs artifacts/tactile-before.json artifacts/tactile-after.json artifacts/tactile-acceptance.json
```

The direct-native harness starts an isolated compatible dedicated worker and
writes no service/database records. It sends actual native placement, aim,
charge and release inputs; it never injects ball poses or substitutes scoring.
The five cases include two low-speed rolling approaches, warning/bar bounces,
and a faster warning-pad impact. Low-speed contacts are visible in native
contact diagnostics; they correctly do not count as scoring impacts. These
checks require physical rest for the two rolling trials. Other observed flights
are not falsely completed after the observation window.

Fleet evidence is under `artifacts/k010/`: `candidate-v2` has 43 patches, 4,620
raised features, 86 matching raised/base meshes and 129 matched top/slope/valley
ray checks. `verified-before.json` / `verified-after.json` combine the same-input
bounce and final rolling trials; `native-acceptance.json` checks them. Bounces
hit the 5 mm tops at 2.62, 3.48 and 6.86 m/s. Rolling approaches at 0.142 m/s
contact nonvertical normals and stop 0.128/0.130 m sooner than the flat baseline,
then reach native Result with zero velocity and spin. This is the expected
geometric interaction; large bounce deflections are native surface response.

Real browser orbit/motion input and inspected close views are
`dots-profile.png` / `bars-profile.png`. These load the candidate GLB overlay
above the K011 full station GLB. Software rendering is local visual evidence,
not a measurement of the user's Mac GPU. There is no Unity activation blocker:
the unchanged native mesh schema consumes these new panels directly.

## Coordinated integration still required

`candidate.json` lists exact source/layout/overlay hashes. `tactile-profile.json`
contains every footprint, supporting floor/material, orientation and feature
count. The combined collision candidate includes the prior gap/escalator work;
its overlay contains only tactile additions. Build the full browser GLB from
the combined saved source when preparing a new asset revision.

The station owner must replace the existing painted relief planes at floor
+3/+4/+6 mm. Leaving them in place obscures these actual 5 mm profiles. Use the
new raised meshes and their plain base at floor+0.1 mm; do not stack old fake
relief above them. Bars beneath the dot junction are excluded. If the station
owner moves footprints/elevations, regenerate this candidate with the agreed
metadata before integration. No station-owned decorative source is edited here.

Candidate collision JSON is about 162 MB and tactile overlay about 11 MB;
review native startup/memory and full asset packaging during integration.
These files remain outside Git. Canonical layout, manifests, production records,
score rules and historical replay/challenge revisions are unchanged. A new
reviewed layout/asset revision and challenge review belong to the coordinator.

The existing Catch the Lift disks cannot be copied unchanged onto this tactile
layout: native `BrowserCompetition.ValidateDisk` samples one uninterrupted
surface ID and rejects dot tops within a disk. The lower warning pad spans
x=17.61–17.91 (z=5.92–7.08); the historical start x=17.92, radius 0.25 overlaps
it. The upper pad spans x=29.99–30.29; the historical goal x=30.618, radius 0.5
also overlaps it. Evidence: `artifacts/k010/lift-final.log` records all four
original trials rejected at placement. This is an explicit integration limit,
not a claim that the combined candidate passes the unchanged K016 challenge.

Coordinator must review new disk locations/hints for this new layout, or
coordinate a native policy that identifies the supporting architectural floor
beneath fine tactile relief. Do not reuse duplicate surface IDs, disable the
profile collider or silently rewrite historical challenges. The prior K011
candidate passes all original K016 phases without this tactile addition.
The combined candidate passes `test:runtime` on isolated 4274 after creating
new local test revisions of the unaffected First Bank challenge; this does not
waive the Catch the Lift disk-placement review.
