# Station detail backlog — K006 first pass

This is a bounded, independently modeled interpretation, not a survey. Research
reviewed 2026-09-08. Photographs are viewing evidence only: no photo pixels,
commercial campaigns or third-party models enter the candidate assets.

## Reference register

- R1: [Station operator: design concept](https://www.kyoto-station-building.co.jp/about/history/).
  Establishes the central valley, east/west terraces and glass/metal enclosure.
- R2: [Operator: squares and public routes](https://www.kyoto-station-building.co.jp/service/square/).
  Official photographs and locations for Karasuma Square, Muromachi Square,
  the grand staircase and Skyway. The Skyway is at 10F, joining east and west.
- R3: [Karasuma Square daytime photograph](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_karasumasquare_01.jpg).
  Visible dark stair cheeks, light nosings, stone panel joints, repeated recessed
  square vents and glass mounting shoes. Dimensions below are estimates.
- R4: [Muromachi Square daytime photograph](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_muromachisquare.jpg).
  Visible stair riser equipment, dark stair field, contrasting nosings, panelized
  portal soffit, mirror glazing and strongly articulated metal cladding.
- R5: [Skyway interior photograph](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_skyway_01.jpg).
  Visible handrail joints, glass shoes, bolted connection plates and floor borders.
- R6: [Operator: grand staircase illumination](https://www.kyoto-station-building.co.jp/graphical_illumination/).
  Documents LEDs on 125 of 171 steps. Candidate hardware placement is an
  approximation on the retained game stairs; it does not reproduce a light show.

## Reproduced starting point

`KyotoAtrium.blend` contains 54,367 mesh objects / 1,290,631 source vertices,
including actual curved stair contours, rail posts, canopy, layered frontage,
coffers and signs. The browser uses a material/spatially batched GLB. Do not
rebuild already-present primary structure merely to add detail. Existing hardware
contains 672 glass clamps and 40 comb plates, but lacks stair-riser installations
and systematic surface articulation at terrace level. The browser overrides both
stair stone families with the same pale finish, losing the dark/light distinction
visible in R3/R4. Mac-only source fonts are missing on Linux; browser text needs
an installed Noto CJK fallback. Baseline captures and scene inventory are local
under `.local/fleet/k006/`.

## Priorities and disposition

| Priority | Missing feature / gameplay location | Evidence | Implementation and collision implication | Disposition |
| --- | --- | --- | --- | --- |
| P1 | Dark granite treads, pale nosings, stone joints and fine grip grain; east first/second stair and west grand stair | R3, R4 | Finish existing material families; retain all tread vertices, thicknesses and collisions. Anti-alias fine detail at distance. | First pass, group A |
| P1 | Daytime LED cassette rhythm across curved grand-stair risers | R4, R6 | Author shallow face strips from exact retained flight contours, below nosings, with separated lens/fastener details. Surface offset at most 2 mm; no tread obstruction. No animated or copied show. | First pass, group A |
| P1 | Metal/glass assembly detail along escalator approaches and terraces | R3, R5 | Add flush segmented metal shoe finishes and service joints on existing glass faces, using exported face triangles instead of guessed bounding boxes. Keep moving steps and rails intact. | First pass, group B |
| P1 | Recessed square vent fields and cassette/reveal finish on tall mineral frontage; east stair approach and terrace walls | R3, R4 | Procedural surface shading on existing cladding, restricted to appropriate frontage materials. Recess illusion only; no holes or floating equipment. | First pass, group C |
| P2 | Repetitive soffit service seams, recessed lamp trim and panel rhythm under portals | R4 | Much lighting/coffer geometry already exists. Audit individual soffit meshes before adding face decals; do not span curved canopy apertures with rectangular overlays. | Later finish pass |
| P2 | Complete wall-mounted bilingual destination hierarchy at terrace landings | R2, R3 | Fit existing sign boards; verify destination/side against floor guide. Standalone signposts require colliders. Preserve CJK glyphs now. | Text fallback now; hierarchy later |
| P2 | Roof and Skyway bolted truss connections, utility runs and expansion joints | R5 | Geometry belongs to existing beams; proposed enlarged nodes need collision export review if they protrude materially. High draw-call risk if unbatched. | Later structural/finish audit |
| P2 | East terrace planted stair edges, planters and sculpture; west square sculpture | R3, R4 | Visible solid features alter traversal and ball banks. Coordinator should place planters against current stair cheeks and sculpture on square, export fresh layout/GLB together, version layout and challenge compatibility. No safe exact coordinates until authored proposal is reviewed. | Deferred structural candidate; no obstacle exported |
| P3 | Accurate off-path shop interiors, furniture, rooftop gardens and night lighting programs | R2 | New furniture needs colliders; licensed displays/photos must not be copied. Night program is a separate art/lighting acceptance task. | Explicitly outside this pass |

## Acceptance and integration boundary

Deliver these three finish groups, inspect their Blender source and exported
geometry, and use actual browser input to visit matched entrance, east and west
atrium and east stair views. Compare render calls, triangles and frame timing in
the same Chrome/SwiftShader environment. Run typecheck, tests and browser build.
Keep `runtime/station-layout.json` byte-identical; no native rebuild is needed for
surface details. Only lightweight scripts/modules/docs are committed. Candidate
`.blend`, GLB and metadata need coordinator publication in a new versioned asset
pack. Local manifest and RESULT record checksums, measurements and exact steps.

## Authorized follow-ups and ownership (coordinator updates)

K007 floor holes, K011 segmented lower rails / exposed return treads, and K010
raised tactile contact are owned by physics. K009 global jitter/camera timing is
owned by camera/root. K018 event lighting/audio and K019 level design remain with
their assigned lanes. Do not disguise floor holes with decorative covers, or add
raised tactile meshes before their native collision profiles agree.

K012 jagged shadows, K020 doorway bleed and K021 fixture popping take priority
over additional decorative polish. This lane owns their rendering diagnosis in
`station-look.js` and any specifically justified visual export correction.
Structural duplicate surfaces go to physics; camera projection changes go to the
camera owner. K012 acceptance is stable softer edges with complete station
coverage and measured cost. K020 needs a matching location and moving-camera
before/after evidence, not a global depth offset. K021 needs stable fixture IDs,
hysteresis, fade-out before reassignment, unchanged shader light count and time
rollback tests.

### K008: west rooftop garden candidate

The operator's [roof garden photographs and map](https://www.kyoto-station-building.co.jp/service/square/)
identify Oozora Hiroba / Happy Terrace on the west rooftop, reached from the grand
staircase. Distinguish it from the modeled east garden at Y=34.62. Images
[`01`](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_oozorahiroba_01.jpg),
[`02`](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_oozorahiroba_02.jpg) and
[`03`](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_oozorahiroba_03.jpg)
show bamboo in yellow square beds, lawn, pale paving with dark insets, benches,
low rails and distinctive circular perforated light shades. Author those shapes
independently; do not texture with the photos.

The current model stops its grand staircase at Y=49.5859649123. It retains a
roof-garden datum Y=54.4982456140 and a measurement for 28 additional steps, but
has no matching rooftop floor or access flight. The published observation-area
height is 59.8 m; the retained datum remains an authoring assumption, not a survey.

Proposed garden footprint: Unity X[-168,-142], Z[-35,-9], floor top
Y=54.4982456140. This sits above the modeled western terminal block (westernmost
geometry X=-169.48). Reserve X[-157.2,-154.8], Z[-34,-25.32] for a northbound
return stair: 28 rises of 0.17543859649 m, tread run 0.31 m, width 2.4 m, connecting
(-156,49.5859649123,-34) to (-156,54.4982456140,-25.32). Its lower end lies on the
retained `north-circulation-landing-14`. This is a proposed fit in game coordinates,
not an assertion that the real roof stairs follow that exact plan.

Deliver a separate editable candidate with named floor/access opening, planting,
seating and guard groups plus collider proposals. Keep the arrival path at least
2.4 m wide. Physics/coordinator integrates the deck/access/obstacles together,
after gap repair, with layout and challenge version review. Candidate stays out
of gameplay until those collisions are present.

### K010: tactile geometry handoff

Warning dots and guiding bars are different geometry profiles. Replace the
present painted dots/ribs only when both renderer and physics use the same
placement/elevation/profile contract. Initial reference dimensions should be
checked against a manufacturer drawing (300 mm tile, 5 mm raised profile), with
sloped sides and flat tops, not spheres or square-edged 5 mm boxes. Existing
40 warning-pad placements are in `atrium-detail.json`; the straight directional
runs are currently authored in `station-details.js`. Export those exact
transforms in the agreed contact handoff. Native ball radius is 23 mm, so the
5 mm profile is materially significant to contact and must not be faked by a
normal map. Physics owns the eventual revision and before/after rolling tests.

### K019: authentic shop and top-deck route feasibility

The indexed [operator Kyoto shop map](https://www.dailyservice.co.jp/shop/map?type=kyoto)
(July 2026 information) and [shop listing](https://www.dailyservice.co.jp/shop/detail/4828)
confirm Seven-Eleven Heart-In JR Kyoto west entrance on 2F, outside the gates.
The [operator's December 2025 location diagram](https://www.dailyservice.co.jp/storage/uploads/pdf/01KB25N3CBB3T3DKDC8DC9TJYN.pdf)
is a registration reference alongside the north-south public passage. The live
map/photo fetch times out here; indexed primary text establishes identity and
floor, but does not establish shop frontage width or surveyed openings. The requested rooftop-to-shop shot is a level-study dependency,
not evidence of a clear trajectory. Current western south floors are full
stacked slabs at Y=7.35,15.5,19.586,23.972 and above: a direct line from the
roof through those floors is not feasible. Establish the real entrance relative
to the west 2F circulation before proposing a shop opening; do not relabel the
existing ground-floor cafe as this shop. Shop-specific mesh work awaits that
registration and the separate level study.

K010 proposed profile, pending physics agreement: [manufacturer 2026 catalog](https://www.eco-rubbertech.jp/pdf/catalog2026-2027.pdf)
and [manufacturer stud/bar drawing catalog](https://www.mandf.co.jp/mandfpdf/mandfvol9katarogu.pdf)
support separate tapered warning and guide profiles. Candidate warning tile:
300 mm square, 25 dots at 60 mm pitch / 30 mm margins, 22 mm base diameter,
12 mm top diameter, 5 mm high. Candidate guide: four bars at 75 mm pitch,
27/17 mm base/top width, 290/280 mm base/top length, 5 mm high. These are
profile proposals from product drawings, not a claim of JIS certification.
Preserve the exact current pad transforms; reference floor Y is the stored pad
Y minus its 3 mm visual offset. No added raised slab underneath the profiles.

## Final source disposition and coordinator acceptance

The coordinator moved final full-game visual/performance acceptance to Mac/Metal
on 2026-09-08. Local before views and Blender candidate inspections are evidence;
there is no claim of a completed matched full-game after comparison on SwiftShader.

- K006: curved riser cassette/lens surfaces, clipped glass shoes/service joints,
  mineral cassette/vent finish, stair finish and Noto CJK fallback implemented.
  Hardware candidate: 150 batches / 92,864 triangles, versus 100 / 46,176 before.
- K008: `build_atrium_detail.py -- --garden-output PATH` generates a separate
  editable roof garden, GLB and collider handoff. Final candidate has 58 meshes,
  26,816 triangles and 179 uniquely identified collider proposals, plus lamp
  shade mesh-contact requirements. Deck opening, access/perimeter guards,
  planting, seating and lamps are implemented; native integration is physics-owned.
- K012/K021: fixed four-tap shadow filtering, one-time whole-station frustum fit,
  reduced bias, and two fixed-count shadowless lights with fixture retention and
  fade-out before reassignment. Tests cover zero-intensity moves, bounded fade,
  tall-ceiling retention, clock rollback and complete shadow-frustum coverage.
  Final moving-view and GPU-cost acceptance belongs to root.
- K020: subtract covered upward cap fragments from
  `west-south-substrate-2-2` and `west-south-slab-edge-3-2-2`, supported by
  `west-south-floor-03`. Preserve side faces and exposed rim. The completed local
  export records four trimmed triangles / 0.935947 m². Camera projection and
  structural source remain unchanged. `use_active_scene=True` now excludes the
  unused authoring scene; root must use this source for the integrated export.
- K010: physics commit `97ca8d8` supplies 43 tactile patches / 86 canonical
  base and relief meshes. `station-details.js` removes the old painted relief
  planes; the canonical GLB supplies plain floor+0.1 mm bases and actual 5 mm
  contact profiles. Do not ship that source with an old asset pack missing the
  canonical meshes. The hardware builder fits grooves/trim to supplied
  `*-lower/upper-comb-transfer` panels and retains all 40 warning transforms.

The final comb-support and active-scene source corrections arrived while the
last export was running. Per coordinator instruction it was allowed to finish
and was not restarted. Existing hardware/main GLB candidates therefore need an
integrated rebuild; the garden geometry is already independently generated and
validated. Exact generating-source receipts, asset hashes, test results and
camera coordinates are in the local fleet handoff. No asset pack or deployment
was published from this lane.
