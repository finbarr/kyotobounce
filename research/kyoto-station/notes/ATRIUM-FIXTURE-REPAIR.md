# Atrium fixtures and fascia repair

## Delivered scope

This pass repairs the existing central gate and west atrium frontage. It adds no rooms or navigable space.

- Removed five obsolete departure artwork planes floating behind the current gate bank.
- Replaced the unsupported rear clock with a clock fixed to the existing departure-board rail by a pedestal and base plate.
- Added four mounted camera fixtures with hoods, lenses, collars and short arms; cable runs and clips; base anchors; and board saddles and straps. The straps connect the display housings to the existing support rail.
- Rebuilt six west frontage pieces so the wall and header edges meet the sloping blue fascia with a 2 mm joint. This also removes a partition protruding through the fascia.

The support hardware is a photographic interpretation of the [2022 central gate photograph](https://commons.wikimedia.org/wiki/File:JR_West_Ky%C5%8Dto_Station_JR_Line_Central_Gate.jpg), held locally as `research/kyoto-station/photos/gate-central-2022.jpg`. Dimensions fit the current station model; neither equipment placement nor the clock position is a surveyed reconstruction. Existing public interiors and walkways retain their footprint.

## Implementation

`read-atrium-clock.py` reads the old clock mesh from the editable source. `repair-atrium-details.mjs` removes its exact rendered triangles, removes the obsolete artwork records, and builds the replacement fixtures and wall profiles. `install-atrium-details.py` updates and reopens the Blender source, checking the embedded native layout, object bindings, meshes and materials.

All retained browser attributes are checked exactly by the static GLB compactor. The 77 replacement/additional panels use four existing materials. Their 936 triangles are checked against the native layout; tiny clips, lenses and fasteners are decorative. Clock and frontage bodies retain physical collision.

The browser geometry changes from 155,315,656 to 155,295,880 bytes. No additional textures are introduced.

## Verification

The receipts for this pass live under `.local/v2/current/components/atrium-edge-detail/`. The active bundle remains the single source and runtime bundle pinned by `web/v2/assets.json`.

Acceptance checks:

- Chrome views of the gate, clock mount, support hardware, both fascia ends and basement glazing, with no browser errors.
- Native collision probes on the clock and repaired frontage; walking the atrium approach, wide gate lane, frontage and upper bridge.
- Ordinary exploration, throw, full translation/spin rest, recall and home checks.
- Blender reopened with the exact native layout; every added mesh and retained source binding checked.
- Six wall profiles clear the fascia underside; four straps span the original board-to-rail gap.

This is a local station update. It has not been published to the live site or to a release asset pack.
