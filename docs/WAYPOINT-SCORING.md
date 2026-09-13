# Waypoint chains and jackpot presentation

User direction accepted 2026-09-07: collect as many optional waypoints as possible;
optionally finish in one destination. **Missing the destination keeps waypoint
points.** This is a new scoring family alongside existing destination courses.

## First playable scope

- A course has its existing start area, zero or one destination, and up to 32
  waypoints, with at least one scoring target overall. Every waypoint is optional,
  can be collected once per shot, and can be taken in any order. No streak timer
  expires while the player waits for an escalator ride or another bank.
- Waypoints can lie on fixed station floors, walls, ceilings and other supported
  faces. Their circle follows the actual face normal. Moving tread targets need
  surface-local anchors and are a later extension; the first editor rejects them
  explicitly rather than drawing a marker that drifts away from its surface.
- Destination targets retain physically supported floor/landing rest. A waypoint
  is credited by native ball contact, including slow rolling, on its actual face;
  flying nearby or touching the opposite side of a wall does not count.
- First slice includes authoring, saving, playing and replaying a waypoint-only
  course and a mixed course. Current classic and waypoint courses remain playable. Pre-launch scoring changes clear existing scores and replays; no historical rules are retained.

## Current tuning

See [ARCADE-SCORING.md](ARCADE-SCORING.md) for the authoritative rules.
The multiplier is `2^collected + 0.5 × distinct banks`. Once a waypoint is collected,
target points are `10,000 × multiplier`. Waypoints double only their own component;
banks never compound. Five waypoints earn 320,000 before additive bank credit.
A new bank adds 5,000 target points regardless of collection order or impact speed.

Translating flight and rolling add 100 points per second after all multipliers and
the destination bonus. Stationary time and spin alone add nothing. At least one
target must score to bank movement points. Banks continue throughout the shot;
repeated waypoints and repeated surfaces never earn again.

At full supported rest inside the destination, add `10,000 × multiplier` as a bonus.
Missing it preserves all waypoint points. Without a waypoint or destination, the
shot scores zero. Recall and missing a required route forfeit the shot.

A new-mode shot counts as completed when it earns any target and comes to true
rest; its result separately identifies whether the destination was reached.
Existing required-surface route rules still apply. No timed finish, freeze,
magnet, fabricated contact or client-submitted result is introduced.

## Shared contract

`scoring: 'waypoint-v3'` runs alongside active `combo-v7`.
`goal: Disk | null`; `waypoints: {id, center, normal, radius, surface}[]`.
The native worker advertises `capabilities: ['waypoint-v3']`; the service refuses
new-mode placement/save/select on an older worker.

Native `waypoint-hit` records contain session `id`, `attempt`, `waypointId`,
substep `time`, `point`, `normal` and `surface`. The same records are persisted as
`waypointHits` in results/replays. Contacts must match face, plane and circle;
IDs are unique within the course and are awarded at most once per attempt.

The score breakdown contains `waypointCount`, `waypointIds`, `waypointHits`,
`waypointBase`, `waypointMultiplier`, `destinationReached`, `destinationBonus`,
bank fields, `total` and `potential`. `waypointMultiplier = 2^waypointCount` is
the current waypoint component, `bankBonus = 0.5 × styleBanks`, and
`comboMultiplier` is their sum. Hit celebrations display the combined multiplier;
bank celebrations display their additive increment. The native destination-rest attestation is distinct from the
public completion flag. Final and live scoring consume the same native records.

## Jackpot presentation

Waypoints have a distinct look from destinations: numbered surface patches light
up when collected, and the collected count stays legible during flight. The
briefing frames all targets, including courses with no destination; the editor
supports adding/removing individual waypoints and toggling its single destination.

Each hit launches huge bouncing multiplier typography with increasingly extreme
original chimes, light chases and milestone fanfares. The ball shares that energy:
charged glow, fiery particles/trail, then a jackpot heat state for exceptional
chains. These are presentation effects driven by authoritative score data, with
an unchanged physical ball radius and visible ball core. No new pooled scene
lights, unbounded particles, rapid full-screen flashes or camera jolts are needed.
Reduced-motion mode keeps colors and clear milestones with restrained animation.

Three selectable original robot characters form the first cast: an arcade mecha,
a lucky-cat robot, and a festival drummer robot (art direction can improve within
those distinct identities). Each has its own short high-score celebration dance.
Cosmetic choice persists; physics, release points and replay motion stay identical.
Celebrations use verified score/record events and end cleanly before the next shot.

## Delivery and acceptance

Verify floor/wall/ceiling and slow contact; reject backside/near-miss/forged hits;
verify once-only awards, destination miss preserving waypoint points, destination
bonus, all targets optional, full rest, recall forfeiture and current saved replay parity.
Prove both new course forms through an isolated rebuilt native worker and real
browser create/play/replay controls. Test score/FX reset on recall, retry, stage
change and replay scrub. Capture actual escalation and character dance evidence,
with bounded resource/frame cost. Deployment is a separate authorized action.
