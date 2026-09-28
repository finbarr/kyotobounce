# East Square / NIWA: measured photograph camera

27 September 2026. [Interactive photograph/source/game comparison](east-court-photo-registration/index.html).

## Result

A second station reference now has a measured source-camera alignment. Six point landmarks are fitted, two other points are withheld, and the nearer tower corner supplies one line constraint. At 1224 × 816 pixels, fit RMS is 4.72 px, maximum fitted-point error 9.69 px, maximum withheld-point error 5.92 px, and maximum perpendicular line error 0.64 px. All are below the 24.48 px tolerance (2% of image width). This registers the municipal source; it does not accept the game’s shape, surfaces or lighting.

The exact-camera game capture fails visibly: the retained `east-square` slab covers this real outdoor viewpoint. Its lower surface is Y32.9 m, 0.47369 m above the fitted eye; its upper surface is Y33.5 m. A barycentric intersection with the actual slab triangles confirms this at the camera’s horizontal position. The new isolated garden is Y31.09338 m, leaving 1.33293 m below this eye, but its height is still provisional.

The same-camera courtyard-component view also exposes the provisional seating placement: both seats are distant, while the photograph contains a large foreground seat. Existing component ray and walking checks remain valid for their tested geometry, but they do not establish correct placement. Revise the seat arrangement from registered references before integration.

## Reference and method

- [JR Central’s NIWA article](https://souda-kyoto.jp/blog/01367.html), information current 8 September 2025; exact photograph capture date unknown. Original image: `photos/niwa-jr-02a.jpg`, 816 × 544. The article describes NIWA opening in March 2025 and a seasonal 2025 beer garden; that furniture arrangement is not verified as permanent or current in September 2026.
- The [current station operator listing](https://www.kyoto-station-building.co.jp/restaurant_cafe/004/) still locates NIWA in the eastern 7F zone. Both pages were rechecked during this work.
- [Kyoto City municipal source](https://data.city.kyoto.lg.jp/resource/?id=21224), CC BY 4.0, unchanged GLB SHA-256 `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`.
- Equipment-box corners and a distant rooftop enclosure provide eight exact source vertices. The near tower edge uses source face 4723. Two points interpolated on that edge constrain distance to the observed image line; they are not claimed as two independent point correspondences.
- Centered pinhole camera, square pixels, zero lens distortion. Uniform 1.5× image scale, no crop, warp or source-geometry movement. The exact position, roll, field of view, source indices, original image picks and hashes are linked in the gallery.

The initial equipment-only fit had uncertain far-roof identities. Those tentative junctions were rejected explicitly; they are retained in the worktree’s orientation diagnostic. Distributing point landmarks across near/far structures reduced point errors, but image-pick perturbations still moved the camera by metres. The nearer tower edge substantially reduces this ambiguity: the Jacobian condition falls from approximately 1372 to 297.

With 100 reproducible perturbation trials (point picks ±2 original-image pixels, tower endpoints ±1 pixel), camera-coordinate 5th–95th percentiles are X110.792–111.809, Y32.245–32.576, Z−11.176–−10.952 m, and vertical field of view 69.221–71.754°. These reflect only manual image-pick sensitivity. They exclude source-model error, unknown crop/lens distortion and changes between source dates; they are not survey confidence intervals. Exact furniture dimensions need further evidence.

## Verification and scope

- Source, component and actual-game camera positions, field of view and quaternion agree. The game uses no cutaway or camera obstacle avoidance. Gallery verifies photograph and game image hashes.
- Synthetic verification independently recovers a known camera, checks fitted-line influence, withheld point/line outlier rejection, and width-relative tolerance. The previous north-facade camera remains exactly unchanged.
- The first game capture stopped because the fresh isolated server lacked the candidate course catalog. Loading the already prepared 31-course local catalog resolved this; the failed receipt is retained. No production records were touched.
- Successful diagnostic capture: Chrome 153, 1224 × 816, 2.5 s warmup and 4 s sampling; p95 frame 18.6 ms, p99 18.8 ms, no hidden frames or GPU disjoints. This mostly occluded view and short run provide no gameplay-performance or soak acceptance.
- Gallery controls, images and nine local evidence links pass Chrome checks at 1440 and 390 px, with no overflow or page errors. Desktop rendering was visually inspected.
- Browser asset build and tool syntax pass. No geometry, material, C# or service changes this turn. No commit, push or deployment.

## Next

Use this camera and additional terrace references to correct seat positions, garden boundaries and NIWA frontage. Preserve source uncertainty and the current public paths. Resolve the retained slab and remaining level connections during coordinated integration, then repeat the actual-game photograph comparison. All fifteen final visual comparisons, remaining public-space/exterior construction and full performance/runtime gates remain required.
