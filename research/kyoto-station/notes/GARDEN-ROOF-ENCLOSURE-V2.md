# Northern garden enclosure

## Evidence and correction

The operator's [square guide](https://www.kyoto-station-building.co.jp/service/square/)
photographs show a garden enclosed by panelled concrete, pale ribbed metal and
framed glazing. Saved photographs `square-img_oozorahiroba_02.jpg` and `_03.jpg`
show the garden-facing wall particularly clearly. The
[February 2019 walk](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/)
also records the northern viewing area and separate western passage.

The current reconstruction had coarse textured roof blocks behind a second
glass railing. This increment replaces the garden-facing enclosure with
concrete panels, narrow joints, a dark plinth, horizontal metal ribs and roof
flashing. The western return closes the end beside the recessed viewing bay.

The viewing screen retains its horizontal registration. Its lower sill and
three framed panes replace the shallow provisional window. A floor collar
reaches the new screen, allowing removal of the redundant railing without
leaving an unsupported edge. The opaque screen and glazing remain collidable.

The operator photographs establish the materials and architectural treatment;
panel dimensions and window divisions are approximations fitted to the model.
Roof equipment and the western passage's surrounding rooms remain coarse.

## Scope and acceptance

- Replace only the three wall-backed rail segments and the old viewing window.
- Preserve the garden floor, furnishings, final outdoor stair and western
  indoor stair connection.
- Keep the northern approach and the path across the garden clear in both
  directions, with 2.1 m headroom and a supported window approach.
- Verify the wall and viewing screen as physical boundaries, inspect the
  result in Chrome, and check visual/collision and editable-source agreement.

Tools are `prepare-garden-roof-enclosure.py`, `build-garden-roof-enclosure.mjs`
and `verify-garden-roof-enclosure.py` under `web/station/realism/`. Generated
geometry, screenshots and receipts stay in the private current bundle after
integration.

## Geometry and verification

The replacement retires 33 provisional panels, adds 133 panels (1,596
triangles), and trims one municipal roof mesh. The 7.616 m² floor collar
reaches the window without overlapping the retained public floor. The other
689 garden and access panels, all lifts and all escalators remain exact.

The independent geometry check confirms matching visual and collision faces,
texture coordinates and normals. All 148 sampled route volumes have 2.1 m
headroom. Native walks pass both directions along the northern frontage and
between the garden and window; separate boundary checks confirm the room wall
and viewing screen stop the player.

Four final Chrome views were inspected. A raycast located a remaining piece of
the old screen in front of the first trim; the final cut removes that piece
and the return wall now meets the viewing bay cleanly. Short frame samples
have a 16.7 ms median across all four views; the heaviest view has a 33.3 ms
95th percentile. These are local view checks, not a sustained performance run.

All four routes also pass Chrome keyboard walking. The browser asset build,
native gameplay and Chrome gameplay checks pass, including walking, full
translation/spin rest, free results, recall and returning home. The isolated
preview serves the verified geometry, matching collision layout, 48 escalators
and 14 lifts.

Blender's packed display normal on one new 0.12238 m² cut triangle differs by
0.32762 degrees. The source verifier bounds this case to its measured vertices,
area and angle; full-precision exported normals retain the 1e-6 tolerance.
The saved Blender scene passes the geometry, UV, normal and retained-object
binding checks after reopening. Its embedded collision layout matches the
verified candidate.
