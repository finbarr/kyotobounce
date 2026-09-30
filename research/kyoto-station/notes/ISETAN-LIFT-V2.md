# Isetan north lift and B3 lobby

The provisional five-stop core described below has been replaced by the
[corrected north core](ISETAN-NORTH-CORE-V2.md), clear of the Grand Stairway
and serving B3 through 5F. Its old floor openings are closed.

## Evidence and scope

The [station operator's parking diagram](https://www.kyoto-station-building.co.jp/parking/)
places the Isetan connection at the western end of the B3 garage. The saved
[Isetan 2F plan](https://www.mistore.jp/store/kyoto/shops/floor2.html), together
with its B2, B1 and ground plans, shows the north lift bank beside the northern
stair. North points right in those store plans.

The [firsthand elevator guide](https://kyoto-rys.com/facility/elevator/) lists
the north bank from parking B3 through Isetan 11F. Its entrance photograph is
saved as `photos/isetan-north-lift-guide.jpg` and registered in `sources.json`.
It locates the bank inside the ground entrance; it does not show cabin finishes.

This increment adds one working car through the five constructed floors:
B3, B2, B1, ground and 2F. The other cars, 3F–11F, and the hotel parking
connection remain unfinished. Shaft position, lobby dimensions, floor datums
and finishes are fitted to the current reconstruction, not surveyed dimensions.

## Acceptance criteria

- Walk from both garage aisles through the western portal into the new lift
  lobby, with the existing B3 stair entrance retained.
- Call, enter, ride and leave the lift at every constructed floor; each landing
  connects to an existing hall or public entrance. Retain the ground–2F stair
  and the northern bypass.
- Keep the full travel volume and door openings clear. Remove two conflicting
  placeholder counters and cut the shaft through seven floor/ceiling slabs
  and the lower parts of two Grand Stairway foundations.
- Match editable source, browser meshes and native collision; keep landing
  doors closed when the car is absent, and preserve moving-car ball physics.
- Inspect the completed geometry in Chrome, check walking and gameplay, then
  replace the current local bundle in place and merge the source into main.

## Construction

`prepare-isetan-lift.py` derives the slab outlines from their current top
surfaces, retains existing stair holes, and subtracts the new shaft. The builder
adds the core, five sills, a parking lobby around the south side of the retained
stair, lights and original direction signs. Existing five-stop lift mechanics
provide the car and individual landing doors; no native code change is needed.

The upper doorway paths turn north around the stair enclosure. The former 2F
bypass start lay inside the new shaft footprint; the connected route now runs
through the east landing and the clear strip at Z=15.

## Verification

- Eighteen full-station native routes pass with 3,137 position samples. They
  cover both parking aisles, both food halls, the ground and 2F entrances,
  the western ground aisle, and both directions on the adjacent stairs.
- The native lift fixture passes 61 checks, including all twenty floor pairs,
  closed doors at empty landings, rider support and complete ball rest after
  a moving-car trip. Its 4,820 pose samples cover the travel profiles.
- Chrome passes 33 lift checks: rides and grounded exits at all five floors,
  matching rendered part positions, destination controls, session isolation,
  and throwing/recalling during a descending trip.
- Nine ordinary Chrome walks pass 51 waypoints, covering every new approach
  and the retained B3–B2 and ground–2F stairs.
- The source saves and reopens with matching geometry, UVs, normals, retained
  object bindings and all 24 moving lift parts. Static browser/native checks
  cover 76 added panels, 1,248 triangles and two modified foundation surfaces;
  22 former panels are retired. The net static GLB increase is 637,560 bytes.
- Five inspected Chrome views have no page errors. The 600 short frame samples
  have a 16.7 ms median and 16.8 ms p99; textures stay at 373 and reflection
  captures at seven. This is a short visual check, not a sustained benchmark.
- Native and ordinary Chrome gameplay pass walking, throwing through complete
  translation/spin rest, recall and home. `npm run build:web` passes.

The visual pass found coplanar sill/infill surfaces and a redundant garage
threshold; both were corrected before the final checks.

Private receipts are retained in `.local/v2/current/components/isetan-lift/`.
The current source and playable exports replace their predecessors in place;
the full temporary candidate and port-4426 overlay are removed. The builder, preparation, composition, lift integration and source
installation tools reproduce this increment from its recorded parent bundle.
