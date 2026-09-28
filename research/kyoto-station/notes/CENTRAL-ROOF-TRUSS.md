# Central canopy inner structure

27 September 2026. [Visual construction study](central-roof-truss/index.html).

## Evidence and construction

The canopy now has a registered two-layer structure in the isolated `central-roof-04` component. The [published structural account](CANOPY-PUBLISHED-STRUCTURE.md) gives 2 m nominal depth and 100 mm square tubes; [engineer photographs](https://www.kanebako-se.co.jp/works/view/240) corroborate inner/outer chords and diagonal webs. The municipal 113-face outer envelope remains exact. Grid pitch, phase and aligned-lattice diagonal pattern are explicit authoring hypotheses, not verified fabrication details. The nominal depth is represented between chord centrelines; the publication does not establish this convention.

Shared interpolated vertex normals offset the inner lattice by 2 m. Curved inner chords split at lattice nodes and source-facet boundaries; collinear joints are merged. Both native collision and browser geometry come from the same closed panels. The component has 3,154 outer runs, 8,298 inner runs, 6,626 diagonals and 3,854 depth struts: 21,933 panels and 263,568 triangles in two materials.

## Validation

The first draft passed native/browser comparisons but a separate continuity check exposed up to 47.18 mm of inner-node centreline error. Candidate04 corrects this: maximum node-to-chord error is 5.65e-9 m in double precision. Shared source-edge offset agreement is 1.08e-7 m. These measure construction consistency, not architectural accuracy. All panels are closed, oriented and positive-volume. Float browser/native coordinate error is at most 4.23e-6 m.

All 826 native/browser sampled first hits pass, with maximum hit difference 0.000373734 m. The samples include both glass sides and six faces on 32 members from each new structural family. The complete component and report are byte-identical on repeat. Running the builder without `--truss` preserves the previously verified outer-only GLB and native JSON exactly. `npm run build:web`, JavaScript syntax and diff checks pass.

Both component views were inspected in Chrome. They show the inner lattice and transverse connection, but use inspection lighting and cameras. They do not establish game performance, final materials or photograph alignment.

## Skyway and integration limits

The source horizontal-face inventory records 42 faces within the broad Skyway-height search region; it does not identify a continuous central corridor floor. The source underside and roof ledges must not be treated as proven walking surfaces from height alone. Central/eastern corridor endpoints and support attachments remain unresolved.

This component is not installed in a playable candidate. `station-central-interface-01` remains the current construction scene with three old-canopy conflicts and the Skyway Trapdoor failure. Its prior runtime pass does not cover this new truss. Supports, branch/end joints, western/eastern flares, municipal inner shell and Skyway need coordinated integration, followed by full exported/native, public-route, authored-course and performance checks. No deployment occurred and no final visual milestone is accepted.

## Reproduce

In the reconstruction worktree, run `build-central-roof.mjs` with the municipal source, `roof-registration/fit-02/fit.json`, the `station-east-clearance-01` layout, a fresh local output directory, and `--truss`. The maintained `registrations/central-roof-truss.json` records sources and assumptions. Use `verify-roof-component.mjs` in `component-only` mode with the compatible native worker, then `project-source.mjs` with the saved inspection cameras.

Exact hashes, cameras, construction and native receipts are linked in the gallery. The full long-term scope remains active.

The gallery passes Chrome checks at 1440 and 390 px: four loaded images, ten valid links, no overflow or page errors. Its desktop rendering was visually inspected.
