# Pillar Carom: a verified approach between the wells

28 September 2026. [Route comparison and actual-game screenshots](pillar-approach/index.html).

## What changed

The private Pillar Carom revision moves its suggested launch spot **8 m east along the concourse**, from native X=−12 to X=−4, keeping Y=0 and Z=−21. Suggested yaw changes from **155° to 168.95°**. The marked speed is refined from **15 to 14.85 m/s**; pitch remains 15° and both spin controls remain zero.

All three target **IDs, centers, normals and radii remain exact** in the authored catalog: a 0.60 m floor target, a 0.35 m target on the original pillar face, and a 0.45 m return target. The return target binds to the replacement hall floor at the same position. Start radius, allowed controls, scoring, chapter, title and course description remain unchanged. Private revision 1 becomes revision 2.

The course is still a long approach into a sharp pillar bank. Its measured path before the pillar grows from **40.22 m to 51.56 m**. The information glazing provides the initial bank, and the ball uses the gap between the oval and eastern wells. Total path falls from 69.73 m to 60.04 m because the real guard stops the trailing roll after the required targets; the displayed distance is updated to 60.0 m. These measurements support the retained route challenge, not a claim that every player's perceived difficulty is identical.

## Native acceptance

On exact candidate05, two repeated authored shots and the existing **+0.2° yaw neighbor** collect all three targets and finish at full translational and rotational rest. Both authored shots satisfy the original wall-target and sharp-turn requirements. No timeout or recall counts as completion.

The initial proposal passed exact 15 m/s trials, but a real keyboard throw at 15.052 m/s missed the first circle. The final input study clears at 14.8, 14.85, 14.9 and 15.0 m/s, while 14.95 m/s misses the return target. These sampled outcomes do not establish a continuous success range. The final marked 14.85 m/s input passes the repeated native proof and the actual keyboard check; all failed trials remain available. The original-start study found no full clears among its 16 configurations: 13 rested without clearing, two left the station, and one observation timed out. Those unsuccessful trials remain saved.

The strict campaign verifier permits this bounded revision only with hashed native trace, input-study and original-route evidence. It reconstructs the expected catalog from the original definitions, rejects changes beyond the declared start/aim/marked-charge/distance and floor rebinding, and then replays the authored inputs. Native Float32 geometry is compared to the exact Float32 conversion of the original values; authored target numbers remain unchanged.

## Actual browser game

Chrome loads the complete candidate station and matching moving-lane metadata. Normal onboarding, the H hint control and a Space-key throw verify the new launch location and aim. Two actual keyboard throws clear all three targets and save authoritative scores at physical rest. The second screenshot waits for the score counter to settle. [Browser receipt](pillar-approach/browser-proof.json).

The initial browser check waited for readiness without completing the player-name form. Its timeout is a test setup failure, retained separately; subsequent setup fixes select the explicit game canvas and wait for both the briefing and its transition to finish. These test harness failures remain saved; none changed the game. These screenshots are gameplay inspection views, not registered architectural comparisons or performance acceptance.

## Private integration and remaining scope

The combined catalog in `pillar-approach-02` includes both this repair and the previously verified Locker Loop finish. The isolated `runtime-hall-courses-02` workspace serves that catalog with native layout `47693cafa1aa635c6ceb88cedc1794a1d53fff612ba022661a4c5b6d986ff341` and matching browser05 assets. The active game catalog remains unchanged.

**Seven other courses remain unresolved:** Balcony Express, Escalator Relay, East-to-West Ricochet, Fascia Flip, Garden Switchback, Skyway Trapdoor and Sculpture Square Slingshot. Wider gate/upper-floor architecture, B2 geometry, final materials and lighting, station/plaza/street views, vegetation, full runtime checks and paired Chrome performance/audio acceptance also remain open. Future architecture changes must revalidate this route.

No geometry, native C#, physical material or scoring rule changed in this repair. The long-term reconstruction goal remains active. Nothing was committed, pushed or deployed.
