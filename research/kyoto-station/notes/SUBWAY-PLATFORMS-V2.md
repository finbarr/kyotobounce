# Subway gates, stairs and island platform

29 September 2026. Open the southern and central subway routes onto an island platform, with two tracks and closed platform doors.

## Evidence and construction

The saved [city station diagram](https://www2.city.kyoto.lg.jp/kotsu/tikadia/img/map/sta/pdf/k11map.pdf) establishes separate gate areas above one island platform and two tracks. The [current K11 station page](https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm) identifies platform 1 toward Takeda/Nara and platform 2 toward Kokusaikaikan. The [city facilities page](https://www.city.kyoto.lg.jp/kotsu/page/0000009812.html), whose equipment text states an April 2021 snapshot, identifies four gates and confirms platform doors. Only the southern and central-1 connections are included in this increment.

[Nesnad's platform photograph](https://commons.wikimedia.org/wiki/File:Kyoto_station_platforms_with_platform_doors_-_Karasuma_line_Jan_02_2022_09-22AM.jpeg), taken on 2 January 2022, was downloaded and visually inspected. It guides the two rows of cream columns, pale tiled floor, low ceiling, blue bilingual signs and half-height doors. Source metadata and SHA-256 are recorded in `sources.json`. The photograph is reference material and is not shipped in the game.

The southern gate now has an open lane through its former rear screen. A second entrance opens from the public passage into a central gate vestibule. Each gate has its own enclosed paid hall and two fifteen-step flights with a landing. The halls connect through the platform below. The public north–south passage remains open alongside them.

The fitted concourse is at Y−6.2 m, the platform at Y−11.2 m and the platform ceiling at Y−7.8 m. The island occupies X171–183 m and Z−140 to 16 m. Two tracks continue beyond both ends inside a tunnel enclosure. Profiled rails use a 1.435 m gauge; sleepers, door pockets and columns are grouped into material batches. Each platform edge has closed doors, tactile paving and an end guard. Stair openings match the structural deck and suspended ceiling; the stair backs and sides enclose the space below.

The gate halls, stair dimensions, levels, track alignment, door modules and finishes are fitted approximations. Platform doors and retracted ticket leaves are static. Trains, lifts, moving escalators, north/central-2 gates, detailed service rooms and the B2/Porta connection remain unfinished. This is the initial usable subway structure, with further evidence-based refinement still required.

## Rebuild

Against the public-underground-passage parent, run `prepare-subway-platforms.mjs`, `build-subway-platforms.mjs` and `web/v2/compose-component.mjs`. `subway-platforms-scope.mjs` identifies the twelve replaced surfaces. `verify-subway-platforms-geometry.mjs` checks retained records and exact added geometry, normals and label UVs; signed zero is treated as the same coordinate. `verify-subway-platforms.mjs` walks both gate/stair connections, both platform ends, the inter-stair route and retained public passage, and checks both platform barriers. `install-subway-platforms.py` integrates and reopens the editable Blender scene.

## Underground runtime repair

The first gameplay check failed at the platform spawn: the player was at the right coordinates but never remained grounded. `FirstPersonWalker` reset any player below Y−5 m every frame, and `BrowserSession` cancelled balls below the same fixed height. The scouting camera also silently clamped inspection views to Y−8 m. Position-only route tests did not detect the player's repeated resets.

Fall recovery now uses a plane five metres below the lowest authored collision geometry, computed when the session is created. Walkers, authoritative throws and native prediction use that limit. The scout camera expands its bounds to contain the loaded station, including underground and extended exterior geometry. Route checks now require grounded entrances and endpoints; the Chrome inspection asserts the actual camera position after it settles.

The rebuilt native worker passes `node web/tests/station-bounds-runtime.mjs`: stable standing and a fully stopped throw on an isolated Y−30 m floor, cancellation without a result after a ball escapes, player recovery after falling off, and home. The complete subway runtime check also passes, with full translation/spin rest after 13.94 seconds, recall and home. Chrome gameplay passes at the platform spawn. `npm run typecheck`, `npm test` and `npm run build:web` pass.

## Geometry and visual checks

All eleven native routes pass, including both gate/stair connections in both directions, both platform ends, the inter-stair platform route and the retained public passage: 5,231 recorded position samples with grounded entrances and endpoints. Both closed platform-door barriers stop the player before the track edge.

- The exact browser/native comparison covers 367 added panels, 67,704 vertices and 22,568 triangles. Twelve retired surfaces remove 144 triangles. Retained native records and existing browser buffer bytes match the parent.
- The saved Blender scene reopens with matching geometry, normals, sign UVs and retained object bindings.
- Fifteen views were inspected in actual Chrome at verified camera positions, including both gate halls, both stairs in each direction, platform ends, closed doors, tracks and the retained public passage. No page errors occurred.
- The addition contributes about 2.1 MB of browser geometry and twelve material batches. Thirty-nine fixtures share the existing pool of at most two active lights. Across 1,350 short Chrome frame samples at 1440×900, the median was 16.7 ms and p99 was 16.8 ms. This is a brief inspection, not a sustained gameplay benchmark.

Finishes remain plain, with simplified ceilings, gates and equipment. The next structural priority is the missing B1-to-B2/Porta connection, followed by other subway gates and accessible routes.

Private construction, geometry, native, Chrome, worker-build and source-installation receipts are retained under `.local/v2/current/components/subway-platforms/`. The current hashes are pinned in `web/v2/assets.json`. The current station and editable source are replaced in place; the prepared, composed and source candidate copies are removed after promotion. No research photographs or generated binaries are committed.
