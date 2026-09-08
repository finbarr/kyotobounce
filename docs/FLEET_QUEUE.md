# Kyoto development fleet

Coordinator: this Codex conversation. Started 2026-09-07.

New observations are appended with stable IDs, then assigned to the owner of
the affected files. Status progresses through queued, running, blocked, review,
integrated and verified. A launched agent is not a completed task. The coordinator
reviews diffs and runtime evidence before integration. Feature machines never
deploy to production.

## Machines

The fleet is capped at five machines per the user's current preference. All
five start from team image `244559976`, on source `bcd27c8`. Each has its
own branch, worktree, writable assets, database, worker and logs. Initial plan:
`medium` (4 vCPU, 8 GB RAM, 160 GB disk), $0.20/hour each; $1.00/hour combined
at the current BoxHaven rate. The image provides 16 GB swap. Heavy Blender
exports run on the station lane without simultaneous Unity imports.

| Box | Branch | Initial work | Codex configuration | State |
| --- | --- | --- | --- | --- |
| [kyoto-robot](https://harbor-cloud-bce90a.at.boxhaven.dev) | fleet/robot-20260907 | K001, K002 | gpt-6-astra, medium effort, standard service | online; source delivered; cleanup complete |
| [kyoto-camera](https://opal-cloud-4468d3.at.boxhaven.dev) | fleet/levels-20260908 | K019 playable courses; camera/capacity work delivered | gpt-6-astra, medium effort, standard service | online; source delivered; cleanup complete |
| [kyoto-station](https://opal-ridge-d24d72.at.boxhaven.dev) | fleet/station-20260907 | K006 | gpt-6-astra, high effort, standard service | online; source delivered; cleanup complete |
| [kyoto-physics](https://banana-orbit-9c461b.at.boxhaven.dev) | fleet/physics-20260907 | K007 | gpt-6-astra, high effort, standard service | online; source delivered; cleanup complete |
| [kyoto-audio](https://golden-orbit-acc224.at.boxhaven.dev) | fleet/audio-20260907 | K013 | gpt-6-astra, low effort, standard service | online; K013/K018/K022 audio delivered and integrated |

## Queue

| ID | Observation and acceptance criteria | Owner | Status |
| --- | --- | --- | --- |
| K001 | Robot gaze follows the bouncing ball with smooth, anatomically limited head motion; returns naturally to aiming; works during replays and preserves grip/release. | robot | verified; Mac rig/gaze/gait and actual native full-game checks pass |
| K002 | Replace unnatural walking with a coherent carrying gait: grounded stance, reduced foot sliding, sensible backward/sideways motion, smooth starts/stops and no changes to authoritative movement. Verify video and collision boundaries. | robot | verified; Mac rig/gaze/gait and actual native full-game checks pass |
| K003 | Flight camera begins aligned with the launch trajectory, smoothly follows the ball's direction with stable world-up and collision clearance, and yields immediately to manual mouse/orbit input until the next throw. Preserve the saved throw aim and replay/recall behavior. | camera | verified; native/browser trajectory/manual/recall checks passed on Linux and Mac |
| K004 | Diagnose kyotobounce.com lag using actual host and service evidence; distinguish CPU/memory/worker limits from browser or network cost. Prepare and verify a concrete capacity or code fix without production load tests or deployment. | coordinator; camera capacity lane | capacity benchmark passed through16sessions; native cadence fix verified30Hz at1/16; no resize justified for measured workload |
| K005 | Make the launch-speed/power control substantially smaller and unobtrusive at desktop and mobile sizes; preserve readable speed, ranges, charge feedback, keyboard access and existing controls. | camera | verified; desktop/mobile Mac browser bounds and keyboard checks passed |
| K006 | Sustained Kyoto Station fidelity lane: first compare current art against reliable station references, prioritize visible omissions, and deliver a substantial first detail pass with before/after views and render-cost measurements. Keep exact collision/visual agreement; finish this bounded detail pass. | station | verified; matched final assets and actual Mac station views pass |
| K007 | Priority: audit and repair unintended floor/landing gaps where balls escape below the station. Record coordinates and reproducible cases; preserve intentional voids, restore correct floors below them, and verify matching visual/collision geometry plus native throws/traversal. No invisible catch planes or arbitrary shot timeouts. | physics | matched final assets integrated; native gap/transfer proofs and preservation of repaired geometry pass |
| K008 | Restore the missing upstairs garden: reference its location, elevation, access, planting, furniture and railings; author a separate candidate and integrate its walkable floor/collision through the structural owner. | station; physics integration | verified; final native traversal/floor/guard checks and Mac garden/access views pass |
| K009 | Priority: user clarified the entire game is jittery, including escalators. Diagnose shared render/snapshot timing across robot, ball, camera and escalators; measure authoritative feet, interpolation, input/state pacing and frame time. Fix the demonstrated cause without crossing collision boundaries or masking latency with excessive smoothing. | camera/control + coordinator performance; robot checks pose jitter | browser clock fix and native30Hz cadence fix integrated; Mac A/B and rebuilt native suites pass; new dedicated Linux worker hash and actual native waypoint smoke pass; final Linux package check passes at1/16sessions on repaired layout |
| K010 | Yellow tactile paving must be physically raised: distinct warning dots and directional bars with reference-backed dimensions, matching visible/contact geometry, and native rolling/bounce tests showing engagement. A flat texture alone is insufficient. | physics contact candidate + station visual candidate | verified;43matched raised patches, native bounce/rolling A/B and Mac near/far views pass |
| K011 | Escalator lower curved rails are visibly segmented, and steps protrude through the building bottom. Repair continuous rail geometry and contained tread entry/return paths, with matched collision, traversable landings and full-cycle evidence at both ends. | physics/structural, including escalators.js | verified;20lanes/40ends pass full-cycle/native transfer checks and final Mac views |
| K012 | Shadow edges are jagged. Improve shadow-map coverage/filtering/bias with stable edges over gameplay areas; compare matched screenshots and frame cost, without blindly escalating GPU memory/resolution. | station/rendering | integrated and Mac moving-view checked; 16.6–16.7ms medians; atrium p99 remains noisier (24.2 vs18.8ms) |
| K013 | Music is too repetitive. Add coherent original synthesized phrases/sections, evolving melody/rhythm/orchestration and smooth transitions over minutes; preserve audible gameplay cues, mute/unlock controls and bounded audio-node use. Capture before/after audio and browser checks. | audio | e031384 integrated; 192s music comparison,125s audio endurance and native browser evidence passed remotely |
| K014 | Space advances to the next challenge from a completed-level result without releasing pointer lock. Preserve normal Space-to-throw, ignore key repeats/editable fields, prevent accidental multiple advances, and show the shortcut on the next-challenge action. Verify completion, retry and final-level behavior. | camera/control; narrow competition.js ownership added | verified; actual Mac pointer-lock/Space/repeat/retry checks passed |
| K015 | Priority: timer points stop accruing while a ball is still moving toward/in the goal center. Diagnose goal-contact/prediction/time-bonus freeze; keep accruing according to the corrected movement rule until true rest, preserve final authority and immutable old replay scores, and version changed scoring behavior. | dedicated scoring worktree; coordinator review | verified in coordination branch; native and real-browser timer/result/replay checks passed; not deployed |
| K016 | Concrete K007/K011 reproduction: ball falls through the TOP of the escalator on Catch the Lift. Reproduce with actual stage and varied release phases, repair upper comb/landing/side support and tread turnover, then verify continuous support at both ends through full cycles. | physics | baseline top-runout sinking reproduced; candidate passes four release phases, matching rays and walking; native and actual browser course/replay checks pass |
| K017 | Give the robot a coherent Japanese arcade/mecha/toy-robot identity with expressive face, strong silhouette and intentional color/material accents. Preserve rig/release/gaze/gait, verify actual browser views, and deliver original art as a candidate asset handoff if needed. | robot | verified; all three characters pass native full-game record, replay and interruption checks |
| K018 | Bold pachinko/game-show spectacle: HUGE bouncing multiplier numbers on actual multiplier jumps, escalating scale/pitch/LED chase and rich bank/goal/result fanfares. Milestones must feel progressively more extreme. Maintain score authority, readable flight, audio controls and bounded resources; verify a real audiovisual chain, plus reduced-motion behavior. | audio and feedback visuals | e031384 and70bdb4e integrated; actual Mac classic and waypoint jackpot chains passed; route-miss celebration corrected |
| K019 | Design and build better challenges around meaningful station spaces. First finite design pass: top deck to authentic station konbini plus two distinct routes; verify geography, throw feasibility and readable progression, gate final coordinates on detailed matched geometry, and publish only new challenge revisions. | kyoto-camera levels worktree; station/physics handoffs | verified; all24 native course samples and full-game completion/replay/retry pass; optional destination bonus misses keep waypoint points |
| K020 | User screenshot shows striped doorway-threshold bleed and floor patches that flicker/stutter with camera movement. Identify actual overlapping geometry, depth precision, shadow or material cause; repair it and verify continuous movement at near/far views. Preserve matching structure and collision. | station/rendering; physics/camera handoffs if needed | verified; four coplanar triangles/.935947m² clipped; actual final Mac moving doorway views pass |
| K021 | Lighting pops into existence inconsistently while moving and appears to cause stutter. Reproduce the current two-light pool's 0.4-second full-intensity reassignment, stabilize lighting with measured frame cost, and verify traversal plus clock/replay resets. | station/rendering | verified in actual native walk; 4 relocations while lit became 0; two-light count unchanged; clock rollback/fade checks pass |
| K022 | New waypoint-v1 scoring: optional once-only surface waypoints and at most one optional destination. Preserve waypoint points when destination missed, add landing bonus, keep full native rest/authority and immutable classic replays. Author/play/replay both course forms; see WAYPOINT-SCORING.md. | local native/backend + browser worktrees; audio handoff | backend5796125 and UI63bebe5 integrated; rebuilt native suites plus actual Chrome editor/play/replay and delayed-placement checks passed; not deployed |
| K023 | Three selectable original Japanese arcade robot characters with distinct silhouettes/personalities and high-score dances. Preserve identical physics/release/gait and replay compatibility, persist cosmetic choice, verify real record-driven celebrations and reset. | robot; browser integration | verified; actual records for all three characters, saved choice, replay suppression, reduced motion and desktop/mobile winner visibility pass |
| K024 | Score/waypoint-driven ball heat: charged color/glow, fire/embers/trail, then extreme jackpot state. Synchronize with sound/multiplier spectacle; preserve physical core, visibility, timing and bounded render cost. | waypoint browser presentation + audio | verified; actual native12.6m and combined169.8m stress shots, visible fire/bursts, replay resets and all tiers verified; not deployed |

## Current findings

- All five boxes have the source-compatible Linux worker and an active local game
  service. All feature delivery and cleanup are complete. Final rendering, archive replay and existing/fresh course startup passed.
  Codex 0.153.3 uses persistent `boxhaven` tmux sessions, effort overrides and
  `service_tier=default`. Actual browser startup and throws passed on all five development previews.
- No Unity authentication is currently blocking fleet work. The new waypoint
  dedicated LinuxServer worker built successfully on the licensed Mac and its
  archive/code-assembly hashes were verified after transfer to physics and levels. The coordinator will flag any actual remote
  editor/build activation requirement promptly, per the user's request.
- [Production audit](PERFORMANCE-AUDIT.md): the idle 2-vCPU/4-GB host had 99%
  idle CPU, 2.9 GiB available RAM and no current-service restarts. This neither
  reproduces gameplay lag nor proves capacity under traffic. The
  serial Unity worker and 16 normal clients have since passed isolated Linux
  capacity checks; measured cadence loss was fixed and verified with rebuilt
  native workers. See web/bench/CAPACITY.md and NATIVE-PUBLICATION.md.

- K015: native perfect-shot timer now continues from first goal entry at 10.78 s
  through 16.41 active seconds; identical stationary tail poses add nothing.
  Archived v4 score objects were byte-identical on three native trajectories.
  Integrated browser throw verified the HUD rising after goal entry, the final
  timer breakdown, and visible combo feedback during replay.
- [Official station retail map](https://www.dailyservice.co.jp/shop/map?type=kyoto)
  (July 2026) confirms several station 7-Eleven Heart-in shops, including the 2F
  west entrance. The West Exit2F shop is registered at the inferred model doorway(-54,7.35,-18).
  A new supported gallery connects the actual2F landing; native walk/contact checks
  pass. A real top-deck shot enters and rests inside; all eight native samples pass. Actual browser delivery banked both waypoints;
  its optional destination bonus was missed and its saved replay passed.

- K009 Mac/Metal A/B: steady play dropped from15 backward steps/128 stalls
  to0/0; with injected120ms ordered packet delays, backward steps dropped33→0
  while stalls dropped396→232. Median RAF remained16.7ms and both renders
  respected the exact native wall boundary. This fixes backward shared time,
  not all network starvation or lighting/rendering stutter.
- K022 native acceptance: waypoint-only124,321 points; the same shot with a
  missed destination kept124,321. Separate supported-destination, wall and
  ceiling fixtures passed, including backside/nearby rejection,32targets,
  slow contacts and recall. Archived v4/v5 score objects remained identical.
  Actual Chrome author/play/replay acceptance runs in an isolated local lane.

- Combined K018/K022/K024 browser acceptance on the coordinator: a deliberately
  overlapping12-target local stress course earned169,830,720 authoritative
  points, displayed the earned ×2,048 burst, entered jackpot heat, saved/replayed
  and reset cleanly. This is stress evidence, not a designed or published course.
  Missing-required-route results now suppress both success animation and music.
- All three robot characters completed actual native personal-record shots and
  result dances. Saved replays suppress celebrations; retry/charge interrupt cleanly.
  Desktop1440×900 and narrow390×844 results keep the full robot visible. Reduced
  motion, persistent selection and3,016 sampled celebration invariants passed.

## Ownership and handoffs

- Robot owns `web/public/avatar.js`, robot-only browser tests, and robot
  source/export scripts if required. It must request edits to `game.js` through
  the coordinator; the existing `poseAvatar` arguments already include ball state.
- Camera owns `web/public/game.js`, `style.css`, `arcade.css`, `index.html` and
  camera/power-specific browser tests, plus narrow `competition.js` changes for
  K014 result-keyboard flow. It preserves other gameplay and avatar APIs.
- Audio owns `web/public/arcade-audio.js`, `arcade-feedback.js` and audio/feedback-only
  tests. Its public API remains compatible with camera/gameplay callers. Shared
  CSS/game/build manifest hooks require a coordinator patch handoff.
- Station owns station art scripts, station-only rendering modules and candidate
  decorative outputs, plus a standalone upstairs-garden candidate, K020 edge artifacts and K021 light stability. Physics owns
  the structural `KyotoAtrium.blend`, `tools/export_atrium_layout.py`,
  `web/public/escalators.js` and candidate
  floor/collision repairs; station must not edit that same structural source.
  `runtime/station-layout.json`, native physics, asset manifests,
  package manifests and asset releases require an explicit integration handoff.
- Shared contracts, production changes, published asset packs and PR integration
  belong to the coordinator. Never upload `.local/`, secrets, research images,
  Unity binaries or large asset originals into Git.
- Agents record progress and blockers in `.local/fleet/STATUS.md`, and deliver
  `.local/fleet/RESULT.md` with commits, tests, screenshots/video and limitations.
  Report Unity licensing only when it blocks an actual editor/build operation.
- The coordinator keeps the operational manifest, logs and task prompts in the
  ignored `.local/fleet/` directory in this coordination worktree. Future turns
  read this queue and live box status before assigning more work.

- Cleanup: six completed local worktrees, superseded coordinator logs/setup files,
  old worker/import output and temporary benchmark services/databases removed.
  Robot removed110superseded files; audio48; station34; physics1.47GB of retired
  candidates. Required archive assets have one verified permanent copy.
  Retain reproducible source, compact final evidence and required immutable assets;
  superseded candidates and the completed remote levels/capacity worktrees are gone.
  Only the current local4192review and five established public development previews remain.

## Final integration gates

Combined collision SHA: `7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775`.
Main browser asset has one intended scene /587batches,166,133,128bytes, with
matching layout metadata and rebuilt hardware. All eight incoming source/runtime
asset hashes were verified before installation. The original six650fed69 archive
files remain byte-identical. The main exporter wrote its complete GLB and receipt
before a slow shutdown was terminated; parsed geometry and browser views passed.

First Bank and Return Ticket have exact native-proved revision8 definitions on
that layout, using existing hints259ms/173ms and unchanged placements. Actual
native rest and authoritative score/replay parity pass (41,424 /38,386 points).
Read-only production history is6/6/8, unlike fresh local4/4/6. Catch the Lift's
new definition must therefore use revision10; no existing revision is reused.
Production-like6/6/8, local4/4/6 and fresh startup/restart all select the exact
five current courses. Historical raw challenge/replay/score rows remain unchanged;
restart adds no challenge, attempt or migration rows.

Final Mac station inspections passed at16.3–16.8ms median across eight views,
with no asset/JavaScript errors. Original historical challenge/replay bytes and
169,830,720-point replay were preserved on the actual new layout; Chrome loaded
only its matching old assets and opened no native WebSocket.

The local assets-v2 pack has34allowlisted files,209,823,956bytes and verified
SHA314f099eb4f836e1f744cf9f38a5edab91e112ecefed65f189a1c823e5b32ad7.
The packaged dedicated Linux runtime passed an isolated1/16-session check at
30.058/29.932Hz, with zero errors/recoveries/saturation. Worst observed gap was
118.7ms; this does not establish production WAN or GPU performance. Test staging
and processes were removed.

All24 native course samples match the canonical physical definitions and proved
numeric hints. Staircase Special completed/replayed with551,813points; Catch the
Lift earned117,852points plus its landing bonus in the Mac browser. Last Order
banked609,881points and both interior waypoints; its destination bonus was not
earned. All three saved replay and retry flows passed.

The prepared runtime package has238files. Only the final starter file and its
browser build manifest changed after the Linux package run; all236other packaged
files remain byte-identical. Asset originals, geometry and native workers are frozen.
Current definitions have one source in web/starter-challenges.json; authoring
helpers derive fixtures from that file and retain no duplicate catalog or seeder.

Implementation and acceptance are complete. The local preview is
http://127.0.0.1:4192. The prepared assets-v2 and Linux runtime packages remain
local; no production deployment or asset release publication has been performed.
