# Browser shot playback

Walking, aiming and wind-up use snapshots from the dedicated browser worker.
Release locks the launch state. The worker advances the 180 Hz contact solver
ahead of presentation, using the same analytic station clock for moving
escalators. Rendering and audio remain on their own clocks on the main thread.

Physics computes at most 30 seconds ahead of acknowledged playback, with one
step of numerical tolerance. A recording batch contains at most 180 new poses,
30 presentation frames and a bounded event batch. The worker yields between
batches and waits for IndexedDB acknowledgments, so a long-running shot cannot
grow an unbounded in-memory trajectory. These limits pause computation; they
never finish a moving ball.

`shot-chunk` messages contain motion and timestamped contacts. The browser's
playback clock drives the ball, robot, escalators, score and effects. Future
results and sounds stay hidden until their presentation time. A buffer underrun
waits for physics instead of extrapolating through a collision. Local intent
fences discarded attempts: late worker messages cannot restore a recalled shot
or take over the camera while the player holds a new ball.

A successful result requires both translation and spin to stop. The completed
recording remains provisional until the result is presented; only then are the
score, replay header and optional verification outbox entry saved atomically.
Recall forfeits even when computation has finished ahead of playback. Leaving
the station is a forfeit, not an artificial rest state.

During flight, hold Space or use the speed button for 2× playback. Ball and
station animation, score effects, music and sound envelopes speed up together.
The physics timestep and scoring duration do not change. Camera controls remain
responsive at normal speed. Focus loss, menus, recall and completion restore 1×.

Enter or **Skip to result** removes the compute-ahead lead limit while retaining
storage backpressure. Playback waits for the final resting pose and result,
then jumps once without a burst of skipped impact sounds. Full replay data is
preserved. Recall stays available while **Finishing shot…** is displayed.

Gameplay has no WebSocket or native-session reconnect path. Network loss only
affects optional online synchronization; loaded gameplay continues locally.
Reload retains saved progress, courses and complete shots. It discards an
unfinished recording rather than awarding an unearned result.

## Replays and online scores

Local replays load their original full pose, rotation and contact records from
IndexedDB. They include launch controls, station/rule versions, player name and
cosmetic robot choice. The moving station follows the recorded clock. Orbit,
free camera, pause, seek and playback speed do not change the recorded score.

With a verifier configured, saved legal controls can be independently checked
online. The service reconstructs walking, release, flight and scoring using its
own current course and collision assets. It never accepts a client final score,
trajectory or claimed waypoint hit as evidence. A local result stays labelled
local until verification succeeds; network failure leaves the saved result and
pending upload intact.

Public `/replay/<attempt>` links fetch a verified input seed. The browser worker
reconstructs it and checks the server's result before displaying it. Accepted
replays are cached transactionally for offline viewing, within shared count and
byte limits. Direct links require neither a player registration nor a name
prompt. Only verified published results receive public sharing controls.
See [ON-DEMAND-VERIFICATION.md](ON-DEMAND-VERIFICATION.md) for persistence,
authentication, bounded verification and cache details.

## Verification

Run `npm run typecheck`, `npm test` and `npm run build:web` for portable checks.
`npm run test:browser` exercises offline desktop/touch play, Skip, recall,
replay seeking and reload persistence through the normal startup command.
`npm run test:browser:recording` verifies long-running motion, delayed storage,
failure handling and interrupted-recording cleanup. `npm run test:browser:sync`
checks offline queueing, reconnect, verified standings and public replays.

The full station and campaign evidence is indexed in
[BROWSER-PHYSICS.md](BROWSER-PHYSICS.md). Browser checks run headlessly with the
background input guard installed before navigation. Never create test records
on production by default.
