# Kotochika public rooms and plaza

29 September 2026. Open the blank walls beside the subway North/Central 1 public passage.

## Evidence and limits

The [operator's current Kyoto page](https://kotochika.kyoto/kyoto/) links the [current floor map](https://kotochika.kyoto/common/pdf/floormap_kyoto15.pdf). Its north arrow points left. Public shops surround the North and Central 1 gate cores, with Kotochika Plaza in the space between them. The earlier `kyoto4.pdf` is retained as a dated-design reference, not current tenant evidence. The operator's small Seijo Ishii and Ogawa Coffee photographs show open retail fronts, dark café frames, glazing and timber counters; they are reference images only.

The existing model has a long blank public passage west of the paid cores. Their spacing and exit registration do not precisely match the diagram. This increment opens five generic rooms and a plaza on that western public route. Floor Y−6.2 m and ceiling Y−2.8 m match the existing passage. The western extension stops at X138.2 m, beyond the lower B2 ceiling; the eastern extension uses the retained paid-deck edge without overlapping its floor.

Room dimensions, placement, materials and fitouts are fitted approximations. Signs describe generic retail categories; no surveyed tenant assignment is claimed. The missing eastern bypass and complete public loop around the cores remain a separate structural task.

## Acceptance

- All five room entrances and the plaza are accessible from the public passage, in both directions.
- The North and Central 1 gate approaches and B2 upper stair approach remain connected.
- The public/paid boundary remains closed behind the plaza. No wall trim floats in the new openings.
- Native collision, browser geometry and the saved editable station agree. Real Chrome walking, ordinary throwing, recall and full translation/spin rest pass.

## Verification

Six normal-speed native walks pass with 5,963 position samples, covering all five entrances, both gate approaches, the plaza and retained B2 approach in both directions. The paid boundary blocks 60 forward-input samples without loss of floor support. Chrome completes a 29-waypoint round trip through all five rooms.

Nine Chrome views were inspected. Texture count stays at 376 and reflection captures at seven. The short rolling frame samples show a 16.7 ms median and 16.8 ms 99th percentile; these are inspection samples, not a sustained performance or audio benchmark. Seven new fixtures use the existing bounded light pool.

The component adds 131 closed panels and 1,572 triangles, replaces 25 wall/trim panels, and appends 310,152 browser bytes to the prepared base. Every retained native record and browser byte outside the retired surfaces is preserved. The saved/reopened Blender scene matches the visual and collision exports.

`npm run build:web`, the native runtime test and Chrome gameplay pass. They cover movement, full translation/spin rest, recall and home; the candidate native shot reaches full rest in 14.03 seconds.

The promoted local build also passes native gameplay (13.96 seconds to full rest). Cleanup removed 1,291,617,965 bytes of temporary generated station files. Private proof records are under `.local/v2/current/components/kotochika/`.

## Reproduction

Run `prepare-kotochika.mjs`, `prepare-east-transfer-base.mjs`, `build-kotochika.mjs`, `web/v2/compose-component.mjs` and `finalize-east-transfer.mjs` against the recorded parent. Verify the composed station with `verify-east-transfer-geometry.mjs`, the native route walker, `walk-kotochika-chrome.mjs` and `kotochika-views.json`. `install-east-transfer.py` installs and reopens the same editable station.
