# NIWA entrance and visible interior

27 September 2026. Local candidate NIWA11 / court assembly05 / full-station context05. The long-term reconstruction remains active and unfinished. Nothing from this pass is committed or deployed.

[Open the photographic comparison](niwa-entrance-interior/index.html).

## What changed

The cafe now has an angled glazed entrance with two closed door leaves, fixed sidelights, lower kick panels, pull handles, a threshold and return soffit. The service counter has cabinet joints and a coffee appliance. Behind the long glazing are a shallow seating area, pale walls, warm light fittings and 45 original curved bamboo strips.

The [official station listing](https://www.kyoto-station-building.co.jp/restaurant_cafe/004/) establishes the current seventh-floor NIWA venue. The [Rurubu article](https://rurubu.jp/andmore/article/23413), published 8 June 2025, supplies the entrance view and identifies the bamboo installation with Akane Teshigahara / Sogetsu. The [JR Central article](https://souda-kyoto.jp/blog/01367.html) supplies the other registered courtyard view. The previously saved NAKED interior photograph shows the counter, ceiling, light fittings and bamboo. These photographs are references; their pixels have not been used as game textures.

The return angle, hidden room depth, furniture sizes and door dimensions are inferred. Bamboo geometry is an approximation, not a faithful reconstruction of the artwork. The doors are static and closed. This is shallow visible interior context, not a complete restaurant interior. The short final captures show remaining coarse geometry at the glazed corner; resolve it with the hotel facade interface. Interior brightness and reflected light still need the planned lighting pass.

## Scope and cost

NIWA11 contains 300 panels and 7,596 triangles: 220 collision panels and 80 decorative panels. It preserves 172 previous panels exactly, adjusts 19 service panels and adds 109. All 14 declared path definitions, existing stair levels, planter, timber structure and original six texture images are unchanged. Minimum bamboo clearance is 0.1894 m behind the return and 0.3092 m behind the front glazing.

The full-station replacement retains 32,105 other native panels and all other native records and materials. Moving escalators are unchanged. It replaces 315 assembly panels with 424, adding two materials. Full browser geometry is 1,995,271 triangles in 1,876 batches, with 462 materials and 293 images. Relative to context03, this is 5,289 extra triangles, two batches, two materials and 214,852 bytes in the optimized asset. No new images or realtime lights were added. Runtime asset size is 114,985,940 bytes. Estimated texture storage remains 868.875 MiB including mipmaps; this is not a measured GPU allocation.

## Verification

- Full station: all 28 normal-speed courtyard walks pass, with 233 points and 466 floor/headroom rays; no failed spawns, obstructions or mismatches. Minimum sampled covered clearance is 2.72 m. Two exact ramp-edge ties are verified geometrically.
- Component: all 2,676 native collision samples pass; maximum position error is 21.85 micrometres. Decorative geometry is explicitly excluded. One shared boundary hit is accepted only after proving the reported point lies on the named native face with matching normal.
- Export: all 18 component materials and 184,797 vertex occurrences pass. Maximum UV error is 0.0000114441; maximum normal angle is 0.049982 degrees. The importer/exporter is not lossless in normals or interpolated UVs.
- Precision rule: original-vertex UV tolerance remains 0.0000002; interpolated UVs use the larger of 0.00001 and two Float32 ULPs at the stored coordinate. Three vertices use that rounding allowance. An earlier fixed-threshold failure at UV 76.905014 is retained. Source-surface distance remains limited to 10 micrometres and normal angle to 0.05 degrees.
- Repeat builds reproduce final NIWA11 GLB/native bytes. The default builder still reproduces NIWA08 bytes.
- `npm run build:web` passes. No native C#, service or scoring code changed in this pass.

Earlier component09 failures exposed a duplicate corner jamb, frames buried in the counter and threshold overlap. Those geometries were corrected. Component11 then had one shared-cap identity tie, independently verified by the final probe12. Failed reports remain local.

## Live Chrome inspection

Both views use their original registered camera, the full candidate station, a fresh isolated native worker and actual game lighting. Chrome 153 on Apple M2, AC power:

| View | Buffer | Frame p95 / p99 | GPU p95 | Draw calls |
|---|---|---|---|---|
| JR | 1224 × 816 | 17.6 / 17.9 ms | 4.86 ms | 56 |
| Rurubu | 1200 × 800 | 17.6 / 17.8 ms | 3.70 ms | 39 |

There are no browser errors or warnings, hidden measurement frames or skipped music steps. These approximately four-second captures are visual diagnostics. They do not pass the repeated matched 720p benchmark or twenty-minute audio/context soak.

The comparison gallery passes Chrome checks at 1440 and 390 px: four images, fourteen local links, working before/after selection, no page errors or horizontal overflow. Both layouts were visually inspected. Temporary review and QA processes are stopped.

## Exact candidates

- NIWA GLB: `2b05ed1e46f7cef8cad7da0bfcc1617c807acdbab946faea330556ab4fa5bbf9`
- NIWA native: `99b8508365e387ac41d42fbc1130bd1b9f45d72a25ca5b436296a18da6e2d2a7`
- Full layout: `5eda9b3e341be93ba53e1cef7a9ad728d6fc99a0cc4d19325c74c1ec7cc6f078`
- Blender: `f07765d45d38b1cf4f6ffdf4d5a2452f2e1cefbb4647c7517f5277c40a37e7c7`
- Runtime GLB: `f4377997707202d29d4cab59e742534954bee418e9c5a048c204a64a70588e4e`

## Next substantial work

Replace the coarse courtyard hotel facade with registered openings, stone joints and surfaces, including its cafe corner interface. Complete sculpted terrace forms, plants, furniture and lower public connections. Thirteen target areas remain unregistered. No final visual milestone, complete-course verification, full runtime test or performance gate is accepted. The earlier Skyway Trapdoor course failure remains open.

The research catalogue remains 208 entries, 193 downloaded source files, 20 PDFs and 114 reference images. Videos and panoramas remain indexed links. No new source count is claimed for these construction captures.
