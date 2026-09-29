# Daruma wall fittings

## Delivered

The Daruma dining room now has the two framed monochrome photographs visible above its serving hatch, dark timber dado along the left dining wall, a cap rail, panel stiles and a dark kickplate. Upper-wall infills and trim connect the serving wall to the outer walls while retaining the staff opening. Native testing exposed an existing obstruction beyond that opening; shortening the worktop and shelf ends and shifting the cupboard 0.43 m clears the passage. Six existing parts changed position.

This adds 29 closed parts, 348 triangles, four material batches and 89,788 bytes to the station GLB. Existing timber, metal and cream materials are reused. No lights were added. Photographs are noncolliding decoration; wall lining and upper joins use matching native/browser surfaces.

## Evidence and fitted details

- [Kyotopi's June 12, 2026 Kyoto opening visit](https://kyotopi.jp/articles/hakatadaruma) supplies the actual Kyoto interior. Its [interior photograph](https://image.kyotopi.jp/item_images/images/000/311/945/medium/e1a38a26-e7ea-4c82-9da0-d7492a24434b.jpg?1781106367) shows the pair of framed pictures, dark lower-wall joinery and serving hatch. The local research file is `research/kyoto-station/photos/daruma-kyotopi-interior-20260612.jpg`, SHA-256 `e6ebcc47002ab96fcb042c2c075c1c7124f027b60b60c2c927ef3713ff90682f`.
- The original 640 × 480 JPEG is embedded unchanged. UV rectangles select the two visible prints: `[224,7,329,82]` and `[452,6,558,81]`. This preserves the documented image content instead of substituting invented historical scenes. The prints inherit the limited resolution and photographed reflections of that reference.
- The [owner's history page](https://ra-hide.com/) was also inspected in rendered Chrome. Its historical kitchen photograph differs from the prints in Kyoto, so it was not substituted. Public history image: `https://storage.googleapis.com/studio-design-asset-files/projects/1Va6M8Gdq7/s-1342x620_v-fms_webp_b3f46129-33f4-4915-a98b-805d1570fe9d.webp`.
- The 0.79 × 0.575 m frames, 0.90 m dado and service-wall joins are fitted estimates within the existing shop footprint. The staff opening is inferred; the photo does not survey its full geometry.
- Research image attribution is retained in the component receipt. No redistribution license has been established. Research media and generated bundles remain local and outside Git.

## Construction and verification

Sources: `web/station/realism/prepare-daruma-wall.mjs`, `build-daruma-wall.mjs`, `install-daruma-wall.py`, `verify-daruma-wall.mjs`. The route checker accepts `--staff-access` to include the passage behind the dining counter.

The component verifier checks all 696 new vertices, triangle order, normals and UVs against the composed native layout. The verifier permits only the selected position values of the six corrected kitchen parts to change in the inherited GLB; other encoded bytes and records remain unchanged. The Blender installer saves and reopens the editable scene, checking the new geometry, normals, UVs, materials and retained object bindings.

Validation receipts are retained in `.local/v2/current/components/daruma-wall/`. The browser build and lossless asset test pass. Native runtime checks pass for exploration, full translation/spin rest, free result, recall and home. Chrome checks pass for entry, WASD, throwing, result presentation, recall, menu and home.

Seven actual Chrome views at 1440 × 900 were inspected, including the prints, wall junction and staff passage. Eighteen native walks pass, including both directions through the staff opening and around the full dining loop; the tabletop height and surface probe also pass. Their short frame samples had 16.7 ms medians, no page errors, a running audio clock and the existing two-light limit. These are local smoke checks, not a release performance soak. The dining room still needs fuller ceiling and interior lighting treatment; the low-resolution picture reference also limits close inspection.

## Asset identity

- Layout: `2bc4fdfa134cf74ca1215c87f32e6a3886ba14625d7cd6054c9557d9204977f2`
- Runtime geometry: `4a10665e8b1b01b1482727e6804eeeecdd5a79b96ac78c9e4e69d39c20d62757`
- Saved editable source: `1e2c0a81a8a882366092d8c8a1a38299dc99ed5953327fed3f7c1a0e24298b3f`

## Next

Inspect the restaurant ceiling and illumination against the Kyoto interior references. Improve the conspicuous dark/unfinished overhead surfaces and fixture placement while retaining the bounded light pool and current circulation.

## Retention

Promotion keeps one current station/source bundle and the small component receipts. Superseded candidate station, preparation export, Blender source and port-4426 public overlay were removed. After promotion: current bundle 667 MiB; candidate receipts, scripts and inspection views 40 MiB; active 4425 overlay 275 MiB; retired 4426 metadata/logs 68 KiB. No new checkout or full-station archive was created.
