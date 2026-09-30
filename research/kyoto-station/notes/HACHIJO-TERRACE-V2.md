# Miyako Yume Terrace and public connections

29 September 2026. Replace the small provisional southern deck with the terrace, stair and lift arrangement shown in the city's plan.

## Evidence and registration

The [City of Kyoto's advertising attachment](https://www.city.kyoto.lg.jp/gyozai/cmsfiles/contents/0000294/294495/zumen.pdf), linked from its [12 August 2026 notice](https://www.city.kyoto.lg.jp/gyozai/page/0000294495.html), includes a dimensioned deck drawing and photographs. Page 1 gives a **39 m column grid in three 13 m bays and 45 m outer deck width**. It distinguishes the two original station stairs from two newer terrace stairs, and locates three lifts: west, south and the end of an eastern walkway. Pages 3–4 show the enclosed station stairheads, open steel terrace roof, glass guards and passage entrance.

The saved [municipal renewal brochure](https://www2.city.kyoto.lg.jp/html/shikai/img/joho/kankobutsu/siryou/H28/13-2.pdf) independently identifies three lifts and four terrace escalators. The downloaded files and hashes are registered in `sources.json`; reference images and PDFs stay outside Git and are not shipped as textures.

The model retains the plan's east–west dimensions and topology. Its origin is fitted to the existing public passage at native X−63. The terrace starts at Z−196.5, beyond the existing station stair line; its main southern edge is Z−208.5. Floor Y3.675 is the retained hall datum. This is a reconstruction, not an as-built survey: stair dimensions, lift cars, roof height, depth registration, finishes and paving are fitted. The city drawing is itself labeled a reference plan.

## Delivered construction

- Extend the lower public hall into the larger terrace, with two enclosed station stairs branching before it.
- Add two terrace stairs with middle landings and connected ground pavement.
- Add three operating lifts and the eastern walkway, with matching car parts, shaft openings, fixed thresholds and doors in the native and browser representations.
- Build the open steel canopy, transverse members, roof light band, glass guards, columns, paving bands and tactile routes.
- Keep ground circulation between Miyako Michi, ASTY and the Hachijo entrance continuous beneath the deck.

The western lift approach turns behind the adjacent descending stair's handrail. An initial direct diagonal crossed that rail during the native walk; the final route uses the actual receiving landing. The landing has guards at its outer edge and exposed southern extension.

## Acceptance

The complete station must pass normal-speed walks in both directions on all four stairs, through the hall/deck join, along all three lift approaches and along the retained ground connections. Each lift must pass native doorway sensing, idle rides, exits, return trips and protection against entering an empty shaft. Chrome must exercise all three return trips through ordinary keyboard controls and compare rendered parts with native arrival poses.

Independent geometry checks require matching static exports, unchanged retained geometry and motion, clear lift travel volumes, supported receiving routes and a saved/reopened editable source. The browser build and ordinary native/Chrome play loop must pass before promotion. Final checks pass:

- 24 normal-speed native walks, 7,277 position samples and both exposed-edge barrier checks. The ground walks pass around the canopy columns.
- All three lifts pass five native checks each, and Chrome passes five interaction/render checks for each lift.
- 609 added closed panels, 22,176 vertices and 7,392 triangles match between the static browser and native exports. The 179 retired panels remove 2,148 triangles. Static browser growth is 627,524 bytes and eight material batches.
- All three lift travel prisms are clear; 2,234 sampled receiving-route floor positions are supported. The saved Blender source reopens with matching panels, retained bindings, twelve lights and 54 new editable lift parts.
- Fourteen Chrome views have no page errors. Short frame samples have a 16.7 ms median and 16.8 ms p99; these are not a long performance soak.
- Browser build, native gameplay and Chrome gameplay pass, including ball rest with zero translation and spin, recall and home.

A source-only fixture identifier correction was verified to leave every colliding panel, box, beam, flight, lift, escalator and spawn unchanged. The native receipts from that identical physical layout are linked by an explicit identity proof. A later ground-route waypoint correction avoids a real canopy support; it changes no geometry.

Private receipts live in `.local/v2/current/components/hachijo-terrace/` after local delivery. The manifest pins the playable exports; the current source and full exports are replaced in place.

## Remaining work

The **four terrace escalators** and the original station-side escalators are still missing. The next increment should add their actual moving connections using this plan, followed by the remaining bus/pickup canopies and street arrangement. Reserved terrace edges remain guarded until their escalators exist. Seating, information displays and photographic materials remain later work.

Rebuild with `build-hachijo-terrace.mjs`, `prepare-east-transfer-base.mjs`, `web/v2/compose-component.mjs`, `integrate-hachijo-terrace.mjs` and `install-east-transfer.py`. `verify-hachijo-terrace.mjs` checks complete-layout clearances and floors; the shared native route/lift tools and `inspect-component-lifts-chrome.mjs` check movement.
