# Elevator removal

1 October 2026. Bounded delivery within the station simplification plan.

## Result

Remove all 15 operating elevators from the station, browser, service protocol,
replays and native worker. Delete their 296 moving parts and 273 static objects:
side and back shaft walls, pits, roof caps, controls, obsolete lift signs and the
three static Kintetsu hotel cores. Keep shallow front faces and closed landing
surfaces where the current circulation meets them. No shaft enclosure remains
behind these faces.

Close 43 former landing openings with static collision surfaces. Of these,
37 face retained public routes; six at parking or the southern street branch
are temporary closed boundaries pending removal of those off-scope interiors.
These six surfaces do not authorize retaining their former destinations.
Restore 76 floor, ceiling and paving sections at the removed shaft footprints.
Repair only missing slab areas, preserve sloping paving, and reuse neighboring
materials and interpolated texture coordinates.

The browser no longer creates elevator objects, buttons or floor dialogs.
The native worker no longer simulates cars, carries passengers, holds doors,
checks moving elevator contacts or records elevator replay history. Escalators
and their analytic collision remain in use. Current gameplay still finishes
shots on full translation and spin rest; recall forfeits the attempt.

This does not finish the separate removal of deep shops, restaurants, hotel
and parking interiors. Public stairs, passages and adjacent floors are retained
in this delivery. The next task should prune those interiors against the
contiguous-public-space rule, rather than add new decoration or destinations.

## Reproduction

Use one temporary candidate alongside `.local/v2/current/`:

```sh
node web/station/realism/plan-elevator-removal.mjs web/v2/assets.json .local/v2/candidate/remove-elevators
PYTHONPATH=.local/geometry-python python3 web/station/realism/patch-elevator-floors.py .local/v2/candidate/remove-elevators
node web/station/realism/remove-elevators.mjs .local/v2/candidate/remove-elevators
/Applications/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python web/station/realism/install-elevator-removal.py -- web/v2/assets.json .local/v2/candidate/remove-elevators/assets.json
```

The commands require the parent bundle with its elevators. They are construction
steps, not compatibility migrations. The Python geometry step uses Shapely.
Keep original assets outside Git, following `docs/ASSETS.md`.

Verification receipts are retained in
`.local/v2/current/components/remove-elevators/` after promotion. The final
bundle replaces the previous editable scene, native layout and browser export;
the temporary full bundle is deleted.

## Verification

- `npm run typecheck`, `npm test` and `npm run build:web` pass.
- Rebuilt the macOS native worker successfully before runtime tests.
- Reopened the Blender source: removed objects are absent, the embedded layout
  is exact, and every retained seed binding and added mesh/UV is checked.
- Final GLB: all 6,024 added vertices, 2,008 triangles, materials and UVs match
  the native panels. The compactor checks retained decoded attributes exactly.
- Native runtime: all 86 closed surface leaves and 76 restored slabs have
  matching collision; three public door approaches block walking; a real ball
  throw strikes the central closed door.
- Walks pass from the upper landing into the rooftop garden, from the head
  concourse to platform 30, and through the north entrance into the atrium.
  Tower and hotel contacts still work.
- Chrome: six station views checked, restored paving inspected, no elevator
  controls or state, and no page or shader errors. Ordinary entry, movement,
  throw, result, recall, menu and home checks pass.
- `npm run test:runtime` passes: translation and spin both stop (22.51 seconds
  for the check shot); recall forfeits the moving attempt.

The browser geometry is 155,315,656 bytes, down from 155,759,312 bytes in the
forecourt delivery. This is mainly a removal of simulation and interaction
complexity; it is not a measured frame-rate improvement.
