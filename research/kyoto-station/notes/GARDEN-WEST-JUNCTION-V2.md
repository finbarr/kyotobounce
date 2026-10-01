# Western garden passage wall junction

## Evidence and repair

The western passage had an unfinished back beneath its roof cap and a thin,
incomplete end facing the garden. Municipal shell fragments also crossed this
junction. The [February 2019 photographic walk](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/)
shows the passage's concrete base, pale vertical metal cladding, service doors
and cabinets. This repair continues that treatment around the existing wall
volume and fits its coping and end.

The [operator's garden photographs](https://www.kyoto-station-building.co.jp/service/square/)
and [firsthand garden photographs](https://kyoto-rys.com/facility/skygarden/)
support keeping an open outlook. The low western glass guard remains in place.
The new rear and end use the depth already established by the existing cap and
return. Their exact joints are inferred; the references do not survey this rear
face. No new tall screen crosses the garden edge.

## Acceptance

- Finish the exposed wall back and garden-facing end beneath fitted coping.
- Keep the garden-to-Isetan passage and western garden path walkable both ways.
- Keep players behind the passage wall and garden guard.
- Inspect the junction and adjoining paths in Chrome, verify matching native
  and browser geometry, and reopen the saved editable scene.
- Pass local gameplay checks, then merge into the playable local main build.

## Construction and verification

`build-garden-west-junction.mjs` replaces two old cap/return panels with 33
panels and 4,632 triangles. Repeated ribs share two combined noncolliding meshes;
their backing walls provide collision. Six material batches reuse the existing
passage materials. The addition uses 393,360 browser bytes and adds no textures,
lights or moving hardware.

A single bounded cut removes 22.72 m² of intersecting municipal shell. The
independent cut verifier checks the retained triangles, UVs and normals. All
2,553 whole faces outside the cut are retained. The replacement verifier checks
exact retained browser bytes, native records and moving hardware. Existing
walking floors remain unchanged.

Six native walks pass with 1,013 position samples, together with three boundary
checks. Chrome passes the same six routes with 22 grounded waypoint checks and
all three boundaries, without browser errors.
Six final Chrome views were inspected: garden outlook, passage mouth,
end junction, rear corner, passage return and southern outlook return. The wall
is closed and the adjacent public paths remain clear. Textures remain at 387
and reflection captures at seven. These brief views are not a sustained
performance benchmark.

The browser asset build passes. Native gameplay verifies the ordinary spawn,
movement, a passage throw reaching full translation and spin rest in 8.70
seconds, recall forfeiture and returning home.
Chrome gameplay passes entry, movement, a complete throw, unsaved result
presentation, recall during flight and returning home. The result has zero
velocity and spin on the verified candidate layout.

The saved Blender scene was reopened. New panels, retired objects, the modified
municipal mesh, UVs, full-precision export normals and retained bindings match
the candidate. Existing municipal corners retain their previously checked
Blender preview quantization; the largest angle is 0.573 degrees.

| Final asset | SHA-256 |
| --- | --- |
| Layout | `c342defdbf15215ab81d6cf7ed8704fb2f15de572461712eca7506207c4c7110` |
| Browser geometry | `2306d6ff736f7ccf0fda6974757221702538952a801fbabf0e2bba4b44d2ee6a` |
| Editable scene | `40161c894b6769964a73c2a65f82d60ddd4c30a4731acf54d2817d42de6beadb` |

## Rebuild and storage

Use one `COMPONENT` directory under `.local/` and the recorded parent:

1. `build-garden-west-junction.mjs PARENT COMPONENT`
2. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json COMPONENT/station`
3. `open-isetan-ground.mjs COMPONENT/station/assets.json COMPONENT`
4. `web/v2/compose-component.mjs COMPONENT/station/assets.json COMPONENT COMPONENT/station COMPONENT/station/removal.json`
5. `finalize-east-transfer.mjs PARENT COMPONENT/station/assets.json COMPONENT`
6. `verify-static-replacement.mjs PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/geometry-proof.json`
7. Native and Chrome routes, visual inspection and local gameplay.
8. Blender `install-east-transfer.py -- PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/source`

Except for composition, these scripts are in `web/station/realism/`. Promotion
replaces the current bundle in place and removes the full temporary source and
station exports. Reference photographs and generated receipts stay outside Git.

Coarse roof equipment and other roof-room ends beyond the western guard remain
unfinished. Garden planting and seating are the next priority.
