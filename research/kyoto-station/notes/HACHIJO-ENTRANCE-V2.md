# Hachijo ground entrance and concourse stair

29 September 2026. Open the southern ground-storey wall and connect the public forecourt to the Shinkansen concourse.

## Route and evidence

The [JR Central station map](https://railway.jr-central.co.jp/station-guide/shinkansen/kyoto/map.html) and saved [JR West plan](https://www.jr-odekake.net/station/img/premises/0610116.pdf) establish the ground-level Hachijo entrance and its connection to the upper Shinkansen concourse. Page 2 of the saved [municipal forecourt brochure](https://www2.city.kyoto.lg.jp/html/shikai/img/joho/kankobutsu/siryou/H28/13-2.pdf) was rendered and inspected for the relationship between the public passage, terrace stairs and eastern pavement. It is a December 2016 reference, not a current transport-service schedule.

An attributed [Hachijo gate photograph by Mister0124](https://commons.wikimedia.org/wiki/File:JR_Central_Ky%C5%8Dto_Station_Shinkansen_Hachij%C5%8D_Gate.jpg), dated 10 December 2022, was downloaded and visually inspected. It informs the warm stone, blue gate hoods, staffed window, pale ceiling panels, dark floor strip and bilingual fascia. The research copy is licensed CC BY-SA 4.0, with source, license link and hash in `sources.json`. The photograph is not shipped in the game. Sign textures are independently authored text and shapes.

The receiving pavement now extends east from the existing public-passage stair landing. It meets a covered foyer with open sliding-door leaves, ticket machines and an information window. One gate lane leads into the paid lower lobby. Two eleven-step flights, separated by a 1.8 m landing, rise through a matching floor opening to the existing concourse. Side walls support the stair enclosure; guards protect the opening. Both side aisles and the westward concourse connection remain usable.

The fitted entrance is at X46.4 m; ground is Y0 and the upper floor is Y3.675 m. The stair extends from Z−169 to Z−160.16 m. These positions, floor elevations, dimensions, equipment count and finishes remain approximations. Gate and door leaves are static. Moving escalators, lifts, the eastern entrance, detailed shops and the complete Hachijo building/forecourt remain unfinished.

## Matching exports and cost

Two obsolete panels and 24 rendered triangles are replaced with 237 panels and 2,864 triangles: a net increase of 2,840 triangles. Browser/native correspondence covers all 8,592 added vertices, flat normals and sign UVs. Retained native records and encoded browser data are unchanged. Composition appends 490,248 bytes in twelve material batches, including one embedded sign atlas. Nine emitters share the existing pool of at most two active lights.

The first Chrome review exposed gaps in the non-colliding tactile decoration and mirrored sign backs. The final strip is continuous; the upper sign names the concourse on its stair-facing side and the Hachijo exit on its concourse-facing side. Unused board backs and edges are blank. A correction receipt proves that all collision records, other layout data and walking routes are identical across that visual-only change; only non-colliding panels and the corresponding export hashes/count differ. The native walk report retains its actual input hash. Final-layout geometry, source and gameplay checks are performed after the correction.

## Verification and rebuild

All twelve native walking routes pass with 7,047 position samples; endpoint floor heights remain within 0.06 m. The final Blender source saves and reopens with matching geometry, UVs, materials, lights and retained bindings. Original generated signs are packed in the editable scene.

`npm run build:web` and final-layout `test:runtime` pass. Core native gameplay includes a 1.35 m walk, complete translation-and-spin rest in 13.87 seconds, a free result, recall and home. Chrome gameplay also passes entry, walking, throwing, results, recall during flight and menu/home navigation. Twelve final Chrome views were inspected with no page errors. The 1,080 short 1440×900 frame samples have a 16.7 ms median and approximately 16.8 ms p99/maximum; active lights remain capped at two. These are short checks, not a sustained performance/audio soak.

The local playable build on port 4425 now serves the tested geometry and matching layout with its native worker ready and normal exploration spawn retained. The promoted Blender source and sign atlas match their verified hashes. Superseded prepared, composed and source station copies and the port 4426 browser overlay have been removed; small component receipts remain for verification.

Rebuild in order with `prepare-hachijo-entrance.mjs`, `build-hachijo-entrance.mjs` and `web/v2/compose-component.mjs` against the central-transfer parent. `hachijo-scope.mjs` defines the exact retired surfaces. `verify-hachijo-geometry.mjs` checks matching exports; `verify-hachijo-entrance.mjs` walks the complete terrace/forecourt/gate/stair route and adjacent paths. `install-hachijo-entrance.py` integrates the editable source. Private receipts are retained under `.local/v2/current/components/hachijo-entrance/` after promotion; superseded full-station candidates are removed.
