# Central hall: first source-based construction component

27 September 2026. [Visual comparison](central-hall-construction/index.html). This turn made construction progress. The full long-term goal remains active; the component is uninstalled and no final visual milestone is accepted.

## What changed

A representative gate/upper-bay component now has real openings and returns, pale/rose/dark stone samples, panel joints, glazing with metal frames, a tiled soffit, small recessed lights, grille samples and a bounded floor approach. The gate width is **16.999 m** in the city source. The upper side return uses a provisional **5.6 m** depth. Neither is presented as a surveyed dimension.

The source photos remain references. Nine original 512 px maps supply stone color, normal and roughness variation. A broad periodic texture pattern found in the first render was removed. All generated solids are closed and use the same coordinates for browser and native geometry. Small grille blades, mullions and light faces are decorative.

| Component | Result |
|---|---:|
| Triangles / vertices | 7,800 / 23,400 |
| Closed panels / colliding panels | 650 / 537 |
| Material batches / texture images | 8 / 9 |
| Raw GLB | 2,728,412 bytes |
| Calculated RGBA plus mip storage | 12 MiB |
| Full native triangle probes | 6,444 passing |
| Maximum native/browser hit difference | 0.000002845 m |
| Maximum serialized coordinate difference | 0.000001035 m |

These resource counts do not establish the Chrome gameplay budget. The inspection viewer uses its own static environment and lighting. The close camera renders seven visible batches / 7,656 triangles; the component has eight batches in total.

## Photo fit and uncertainty

The July 2026 photograph has six manually selected fitted anchors and two withheld checks. Fit RMS is **7.09 px**, maximum fitted error **11.68 px**, and maximum withheld error **22.09 px** at 1200 px width. All eight source vertices are exact and visible; the unchanged initial limit is 24 px. Independent projection implementations agree to less than 1e-12 px.

A fixed 2,000 px focal-length cap in the earlier fitting tool became active on this 2665 px-wide image. The tool now accepts explicit focal bounds and reports both focal length and active constraints. The new study uses 600–6,000 original-image pixels; its result is **2,104.75 px**, with no active bound. The earlier default portrait fit is reproduced exactly after the tool change. Observations and error tolerance were not changed to obtain the result.

The fitted camera is `(−28.98114, 6.64252, −9.20240)`, FOV 45.76551 degrees, roll 2.04851 degrees. Across 100 manual-pick perturbations, the 5th–95th percentile FOV is 44.34–47.11 degrees. That analysis excludes lens, crop and city-model errors. Several anchors are nearly coplanar. The wider hall and floor openings still lack independent correspondence checks. **This supplementary pose does not complete the broad central-hall acceptance view or reduce the thirteen remaining target registrations.**

Three additional side-edge observations, excluded from fitting, were projected onto the source bay's west-side plane. They imply depths of 5.55–5.69 m; the construction rounds their mean to 5.6 m. That spread is not a confidence interval. The floor/glazing datums, hidden closures, thicknesses, joints, grilles and lamp spacing retain explicit assumptions in [spec.json](central-hall-construction/spec.json).

## Verification and retained failures

- Independent serialization checks cover every vertex, triangle index and winding. All 7,800 face normals pass the geometric-normal check.
- The first build rejected a tiny residual head tile before producing an asset. Even cell partitioning removed the sliver; the failed receipt remains in `central-hall-bay-01`.
- The first native run checked all 6,444 triangles and found two probe origins within about 0.2 micrometres of an adjacent face. Browser and native rounding chose different surfaces there. The verifier now advances an origin only when its browser hit is within 0.1 mm, records the adjustment, and retains the original 1 mm hit tolerance. Exactly two origins moved from 0.2 to 0.2317 m. The complete rerun passes with no shared-surface exceptions.
- The original failed native receipt remains `central-hall-bay-native-02/report.json`; the passing run is [native.json](central-hall-construction/native.json). Component03 changes only original texture pixels relative to component02; native geometry hashes are identical.
- Photo, close and walking-eye-height component renders were inspected in Chrome. The final sample still has sharp edges, bright grazing seams, overly uniform interior illumination and incomplete glazing response. Those are open visual tasks, not hidden passes.

## Current artifacts and next integration step

Worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`.

- Specification: `.local/station-realism/central-hall-bay-spec-01/spec.json`.
- Component: `.local/station-realism/central-hall-bay-03/central-hall-bay.glb`.
- Native geometry: `.local/station-realism/central-hall-bay-03/native-panels.json`.
- Generator: `web/station/realism/build-central-hall-bay.mjs`; preparation: `prepare-central-hall-bay.mjs`.
- Fit and raw camera diagnostics: `.local/station-realism/central-hall-maeda-01/`.

Next, inventory the affected current hall/source layers and course paths, verify additional depth landmarks, and prepare a coordinated replacement at the gate, roof and forecourt interfaces. The component still excludes adjacent bays, full canopy bearing, gate equipment, complete shop threshold and forecourt. Preserve the installed courtyard candidate. Integration will need full-station collision, public-route and gameplay checks before it can replace that candidate.

The latest full station remains courtyard life04 / browser04. No C#, service, scoring or production changes were made. Full photographic fidelity, all-course proof, complete gameplay benchmarks and the twenty-minute audio/context soak remain open.
