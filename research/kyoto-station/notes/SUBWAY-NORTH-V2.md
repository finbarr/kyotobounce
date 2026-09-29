# North subway gate and platform end

29 September 2026. Open the fourth subway gate from the public passage, add its paid hall and stairs, and extend the island platform to receive them.

## Evidence and construction

The saved [city station diagram](https://www2.city.kyoto.lg.jp/kotsu/tikadia/img/map/sta/pdf/k11map.pdf) was visually inspected. It places the North gate beyond Central 1 with a separate descent at the end of the shared island. The [K11 operator page](https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm) lists North as a staffed gate and confirms the single island and two tracks. Hall dimensions, levels, stair counts, office layout and finishes remain fitted approximations; the diagram does not supply a measured section.

The new vestibule opens through the public passage's east wall at Z8–24 m. A service window and a small office with a door into the paid hall sit beside the gate. An open gate lane leads around the stair well to the upper landing. Two fifteen-step flights descend southward from Y−6.2 m to the platform at Y−11.2 m, with a 1.8 m intermediate landing. The 6 m wide shaft occupies Z16.15–28 m. Its structural deck, suspended ceiling, side walls and guards share matching boundaries.

The platform extends 16.5 m north to Z32.5 m. The old end guard is removed; three additional door modules on each side, tactile strips, floor joints, ceiling channels, two column/base pairs and a new end guard complete the extension. The rails and tunnel already continue beyond this area. The public passage and its existing street-exit turn remain connected alongside the gate.

Gates and platform doors are static. The station still needs platform escalators, accessible vertical routes, the onward plaza Porta B1 connection and public-side Kotochika retail space. These are the next structural priorities; this delivery does not claim a finished subway interior.

## Verification and rebuild

`prepare-subway-north.mjs` identifies 21 retired surfaces. Use its scope with `prepare-east-transfer-base.mjs`, then build with `build-subway-north.mjs`, compose with `web/v2/compose-component.mjs` and bind unchanged moving hardware with `finalize-east-transfer.mjs`.

The shared geometry verifier checks 233 added panels, 9,732 vertices and 3,244 triangles against the native export. It removes 388 old triangles, for a net increase of 2,856. Retained native records and existing encoded browser data are unchanged. `verify-subway-north-openings.py` confirms that the deck changes only at the new 71.1 m² opening, the platform grows by exactly 198 m², and the ceiling gains 423.9 m² after the new opening. Earlier stair openings are preserved.

`verify-east-transfer.mjs` reads fourteen walks (seven routes in both directions) and three closed-boundary checks from the component report. These cover the gate/stairs, public passage, both platform aisles, platform end, Central 1 connection and existing street-exit stair. Boundary checks walk toward both extended door lines and the north end guard, requiring a grounded stop before the track edge. Route entries and endpoints must stay grounded and match the expected floor height.

All fourteen walks and all three boundary checks pass: 5,271 walking samples and 180 boundary samples. The geometry and footprint checks pass on the same source layout, `5c9fafeb1279597a2b53f63b8953d604fe5e63285d1de7f1b34f5cce7ca4a9e8`.

`subway-north-views.json` defines eleven Chrome inspection views. `inspect-east-transfer-chrome.mjs` checks their actual camera positions and browser errors. `install-east-transfer.py` installs the new component into the editable scene and checks the saved geometry, labels and retained bindings after reopening. The Blender check and Chrome gameplay check pass, as does `npm run build:web`.

All eleven Chrome views were visually inspected, including a corrected camera direction at the platform end. There were no page errors; texture and reflection-capture counts remained stable. Short, overlapping frame windows at 1440×900 had a 16.7 ms median, 16.8 ms p99 and 33.3 ms maximum. These are inspection samples, not a sustained performance benchmark.

The browser addition is 538,000 bytes and eleven material batches. Twelve added fixtures share the existing pool of at most two active lights. No source photographs are used as textures; bilingual sign artwork is generated locally.

The promoted preview on port 4425 passes the authoritative play loop: grounded spawn, 1.37 m walk, full translation/spin rest after 13.93 seconds, free result, recall forfeiture and home.

Private construction and verification receipts live under `.local/v2/current/components/subway-north/`. The current station and editable source were replaced in place. Cleanup removed 1,222,839,205 bytes of superseded generated scenes and the stopped port 4426 overlay, preserving the current source, textures and small receipts.

## Follow-up evidence leads

The public plaza connection should be checked against the Kotochika and Porta plans before fitting more corridors. A targeted search found an [operator retail map](https://kotochika.kyoto/common/pdf/kyoto4.pdf) and a [firsthand guide with a North gate photograph](https://kyoto-rys.com/map/chika/). The guide page was read, but the map and photograph could not be fetched through the web tool; their visual contents have not been used for this construction.
