# Central hall basement descents

[Construction gallery and verification receipts](hall-descents/index.html).

**28 September 2026:** both source banks now contain working paired escalators, fixed landing covers and a supported first lower deck. This advances the representative central-hall area. The component remains uninstalled; the full station remains courtyard life04/browser04. No final visual milestone is accepted.

## Evidence and construction

The lane measurement uses municipal source objects `BuildingInstallation.1541` and `.2070`, with landing plates from `.1601` and `.1471`. Horizontal tread polygons are grouped by elevation into two lanes per bank. Fitting their central centroids gives inclines of 30.08792° west and 30.08830° east, with maximum fitted residuals of 1.36 mm and 1.55 mm. Those are residuals within the coarse source mesh, not survey accuracy.

Each lane is approximately 0.98456 m wide. The bank rise is 4.913583 m, the inclined horizontal run is about 8.4804 m, and each flat end is about 1.234 m. Positions, lane spacing, widths, incline and the cover-to-cover span follow the source. Source landing plates sit about 18 mm below the adjacent source floor; the construction aligns them to playable floor levels Y=0 and Y=−4.913583.

The unchanged game escalator renderer and native moving-box physics supply motion. Speeds of ±0.5 m/s, direction, phase, 0.35 m path easing, 0.4 m turnaround radius, nominal 0.4 m tread pitch, 0.24 m step height, casing sections and pit depth remain explicit game settings. They are not measurements of the installed machinery.

The lower deck preserves its 157.810488 m² source footprint and two holes, with an assumed 0.18 m construction thickness. Four fixed landing infills follow the source plate outlines after subtracting existing pit covers, comb transfers and floor. At the upper ends, the outline extends at most 6 cm toward the existing hall floor and is clipped against it. The infills are 6 cm thick. All 590 parent hall records remain identical, including the three upper openings and their guards.

The [official operator directions](https://www.kyoto-station-building.co.jp/directions/), rechecked this turn, describe the central-concourse route to B2F and Porta. The [earlier basement evidence](CENTRAL-HALL-BASEMENT.md) includes a B1F label in the recent photograph. That does not yet identify the source model's first lower deck: no deeper continuation or definitive floor label is invented.

## Candidate and verification

Worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`.

- Component: `.local/station-realism/hall-descents-02/`; 125 closed records, 63,576 triangles, 73,986 vertices and four material batches.
- GLB SHA-256: `91d4eab38640e01cb7c27a5cb2d10db2c1d897ea0caee9b189c10188b046b976`.
- Native SHA-256: `b25a46d4e9df1a45bbf1cf48782633b491c7c70a9b90cfe520ab26541fa6c1b7`.
- Assembly: `.local/station-realism/hall-descents-assembly-02/`, combining descent02 with unchanged hall11. It has 715 static records; its GLB is 5,996,356 bytes.
- Assembly native SHA-256: `96f08f702acd6e943cd0e2be4b4584e076dbd67a03d0ed343ef781aad1cf8fc8`.

Checks on the final candidate:

1. Every emitted browser/native coordinate, triangle index and winding agrees; maximum Float32 coordinate difference is 0.536 µm.
2. All 125 records are closed with positive volume. Each return-chain envelope passes 4,904 swept-corner checks. These establish game housing containment, not fabrication validity.
3. The lower-floor footprint matches the source polygon exactly in the planar comparison and retains two holes. All four infill outlines match their construction polygons. Maximum numerical overlap with the existing floor is 1.03e−9 m², below the 1e−6 m² check.
4. The actual browser tread function passes 128,000 samples across 80 phases. Maximum height error against the native-box oracle is 0.241 µm; maximum adjacent join error is 0.909 µm, both below the unchanged 10 µm limit.
5. `hall-descents-native-03/report.json`: 324 native support/headroom samples, 24 through walks and four standing rides pass, with no browser/native head-ray mismatch. Each lane is walked both ways at lateral offsets −0.1, 0 and +0.1 m. No fallback concourse fills the openings. Worker and private log are isolated from the running game.
6. Two actual Chrome inspection views pass without page errors; the overview uses the unchanged prior hall11 camera. The browser asset build and diff check pass. No C# or service changes require a rebuild or service suite.

These are component checks. They do not establish full-game performance, visual acceptance, all-course success or the twenty-minute music/context soak.

## Retained initial failure

`hall-descents-native-01` reported six missing fixed supports and ran no walks. Its replies explicitly said that the ray hit a moving target, which placement intentionally rejects. The affected points were within half a tread pitch of the public path end, over a fixed pit cover. The verifier now classifies that specific native response within the actual tread envelope as requiring a walking trial. It does not change height, headroom or positional tolerances. Candidate01 subsequently passed 24 walks and four rides; final candidate02 repeated those checks after the infills were added. The initial receipt remains in the gallery.

## Still required

- Complete shared bank cladding, source-specific glass and handrail profiles, and well lining. The inherited handrails are visibly too coarse for final close views.
- Resolve the first lower route and floor label from additional cross-checked source evidence; add its ceiling, retail thresholds, services and finishes. The source mesh alone cannot establish a deeper route.
- Finish materials, blue glass decoration, contact shadows and indirect lighting. The pale isolated viewer lighting is diagnostic.
- Reconcile nearby Balcony course support, finish hall interfaces, and replace visual/native station floors together before integrated route, course, runtime and Chrome checks.

The wider long-term plan remains active: both plazas, immediate streets, remaining station architecture, thirteen broad camera registrations, all final visual comparisons and full gameplay performance gates remain open. No commit, push or deployment was performed.
