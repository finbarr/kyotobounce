# Western lower staircase: handrails and parapets

The reconstructed lower staircase had its 31 treads but lacked both handrails and their supporting stone parapets. This addition restores that assembly without re-exporting the Blender station.

## Source and construction

The retained [Kyoto City municipal model](https://data.city.kyoto.lg.jp/resource/?id=21224), licensed CC BY 4.0, supplies handrail objects `BuildingInstallation.1390` and `.1759`. Their positions, topology, mounting brackets, end shapes and vertex normals are retained. Its SHA-256 is `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`.

Inspection of the source in Chrome confirmed stone walls behind the mounting brackets. Nineteen cap triangles from `Untitled.200` establish the sloped sections, intermediate flats, thickness and unequal end lengths. The builder records their face indices and verifies the source hash before extraction. Backing extends 1.7 metres downward to meet the treads; this hidden depth and the stainless/stone finishes are construction assumptions. No research image is used as a texture.

`web/station/realism/build-west-stair-handrails.mjs` emits 21 closed collision parts and two render batches: 7,232 triangles and 266,684 bytes. The compositor adds 266,508 bytes to the complete runtime GLB, retaining every inherited encoded buffer byte. Both rails and the parapets remain appended components; they are not yet installed in the base Blender scene.

## Verification

- Browser/native serialization agrees within 0.2 micrometres, including triangle winding. Closed-mesh checks pass.
- The full native candidate passes both connected escalator routes uphill/downhill and the staircase in both directions: 766 observed poses. Staircase height deviation stays below 0.201 m, including the capsule floor offset and tread transitions.
- Chrome inspection at the stair entrance and side confirms mounted rails. All four moving lanes animate, textures and reflection captures remain fixed, and there are no browser errors. A ten-second 1280 × 800 sample contains 601 frames: p95 16.7 ms, maximum 16.8 ms. One Chrome startup attempt timed out before connecting; a fresh launch passed.
- The browser build and JavaScript syntax checks pass.

Current asset identities and component paths are in `web/v2/assets.json`. The surrounding frontage/gallery and onward Grand Stairway connection remain separate unfinished work.
