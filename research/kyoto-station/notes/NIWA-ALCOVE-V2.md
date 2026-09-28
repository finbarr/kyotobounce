# NIWA service alcove closure — v2

28 September 2026. The playable café now has a plaster end wall behind the counter, a dark plinth and a closed rear floor seam. The end joins the retained stone pier, canopy and backing. It no longer exposes unrelated outdoor geometry below and beyond the room. The existing entrance and public frontage remain clear.

The saved NAKED interior reference supports an enclosed room and plaster finish. Hidden wall thickness and depth are inferred from the current shell, not surveyed measurements. This completes the service-alcove closure; the remaining café furnishings are a separate task.

## Editable source and assets

`web/station/realism/build-niwa-alcove.mjs` derives the frame from the actual retained counter and creates three closed colliding parts. The component has 36 triangles and two batches, reusing the existing plaster and charcoal materials without new textures or lighting passes. `web/v2/compose-component.mjs` appends it while verifying all inherited encoded geometry and images are unchanged. The runtime GLB grows by 4,460 bytes.

- Component: `.local/v2/niwa-alcove-01/`
- Integrated station: `.local/v2/station-niwa-alcove-01/`
- Current selection and source hashes: `web/v2/assets.json`
- Source layout SHA: `17b6a4bad1997e2c36c88852824bf116d6fbb9e0e03ba8820934ceb3405c4ae0`
- Runtime GLB SHA: `d3ade1b314101c821ede1eddce430ed8d095c4682afba1634851ade9c9edce47`
- Running spawn-only layout SHA: `a66fe4ee42e526a731d1244243ff7274a6e1810d87d9d12588992af718bef5ab`

Rebuild against the parent manifest retained in the integrated station's `composition.json`; do not append the same component twice. Generated assets remain private. Local preview: http://127.0.0.1:4425.

## Checks

- All 108 serialized vertices and 36 triangle normals pass. Maximum Float32 position difference: 6.60 micrometres.
- Native/browser ray audit: 36 samples, no mismatches, maximum position difference 18.31 micrometres. Receipt: `.local/v2/niwa-alcove-native-01/report.json`.
- Full-station frontage walk: 2.64 m, 79 samples, grounded and unobstructed. Receipt: `.local/v2/niwa-alcove-walk-01/report.json`.
- Browser build and v2 runtime pass, including a spinning throw through full physical rest, free-result handling, recall and Home.
- Actual Chrome interior inspected at 1280 × 800. No JavaScript/shader errors, unchanged texture count and five fixed reflection captures. Final ten-second sample: p95 16.7 ms, maximum 16.8 ms. An earlier sample overlapping other checks had p95 16.8 ms and maximum 100 ms; both receipts are retained under `.local/v2/niwa-alcove-01/`. These are focused samples, not a long performance soak.

The iteration used the cached full station and a small appended component; no Blender export or native worker rebuild was needed.
