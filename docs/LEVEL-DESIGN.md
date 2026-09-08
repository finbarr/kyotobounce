# Three station challenges

Design proposal, 2026-09-07 Pacific. No live levels, challenge revisions, source geometry, scores or replays changed. This is a finite three-course proposal; implementation waits for the station/collision work and native proof shots.

The aim is to turn recognizable architecture into a route the player can explain: **deliver a ball from the high deck into a konbini; descend the great staircase and brake in the plaza; hitch a ride on an escalator and dismount onto its landing.** Each course has one primary lesson and a memorable destination. Existing small floor targets can remain as onboarding.

## What is real, and what is proposed

The operator's [Kyoto shop map](https://www.dailyservice.co.jp/shop/map?type=kyoto), explicitly dated July 2026, places Seven-Eleven Heart-in JR Kyoto Station West Exit in its 2F outside-gates section. It separately lists a Central Gate shop in its 1F outside-gates section; the [Central Gate detail](https://www.dailyservice.co.jp/shop/detail/5404) confirms that identity. These are different shops. The [West Exit detail](https://www.dailyservice.co.jp/shop/detail/4828) is the relevant candidate for a west-side upper-deck descent.

**Verified:** shop identity, floor and outside-gates classification from the operator index. **Not verified:** exact doorway footprint, doorway orientation, a visible opening from a particular top deck, or an uninterrupted airborne route. The West Exit detail and the operator's 1F/2F map PNGs repeatedly timed out during this audit; English detail access returned 403. The official West Exit event-space drawing was found, but its screenshot fetch failed. Do not present “the real shop directly below this balcony” as an established fact. Resolve registration using the operator floor plan and dated entrance photographs before finalizing this course. If the actual doorway is occluded, use a bank through its real approach corridor or revise the launch deck; do not rotate or relocate the real shop to fit an invented view.

The station building's [official squares guide](https://www.kyoto-station-building.co.jp/service/square/) identifies the East Square on 7F and Skyway on 10F, 185 m long and 45 m high. It also identifies Muromachi Square on 4F and the Great Staircase. This supplies geographic context, not surveyed game coordinates. A photo of the Skyway is not evidence that a projectile can pass through its glazing.

Any receiving mat, aiming graphic, highlighted collision patch, simplified shop interior or held-open door below is a **gameplay adaptation**, not a claim about the real station. Do not invent a checkout layout or claim the game's provisional floor elevations are measured reality.

## Geometry and rules checked

Read-only reference: `/Users/finbarr/code/games/kyoto/runtime/station-layout.json`, SHA-256 `650fed69aa6ab63af523f8f8aa8819858672ffd3994a1be6c2e9ea1aaa7731d2`. This matches `web/starter-challenges.json` in the design worktree. The design worktree has no fetched runtime pack. Coordinates below are native metres: +X east, +Y up, +Z north. Polygon bounds are only search regions; they do not prove support at every enclosed point.

| Feature | Current native geometry |
|---|---|
| West 11F candidate launch landing | `north-circulation-landing-14`: x −159.57…−151.52, z −35.47…−9.34, top y49.586 |
| West 10F alternative launch landing | `north-circulation-landing-12`: x −148.89…−139.90, z −33.86…−6.52, top y45.2 |
| West 2F receiving region | `west-2f-landing`: x −72.92…−26.50, z −21…9.43, top y7.35 |
| Muromachi plaza | `muromachi-square`: x −82.66…−57.26, z −17.35…9.43, top y19.586 |
| First great-stair flight/landing | `daikaidan-flight-01` begins at y19.586; first landing at y21.691; authored riser ~0.1754 m |
| East lower escalator | `east-concourse-lower-escalator-1`: lower center (19.3,0,6.5), uphill +X, run9.3 m, rise5.5 m, width1.02 m, signed speed +0.5 m/s |
| East receiving landing | `east-ground-second-landing`: x29.5…34.4, z−1.9…9.4, top y5.5 |

Many elevations and architectural registrations are explicitly provisional in the layout. The current cafe frontage is not verified to be the West Exit shop. No 7-Eleven geometry was identified by name; authoring the correct shop frontage is a prerequisite, not a texture swap on the cafe.

