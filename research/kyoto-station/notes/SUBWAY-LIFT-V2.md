# Central 1 passenger lift

29 September 2026. An operating lift connects the subway island platform to the Central 1 concourse through a short enclosed vestibule.

## Evidence and scope

The [city's Kyoto station page](https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm) and its saved `maps/subway-kyoto-plan.pdf` identify the platform-to-Central 1 accessible connection. The plan is dated 7 August 2026. It establishes the connected levels; the shaft position, car dimensions, finishes and travel speed here are fitted approximations, not surveyed measurements. The onward lifts toward Exit 5, Porta and Hachijo remain missing.

The car travels five metres between Y−11.2 and Y−6.2. It has a 2.4 m square floor, stainless walls, handrails, ceiling, sliding car doors and separate landing doors. The platform, its ceiling and the concourse deck have matching shaft openings. An enclosed vestibule opens through the two existing hall end walls, keeping both platform side aisles clear.

Walk into the car and press E to ride; beside a landing, E calls it. The on-screen button also works with the cursor released. Native physics checks button proximity and owns each private session's car schedule. Doors remain closed at the empty landing and during travel. A player or active ball in the closing doorway holds the doors. The car carries idle riders, collides with balls and cannot finish a moving ball's shot early. The browser receives native poses, including recorded shot playback and recall rewind. Moving car walls also stop the third-person camera.

## Verification

- The rebuilt native fixture checks both travel directions, a spinning ball reaching full rest after descent, fast-ball contact against an empty landing door, walking entry/exit, private session isolation and doorway obstruction.
- Eight full-station native walks check both platform aisles, the Central 1 approach and the lower threshold in both directions. The approach goes around the existing stairwell guardrail.
- Real Chrome checks entry, riding, upper exit, the doorway sensor, the closed empty shaft, calling the car back, a mid-descent throw/recall and lower exit. Standard Chrome walking, throw/rest, recall, menu and home checks also pass.
- Saved replay checks cover release, midway travel, arrival and backward seeks. The rider follows the car instead of remaining at the original release height.
- Service type checking, unit tests, browser asset build and the isolated core native runtime pass. Short Chrome samples around the lift remained near 60 fps at 1280×800; this is not a sustained benchmark.
- Geometry verification checks 972 added/replacement triangles in 44 panels against the native layout, preserving the existing station buffers and all 30 escalator definitions. The car and doors use 18 matching box parts. No texture images or realtime lights are added.
- The Blender installation saves and reopens with matching static geometry, materials, retained surface bindings and all 18 editable lift parts. The embedded native seed contains the motion definition; the static export excludes moving parts. Changes to a lift part require updating its shared definition before exporting.

## Rebuild

Use `prepare-subway-lift.py`, then `prepare-east-transfer-base.mjs` with the prepared spec. Run `build-subway-lift.mjs` against that base, compose the component, and run `integrate-subway-lift.mjs`. The latter resolves dynamic material IDs and adds the same lift definition to native and browser metadata. `install-east-transfer.py` installs the static replacement surfaces and moving boxes in the existing editable source.

`MovingLiftVerification` runs with `--kyoto-lifts`, an absolute `--kyoto-lift-spec=…/lift-spec.json`, and an absolute `--kyoto-evidence=…/fixture`. The component's `report.json` supplies the eight routes for `verify-east-transfer.mjs`. `inspect-subway-lift-chrome.mjs` checks the operating connection in Chrome.

Current asset identities are pinned in `web/v2/assets.json`; private build, source, runtime, browser and cleanup receipts are retained under `.local/v2/current/components/subway-lift/`. Geometry and editable source replace the current local bundle in place.

The promoted local runtime passes a 1.37 m walk, full translation/spin rest at 9.37 s, free exploration results, recall and home. Its spawn faces the lift at X177, Y−11.2, Z2.4. The saved source SHA is `ed762beddb83ed4cfd278eeee0bda2e520f3d76bb56442bc0ce07d6fb0611a67`. Cleanup removed 1,264,086,017 bytes of superseded generated scenes, layouts and the stopped candidate overlay.
