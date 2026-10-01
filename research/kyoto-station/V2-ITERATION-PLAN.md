# Kyoto station simplification plan

## Direction

30 September 2026. Focus the game on Kyoto Station's connected public spaces:
the atrium, its open upper and lower levels, the railway, and the outdoor spaces
that belong to the station. Build the architecture that makes these spaces
interesting to explore and throw a ball through.

This plan supersedes the earlier expansion and decoration queues. The old goal
is paused. The unfinished central planting candidate is set aside; it has not
been merged into the playable build. The simplification is authorized. The first delivery is the forecourt boundary:
retain the façades and tower, hide the city beyond, constrain the camera, and
remove distant objects from the source and runtime together. See the
[delivery record](notes/FORECOURT-BOUNDARY.md). The [elevator removal delivery](notes/ELEVATOR-REMOVAL.md) removes the operating
machinery and hidden shafts while retaining closed public frontages. Removing
deep interiors remains the next bounded task.

## Scope rule

Build the station's contiguous public airspace: spaces connected by open portals,
stairs, ramps, escalators and public passages without opening doors or windows.
Model the surfaces that bound that space and the public levels visible through
its glazing. Closed doors and windows do not justify constructing inaccessible
rooms, shafts or other hidden volumes behind them. Elevator doors remain only
where their public-facing side is reachable within this continuous space.
Upper restaurant interiors are an explicit
exception: their fitouts are outside this scope even where the entrance is open.

The proposed boundary for attached retail and hotel areas is their station-facing
public circulation. Preserve a through-route when it connects two retained
station spaces; omit deep retail floors, dining rooms, hotel rooms, parking and
service areas. Door-free access does not extend the project into neighboring
buildings or the surrounding city.

| Area | Treatment |
| --- | --- |
| Central atrium and concourse | Keep and prioritize the full volume, roof, structural frame, stairs, balconies, bridges, floor openings and major finishes. |
| Basement glazing and open wells | Keep the glass, frames, curved edges, visible lower levels and connected descents. Preserve real depth and sightlines through the glazing. |
| Grand Stairway and upper public routes | Keep all connected landings, Muromachi Square, Skyway, East Square and other open terraces. Repair gaps and obstructions. |
| Rooftop gardens | Keep the accessible garden, paths, guards and recognizable planting. Defer further leaf, planter and furniture refinement. |
| Platforms and railway | Keep the station's platforms, tracks, canopies, concourses and their public connections, including the rear railway frontage. Operational trains and railway simulation are outside scope. |
| Station entrances and outdoor edges | Keep north and south entrances, attached terraces and enough forecourt to approach and understand the building. End the world at clear station boundaries. |
| Isetan and Granvia portions of the station | Keep the façades, roof and structural masses that enclose the atrium or define an outdoor station space. Keep needed public through-passages. Remove deep internal floors and fitouts. |
| Shops, cafés and upper restaurants | Keep simple frontages and shallow visible backing where needed. Remove dining rooms, kitchens, merchandise, detailed counters and decorative fitouts from the playable export. Do not close a retained public passage to accomplish this. |
| Elevators | Delete cars, shafts, machinery, controls and operating logic. Keep only closed doors and visible surrounds facing the contiguous public space, with matching surface collision. Do not retain or build an elevator enclosure behind them. |
| Forecourt surroundings | Keep the façades that frame the north forecourt, including the Kyoto Tower building and circular tower. Keep matching ball collision on these visible surfaces. Hide the city behind that first building line with a soft fog boundary and prevent the camera moving beyond it. Remove distant city geometry, unrelated roads and off-station extensions such as Avanti. Do not build neighboring interiors. |

An open doorway is not a reason to invent a room. A glazed boundary is not a
reason to fill the view behind it with an opaque wall. Model visible depth where
it contributes to the retained station, especially the basement beneath the
atrium.

## Delivery order

### 1 Bound the station and forecourt

Make a station boundary and a keep/remove list from the current editable scene,
using object ownership, location and the existing plans. Separate station
structure from neighboring buildings before deleting anything: the municipal
source contains both, so removing every object named “municipal” would cut the
station itself.

Retain the forecourt-facing building line and Kyoto Tower as recognizable
backdrop and bounce surfaces. Define a camera boundary behind that line, with
fog concealing the cut and the city beyond. Apply the boundary to free flight,
focus jumps, orbit, briefing and replay cameras. The tower must remain visible
and usable for ball contact from inside the boundary. Remove the remaining
outside buildings and off-station routes from the source, browser export and
collision layout together. Keep entrance thresholds and attached
outdoor circulation intact. Rebuild the export from retained objects so deleted
geometry, textures and unused buffers disappear from the files as well as the
screen. Fit exposed ends where removal would otherwise leave holes or floating
slabs.

**Done when:** the station and forecourt façades define the playable world;
Kyoto Tower is retained with working ball collision; the city beyond the
façades is hidden and cameras cannot escape the boundary; atrium, upper-route
and platform access still work; removed buildings have no visible or invisible
collision leftovers; one smaller current bundle replaces the old bundle.
Commit and merge this removal before starting the next task.

### 2 Remove unnecessary interiors and mechanisms

Remove the deep restaurant, retail, hotel and parking branches listed above.
Preserve useful station through-routes and the enclosing station shell. Reduce
shopfronts to the detail visible from those routes. Do not build additional
rooms to justify previous stair or elevator work.

Delete elevator cars, shafts, machinery, interactions and UI. Retain only doors
and visible surrounds that form a boundary of the contiguous public space,
with collision on those surfaces. Remove the inaccessible volume behind them.
Apply the same rule to other hidden rooms and service spaces.