Current `robot-v4` throws span 0.5–12 m/s Precision and 0.5–100 m/s Robot, with pitch −65…80 degrees and spin controls −200…200. The 2.8-second charge means a 1 m/s Robot change is about 28 ms: large-range hints must show speed and range, not percentages. Native physics and wall/rail clearance, not vacuum ballistics, decide feasibility. Existing schema supports one `requiredSurface`, not an ordered route list. Prefer one required landmark plus naturally constraining geometry; an ordered two-bank requirement needs a separately reviewed versioned contract change.

## 1. Last Order — top deck to konbini

**Moment:** from high above the station, the player picks out the small warm shop entrance, sends the ball down through the architecture, and watches it roll over the threshold onto a receiving mat. This is the showcase finale, listed first because it directly develops the requested idea.

**Start:** a supported 0.8 m-radius circle on the atrium-facing part of west 11F `north-circulation-landing-14`, behind the existing guardrail. Search the candidate landing above; choose a point only after testing the avatar capsule and hand release. The 10F landing is a fallback if the upper rail/overhang makes a readable route impossible. Do not launch through a closed glass barrier.

**Target:** a proposed 0.9 m-radius receiving mat wholly inside the correctly registered **2F West Exit Heart-in** entrance, 1.5–2.5 m past its threshold if the real approach and modeled floor permit. The location remains a named architectural anchor, not a fabricated coordinate. A readable simplified interior needs a supported floor and back/side boundaries; it does not require inventing shelves or real checkout positions.

**Route:** clear the high guardrail, descend to an actual open portion of the west 2F approach, make a shallow granite bank, then roll through the shop opening and settle on the mat. Highlight the landing's bank patch rather than imply a direct airborne shot into the store. If the doorway turns away from the atrium, the version uses a real corridor-wall bank after the landing; prove that route before accepting it. Do not promise both alternate routes will exist.

**Distinct mechanic:** manage gravitational energy and arrival angle over a large drop, then dissipate enough energy to stay inside a small destination. High score comes from optional authentic intermediate surfaces; a long free fall alone is not the whole challenge. No checkpoint removes the ball's momentum and no target magnet catches it.

**Readable cue:** briefing camera follows the intended architecture down to the entrance; shop name/floor appears once, then a visible landing patch and mat remain. Use a small doorway inset during aiming if the entrance is legitimately occluded. The flight camera must not cut through the landing slab to keep the ball visible. Hint: “Land shallow on the approach. Let the last roll carry it inside.” Exact speed/pitch/spin follows the native proof shot.

**Difficulty:** finale after stair braking and escalator landing. Practice version uses the nearer 10F launch and 1.3 m target only if supported; standard uses 11F and 0.9 m. These would be distinct authored revisions/variants, not live edits of published targets. Do not shrink the doorway as a difficulty gimmick.

**Feasibility envelope:** current candidate regions span roughly 79–134 m horizontally with 42.24 m vertical drop. A horizontal vacuum throw would fall for about 2.93 s and need roughly 27–46 m/s before accounting for launch height, drag, rails and impacts. This establishes Robot-range relevance only. The geometry may defeat that trajectory, and a shallow landing bank plus braking must be discovered natively. No exact shot is claimed to work.

**Prerequisites and acceptance:** register real shop and circulation geometry; export matching wall, doorway, threshold, soffit and rail collisions; verify ball-sized opening clearance and avoid invisible fascia colliders. A native proof must cross the real modeled threshold, complete at supported translational AND rotational rest inside the mat, and replay on the same version. Misses must hit the visible frame or overshoot naturally. If no repeatable route survives real geometry, this design remains blocked; ship the other two rather than falsify the shop.

## 2. Staircase Special — cascade, bank, brake

**Moment:** the ball chatters down the illuminated great stairs, turns off the final flight and slows into a broad plaza target. The whole run is legible from its start.

**Start:** supported patch on `daikaidan-landing-01` at y21.691, aligned down `daikaidan-flight-01`; radius 0.7 m. Begin with this actual short lower flight instead of demanding a miraculous full-staircase descent from the roof.

**Target:** radius 1.0 m on supported `muromachi-square`, initially 3–6 m beyond the bottom of the flight and slightly to one side of its centreline. The exact centre must be projected into the actual plaza polygon away from rail bases; it is not the bounding-box centre.

**Route:** controlled downward toss onto a visible tread, descend the roughly 2.1 m first-flight drop, and use backspin/launch energy to finish inside the plaza target. Require `daikaidan-flight-01` contact if its native impact IDs resolve to that surface; inspect actual IDs before using the schema. A side bank can be an optional score line using an existing visible solid boundary, not a newly invented bumper.

