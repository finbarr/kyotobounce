# Level design

The new campaign is being built on the reconstructed station. Its target is
exactly **30 levels**, including an introductory first level. Only finished levels
enter `web/starter-challenges.json`; see [CAMPAIGN-PROGRESS.md](CAMPAIGN-PROGRESS.md)
for the current count and next task. The retired campaign is discarded.

## Design rules

- Teach aiming and charge timing with broad targets before requiring bank chains.
- Use the atrium, public basement connections, bridges, staircase, gardens and
  platforms. The retained forecourt and tower are available for useful shots.
- Add no rooms. Fix geometry only when a chosen level exposes a concrete blocker.
- Author from actual native shots. Use visible collision faces, meaningful banks
  and readable targets. Avoid padding a route with repeated floor patches.
- Give each level a short brief, an honest difficulty label, a measured suggested
  route distance and an accurate aim, power and spin hint.
- Prove repeated complete solutions at full translation and spin rest. Nearby
  aim and power samples measure tolerance; report failures honestly.
- Never add catch planes, special friction, forced stops or level-specific physics.

## Scoring and completion

[ARCADE-SCORING.md](ARCADE-SCORING.md) defines the authoritative rules. Each purple
waypoint scores once in any order; collect every waypoint to clear the level.
The gold destination, when present, is an optional landing bonus. A proof of the
suggested solution must reach it as well. Other settled in-bounds shots still
rank. Movement adds points outside the target multiplier. Recall forfeits.

The first level, **First Bounce**, has one broad floor patch and no destination.
It is part of the 30-level count and carries the movement, aim and charge coaching.

## Scouting and creating

Press **F** before throwing to scout. WASD flies, E/Q moves vertically, Shift
speeds up and Alt slows down. Scouting leaves the robot and its aim unchanged.

**Create** records an unranked design ball from the robot's position. At full rest,
real contacts become up to eight validated waypoints, preferring distinct banks.
A clear landing becomes an optional destination. The review shows the trajectory;
name it and choose **Save & play**, or throw another ball to change the route.
Exiting the creator returns to the selected campaign level.

The service accepts only its own unmodified capture token and native trajectory.
A browser cannot submit a final score or invent a valid recorded route.

## Verification

See [the authoring README](../web/levels/README.md) for the local native and Chrome
commands. Commit and merge each verified level into local main before authoring
the next. This work does not authorize deployment.
