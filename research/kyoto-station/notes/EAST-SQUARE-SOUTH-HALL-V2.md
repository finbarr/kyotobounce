# East Square southern entrance and public hotel hall

## Evidence and scope

The hotel’s [July 2026 floor map](https://jrwest-hotels.jp/granvia-kyoto/files/pdf/floormap.pdf?01=),
page 8, and the [clinic operator’s 7F diagram](https://kyoto-clinics.jp/floorguide/)
show the public hall behind East Square’s rounded and folded frontage. It
serves three clinics, with the hotel’s eastern lifts and escalators beside
its western lobby. The [clinic access photograph](https://www.kyoto-skin-cl.com/clinic/)
shows a carpeted lobby, pale walls and ceiling, metal handrail and a sloped
corridor. The hotel diagram’s north arrow points down.

Private references, retrieved 1 October 2026:

- `maps/granvia-floormap-2026-07.pdf`, page 8.
- `maps/clinics-7f-plan.png`: [operator map](https://kyoto-clinics.jp/wp/wp-content/themes/KCtheme/assets/img/floorguide/floorguide01_sp.png).
- `photos/namba-7f-hall-2026-09.webp`: [access photograph](https://www.kyoto-skin-cl.com/wp-content/webp-express/webp-images/uploads/2026/09/PI_6893_path2601-420x280.jpg.webp).

The repair opens the straight return beside the rounded frontage into a
supported receiving lobby. A continuous hall runs east to the retained
terrace, with fitted thresholds, a ceiling, lighting, handrails and closed
clinic frontages. Glass and metal guards follow the retained terrace's
southern and eastern edges, leaving the doorway clear.
Six existing panels receive bounded cuts; the rest of
the rounded and folded façade remains intact.

The municipal source supplies the oblique western threshold and eastern
terrace edge. The hall alignment, dimensions, finishes, 0.32 m rise and
return ramp are fitted estimates. The photograph establishes a slope but
does not measure it. The hotel lift bank, escalators to 6F and clinic
interiors remain unfinished. The lobby has a supported floor until those
vertical connections are installed.

## Acceptance

- Walk from East Square through the western entrance and full public hall
  onto the eastern terrace, then return. Walk both directions around the lobby.
- Inspect the actual entrances, slopes, ceiling and frontages in Chrome.
- Walk against the southern and eastern terrace guards and remain supported.
- Match browser and native geometry, retaining all unrelated records and
  moving hardware. Reopen and verify the saved editable source.
- Pass relevant browser-build and local gameplay checks, commit, merge into
  local main and replace the current bundle in place.

## Rebuild

Use the parent recorded in the private receipt and a single `COMPONENT` directory
under `.local/`:

1. `build-east-square-hall.mjs PARENT COMPONENT`
2. Blender `extract-east-public-lift.py -- PARENT COMPONENT`
3. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json COMPONENT/station`
4. `open-isetan-ground.mjs COMPONENT/station/assets.json COMPONENT`
5. `web/v2/compose-component.mjs COMPONENT/station/assets.json COMPONENT COMPONENT/station COMPONENT/station/removal.json`
6. `finalize-east-transfer.mjs PARENT COMPONENT/station/assets.json COMPONENT`
7. `verify-static-replacement.mjs PARENT COMPONENT/station/assets.json COMPONENT OUTPUT`
8. Native and Chrome route checks; actual-game visual inspection and gameplay.
9. Blender `install-east-transfer.py -- PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/source`

Other than the composition command, scripts are in `web/station/realism/`.
The opening tool preserves every nondegenerate original face outside the
cuts, including tiny municipal details. Its larger sliver threshold applies
only to newly clipped faces.

## Geometry and saved source

- 162 new panels, 2,088 triangles and 183,892 appended GLB bytes.
- Ten material batches; no new textures. Fourteen fixture records use the
  existing bounded light pool.
- Six bounded source cuts preserve 1,720 whole faces outside the openings.
  The independent comparison verifies geometry, UVs and normals against
  the browser export. All unrelated native records and moving hardware
  remain unchanged.
- The saved Blender scene was reopened and verified against the final layout.
  Its export normals are exact; preview normals differ by at most 0.0202°.

Final asset identities:

| Asset | SHA-256 |
| --- | --- |
| Native layout | `e172845b4456fdc15ff11c213ceceb2e31beee8e216143a6496cf217218b5820` |
| Browser geometry | `dc100de6a084c00e952ce1fd7cc5803b0dcabdbfce5a26efcf7efb425916b75d` |
| Editable scene | `d137ebbacfce10b85482a8bbb5d7a56b6e47024aa566cfa0d2417dc8a58bc741` |

Private receipts and the small component are kept under
`.local/v2/current/components/east-square-south/`. The full candidate scene,
layout and geometry replace the current bundle in place at delivery.

## Verification

The final native route pass uses running input for the two full hall routes
and both lobby directions. Both terrace guards block walking input while
the player remains supported. Ordinary native gameplay passes from the
hall floor: a 1.34 m walk, full translation/spin rest after 4.04 seconds,
unsaved exploration result, recall forfeiture and home.
Chrome keyboard controls pass the outward and return hall walks, the lobby
route and both terrace guards, with no page or game errors.
The normal Chrome gameplay check also passes entry, WASD, a complete throw,
result presentation, recall during flight, menu and home. `build:web` passes.

Six actual Chrome views were inspected. A doorway trim overlap and an
unfilled header were corrected before delivery. The rooms have continuous
floors and ceilings; the public lobby's retained frontage and new interior
finishes remain provisional. The warmed views retain 384 textures and
seven reflection captures throughout the inspection; they do not establish
a general performance benchmark.

Relevant commands (same `COMPONENT` as above):

```sh
npm run build:web
KYOTO_FAST=1 node web/station/realism/verify-east-transfer.mjs COMPONENT/station/station-layout.json COMPONENT COMPONENT/native-routes
node web/station/realism/walk-isetan-stair-chrome.mjs http://127.0.0.1:4426 COMPONENT/station/assets.json COMPONENT COMPONENT/chrome-routes
node web/station/realism/inspect-east-transfer-chrome.mjs http://127.0.0.1:4426 COMPONENT/final-views COMPONENT/views.json
KYOTO_TEST_ORIGIN=http://127.0.0.1:4426 KYOTO_V2_ASSETS=COMPONENT/station/assets.json KYOTO_TEST_SHOT_START='{"x":145,"y":30.29345733642578,"z":-19.9}' node web/tests/v2-runtime.mjs
KYOTO_TEST_ORIGIN=http://127.0.0.1:4426 node web/tests/v2-browser.mjs
```
