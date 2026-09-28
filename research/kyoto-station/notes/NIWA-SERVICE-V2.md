# NIWA service counter — v2

28 September 2026. The service-counter section is integrated into the playable station.

## Visible work

- Five jointed front cabinets with pulls and a recessed toe strip; six rear cabinets and a timber shelf.
- Two dark drink dispensers with stainless nozzles and gridded drip trays.
- Three tall red tap handles beside the existing coffee appliance.
- A transparent bean hopper, fill, lid, controls and steam arm on the retained coffee-machine body, with a supported worktop continuation beneath it.
- A pale plaster backing, recessed warm light strip and dark cover beneath the existing ceiling. The stationary warm wall wash is encoded in the plaster finish, using the existing grain texture and no additional realtime lights.

The saved NAKED interior photograph (`photos/niwa-naked-interior.jpg`) guides the fittings, cabinet palette, timber counter, red handles and warm cove beneath the dark ceiling. The exterior JR Central and Rurubu photographs guide the courtyard-facing context; source links are recorded in `NIWA-ENTRANCE-INTERIOR.md`. Photographic pixels are not game textures. Dimensions, equipment models, cabinet divisions and hidden room depth remain approximations.

The room shell, public stairs and serving screen remain the existing reconstruction. Fixtures are checked to stay behind that screen. The current interior still has unfinished end/floor closures and sparse seating/bamboo context; this delivery completes the counter section, not the entire café.

## Source and integration

`web/station/realism/build-niwa-service.mjs` derives its coordinate frame from the actual retained counter in the selected layout and emits matching visual/collision geometry. Current component: `.local/v2/niwa-service-02/`. It contains 78 closed parts, 26 colliding parts, 1,656 triangles and nine material batches. Small grille bars, controls, handles and light fittings are decorative. The glass hopper uses glass physics; the other colliding parts use the existing fitting response.

`web/v2/compose-component.mjs` appends the component to the selected runtime GLB and layout. It reuses the original timber and glass materials. It verifies every inherited accessor, view, mesh, node, material, image, texture and encoded binary byte. There is no full-scene re-export or duplicated image set. The source scene remains the existing gate bank02 Blender file plus this editable component builder, recorded in `web/v2/assets.json`.

The addition is 147,536 bytes and nine static draw batches. Current station outputs are in `.local/v2/station-niwa-service-02/`; their composition receipt records the parent asset selection and component hashes. To revise this component, rebuild it and compose against that receipt's parent manifest; appending it twice is rejected by duplicate IDs. The v2 launcher changes only its own previously recorded asset symlinks and refuses to replace an unknown local file/link.

- Source layout SHA: `1d08dcd0e86b8f5b33ea831614dba3b02716ba792a0d693ce2080ca003c30091`
- Runtime GLB SHA: `9ad10d6a7e28a261f527f4e9d18cb489f1640c0b5096a5aee088155268ee33fd`
- Component GLB SHA: `3a6d91cd10e5daa25beebe7673f79f528bf206c99794d0c007d33b7f39162117`
- Component native SHA: `0e95ee79adcdd2f0c927a754780a6c42a3f06cf2a0db3d80d3a03adf98c74c9e`

## Verification

- Serialization checks all 4,968 emitted vertices and all indices/winding, with maximum Float32 position difference 7.72 micrometres. All 1,656 flat triangle normals pass.
- The native component audit checks 528 ray samples with no mismatches; maximum position difference is 22.62 micrometres. This checks colliding parts, not decorative controls.
- `verify-niwa-service-walk.mjs` walks 2.66 m along the actual café frontage in the full station. The player remains grounded on its existing floor with no obstruction.
- `npm run test:runtime` checks v2 spawn, walking, an unranked spinning throw through full rest, recall and Home on the integrated layout.
- Browser build, authored-material preservation and `node web/tests/courtyard-glass-browser.mjs --service` pass. The Chrome check renders courtyard, counter-front and interior views, verifies the service materials/cove and local metal/glass reflections, and records no JavaScript/shader errors. Five reflection captures and the texture count remain fixed. A ten-second 1280 × 800 sample has p95 16.8 ms and maximum 16.8 ms; this is a focused check, not a long soak.

Receipts: `.local/v2/niwa-service-02/`, `niwa-service-native-02/`, `niwa-service-walk-02/` and `niwa-service-browser/`. Generated assets and images remain private. The local preview is http://127.0.0.1:4425; no push or production deployment is included.
