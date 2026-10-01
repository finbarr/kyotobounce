# East Square gallery connection

30 September 2026.

## Connection

The raised landing beside NIWA ended against a solid stone pier. Native
walking reproduced the obstruction at x127.49. The replacement opens that
pier into a continuous gallery passage, a receiving lobby and two facilities
rooms. The existing stair from East Square reaches the entrance, and the
route works in both directions.

The [operator's 7F map](https://www.kyoto-station-building.co.jp/floorguide/7f/)
establishes the eastern corridor, lift and toilet connection. The entrance
and passage photographs in this [August 2025 visit](https://ameblo.jp/96kakeru/entry-12922118870.html)
place the entrance on the raised landing beside NIWA. They show a granite
surround, glazed doors, dark stone paving, pale concrete walls, low lights
and a ribbed ceiling. Blue, red and yellow display surrounds follow the
[gallery's](https://ideableworks.com/kyotostationgallery) photographed booths.
Source URLs, local filenames and hashes are in [east-gallery-sources.md](east-gallery-sources.md).

The new floor follows the retained landing edge without overlapping it.
The 2.8 m corridor and 2.54 m entrance clearance are fitted reconstruction
dimensions. The operator plan is schematic; the room arrangement and
fixtures are approximations, not a surveyed toilet plan. Basins sit against
side walls, leaving both entrances and the central room approaches clear.
The eastern lift bank remains unbuilt. Display panels have no artwork yet.

The change replaces one 12-triangle pier with 292 panels and 3,800 triangles,
adding 330,128 encoded browser bytes and 12 draw batches. The surround reuses
the existing granite material and texture. Moving hardware is unchanged.

## Verification

- All six native walks pass: East Square to the lobby and back, and both
  facilities rooms in both directions (1,826 movement samples).
- Chrome keyboard walking passes the same six routes and all 34 waypoints.
- Five final Chrome views were inspected. Texture and reflection-capture
  counts stay stable and the page reports no errors.
- Added browser geometry matches its native panels. Retained native records,
  encoded browser buffers and moving hardware remain unchanged. The saved
  Blender source reopens with matching geometry, UVs, normals and bindings.
- Browser asset build, native gameplay and Chrome gameplay pass, including
  a complete throw, translation and spin rest, recall during flight and home.

The native gameplay check uses `KYOTO_TEST_SHOT_START` at
`{"x":145,"y":31.600000381469727,"z":11.55}` to exercise the gallery floor;
the ball reaches full rest in 8.14 seconds. Its normal spawn, movement and
home checks still run first. The unscoped rooftop throw was unreliable:
one attempt left the station and a recorded second attempt rolled down the
Grand Stairway, stopping after 72.5 seconds beyond the 60-second test wait.
That trace never approached the gallery. The unchanged main build passed
the original check, and candidate Chrome gameplay passed from normal entry.
The optional test position avoids making this component check depend on a
long, timing-sensitive stair trajectory. No physics rules were changed.

## Delivery and next work

`web/station/realism/build-east-gallery.mjs` builds the component from the
current landing. The shared replacement, composition and source-installation
tools integrate it into the station. The verified source and exports replace
the local bundle in place; temporary full exports are removed. Small receipts
remain in `.local/v2/current/components/east-gallery/`.

Next, establish the eastern lift's lower connections from the operator maps
and inspect East Square's southern public route. Keep further work focused
on the atrium, rooftop gardens and their connected public spaces.
