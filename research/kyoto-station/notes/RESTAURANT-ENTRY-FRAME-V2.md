# Restaurant entrance lantern frame

28 September 2026. Integrated into the editable station and local playable v2.

## Evidence and interpretation

[Soul Kyoto's station photographs](https://soulkyoto.blog.fc2.com/blog-entry-395.html), captioned 9 February 2014, show cream illuminated entrance columns and lintel, dark crossbars, inner returns and kickplates. The saved reference is `photos/soulkyoto-20140209kyotostation06_0326.jpg`, SHA-256 `fa48fbee3fb7902472c7ae9533459a9efc4a96484216d1bf804f32adad5ffad9`. It guides geometry and finish; no photograph pixels are used as game textures. Its date does not establish current branding.

The frame uses the [registered western entrance](WESTERN-APPROACH.md). Its clear opening is 2.36 m wide and 2.60 m high; the existing 2.32 m threshold remains clear. Dimensions and subdivisions are approximations fitted to the registered model, not surveyed measurements. The diffusers use emissive materials without adding dynamic lights. Shop interiors, menus and surrounding floor finishes remain unfinished.

## Delivery and checks

- 20 closed panels, 240 triangles, three material batches; the station GLB grows by 22,804 bytes. All inherited encoded geometry remains byte-for-byte unchanged.
- Source installer appends the same meshes to Blender and updates its embedded collision seed. Reloading the saved source verifies all 20 meshes and triangle indices, with zero measured coordinate error for these panels. External textures resolve; other images are packed in the scene.
- Six native doorway walks pass: three lanes, each outward onto the skewed landing and back into the restaurant. Feet remain within 0.12 m of the registered floor.
- Three Chrome views at 1440 × 900 show the frame and clear opening without page errors. Brief 120-frame samples per view have median 16.7 ms and p95 at most 16.8 ms. These are local spot checks, not release-wide performance acceptance.
- `npm run build:web` passes. `npm run test:runtime` on isolated port 4426 passes a 1.35 m walk, full translation/spin rest (4.22 s), free result, recall forfeiture and return home.
- The promoted build also passes `npm run test:v2:browser`: visible station, WASD, full throw, result presentation, recall during flight, menu and home. Its local service reports a ready native worker.
- Existing escalators, flights, beams, boxes, inherited panels and architectural supports are unchanged; the hardware GLB is reused. Only its source-layout metadata advances.

## Current asset identity

| Asset | SHA-256 |
| --- | --- |
| Native layout | `ff18e896866c037c263add636e139dd1f2f5ae6524299a419d923c3cef2eb079` |
| Station GLB | `6fec8136447e86f27724f6899dfb91663bcc4e6f00d8327a6612d658be27afe6` |
| Editable Blender scene | `9e570cbc1a869035b39f00428418ec48624a25275662c4e85d538c74cfb3f3ea` |
| Unchanged hardware GLB | `ef0116ea90c801d28b81e0aa2d73c21ebd5bb8d0e21792ffecf957252224fe26` |

`web/v2/assets.json` identifies the current paths. The full scene and layout replace their previous versions in `.local/v2/current/`; the station layout aliases the source layout. Small component inputs and receipts remain under `current/components/restaurant-entry-frame/`. The superseded candidate scene, duplicated layout and port 4426 overlay were removed after promotion. Current bundle: 627 MiB; remaining candidate receipts/views: 19 MiB; live port 4425 overlay/layout: 275 MiB. Cleanup removed roughly 1.1 GiB of temporary duplicates.

The checked-in builder and installer are `web/station/realism/build-restaurant-entry-frame.mjs` and `install-restaurant-entry-frame.py`; the native walk check is `verify-restaurant-entry-frame.mjs`. Compose against a manifest that has the registered restaurant but no lantern frame, then install that component into its corresponding source. The current source already contains it.
