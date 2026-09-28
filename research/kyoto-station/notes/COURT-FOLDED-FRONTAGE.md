# Folded courtyard facade: evidence and component 04

27 September 2026. Local construction study; the full-station native candidate remains `station-court-adjacent-02` with `court-adjacent-browser-03`. This preview must not be used for gameplay with that unchanged native layout. [Visual comparison](court-folded-frontage/index.html).

## What the photographs establish

The [2019 firsthand article](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902120000/) supplies a close view of reflective folded lower faces, pale upper cladding with vertical joints, a rounded dark return and a narrow plinth. Its overview relates that facade to the cafe. The [2025 JR Central article](https://souda-kyoto.jp/blog/01367.html) shows the upper folded envelope; umbrellas obscure the lower glazing. The [Rurubu view](https://rurubu.jp/andmore/article/23413) mainly sees the already installed adjoining wall.

These are reference copies, not licensed textures. The three new photographs and article are catalogued with file hashes; the library now contains 212 entries and 197 downloaded files. Individual 2019 capture dates are unknown. The author's tentative chapel identification is historical; current tenant/use is unverified. Old gazebo, furniture and planting are not current-state modeling requirements.

## Registration and construction

- Municipal GLB SHA256 `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`, object `Untitled.203`, faces8251–8286: 18 vertical patches, 19 profile anchors, projected area 195.375091 m². The separate inset roof lip is retained.
- BottomY29.973389m, topY36.308678m in renderer coordinates. A circular fit to the rounded section misses its nine anchors by up to 0.094022 m. The component instead interpolates those anchors with a centripetal curve and 64 small spans; maximum departure from the coarse chords is 0.091418 m. These are model comparisons, not survey accuracy.
- Cladding division Y34.15, plinth 0.18 m, sheet thickness, seams and nominal 1.1 m straight upper panels / 1.2 m glass panels remain estimates. Rounded upper joints follow the original source span boundaries, approximately 1.2–1.5 m; the eight fine subdivisions within each span have continuous shading.
- Closed backing, upper sheets, lower mirrored/dark sheets, plinth, head trim and coping. Fold corners use shared offset-line miters; interior flat sheets have square cuts. Backing ends below the coping to avoid overlapping rear faces.
- 465 closed panels,391 colliding and 74 decorative; 5,580 triangles; 6 material batches; zero new image textures; 473,740 GLB bytes. Optical parameters remain provisional.

## Verification

- Independent browser/native serialization checks every vertex, index and winding:16,740 vertices,maximum 4.2304 µm Float32 conversion error.
- Component collision: all 4,692 sampled rays pass,maximum 0.000099357 m native/browser difference, 0 shared-boundary ties. This private component-only test excludes decorative trim and does not prove station routes or gameplay.
- All 16,740 saved normals checked for unit length and outward orientation; 12,132 flat vertices and 4,608 curved vertices. 742 ungapped curve-normal joins agree exactly. The lowest curved face/normal dot product is 0.997774.
- Repeated generation reproduces GLB,native panels and report bytes. Browser asset validation, JavaScript syntax and `git diff --check` pass.
- Preview clips exactly 36 source triangles in one municipal batch and removes195.375091m². JR and Rurubu use their unchanged registered cameras; the additional overview is unregistered. All use fixed inspection lighting and a generic RoomEnvironment. They do not demonstrate actual courtyard reflections, full-game performance, or final appearance.
- Draft 02 failed three native checks: overlapping coping/backing and one corner-grazing hit. Draft 03 fixed those joints but revealed one interior sheet-cap hit. Draft 04 uses square interior sheet cuts and passes the unchanged tolerances. Failure receipts remain in the worktree.

## Receipts

- Component GLB `049da3c17998273e538b5601365563efbf3a1f554a694c57319d1111728e3919`.
- Native panels `cce0df35607416f9a2c5d324468fbdf5b37689f48b48b1d5f22800641b46368f`.
- Preview GLB `433adc61392e4a1f11618a1316dd83c11cae1d2428bbad42d7c2b79f4d2ca1a9`.
- Worktree outputs: `.local/station-realism/court-folded-frontage-04`, `court-folded-frontage-preview-04`, `court-folded-frontage-native-04`.
- [Component](court-folded-frontage/component.json), [source specification](court-folded-frontage/spec.json), [preview clipping](court-folded-frontage/preview.json), [collision rays](court-folded-frontage/native.json), [serialization](court-folded-frontage/serialization.json), [normals](court-folded-frontage/normals.json), [browser asset build](court-folded-frontage/build-web.log).

Gallery checks pass in Chrome at 1440 and 390 pixels: six images, seventeen local links, working before/after control, no horizontal overflow or page errors. Both layouts were visually inspected.

## Next bounded step

Install the same source clip and closed component in the Blender/native station parent. Preserve other records and courtyard routes, then verify the export, route walks, selected runtime checks and actual-game matched views. Check nearby scene reflections before accepting the glass. Terrace form, pavement, planting/furniture, cafe junctions and the wider long-term plan remain unfinished. No commit, push or deployment.