**Distinct mechanic:** turn step impacts and spin into a controlled runout. Numbered treads must count as one staircase bank family under current scoring; this course is about controlling the cascade, not farming 12 contacts as 12 multipliers.

**Readable cue:** one highlighted first tread, a downward chevron sequence on the briefing overlay, and the target visible at the foot. Lighting remains decorative and never changes collision friction. Hint: “Let the steps spend the speed. Backspin shortens the last roll.”

**Difficulty:** first of the new courses. Tune in Precision, exploring roughly 2–8 m/s rather than fixing that as a published hint. Standard target radius 1.0 m; beginner radius 1.5 m if its full disk fits. A later hard revision may start one landing higher only after the base course is proven; it is outside this three-course delivery.

**Prerequisites and acceptance:** actual treads must collide with balls while walking-assist ramps remain player-only; centre rails, nosings, tread seams and plaza seam must match rendering. Show a repeatable success plus undershoot and overshoot with visibly distinct causes. Ensure the ball does not tunnel through risers, lodge in a nonvisual crack, or gain extra bank awards from each numbered tread. Camera must preserve the final plaza roll and replay the same result.

## 3. Transfer at Kyoto — ride, then dismount

**Moment:** a low throw lands on the ascending escalator, rides the moving tread upward, then rolls off the comb plate into a landing target. The station machinery does useful work for the player.

**Start:** retain the proven candidate region near (17.92,0,6.37), radius 0.25–0.5 m according to supported clearance. Use the existing lower east ascending lane; do not switch lane direction or manufacture a conveyor speed.

**Target:** supported radius 0.65 m disk on `east-ground-second-landing`, search around (30.6,5.5,6.15), beyond the top flat. This starts from the existing Catch the Lift geometry but makes the **clean dismount and final supported stop** the deliberate objective, with a stronger briefing and clearer target placement. It should supersede that course through a new revision if adopted, not become a fourth duplicate.

**Route:** land on `east-concourse-lower-escalator-1`, ride its existing +0.5 m/s motion, cross the top comb and stop on stone. Require that lane's surface; a direct throw to the landing must fail the route requirement. The paired descending lane is a visually readable wrong choice.

**Distinct mechanic:** release timing against moving geometry, then speed management at a material transition. Existing starter hint uses downward pitch and backspin in the old Precision model; convert and retune from its preserved launch speed under current rules rather than copying hold milliseconds.

**Readable cue:** small arrows on the correct lane and a phase indicator derived from authoritative station time. Highlight the entry tread region and top exit, never the entire stair bank. Hint: “Catch the rising step. Arrive on the landing with just enough roll.” The phase cue is guidance, not a pause/freeze button.

**Difficulty:** middle course, after Staircase Special. Width 1.02 m makes lateral aim meaningful; use the generous 0.65 m landing disk before considering 0.5 m. A roughly 10.8 m incline at 0.5 m/s suggests a ride on the order of 22 s before entry/exit travel, not an instant bank; this is an estimate, and native contact/slip decides the actual duration. Presentation must make progress visible throughout, without adding a timer finish.

**Prerequisites and acceptance:** moving collision and visible treads must share phase, direction, top/bottom transition and comb geometry. Native success must include required-lane contact and transfer to the static landing without wedging, teleportation or perpetual microspin. Replay must retain station phase. Sample release phase around the solution; tune for a useful success window rather than a single lucky simulation tick. Confirm the descending lane and direct lob cannot satisfy the named route.

## Finite implementation gate

For each course, create one isolated native proof fixture containing layout hash, physics/scoring/throw versions, launch position, speed, aim, spin, station phase and final replay. Require five repeated successes at the exact fixture and at least three neighboring successful input samples within a small authored search window; otherwise widen the legitimate target or move the start within the stated surface. Those are robustness checks, not claims of human fun. Have a real browser player complete each standard course from its own briefing without developer commands, with one retry at most after understanding the route.

Publish no numerical hint until its native shot works. Test full rest completion, recall forfeiture, route rejection, legitimate miss scoring and immutable historical replay/version behavior. Rebuild the dedicated worker and restart only an isolated service for native changes; run the repository's typecheck, service tests, browser build and relevant runtime tests when implementation touches those layers. A design-only document needs no service restart.

Done means these three distinct routes are proved, readable and versioned. No wider campaign, economy, achievement system or automatic production publication is included.
