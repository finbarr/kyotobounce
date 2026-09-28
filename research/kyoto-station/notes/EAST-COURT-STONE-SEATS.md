# East Square: stone seats and original granite material

27 September 2026. Isolated component; not installed in the full station. [Visual review](east-court-stone-seats/index.html).

## Current reference and construction

[JR Central’s September 2025 report](https://souda-kyoto.jp/blog/01367.html) provides post-renewal terrace photographs. The exterior overview shows stepped warm stone seats, café tables/chairs, pale umbrellas and a timber frontage. The new set is archived with dates and hashes; the article's date is not an exact photographic capture date. The tea-room interior is a separate space, not a replacement for the outdoor square.

Two provisional seats now sit within the raised garden, clear of its declared circulation. Each has an L-shaped base, seat tier and taller back, with 12 mm bevels. Their shape follows the current reference; dimensions and placements remain inferred. Six closed collision meshes total 200 triangles in one material batch.

The granite uses three original 512×512 maps: color, roughness/metallic and normal. A fixed random seed creates mineral grains with periodic boundaries; no photograph pixels enter the texture. UV scale is 0.6 m per tile. Estimated decoded RGBA8 texture allocation including mipmaps is 4 MiB, shared by both seats. This is an allocation estimate, not measured whole-game memory.

## Verification

- All 200 triangle probes agree between emitted browser geometry and the isolated native worker. Maximum point difference is 0.000011933 m. Every seat part has closed oriented edges and positive volume.
- All seat vertices lie over the raised garden. The 113 parent court/escalator panels, moving lanes and comb supports remain unchanged.
- The 14 previously recorded native walking paths stay clear: 10,098 panel/path sample comparisons, minimum sampled horizontal clearance 1.53455 m. Accounting for the largest gap between recorded samples gives a conservative 1.45678 m clearance along their piecewise-linear paths, above the 0.265 m capsule radius plus skin. This explicitly reuses prior walking evidence; no fresh furnished-assembly walk is claimed.
- Composed geometry checks 79,410 vertices and all 53,116 triangle indices/winding. Maximum serialization error4.256e−6 m.
- Embedded image hashes, all 600 UV vertices and material bindings survive composition. A second test uses two textured inputs with different base-color content to exercise nonzero image/texture/sampler offsets. The prior untextured court assembly remains byte-identical under the updated composer.
- An independent build reproduces GLB, native JSON and report bytes. Browser asset build, tool syntax and diff checks pass. Normal-distance and close-up Chrome views were inspected. These use inspection lighting and unregistered cameras, not the final visual rubric or performance gate.

The textured eastern assembly has 119 panels, 53,116 triangles, eight materials and 3,416,684 GLB bytes. The new material/UV pipeline is reusable, but it does not yet replace the full station’s material system.

## Next

Register current terrace furniture and the timber frontage, then build the remaining columns, seat/planter edges and planting. Keep public paths open. Source-confirm the other level connections and photographic camera before integration. Full-station lighting, contact shadows, performance/audio soak and visual acceptance remain open. No commit, push or deployment.
