# Station campaign

Updated 9 October 2026. **30 current levels**, developed and merged into local
`main`. No push, deployment or asset-pack publication.

## Current scope

The station architecture and native physics are unchanged by this refinement.
Eight courses now use longer approaches, returns or descents. The campaign has
**10 short routes** (under 15 m), **12 medium routes** (15–40 m) and **8 long
routes** (over 40 m).

Distances measure the suggested shot's travelled path through its final required
waypoint. Later rolling and optional destination travel are excluded. These are
route lengths, not straight-line distances between targets.

Retired course revisions are discarded. Current scoring remains server-authoritative
`waypoint-v4`: the first waypoint gives ×10 and each further waypoint doubles
the multiplier; each distinct bank adds +0.5×. See [ARCADE-SCORING.md](ARCADE-SCORING.md).
A result still requires full translation and spin rest. Recall forfeits.

## Opening progression

First Bounce has one broad floor waypoint about 6.7 m ahead of the robot, with no
landing destination. Its flat 10 m/s precision throw travels 6.6 m before the
waypoint. The opening camera is pulled back to 5.2 m, including fresh entry,
return to start and recenter; the coaching uses the current suggested speed.

The opening chapter introduces one requirement at a time:

1. **First Bounce:** one broad floor target; aim and charge.
2. **Glass Return:** one glass target, with an optional landing bonus.
3. **Clock In:** one smaller, elevated target.
4. **Blue Wall Bank:** a longer bank and floor return; labelled Medium.
5. **Ticket Slalom:** a precise pair of cabinet targets.

## Revised courses

| Course | Suggested route | Features |
| --- | ---: | --- |
| Blue Wall Bank | 26.1 m | Blue-wall bank and longer concourse return |
| Basement Drop | 40.7 m | High atrium lob into the glass well and B1 floor |
| Glass Loop | 21.5 m | Back wall, inside glass and aisle return |
| Bridge Pinball | 62.5 m | Bridge glass and the upper west gallery |
| Stair Skip | 26.3 m | Third stair landing, middle landing and Muromachi Square |
| Garden Corner | 50.1 m | Rooftop viewing glass and promenade return |
| Canopy Crossing | 55.5 m | Diagonal flight over the near canopy onto the next platform |
| Skyway Circuit | 64.5 m | Westbound skips along the glass walkway |

Every revised course passed **two exact native shots and six nearby variations**
(64 completed shots in total). All reached full translation and spin rest.
Each accepted course cleared on the first shot of its final Chrome acceptance
run, including saved replay, scrub and retry. No music steps were skipped during
those eight browser shots. Earlier rejected candidates are not part of this catalog.

Apart from First Bounce, the other 21 courses retain their previously verified geometry and launch inputs.
Their native evidence remains in `.local/campaign/final-audit/native/`.

## Camera and desktop behavior

The robot camera keeps its normal shoulder distance at walls. A small feathered
cutaway removes only the station surfaces between the camera and robot.
Collision and ball-follow obstruction remain active. The cutaway clears when
switching views.

Local browser checks install `web/tests/background-input.mjs` before navigation,
run headless and use keyboard controls. They cannot call the browser's native
pointer-capture API. The macOS worker is background-only; its running activation
policy was verified as prohibited, with no foreground activation. New launches
reject a worker bundle without that setting. See
[PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md).

## Campaign distances

| Level | Course | Route | Length |
| ---: | --- | --- | ---: |
| 1 | First Bounce | Short | 6.6 m |
| 2 | Glass Return | Short | 2.2 m |
| 3 | Clock In | Short | 7.2 m |
| 4 | Blue Wall Bank | Medium | 26.1 m |
| 5 | Ticket Slalom | Short | 4.7 m |
| 6 | Basement Drop | Long | 40.7 m |
| 7 | Pier Pressure | Short | 5.2 m |
| 8 | Ceiling Skip | Short | 9.9 m |
| 9 | Upward Bound | Medium | 15.2 m |
| 10 | Glass Loop | Medium | 21.5 m |
| 11 | Bridge Pinball | Long | 62.5 m |
| 12 | Step Down | Short | 6.0 m |
| 13 | Terrace Triple | Medium | 38.6 m |
| 14 | Timber Turn | Short | 10.2 m |
| 15 | Promenade Pinball | Medium | 18.8 m |
| 16 | Stair Skip | Medium | 26.3 m |
| 17 | Soft Landing | Short | 9.2 m |
| 18 | Garden Corner | Long | 50.1 m |
| 19 | Planter Skip | Short | 6.6 m |
| 20 | Rooftop Circuit | Medium | 21.4 m |
| 21 | Platform Zero | Medium | 23.7 m |
| 22 | Column Switchback | Medium | 30.4 m |
| 23 | Canopy Crossing | Long | 55.5 m |
| 24 | Platform Descent | Medium | 31.0 m |
| 25 | Underpass Circuit | Medium | 15.5 m |
| 26 | Grand Descent | Long | 97.7 m |
| 27 | Skyway Circuit | Long | 64.5 m |
| 28 | Tower Return | Long | 215.1 m |
| 29 | Passage Rebound | Medium | 35.3 m |
| 30 | Atrium Finale | Long | 80.8 m |

