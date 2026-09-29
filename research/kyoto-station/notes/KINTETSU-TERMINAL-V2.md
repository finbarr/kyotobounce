# Kintetsu terminal and JR10 clearance

29 September 2026. Replace the Kintetsu receiving-room dead end with its terminal.

## Structure and limits

One gate lane opens into a level head concourse, connected to four platform strips: track 1 boarding; track 1 alighting / track 2 boarding; track 2–3 alighting; and track 3 boarding / track 4 boarding and alighting. Four tracks terminate behind buffer stops and head guards. Track 4's buffer is recessed farther west. Platforms curve westward and have coping, tactile strips, end guards, signs, ceiling beams, columns and linear lights. Three enclosed hotel lift shafts occupy the northern island, with clear routes beside them.

The existing western extension of JR platform 10 and its canopy passed through this terminal volume. That provisional extension is replaced with a shorter platform/track end and buffer. Its eastern platform, access stair and materials remain. Six provisional Shinkansen bearings are moved onto the new platform structure, clear of the track channels.

The Kintetsu floor remains at Y3.675 m, level with the gate. Platforms extend 136 m from X−242 to X−106; the concourse joins the receiving room at X−81. Ceiling underside is Y7.175 m and rail head Y2.61 m. These dimensions, curves, columns, shafts and finishes are fitted approximations. The hotel's upper building, lower shopping streets, shops, detailed accessible routes and railway operations remain unfinished. The lift shafts are static enclosed structures, without working lift access.

The subsequent [central transfer connection](CENTRAL-TRANSFER-V2.md) shortens the remaining JR10 track extension farther east, clearing the space beneath the new transfer route while retaining the platform and its stair.

## Evidence

- [Kintetsu's current station plan](https://www.kintetsu.co.jp/soukatsu/kounai/kyoto.html), dated 14 March 2026, establishes the level gate-to-platform route and boarding/alighting arrangement.
- [Kintetsu's terminal completion notice](https://www.kintetsu.jp/news/files/kyouto4senka.pdf), dated 8 March 2012, provides the four-track plan, a platform photograph, the hotel lift-shaft photograph and a section through the Shinkansen, Kintetsu and ground storey. Pages 1, 2, 3 and 5 were rendered and inspected. The photographs are historical references; topology is checked against the current plan.
- [JR West's station plan](https://www.jr-odekake.net/station/img/premises/0610116.pdf), dated 31 January 2026, shows the eastern-facing Nara terminal tracks. It supports removing the excessive western JR10 extension; the exact new endpoint remains fitted.
- The registered municipal hotel roof `26100-bldg-466058` informs the broad western curve and northern relationship. Source: Kyoto City / MLIT Project PLATEAU; the reconstruction is independent and not an official municipal product. The roof outline is not a floor survey.
- [Kintetsu's Kyoto Line specification](https://www.kintetsu.jp/kouhou/Rireki/A40003.html) identifies standard gauge, modeled here with nominal 1.435 m railhead separation.

Research PDFs are reference copies, not game textures. Platform labels use the [documented authoring font](PLATFORM-NUMBER-FONT.md), whose notice is retained with the component.

## Verification and rebuild

The component replaces 54 provisional panels and 8,940 rendered triangles with 332 panels and 24,272 triangles. All 72,816 added vertices and their normals match between native and browser geometry. Retained native records and encoded browser buffers are unchanged. The net triangle increase is 15,332; composition appends approximately 2.05 MB in seventeen material batches. Thirty-six emitters share the existing pool of at most two active lights.

Use `prepare-kintetsu.mjs`, `build-kintetsu.mjs` and `web/v2/compose-component.mjs` against the expected Shinkansen parent. `kintetsu-scope.mjs` defines the exact retired surfaces. `verify-kintetsu-geometry.mjs` checks removal scope and matching exports; `verify-kintetsu.mjs` checks the gate, four platform connections and curved western sections, cross-concourse route, shaft passage, corrected JR10 end and public hall. `install-kintetsu.py` integrates the component into the editable Blender scene and verifies it after reopening.

Private receipts are retained under `.local/v2/current/components/kintetsu/` after promotion. The light-ID correction receipt links the native walking input to the final layout: only emitter names and their component hash changed, with all other layout data and browser geometry verified identical. The walk report retains its actual input hash. Current-layout core runtime, source and Chrome checks are run after that correction.

The saved Blender scene reopens with matching geometry, materials, light values and retained bindings. `npm run build:web`, `test:runtime` and `test:v2:browser` pass. Native core gameplay includes a 1.37 m walk, complete translation-and-spin rest in 13.96 seconds, a free result, recall and home. Chrome passes entry, walking, a complete throw, result presentation, recall during flight, menus and home.

Twelve Chrome views have no page errors. The short 1440×900 sample includes 1,080 frames, with a 16.7 ms median and approximately 16.8 ms p99; the active light count stays at two. These are short checks, not a sustained performance/audio soak. The views cover gate/concourse joins, all four platform strips, the shaft passage, western curve, corrected JR10 end and public hall.

All 26 native walks pass with 8,119 position samples, including both directions through each tested route. Endpoint floor heights are within 0.06 m of their intended floors.

The promoted local preview is ready with its native worker, normal entry spawn and the exact verified geometry hash. The prepared, composed and source candidate copies have been removed; the editable scene and current runtime remain together in the existing checkout.
