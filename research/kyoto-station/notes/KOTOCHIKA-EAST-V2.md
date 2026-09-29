# Kotochika eastern public loop

29 September 2026. Connect the public plaza across the subway cores to Porta East and the south public passage.

## Evidence and correction

The [current operator floor map](https://kotochika.kyoto/common/pdf/floormap_kyoto15.pdf) shows public circulation on both sides of the North and Central 1 cores, with a crossing at Kotochika Plaza. The saved [city station diagram](https://www2.city.kyoto.lg.jp/kotsu/tikadia/img/map/sta/pdf/k11map.pdf) distinguishes the paid platform-lift approach from that public circulation. Both diagrams were visually inspected for this increment.

The model's North paid enclosure extended south beyond its staffed gate and blocked the crossing. This change pulls its south boundary back to the gate line at Z12 m. The existing Central 1 lift and vestibule remain enclosed as a peninsula within the public crossing. Its approach stays inside Central 1; the public route passes behind its shaft and around either side, outside the paid halls.

An eastern passage at X190–198 m connects the plaza to the retained Porta East cross-aisle through a new 3.6 m portal. At the south end, a 4 m crossing between Central 1 and Central 2 returns to the existing public passage. The retained structural deck supplies X162–192 m; only the missing floor strips are added. Ceilings and end walls enclose every added passage.

Dimensions, registration and finishes remain fitted approximations. In particular, the earlier Exit 5 lift is registered beside the wrong core relative to the operator diagram; its placement and the remaining numbered exits need a separate correction. Eastern retail rooms are still missing. This increment establishes the public route rather than claiming surveyed registration.

## Acceptance

- Walk from the western plaza around the protected lift peninsula to Porta East, and back.
- Walk the eastern passage and southern crossing back to the western public corridor, and back.
- Preserve the North gate/stair approach and Central 1 lift access. Public movement cannot enter the lift shaft or cross the North paid boundary.
- Floor and ceiling coverage, visual/collision exports and saved editable source agree. Verify real Chrome walking and ordinary gameplay before local integration.

## Verification

Eight normal-speed native walks pass with 8,810 position samples. They cover both public connections, the North gate/stair approach and the Central 1 lift approach in both directions. Three boundaries pass 180 forward-input samples: the North paid wall, lift vestibule side and shaft rear. The first wall check incorrectly assumed the player would remain on the flat floor while touching its 16 cm skirting. Declaring that existing contact ledge fixes the check; component bytes and route points remain identical, so the eight passed walks are reused by exact layout hash.

Chrome completes the full public loop in 19 keyboard-driven waypoints. Ten views were inspected, with 377 textures and seven reflection captures remaining stable. Short rolling frame samples are about 16.7 ms median and 16.8 ms p99; they do not establish sustained performance or audio behavior.

Independent geometry checks cover a 0.5 m-wide footprint along both public routes, with continuous floor and ceiling coverage and 2.1 m of clearance. The 489.2 m² of added floors have no duplicate area. The component adds 59 closed panels and 708 triangles, replaces 11 panels, and appends 259,352 browser bytes to the prepared base. All retained browser bytes and unrelated native records match. The saved/reopened Blender scene matches the exports; all seven lifts and thirty escalator lanes remain unchanged.

`npm run build:web`, native gameplay and Chrome gameplay pass, including walking, full translation/spin rest, recall and home. The candidate native shot stops completely after 13.93 seconds. Nine new fixtures share the existing bounded light pool.

The promoted local build also passes native gameplay, reaching full rest in 13.92 seconds. Cleanup removes 1,292,570,048 bytes of temporary generated station files. Private proofs are retained under `.local/v2/current/components/kotochika-east/`.

## Reproduction

Run `prepare-kotochika-east.mjs`, `prepare-east-transfer-base.mjs`, `build-kotochika-east.mjs`, `web/v2/compose-component.mjs` and `finalize-east-transfer.mjs` against the recorded parent. Check correspondence with `verify-east-transfer-geometry.mjs`, coverage with `verify-kotochika-east.py`, native walking with `verify-east-transfer.mjs`, and Chrome with `walk-kotochika-east-chrome.mjs` and `kotochika-east-views.json`. `install-east-transfer.py` installs and reopens the same editable source.