Keep stairs, ramps and escalators that serve the retained public circulation.
If an area currently depends on an elevator, include it only if a real open
public route connects it to the rest of the station; repair that route where
needed. Otherwise omit the area. Do not invent a connection to preserve it.

**Done when:** every retained area has a continuous walking route; there are no
elevator-only destinations, dangling controls, empty shafts or corridors ending
in arbitrary new walls. Removed destinations no longer appear in the live route
queue or tests. Commit and merge.

### 3 Make the atrium and basement the strongest part of the game

Inspect the atrium at ground level, from its balconies, and through its basement
glazing. Prioritize spatial errors: incorrect floor openings, opaque glass,
missing lower floors, blocked views, broken stair connections, intersecting
slabs and abrupt wall ends. Then improve the major glass, steel, stone and
lighting treatments that make the space recognizable.

Existing research records two broad curved basement wells and a smaller oval
opening; preserve their distinct geometry while checking the current scene.
The older research does not fully establish the oval's purpose. Do not invent
an elevator or room to explain it. Resolve unclear details only when they affect
the retained route or view.

**Done when:** the atrium, open lower circulation and upper balconies read as a
connected space from player height. The basement is visible through the intended
glass; routes and ball-contact geometry agree with what the player sees.
Deliver individual repairs as they are finished.

### 4 Complete the railway and the station side facing it

Audit the retained platform approaches, conventional tracks, terminal platforms,
Shinkansen area and other railway spaces inside the station boundary. Correct
missing or misleading connections, platform edges, canopy supports, bridges and
views from the main building. Keep the track layout and rear station structure
as major features. Stop at the station's railway extent; do not extend into a
city or railway-network reconstruction.

**Done when:** station concourses connect coherently to the retained platforms,
tracks and canopies form a convincing railway space, and the back of the station
has complete visible structure. Finish and merge one connected area at a time.

### 5 Refine the connected upper outdoor spaces

Walk the complete Grand Stairway, Skyway, East Square and garden routes. Repair
remaining architectural gaps and confusing transitions first. Refine large
surfaces, glazing, sightlines and distinctive fixtures next. Detailed planting,
furniture and shop decoration follow only when they materially improve one of
these spaces.

## Keep the build small

The current playable bundle at commit `fbb61e8` was inspected for this plan:

| Measured item | Current value |
| --- | ---: |
| Layout JSON | 524,904,895 bytes, about 501 MiB |
| Browser station GLB | 279,111,436 bytes, about 266 MiB |
| Serialized mesh definitions | 2,423 |
| Material definitions | 1,098 |
| Lift definitions | 15 |
| Escalator definitions | 48 |

These are file sizes and asset counts, not frame-rate measurements. The unfinished
planting export exceeded JavaScript's single-string limit. Its proposed shared
vertex change passed a geometry check, but has not passed runtime or source
integration and is not part of the playable bundle. Reassess whether it is still
needed after the removal pass instead of making it another active project.

The current append pipeline retains earlier binary buffers when retiring
geometry. Hiding objects or removing their indices alone will not recover all
that storage. The simplification must produce a compact export containing only
the retained station and assets it uses. Share repeated geometry and materials,
avoid duplicating decorative vertices in collision data, and keep render-only
detail out of physics where appropriate.

Record the resulting file sizes, load time and representative frame times.
Measure performance in Chrome on this laptop without simultaneous heavy Blender
work. Do not assume elevators or surrounding buildings are the largest runtime
cost until the measurements show it.

## Verification and iteration

Each task gets one concrete outcome, one temporary candidate, relevant checks,
a local commit and a merge into `main`. Keep one current editable source and
playable bundle. Remove superseded generated exports after promotion; use Git
for code history and keep existing research references without copying them.
Set aside unfinished source changes safely before the first removal, without
creating another complete station copy.

Use a small set of representative routes: entrance through the atrium and its
basement, Grand Stairway to the garden and Skyway, and concourse to platforms and
the rear station side. Test the routes affected by each change in the native
runtime and Chrome. Check representative views through glass, support at edges,
and ball collisions; preserve full translation-and-spin rest and recall
forfeiture. Retire elevator-operation and removed-room checks. Keep the repository's
required build and code checks for the files actually changed.

Research only a concrete route, structural or material uncertainty in the task
in progress. Do not resume old room, elevator or surrounding-city checklists.
Deliver brief notes on the change and its checks; no before/after gallery is
required. Push and deployment remain separate from local delivery.

## References

The operator's [floor guide](https://www.kyoto-station-building.co.jp/floorguide/)
and [directions](https://www.kyoto-station-building.co.jp/directions/) remain the
starting points for public-route research. Their plans guide connections; they
do not define this game's scope or provide survey dimensions.

Use the existing [central hall basement research](notes/CENTRAL-HALL-BASEMENT.md),
[basement video inspection](notes/BASEMENT-360-INSPECTION.md),
[atrium to garden route](notes/ATRIUM-GARDEN-ROUTE-V2.md) and
[western platform notes](notes/WESTERN-PLATFORMS-V2.md) where relevant. Previous
delivery notes are evidence of past work, not instructions to keep expanding it.

## Replacement goal statement

Iteratively simplify and improve Kyoto Station's connected indoor and outdoor
public spaces, prioritizing the atrium, basement glazing, railway and open routes
to the upper terraces and gardens; retain the forecourt façades and Kyoto Tower
inside a fogged camera boundary, remove the city beyond them, unnecessary
interiors and elevator systems including shafts, retaining only doors and
surrounds that bound the contiguous public airspace, and finish, verify, commit
and merge each useful change into one compact playable build before starting
the next.
