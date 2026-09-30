# Miyako Yume Terrace escalators

29 September 2026. Connect both ends of the terrace to the ground pavement with four operating escalators.

## Evidence and fit

Page 1 of the saved [Kyoto municipal terrace plan](https://www.city.kyoto.lg.jp/gyozai/cmsfiles/contents/0000294/294495/zumen.pdf) shows a pair at each end of the deck. Its UP/DN labels place the west upward lane north of its downward lane, and the east downward lane north of its upward lane. The [municipal renewal brochure](https://www2.city.kyoto.lg.jp/html/shikai/img/joho/kankobutsu/siryou/H28/13-2.pdf) independently specifies four escalators. Both references are registered in `sources.json` and retained locally.

The banks connect the existing reserved deck edges at X−85.5 and X−40.5 to the pavement. They retain the terrace's fitted 3.675 m rise. The 30° incline, approximately 0.985 m tread width, 1.234 m flat sections, 0.5 m/s speed and exact registration are construction assumptions rather than measured equipment specifications.

## Construction

- Four circulating step chains, paired up/down, with matching browser, native and editable-source paths.
- Fitted steel casings, comb transfers, glass balustrades and rubber handrails.
- Pavement openings beneath the returning steps, preserving the irregular Miyako Michi ground outline and the adjacent southern lift opening.
- Guarded upper receiving aprons and warning paving at both ends of each lane.

The two original station-side escalators north of the terrace are still missing. Their receiving arrangement needs to be reconciled with the current ASTY frontage before construction. Street and bus/pickup canopies remain separate work.

## Verification

Acceptance requires all four native and Chrome rides to board by ordinary walking, carry the idle player in the declared direction, and exit grounded at the correct elevation. Chrome must also show moving treads. Fourteen normal-speed route walks cover the nearby terrace stair, lift approaches, Miyako Michi–ASTY ground route and both new ground landings. The saved source must reopen with matching geometry and operating animation paths.

The static component adds 731 closed panels, 108,876 vertices and 36,292 triangles, replacing 17 panels and 252 triangles. Browser geometry grows by 3,053,108 bytes in six material batches. Retained native geometry, lifts, escalators and encoded browser buffers remain exact. The existing instanced tread renderer handles the new chains.

All four native rides and all four Chrome rides pass, with 652 and 325 idle-ride samples respectively. All fourteen route walks pass with 3,855 position samples. The south-lift ground route passes north of the new east bank, under the main deck; its former straight path intersects the new escalator's low underside. This waypoint correction leaves every geometry and physics byte unchanged.

The independent tread check compares 128,000 positions over 80 phases per lane; maximum native/browser height error is below 0.000001 m. Eight inspected Chrome views have no page errors and no growth in texture or reflection resources. Their short frame samples have a 16.7 ms median and 16.8 ms p99; this does not establish long-session performance.

The saved Blender source reopens with matching static surfaces, retained bindings and four animated chains of 56 steps each. The browser build and native/Chrome gameplay checks pass, including complete translation/spin rest, recall and home.

Final walk, source, gameplay and local-delivery receipts are retained with the component under `.local/v2/current/components/hachijo-escalators/`. The current station assets are replaced in place after validation; the full candidate copy is then removed.

## Rebuild

Run `build-hachijo-escalators.mjs` against the parent asset manifest, followed by `prepare-east-transfer-base.mjs`, `web/v2/compose-component.mjs` and `integrate-porta-motion.mjs`. The shared static replacement and tread-oracle checks verify export correspondence. `verify-subway-escalators.mjs` now supports both declared directions; `inspect-component-escalators-chrome.mjs` exercises the same connections in Chrome. `install-porta-connection.py` installs the static geometry and moving chains into the editable source and validates them after reopening.
