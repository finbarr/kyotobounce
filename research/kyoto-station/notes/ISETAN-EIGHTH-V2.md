# Isetan eighth-floor connection

30 September 2026. Connect the southern Grand Stairway entrance to the eighth-floor store halls, add the operating 7F–8F escalator pair, and correct the floating FUKUNAGA901 café.

## Evidence and fit

The station operator’s [8F guide](https://www.kyoto-station-building.co.jp/floorguide/8f/?tenant=isetan) and [plan overlay](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_8f_isetan.svg) show the central store escalators, northern lift halls and connected aisles. The [store directory](https://www.mistore.jp/store/kyoto/shops/floor8.html) gives the floor context. The station’s [FUKUNAGA901 listing](https://www.kyoto-station-building.co.jp/restaurant_cafe/001/) places the café south of the Grand Stairway on 8F. The downloaded plan remains with the private component receipts.

The source supplies the 35.395 m floor datum and retained public landing. The southern doorway opens into halls around the public stair structure. About 131.46 m² of missing floor connects the southern, western and northern aisles. Four deep stair foundations are rebuilt around the hall opening, retaining their original extents outside it and preserving the public steps above. A fitted soffit encloses the outdoor escalator undersides where they cross the western hall.

The new central pair rises 5.046 m from 7F at 0.5 m/s in opposite directions. Fitted floor and ceiling openings provide passenger clearance; upper guards protect the wells. The seventh-floor aisle joins the retained and new banks.

The existing café floor floated 1.39 m above the eighth-floor landing. Its duplicate slab is retired and its 62 retained fixtures, glazing and furnishings move to the common store datum. Its light moves with them. A doorway joins it to the southern hall, which turns around the café footprint. The superseded route and label are removed.

Dimensions, lane placement, finishes and the café’s fitted footprint remain approximations. The northern eighth-floor public entrance, lift extension, remaining escalator banks and tenant interiors remain unfinished. The north lift still serves B3–7F.

## Verification

- The component adds or replaces 579 panels with 23,668 triangles. It retires 24 native panels, 33 boxes, 28 source-only meshes and 3,519 browser triangles. Bounded cuts affect 43 retained panels. Unrelated native records and retained browser buffer bytes remain exact.
- Floor coverage, excess and overlap each remain below 0.002 m². The three rebuilt slabs preserve their footprints outside the declared openings. Retained textured stone keeps its original world UV mapping.
- The four foundation replacements preserve their source footprints and every section outside the hall opening. The public landing remains exact. Clearance checks cover 86 nearby public tread envelopes, including the outdoor escalators, 370 central-escalator passenger volumes and 770 hall volumes at nominal 2.1 m headroom.
- Sixteen native walks pass with 2,619 position samples, including both café directions, the public stair approach and seventh-floor transfers. The upper well boundary remains guarded. Seven Chrome routes pass with 93 checked waypoints. Native and Chrome passive rides pass on the new and retained central pairs; Chrome also verifies that the rendered treads move.
- The reopened Blender scene matches the collision geometry, UVs, material bindings and animated chains. Authored export normals remain exact; the largest viewport normal difference is 0.071°.
- Seven inspected Chrome views show the connected halls, café and escalator approaches. Short 1440×900 samples record 16.7 ms median and 16.8 ms p99 across 840 overlapping frame samples. This is a smoke check, not a sustained performance benchmark.
- `npm run build:web`, native gameplay and the Chrome play loop pass. Native gameplay verifies full translation/spin rest at 13.85 seconds, free outcomes, recall and home. The served geometry and all 48 escalators and 14 lifts match the candidate.

## Rebuild and receipts

`prepare-isetan-eighth.py` derives the openings, bounded cuts, foundation replacements and missing floor. `extract-isetan-eighth.py` records the retired source geometry and existing café meshes. `build-isetan-eighth.mjs` builds the connected hall, café adjustment and escalators. The shared retirement, opening, composition and motion-integration scripts assemble the candidate. `verify-isetan-eighth-floors.py` independently checks floor coverage, retained public geometry, foundation sections and café placement. `install-east-transfer.py` installs and reopens the editable source for correspondence checks.

Asset hashes are pinned in `web/v2/assets.json`. Private receipts live in `.local/v2/current/components/isetan-eighth/` after promotion. The candidate replaces the current bundle in place; its full source, exports and temporary preview overlay are removed.
