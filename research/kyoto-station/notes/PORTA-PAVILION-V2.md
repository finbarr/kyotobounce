# Porta forecourt pavilion: restore its missing stair

29 September 2026. Connect the retained municipal entrance to the underground mall.

## Scope and evidence

The current municipal model already supplies a Porta entrance pavilion, including its façade, columns, canopy and signs. Inspection found that the forecourt paving filled its interior and no stair connected it to the mall. This repair keeps that exterior and opens the paving and mall ceiling beneath it.

The [operator shop guide](https://www.porta.co.jp/common/pdf/floor/shopguide_jp.pdf) and page 7 of its [April 2024 area plan](https://www.porta.co.jp/common/pdf/company/hinankeikaku.pdf) establish the street entrances around the west area. A separately saved [2013 C2 entrance photograph](https://commons.wikimedia.org/wiki/File:Kyoto_Porta_Entrance.JPG), by KishujiRapid, shows a different façade. The retained pavilion's exact numbered exit remains unconfirmed. This repair uses its registered municipal geometry rather than assigning it that photograph's identity.

## Acceptance

- A continuous, guarded stair descends from the retained pavilion to North Street, in both directions and in both lanes.
- The middle landing, ceiling opening and paving cut have usable headroom. Existing exterior surfaces and paving texture coordinates remain intact outside the opening.
- Adjacent shop entrances, the west cross-passage and lift approach remain usable.
- Native collision, browser geometry and the saved editable station agree. Chrome walking and ordinary throwing/recall still work.

The fitted well occupies X37.5–49, Z40–51.3 m. Thirty-four risers connect the retained forecourt apron at Y0, to B1 at Y−6.2 m. The intermediate landing is 1.6 m deep; risers are approximately 0.182 m and goings 0.285 m. A rear spandrel closes the join above the mall ceiling. Four generic shop bays are rebuilt around the core. Two synthetic street bollards inside the well are removed. Dimensions and the underground registration are fitted approximations; the retained exterior is preserved.

## Verification and delivery

Eight normal-speed native route walks pass with 3,023 position samples. The middle-landing wall also blocks the player without loss of floor support. Chrome completes the full descent, North Street approach and return, with 13 stops on flat landings.

Seventy clearance volumes check 2.1 m of headroom across both stair lanes. The 129.95 m² paving opening retains the original surface, normals and texture coordinates around it. Browser/native correspondence and the saved/reopened Blender source pass. Nine Chrome views were inspected; texture count stays at 375 and reflection captures at seven. Six fixtures use the existing two-light pool.

The component adds 198 panels and 2,424 triangles, replaces 88 prior panels and adds 282,100 browser bytes. `npm run build:web`, native exploration and Chrome gameplay pass, including walking, complete translation/spin rest, recall and home. The candidate native shot reached full rest in 20.14 seconds. These checks establish route and gameplay behavior, not a prolonged performance or audio soak.

Private verification records are retained under `.local/v2/current/components/porta-pavilion/`. The promoted local build also passes native gameplay (20.76 seconds to full rest). Cleanup removed 1,290,279,158 bytes of superseded generated station files, preserving the current editable source.

## Reproduction

Run `prepare-porta-pavilion.py`, `prepare-exit-five-base.mjs`, `build-porta-pavilion.mjs`, `web/v2/compose-component.mjs` and `finalize-east-transfer.mjs` against the recorded parent. Verify with `verify-porta-pavilion-openings.py`, `verify-exit-five-openings.mjs`, `verify-east-transfer-geometry.mjs`, the normal-speed native route walker and `walk-porta-pavilion-chrome.mjs`. `install-east-transfer.py` installs and reopens the same source scene.