## Verification and evidence

The latest opening revision passes typecheck, the complete unit/service suite and
the browser asset build. First Bounce passed two exact native throws plus all six
variations (yaw ±8°, pitch ±5°, charge ±122 ms), all at full translation and spin
rest. Chrome cleared it on the first keyboard throw and verified saved replay,
scrub, retry and advancement to Glass Return. No music steps were skipped.

`web/tests/browser-first-bounce.mjs` checks fresh 1280×800 onboarding, the current
charge instruction, recenter, return to start and opening course order. Its
screenshots show the whole robot and floor target with the tutorial visible.
Accepted evidence is in `.local/first-bounce/{accepted-native,accepted-browser,framing}/`.

The preceding station-wide verification passed the full runtime integration suite,
all 30 starting views and five walking/back-to-wall sequences, with no robot-hiding
frames and normal shoulder clearance. Those camera receipts remain in
`.local/level-refinement/final-camera/browser.json`.

Runtime coverage includes authoritative scoring and replay parity, recall
forfeiture, exploration movement, full rest, saved course design, tampered-proof
rejection and cancellation during flight. Browser checks remained headless with
pointer capture disabled.

Accepted evidence is under `.local/level-refinement/` (outside Git):

| Course | Native proof | Browser proof |
| --- | --- | --- |
| Blue Wall Bank | `blue-proof/` | `blue-browser/` |
| Basement Drop | `basement-proof/` | `basement-browser/` |
| Glass Loop | `glass-proof/` | `glass-browser/` |
| Bridge Pinball | `bridge-final-proof/` | `bridge-browser/` |
| Stair Skip | `stair-proof/` | `stair-browser/` |
| Garden Corner | `garden-proof/` | `garden-browser/` |
| Canopy Crossing | `canopy-final-proof/` | `canopy-final-browser/` |
| Skyway Circuit | `skyway-accepted-proof/` | `skyway-browser/` |

`accepted-summary.json` checks these receipts against each current course's
revision, start, target geometry, hint, layout, physics and scoring. It also
checks the displayed distance and the final 10/12/8 route mix.

There is one checkout and one current station bundle. The unrelated Unity
package-lock edit is untouched. Each verified course increment was committed
and merged before starting the next. Superseded trial recordings were removed;
the accepted refinement evidence occupies about 129 MB.

## Floor regression workflow

The focused rest fixture is `web/levels/ticket-slalom-rest.json`. Run
`Kyoto.Editor.BatchTasks.CampaignRest` through Unity batch mode with `KYOTO_LAYOUT`,
`KYOTO_REST_INPUT` and `KYOTO_REST_REPORT` set to absolute paths. Omit `-quit`;
the batch task enters Play mode and exits after the test. This defaults to a failing
40-second observation limit, never a gameplay finish timer.

The floor repair uses `prepare-atrium-grout.py` (Shapely 2.1+),
`build-atrium-grout.mjs` and `install-atrium-grout.py`, then the normal browser
exporter with `--only-object hall-bay-floor-surface` for the parent and candidate.
Use `verify-atrium-floor-fragments.py` if the parent uses equivalent alternate
triangulation. `install-atrium-grout-browser.mjs` replaces visible fragments while retaining
all other encoded geometry and textures. Selected exports still consider nearby
station objects when removing hidden overlaps. Use Blender's `--python-exit-code 1`
so a failed source/export assertion stops the workflow.
