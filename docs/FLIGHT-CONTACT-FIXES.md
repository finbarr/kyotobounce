# Flight camera and contact fixes

The ball camera now has its own view. Mouse and arrow orbit inputs during flight leave the robot's throwing direction and position alone. The reticle disappears at release. Recall restores the exact last throw yaw, pitch and zoom; changing challenges clears that saved aim. The live score sits in a compact bottom corner, and the white power-meter mark is explicitly labeled as the suggested power.

The shot inspector retains the previous flight report after recall. Saving its report includes both current state and the previous shot, including contact surface, support normal, velocity and angular velocity.

## Contact model

The reported stationary ball had angular speed 85.679 rad/s after 60 seconds on `east-frontage-roof-return`. The old torsional resistance of 0.002 represented an unrealistically small spin-friction moment for this game's rubber ball. The new estimate is 0.025 times ball radius, a 0.575 mm effective friction arm for the 23 mm ball. This is an explicit material estimate, not a measured calibration result.

Torsional friction opposes spin about the contact normal. Tangential spin still transfers motion to the ball through contact friction, and rolling resistance remains separate. Ground torques require actual sustained support and are absent in flight. This distinction follows the [MuJoCo contact model's torsional and rolling friction description](https://mujoco.readthedocs.io/en/latest/computation/#contact).

A deterministic Unity test at the reported roof position now stops translation and rotation at 3.58 seconds. A separate horizontal-axis spin test moves the ball 23 cm in half a second. An airborne control retains its angular speed. Shots still finish only after both translation and rotation stop.

Authored escalator skirts and undertrays are convex prisms. Their colliders now use their solid convex shape and local coordinates, instead of hollow triangle shells that can miss an interior overlap. The visible mesh and canonical layout stay the same. Fixed landings and casing may sleep; an actual approaching moving tread wakes the ball. Merely being inside an escalator's broad proximity box no longer keeps it awake.

The escalator regression tests start outside the solids and exercise a drop onto the reported skirt plus slow and 100 m/s side impacts. The original interior coordinate was already inside overlapping shells; it is not a valid launch position for a new trajectory. The drop returns to the landing and stops without exhausting the contact budget.

## Versioning and checks

The current physics version is `kyoto-p3-3`. The game is pre-launch: startup discards scores and courses from retired physics instead of migrating or archiving them. Current-version scoring remains authoritative and replays retain their recorded poses.

Focused Unity verification uses `Kyoto.Editor.BatchTasks.FlightContacts`, with `KYOTO_LAYOUT` set to the canonical layout path and `KYOTO_CONTACT_REPORT` set to an output JSON path. Run it with Unity's `-batchmode -nographics -executeMethod` options, without `-quit` (the play-mode task exits itself).

Service checks: `npm run typecheck`, `npm test`, `npm run build:web`. After rebuilding the native worker, run `npm run test:runtime` and `node web/tests/flight-controls.mjs` against an isolated `KYOTO_TEST_ORIGIN`.

## Station floor spin response

Station granite uses sliding friction 0.24 and tangential restitution 0.12, matching the moderate grip of other hard station surfaces. Its normal restitution remains 0.9085344, so vertical bounce height is unchanged. The fitted laboratory Superball response (friction 0.40394, tangential restitution 0.83845, plus a deformation moment) remains available only when explicitly selecting a reference surface in the lab. It no longer overrides the station's floor material.

These station coefficients are gameplay material estimates, not a new measured calibration. A real Superball can reverse direction under backspin, particularly near normal incidence; see Cross, [Impact behavior of a superball](https://pubs.aip.org/aapt/ajp/article/83/3/238/1057893/Impact-behavior-of-a-superball). A long flight can lose most of its horizontal speed before hitting the ground. The adjustment reduces this effect without adding a direction clamp, speed-dependent assistance or artificial spin decay. Friction remains bounded by the normal impulse, and the same impulse changes translation and rotation.

`Kyoto.Editor.BatchTasks.StationSpin` tests the actual station material through native swept contacts. A 100 m/s, 60-degree lob with -200 rad/s spin travels 127.14 m before impact. It arrives at 4.36 m/s forward and leaves at 1.49 m/s forward; the lab response would return it at 0.35 m/s. This agrees at 90, 180 and 360 Hz. Ninety impact combinations cover speed, angle and spin, with checks for energy, friction budget and angular momentum. Slow draw shots, topspin, symmetric side kicks, contact-normal spin and full rest are also checked. Strong spin can still reverse a sufficiently slow or nearly vertical shot.

Run the task with Unity's `-batchmode -nographics -projectPath KyotoRicochet -executeMethod Kyoto.Editor.BatchTasks.StationSpin -logFile /absolute/path/to/log`, without `-quit`; it exits itself and writes `.local/spin-verification/report.txt`. Rebuild the worker and recheck the campaign whenever the physical response changes.

## Apparent spin reversals

Live snapshots arrive at 30 Hz. Interpolating their endpoint quaternions by the shortest path loses full rotations: at +150 rad/s, one update spans +5 radians, but the old interpolation travels -1.283 radians. Its halfway orientation is -0.642 radians instead of +2.5. This can make steady deceleration appear to stop and reverse.

The service now sends the existing native 180 Hz orientation samples (positions remain private), and the renderer interpolates those smaller intervals. The physical trajectory and score are unchanged. The ball's repeating seam markings soften with angular speed and display exposure time before they alias into a reversing wheel. Live exposure uses actual native angular speed, including impacts faster than the launch limit. Replays already contain the fine orientation samples and get the same marking treatment.

The stationary-spin Unity checks cover 85.679 and 200 rad/s: each decreases monotonically, never reverses, and never gains spin after stopping. Browser rotation tests cover both signs, whole turns, irregular packet delivery, deceleration and a genuine collision reversal that must remain visible. The maximum-spin floor case stops at 7.87 seconds.
