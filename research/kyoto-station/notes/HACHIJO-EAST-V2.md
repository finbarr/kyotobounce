# Hachijo East entrance and rail connections

29 September 2026. Extend the southern forecourt into an eastern public foyer, with separate routes through the Shinkansen and JR gates.

## Evidence and construction

The saved [JR Central map](https://railway.jr-central.co.jp/station-guide/shinkansen/kyoto/map.html) and [JR West plan](https://www.jr-odekake.net/station/img/premises/0610116.pdf) establish the eastern public entrance and its relationship to the two rail operators. Pages 3–4 of [Kintetsu's illustrated subway route](https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_03.pdf), dated 20 January 2026, were downloaded, rendered and visually inspected. They show the covered approach, public passage beside the Shinkansen gate, shop frontage, ceiling panels and tactile paving. The source and hash are recorded in `sources.json`; research photographs are not shipped in the game.

The new foyer joins the existing pavement. Its west gate opens into a paid lobby and two eleven-step flights, with an intermediate landing, up to the Shinkansen concourse. The upper floor has a matching opening and guardrails. The original main Hachijo stair opening is retained. At the north end, the JR gate opens through a short guarded landing onto platform 10. That landing follows the existing platform edge rather than overlapping its floor. Both operator routes have one retracted lane; the public corridor and adjacent shop bay have level floors.

The ground level is Y0, the upper concourse Y3.675 m. The fitted stair occupies X124–130 m and Z−163 to −154.16 m. The original-text signs, ticket machines, counter, glazed entrance and ceiling lights provide initial interior structure. All new lights share the existing limit of two active lights.

These are fitted dimensions and provisional finishes, not an as-built survey. Gate and door leaves are static. The shop bay is a simple stand-in for the photographed commercial frontage. The subway descent, eastern JR transfer bridge, lifts, escalators and complete southern frontage remain unfinished. The public subway route is the next circulation priority.

## Verification

The matching-export check covers 268 panels, 9,768 vertices and 3,256 triangles, including flat normals and sign UVs. Two obsolete surfaces containing 44 triangles are retired: net increase 3,212 triangles. Existing native records and encoded browser data remain unchanged. Composition appends 508,732 bytes in twelve material batches, including the original sign atlas; thirteen emitters use the existing light pool.

The editable Blender station saves and reopens with matching geometry, UVs, materials, light values and retained object bindings. `npm run build:web` passes. Core native gameplay passes a 1.35 m walk, complete translation-and-spin rest in 13.97 seconds, a free result, recall and home.

Twelve actual Chrome views cover the forecourt, foyer, both gates, stairs, platform join and shop/ticket area. There are no page errors. The short 1440×900 sample contains 1,080 frames with a 16.7 ms median and approximately 16.8 ms p99/maximum; active lights remain capped at two. This is not a sustained performance or audio soak.

Chrome gameplay passes entry, walking, a complete throw, results, recall during flight and menu/home navigation. All ten new native route walks pass, with 8,846 position samples. Both retained main Hachijo stair walks also pass, with another 411 samples. Endpoint floor heights remain within 0.06 m of their intended level. Receipts are retained under `.local/v2/current/components/hachijo-east/`.

The local playable build on port 4425 serves the verified geometry and matching layout, with the native worker ready and normal exploration spawn retained. The promoted Blender scene and sign atlas match their verification hashes. The prepared, composed and source full-station candidates and port 4426 browser overlay have been removed.

## Rebuild

Against the Hachijo ground-entrance parent, run `prepare-hachijo-east.mjs`, `build-hachijo-east.mjs`, and `web/v2/compose-component.mjs`. `hachijo-east-scope.mjs` defines the exact two retired surfaces. `verify-hachijo-east-geometry.mjs` checks the retained data and matching geometry; `verify-hachijo-east.mjs` walks the forecourt, both operator routes, concourse connection, shop approach and stair bypass in both directions. `install-hachijo-east.py` integrates and reopens the editable Blender scene.
