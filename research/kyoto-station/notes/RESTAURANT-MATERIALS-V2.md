# Restaurant timber, counters and stool finishes

The subsequent [Kyoto kitchen pass](DARUMA-KITCHEN-V2.md) replaces the provisional maple counter finish with cream using a firsthand photograph of the built shop. The timber grain remains on Kotetsu and Daruma’s dark bases.

## Evidence and interpretation

The saved [Kotetsu visitor photograph](https://mckee-blog.net/menyakotetsu_misoramen_kyotoramenkoji/) shows warm timber uprights and rails around the tiger screen. The article is dated July 2024 and has later updates; the photograph's capture date is uncertain. The [Daruma opening release](https://prtimes.jp/main/html/rd/p/000000008.000131832.html) includes pale counters, dark bases, red padded seats and chrome supports. Its interior collage may include other premises, so it supports the finish vocabulary rather than an exact Kyoto floor plan. The [June 2026 visitor account](https://osumituki.com/kyoto-ramen/225895.html) supports the Kyoto shop's dark frontage and glazed side.

Local reference files remain in `research/kyoto-station/photos/`: `mckee-kotetsu-front-202407.jpg`, `daruma-interior-opening-2026.jpg`, and `daruma-front-20260623.webp`. No reference photograph is used as a game texture. Wood species, grain scale, surface roughness and fixture output are visual approximations, not surveyed measurements.

## Delivered change

- 68 existing shop parts receive wood UVs, material separation or smooth stool normals. Grain follows each timber member's longest axis; broad counter surfaces run along their length.
- One original pale timber image supplies the warm Kotetsu frame, pale Daruma counter and dark stained bases. Small normal and roughness maps add restrained surface variation.
- Stool upholstery has its own red material and fine surface variation. Side normals are radial while caps remain flat. Cylinder vertices and collision triangles stay unchanged.
- Six Daruma fixture metadata values fall from 22 to 3.3. Chrome inspection showed the old local illumination washing red seats toward cream and dark bases toward orange. The two-slot light pool, lamp positions and all other fixtures remain unchanged. These are renderer tuning values, not measured photometry.
- The pass adds two material draw calls, five embedded maps and 2,118,504 bytes to the station GLB. Estimated additional uncompressed RGBA texture storage with mipmaps is 8.67 MiB (driver allocation can differ).

The room still needs photographed wall fittings, kitchen depth and rounded upholstered rims. Existing counter and seating positions remain fitted approximations. This finish pass does not claim a fully photorealistic restaurant.

## Original artwork

Generated with the **built-in imagegen tool**, using the imagegen skill. Final original: `.local/v2/current/components/restaurant-materials/maple-original.png`. Runtime maps live in `.local/v2/current/source/textures/restaurant-*.png`; images are also packed into the editable Blender file and embedded in the runtime GLB as appropriate.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: seamless base-color texture for a physically based 3D game material. Generate one square 1024x1024 original pale maple wood texture, viewed perfectly orthographically perpendicular to the surface. Fine natural straight grain runs horizontally left to right, with restrained organic waviness and subtle cream/honey color variation. Represents approximately 1.6 metres along the grain by 0.4 metres across it. Continuous clean finished restaurant counter timber. Very low contrast, realistic fine pores. Uniform diffuse color only: no baked lighting, shadows, glare, vignette, perspective, planks, joints, border, knots, objects, writing or watermark. Seamless tile in both directions. Fill the entire image with wood. Intended to receive lighting and warm/dark tints in the renderer.

The selected original is resized to 1024 square for the game. Metric UVs and mirrored sampling suppress visible seams. Normal and mask maps are deterministic, deliberately weak approximations derived for the material; they do not represent measured relief.

## Implementation and verification

- `web/station/realism/finish-restaurant-materials.mjs` preserves inherited encoded buffers, patches the five affected material batches, and splits the two mixed-use palettes.
- `verify-restaurant-materials.mjs` independently compares the parent and candidate: every physical record, every rendered position and oriented triangle, inherited encoded bytes, unrelated materials and nodes are unchanged. It also checks native/rendered corner UVs and normals and texture hashes.
- `install-restaurant-materials.py` updates the same editable scene, packs the textures, installs UVs and custom normals, updates the six lights, saves and reopens the file. Source geometry signatures and saved attributes pass.
- `npm run build:web` and `node web/tests/lossless-assets.mjs` pass.
- Five final Chrome views at 1440 × 900 passed without page errors, each with a median frame time near 16.7 ms. The brief audio clock check passed. Core runtime checks passed a 1.36 m walk, full translation/spin rest after 7.91 s, recall forfeiture and home; the Chrome control test passed entry, movement, throwing, results, recall, menus and home. Small local receipts are retained with the component. These checks are not a full performance soak.

Final layout SHA-256: `2c744041e5c2f4d873e97d7a6f86fb5ed9fde2df61d4e7c99995ad71b81dde6d`.

Final runtime GLB SHA-256: `4b6a12875b219874699f82bf0e373168b4023cb3afb5e50aad3f1e1abd300538`.

Final editable source SHA-256: `a560c389e10f7cccc82e994cefea41259ac474ca87415d233fa6176a9954d5a1`.

## Retention and next task

Promote this candidate into the existing current bundle. Retain original artwork and small verification receipts; remove candidate full-scene exports and the 4426 overlay. Continue with the conspicuously empty Daruma serving opening and photographed counter/wall fittings, using the same checkout and source.
