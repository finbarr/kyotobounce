# Western rooftop passage

## Evidence and scope

The [February 2019 photographic walk](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/)
shows the passage west of Happy Terrace ending at the Isetan entrance.
Its [passage photograph](https://image.space.rakuten.co.jp/d/strg/ctrl/9/b93b33e054f974bd7cdcecf31de0a0f9a16cf20a.77.2.9.2.jpeg)
shows concrete wall bases, vertical metal cladding, a closed service doorway
on the left and maintenance cabinets and vents on the right. The walk's
author identifies the store entrance at the far end.

The current game inspection showed coarse municipal roof blocks and glass
railings running along both sides of this enclosed passage. This increment
fits the two public wall faces in concrete and ribbed metal, closes their
ends, adds coping and service frontages, and removes those redundant rails.
The existing paving, garden and indoor store stair remain in place.

The photograph establishes the architectural treatment. The wall dimensions,
rib spacing and service fixture positions fit the retained model and are
approximations. The dated photograph does not establish current maintenance
equipment. The [operator's current square guide](https://www.kyoto-station-building.co.jp/service/square/)
lists the rooftop garden as closed for construction; this reconstruction
retains the usable public garden requested for the game.

## Acceptance

- Walk from the garden through the western passage into the store landing
  and back. Check the narrower paths beside both walls.
- The two walls, service doorway and cabinet are physical boundaries.
- Inspect the passage, doorway, cabinets and store entrance in real Chrome.
- Preserve the public floor, garden furnishings, indoor stair and moving
  hardware. Match new visual and collision exports and reopen the editable
  scene to verify its saved geometry.
- Pass browser build and local gameplay checks, commit, merge into local
  main and replace the single current asset bundle.

## Construction

`web/station/realism/build-garden-west-passage.mjs` builds the component.
The backing walls supply continuous collision. Repeated cladding ribs are
combined into one noncolliding mesh per wall, retaining the same exported
faces. The service doors are closed; no unverified public room is implied.

The component retires 48 panels and 576 triangles, and adds 120 panels and
9,720 triangles. It appends 823,408 browser bytes in eight material batches,
with no new textures, lights or moving hardware. No retained source mesh is
relocated. One bounded cut removes the part of the municipal roof shell
protruding into the passage above its earlier 2.2 m opening; the fitted wall
encloses the cut.

Paving, roof equipment behind the public walls, garden planting and the
store entrance's finer finishes remain for later increments. The fine ribs
show some aliasing at a distance; the current geometry uses no alpha surfaces
or extra texture allocation for that detail.

## Verification

Six native routes pass using running input: garden to store and back, plus
both directions beside each wall. Chrome keyboard walking passes the main
route in both directions and the northern path beside the cabinets. Both
runtimes verify that the two walls, service doorway and cabinet stop the
player while maintaining floor support.

The bounded source cut removes 46.095 m² of the old roof shell and retains
2,621 whole faces outside the cut. Independent comparison verifies browser
and native geometry, UVs and normals; unrelated native records and moving
hardware remain exact.

Six Chrome views were inspected after removing the source-shell intrusion.
Their short frame samples have a 16.7 ms median and 16.7–16.8 ms 95th
percentiles, with 384 textures and seven reflection captures throughout.
These are local view checks rather than a sustained benchmark.

The browser asset build and native gameplay pass. A throw from the passage
floor reaches full translation/spin rest after 8.56 seconds; free results,
recall forfeiture and home also pass.

Chrome gameplay also passes movement, full translation/spin rest and return
home, with no browser errors. The reopened editable scene matches geometry,
UVs, export normals and retained bindings. Five inherited corners have Blender
preview-normal rounding differences, at most 0.573 degrees; their face
positions and authored export normals match the parent. Saved export normals
remain accurate within 0.000001.

Final asset identities:

| Asset | SHA-256 |
| --- | --- |
| Layout | `47addd3dcf2569360f0ab19093bb16e208fb53316a2d5aab5db35da88d740529` |
| Browser geometry | `e00d2ced2133b549be2b0891b7276b09ca2e86d4a423b58868c6c153271a7e7f` |
| Editable scene | `9b078eaa26ab153cf91e460afc47ae1b3a639216d2c07d337897bf2b267d64b6` |

## Rebuild

Use the recorded parent manifest and a single `COMPONENT` folder under
`.local/`:

1. `build-garden-west-passage.mjs PARENT COMPONENT`
2. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json COMPONENT/station`
3. `open-isetan-ground.mjs COMPONENT/station/assets.json COMPONENT`
4. `web/v2/compose-component.mjs COMPONENT/station/assets.json COMPONENT COMPONENT/station COMPONENT/station/removal.json`
5. `finalize-east-transfer.mjs PARENT COMPONENT/station/assets.json COMPONENT`
6. `verify-static-replacement.mjs PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/geometry-proof.json`
7. Native routes, Chrome routes and visual inspection, then local gameplay.
8. Blender `install-east-transfer.py -- PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/source`

Other than the composition command, the scripts are in
`web/station/realism/`. Keep reference photos, generated assets and verification
receipts private. At delivery the full candidate replaces the current bundle;
only the small component and useful receipts remain under
`.local/v2/current/components/garden-west-passage/`.
