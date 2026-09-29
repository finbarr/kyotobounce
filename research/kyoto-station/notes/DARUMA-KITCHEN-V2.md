# Daruma: Kyoto counter and serving hatch

## Better evidence

[Kyotopi's firsthand opening visit, published 12 June 2026](https://kyotopi.jp/articles/hakatadaruma), supplies a photograph of the actual Kyoto interior. It resolves the opening-release collage's uncertain relevance: cream counters, brown water pitchers, stainless condiment pots, a metal extractor/shelf and a white upright cabinet are visible. The article also identifies a central communal table. That table and the framed historical photographs remain the next layout/detail work.

Reference image: [Kyotopi interior photograph](https://image.kyotopi.jp/item_images/images/000/311/945/medium/e1a38a26-e7ea-4c82-9da0-d7492a24434b.jpg?1781106367).

Private saved file: `research/kyoto-station/photos/daruma-kyotopi-interior-20260612.jpg`, SHA-256 `e6ebcc47002ab96fcb042c2c075c1c7124f027b60b60c2c927ef3713ff90682f`.

Use this built-shop photograph ahead of the owner's generic opening collage. Exact dimensions, unseen equipment and placement remain fitted approximations. The image is retained for research only; no photograph pixels enter the game.

## Current improvement

- Correct the two counter tops from provisional maple to cream. Kotetsu's timber and Daruma's dark stained frontage retain their wood finish.
- Replace thirty provisional utensil/condiment solids with five supported counter groups: brown pitchers with handles/spouts/lids, stainless chopstick and condiment pots, bamboo utensils, seasoning cans, sauce bottles and original notices. The side-counter groups rotate with their counter.
- Populate the serving hatch with an extractor case, recessed baffles, lip, shelf brackets, stacked trays, containers, cookware and an upright cabinet. Positions are fitted to the existing hatch; this is not a surveyed kitchen equipment schedule.
- Add a cool under-hood fixture to the existing two-slot light pool. It adds metadata and emissive geometry, without increasing the allocated light count. Selection can retain the counter pendants until the camera reaches the hatch, so the distant kitchen remains dimmer than the photograph.
- Original notice artwork uses a 256 × 512 PNG, generated from editable SVG with generic ordering information and no price list. It uses approximately 0.67 MiB of uncompressed RGBA8 texture storage including mipmaps.

The component has 215 closed meshes, 17,664 triangles and nine material batches. It adds 801,812 bytes to the prepared station GLB; the preparation removes 780 obsolete visible triangles. Small fittings are decorative; the hood case and upright cabinet have matching native/browser collision geometry behind the existing counter barrier.

## Verification and identity

The replacement audit checks all 23,324 added vertices, oriented triangles, normals and notice UVs against the native layout. Every inherited encoded buffer byte stays unchanged. Native records outside the retired fittings, cream palette, added component metadata and hood light remain unchanged. The saved Blender source is reopened to check mesh geometry, attributes, retained panel bindings, packed artwork and lamp output.

Browser build, lossless asset and fixed light-pool tests pass. Eight native walks pass through three doorway lanes and the public aisle in both directions. Six Chrome views at 1440 × 900 show a median frame interval of 16.7 ms, no page errors and exactly two active light slots. The hood fixture activates in the close hatch view. The brief audio-clock check passes. Core runtime checks pass a 1.35 m walk, full translation/spin rest after 4.16 s, recall forfeiture and home. Receipts are retained with the component; sampled frame/audio checks are short local checks, not a full-session performance soak.

| Asset | SHA-256 |
| --- | --- |
| Layout | `ac29eed9dd6d9a0b1b460995e674826b55f330c6a4ee6aca2f015b79d9cc9b61` |
| Runtime geometry | `529632a6c0f02d6a0c7911c9a0f46de2b16771fca2973b8eebb7930a8889206e` |
| Editable source | `cea654d76741396d9963163fc3217eae04c6027cf1b85aa529779e33441b2ff0` |

Scripts: `prepare-daruma-kitchen.mjs`, `build-daruma-kitchen.mjs`, `verify-daruma-kitchen.mjs` and `install-daruma-kitchen.py` in `web/station/realism/`. Local component sources, artwork and small receipts live in `.local/v2/current/components/daruma-kitchen/`. The current scene contains the complete addition. Remove all intermediate full-station layouts, GLBs and candidate source copies after promotion.

Next: use the Kyoto photograph to correct the missing central communal table and its surrounding circulation, followed by the photographed wall fittings. The rest of the station remains in the iterative queue.

After promotion, the main preview serves the exact recorded GLB, cream counter palette and hood light with a ready native worker. Chrome gameplay controls pass entry, WASD, throwing/results, recall during flight, menus and home. Intermediate full-scene copies are removed: current bundle 672 MiB, candidate receipts/views 35 MiB, live preview layout/overlay 275 MiB, retired 4426 metadata/logs 68 KiB.
