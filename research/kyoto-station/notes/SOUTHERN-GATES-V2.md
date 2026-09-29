# Southern operator entrances and public transfer hall

29 September 2026. Replace the lower passage’s blank side walls with the opposing Kintetsu and Shinkansen ticket fronts.

## Change and limits

The lower public route now has two named entrance banks, recessed ticket machines and staffed windows. Four columns that occupied the openings are replaced with portal columns. The north–south route remains continuous; both ticket and information recesses have level floors joining the original hall. A tactile branch leads across the hall to a gate lane. The photographed alternating floor pattern and ceiling divisions distinguish the transfer area.

The gates are closed physical boundaries. Each has a visible receiving room behind it; the deeper paid concourses, platform connections and railway above remain unfinished. The next task must replace these provisional room ends with actual connections as it builds the southern railway. No new stairs or platform access are claimed in this delivery.

The retained hall floor is Y3.675 m. Room boundaries, 21 m entrance openings, ten gate lanes per operator, fixture locations and finishes are fitted approximations. Gate motion, exact equipment models, current advertising, shops, lifts and escalators remain unfinished. Sign and machine artwork is original; research photographs are not used as textures.

## Evidence

- [Kintetsu’s Shinkansen transfer route](https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_01.pdf), dated 20 January 2026: the entrances face each other across an approximately ten-metre transfer. The two photographs establish gate cabinets, circular columns, the Shinkansen fascia and the light/dark floor pattern. Both saved pages were visually inspected.
- [Kintetsu’s station plan](https://www.kintetsu.co.jp/soukatsu/kounai/kyoto.html), dated 14 March 2026: operator access and surrounding public routes. The saved PDF was rendered and inspected again.
- [JR Central’s current Kyoto map](https://railway.jr-central.co.jp/station-guide/shinkansen/kyoto/map.html): the central entrance, Shinkansen concourse and tracks 11–14. Its currently linked GIF is saved and hashed in `sources.json`. The filename contains `260420`; this is not treated as a verified publication date.

These sources establish topology and visible character. They do not supply surveyed room dimensions. The existing 12 m public passage width is retained.

## Verification

Verification receipts are retained under `.local/v2/current/components/southern-gates/` after promotion. The source is integrated into the same editable Blender scene, and large temporary station copies are removed.

The native/browser correspondence check covers all 245 new panels, 9,828 vertices and 3,276 triangles, including sign UVs. Eight obsolete wall/base/column panels and 368 browser triangles are retired. Retained native records and encoded browser data are unchanged. Net browser cost: 2,908 triangles, eleven material batches and 425,776 bytes. Ten fitted light emitters use the existing pool of at most two active lights.

- Ten native walks pass in both directions, with 1,616 position samples: the public through-route and all four ticket/information recesses. Endpoints remain within 0.06 m of their intended floor height.
- Sustained native movement stops at both closed gate flaps, approximately 0.32 m before their center planes. The check keeps movement input current while testing the boundary.
- The saved Blender scene reopens with matching geometry, sign UVs, materials, lights and retained bindings.
- `npm run build:web` and `test:runtime` pass. The lower-hall gameplay check includes complete translation-and-spin rest in 13.93 seconds, a free result, recall and home. `test:v2:browser` passes entry, walking, a complete throw, result presentation, recall during flight, menus and home from the lower-hall spawn.
- Ten actual Chrome views have no page errors. The final short 1440×900 sample contains 900 frames, with a 16.7 ms median and approximately 16.8 ms p99. The active light count stays at two. This is not a sustained performance or audio soak.

## Rebuild

Run `prepare-southern-gates.mjs`, `build-southern-gates.mjs` and `web/v2/compose-component.mjs` against the expected parent manifest. Preparation matches exact triangle signatures and material identities to remove only the eight obsolete panels. `verify-southern-gates-geometry.mjs` checks the replacement scope and matching exports; `verify-southern-gates.mjs` checks public routes and closed gate boundaries with the native worker. `install-southern-gates.py` installs the verified geometry, signs and lights into the editable source and reopens it for verification.
