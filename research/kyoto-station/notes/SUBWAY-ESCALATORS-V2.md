# Subway platform escalators

29 September 2026. Add the four missing upward lanes between the subway island platform and the South, Central 2, Central 1 and North gate halls.

## Evidence and construction

The [city's Kyoto station page](https://www2.city.kyoto.lg.jp/kotsu/tikadia/menu0221.htm) links the K11 diagram dated 7 August 2026. The saved `maps/subway-kyoto-plan.pdf` was rendered and inspected: it shows an upward escalator beside each of the four platform stairways. The diagram establishes the connections and direction. It does not provide surveyed widths, rises or casing dimensions. The saved `photos/subway-platform-nesnad-2022.jpg` supplies platform finish context but no close-up measurement of the escalators.

Each fitted lane rises five metres from the current Y−11.2 m platform to the Y−6.2 m concourse. The lanes use the existing hall escalator chassis, 0.985 m tread width, 1.234 m flat landings and a fitted 8.932 m sloping run. Each chain has 70 steps and runs upward at 0.5 m/s. Its eased closed path is shared by the browser, native physics and editable Blender animation.

The existing six-metre stairways become four metres wide, with relocated western handrails, retained intermediate landings and cropped tactile strips. Narrow solid dividers close the space beside the stair treads. Stainless pits and comb plates meet the moving lanes. Glass balustrades and black handrails follow the slope. The concourse deck, platform ceiling and platform floor have exact openings for the new hardware; decorative floor joints are clipped away from the lower landing pits.

All dimensions and lateral placement are fitted approximations. Passenger lifts remain missing. The city identifies a platform lift through Central 1 and onward lifts toward Exit 5, Porta and Hachijo. Operating cars and doors require additional native support; these escalators do not complete the accessible routes.

## Rebuild and verification

Run `prepare-subway-escalators.py` against the parent manifest, followed by `prepare-east-transfer-base.mjs` with its `spec.json`. Build against that prepared base using `build-subway-escalators.mjs`, compose with `web/v2/compose-component.mjs`, then run `integrate-porta-motion.mjs`. The shared motion integrator now accepts the component's own architecture key and spawn while preserving earlier motion metadata.

`verify-porta-geometry.mjs` checks exact retained data and matching added browser/native vertices and normals. `verify-subway-escalator-openings.py` checks the three floor/ceiling cuts, cleared decorative joints and all 120 stair treads. `verify-porta-motion.mjs` compares the real browser tread geometry with an independent native box oracle at 80 phases. `verify-subway-escalators.mjs` uses the real native worker to walk onto each lane, ride its complete slope without input, then walk onto the upper floor. `verify-east-transfer.mjs` checks the retained stairs and both platform aisles in both directions.

`inspect-subway-escalators-chrome.mjs` examines all four lower landings, upper landings and riding views in actual Chrome. It first visits the views to upload materials, then checks resource stability during a second visit. The first test caught six first-use texture uploads between views; after warming those views, texture count stays at 366 and reflection captures at seven. All four tread instance sets change with time. No page errors were recorded. Short overlapping frame samples at 1440×900 have a 16.7 ms median and 16.8 ms p99; these are not a sustained performance benchmark.

The independent motion comparison passes 128,000 samples, with maximum height error below 0.000001 m and continuous comb-to-comb tread coverage. All four native idle rides travel more than eight metres along their slopes, remain grounded and finish on the concourse. The 24 retained-stair and platform-aisle walks pass with 4,437 position samples and grounded endpoints. Browser walking, full throw/rest, recall, menu and home checks pass. `npm run build:web` passes.

The component retires 212 old panels and 3,704 browser triangles. Its 1,235 replacement/additional panels contain 42,596 triangles and match the native export. Retained station buffers and the original 26 escalator records stay unchanged. The composed browser asset gains 3,585,312 bytes and ten static material batches. No lights or texture images are added.

`install-porta-connection.py` installs the component using its own prefix and Blender collection name. The scene saves and reopens with matching geometry, materials, retained bindings and all four new operating chains. The integrated source hash is `3efa5a8974976b67a163371de64f00f333a6dd156bd0ac1a229bd676a091e190`.

Private verification and delivery receipts live under `.local/v2/current/components/subway-escalators/`. The current asset hashes are pinned in `web/v2/assets.json`.

After promotion, the main local runtime passes a 1.35 m walk, full translation/spin rest at 13.65 s, free exploration results, recall and home. Its entry is beside the Central 1 stairs at X172.3, Y−11.2, Z−1.8. The worker reports ready. The current source and playable assets were replaced in place, and 1,250,513,621 bytes of superseded candidate scenes, layouts and the stopped preview overlay were removed.
