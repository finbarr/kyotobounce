# Original Hachijo stair-hall escalators

29 September 2026. Complete the two original station-side connections beside the Hachijo public stairs.

## Evidence and fit

Page 1 of the saved [Kyoto municipal reference plan](https://www.city.kyoto.lg.jp/gyozai/cmsfiles/contents/0000294/294495/zumen.pdf) places one escalator north of each original stair flight and labels both UP. Pages 3–4 show the stair and escalator sharing an enclosure, with pale lower walls, high glazing, horizontal window frames and open ground entrances. These are distinct from the four newer terrace escalators farther south.

The earlier stair reconstruction had a solid wall where each escalator belongs. Removing those two dividing walls makes room for the missing machinery without moving the stair flights. The upper mouths open through the public-hall walls at X−69 and X−57. The lane centres are at Z−187.75, beside the retained ASTY shop backs. Floor rise, stair-hall dimensions and registration are fitted to the existing model; they are not surveyed measurements.

## Delivered connection

- Two upward escalators with circulating steps, comb transfers, casings, glass balustrades, handrails and level upper receiving aprons.
- Shared stair/escalator halls with extended roofs, glazed end walls, northern windows and four ceiling fixtures.
- Machinery pits cut into the existing pavement, with the original stairs and ASTY shop rooms retained.
- Ground approaches around each completed entrance. The eastern ASTY exit passes around the stair-hall corner at X−45.8; it does not lead into the low escalator underside.

The mechanism uses a rigid transform of the already verified terrace upward lane: 3.675 m rise, approximately 0.985 m tread width, 30° incline and 0.5 m/s speed. Both source animation paths and runtime geometry use the same lane definitions.

## Acceptance and checks

Acceptance covers both idle rides and grounded exits in native physics and real Chrome; ordinary walking through all upper and lower approaches; both original stairs; the hall-to-terrace connection; the east ASTY exit; the western forecourt entrance; and the two adjoining shop entrances. Each named walking route is checked in both directions.

The component replaces nine panels and 108 triangles with 383 closed panels, 54,996 vertices and 18,332 triangles. All added browser and native geometry matches. Retained native records and encoded browser buffers remain exact. Browser geometry grows by 1,545,552 bytes in eight material batches; fixtures use the existing capped light pool.

Both native and Chrome rides pass, with 324 and 162 idle-ride samples respectively. All 22 route walks pass with 3,367 position samples. An independent tread check covers 64,000 positions over 80 phases per lane, with maximum native/browser height error below 0.000001 m. Nine inspected Chrome views have no page errors or texture/reflection resource growth. Their short frame samples have a 16.7 ms median and 16.8 ms p99; these are not a long performance soak.

The editable source saves and reopens with matching geometry, retained bindings, fixtures and two 56-step animated chains. The browser build and native/Chrome gameplay checks pass, including complete translation/spin rest, recall and home. Final route, gameplay and promotion receipts are kept under `.local/v2/current/components/station-escalators/` after local delivery. Full station exports replace the current files; the candidate copy is removed.

## Rebuild and remaining work

Build with `build-station-escalators.mjs`, then run `prepare-east-transfer-base.mjs`, `web/v2/compose-component.mjs` and `integrate-porta-motion.mjs`. Shared static, tread, native-walk and Chrome tools validate the complete candidate. `install-porta-connection.py` installs the geometry and moving chains into the editable source.

The six escalators shown across the original stair halls and newer terrace now have working routes. Bus/pickup canopies and street boundaries remain unfinished. The next interior priority is to inspect the incomplete Isetan/Granvia upper-floor connections and repair actual gaps before adding room decoration.
