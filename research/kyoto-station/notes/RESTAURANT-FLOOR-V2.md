# Restaurant charcoal tile floor

28 September 2026. Current restaurant floor finish, integrated into the editable scene and local v2 build.

## Research and appearance

The saved [Soul Kyoto photograph](https://soulkyoto.blog.fc2.com/blog-entry-395.html), captioned 9 February 2014 (`photos/soulkyoto-20140209kyotostation06_0326.jpg`), shows a dark polished floor with narrow tile joints and uneven reflected highlights. The original flat grey material is replaced with charcoal tiles, subtle variation and mineral grain, narrow recessed joints and varying roughness.

The 0.60 m tile pitch and 2.5 mm joints are authored estimates, aligned to the registered entrance; they are not surveyed dimensions. Four deterministic 512 × 512 maps provide color, normal, glTF roughness/metallic and the source's canonical smoothness mask. No photograph pixels or highlights are baked into those maps. Three maps are embedded in the browser GLB; the canonical mask is retained for source export.

A single 256-pixel cubemap captured inside the entrance supplies this material's reflections. It is captured once during loading and disposed with the other station probes. It adds no per-frame capture or dynamic light. The probe represents the entrance surroundings; it is an approximation farther along the corridor. The unfinished shop fronts and missing interior practical lighting still limit the room's realism and brightness.

## Verification

- The asset verifier proves every physical layout record, mesh position, normal, index, node and inherited encoded buffer byte is unchanged. One primitive receives metric floor UVs; other materials are unchanged.
- Reloading the saved Blender source confirms unchanged floor geometry, all 204 UV loops within `1.164e-6` of the intended coordinates, and exact hashes for all three packed source maps.
- The station GLB grows by 370,412 bytes with no extra geometry or draw batches. The three material maps require approximately 4 MiB as RGBA8 mip chains, plus the local reflection map; this is an estimate, not a GPU allocation measurement.
- Three Chrome views at 1440 × 900 have no page errors, median frame time 16.7 ms and p95 at most 16.8 ms. The actual floor was inspected from the entrance and facing back toward the landing. These short samples do not establish release-wide performance.
- `npm run build:web`, `npm run typecheck` and `npm test` pass. The test suite's localhost servers require normal network permission.
- The isolated native runtime test passes walking (1.40 m), translation and spin rest (4.29 s), free scoring, recall forfeiture and home. Chrome controls, full throws, recall, menus and home also pass.

## Current asset identities

| Asset | SHA-256 |
| --- | --- |
| Native layout | `f68415384402a3b79b8777f108a6417e1813aec1d1b3171e805421a93557f299` |
| Station GLB | `30ec79f3f7b50b2fbbe89647c3efe1f8080fa7be7a4c4ff5f876fdcf70b11ef9` |
| Editable Blender scene | `d02ada513cdb4444212eccc4bed34ba19ec4a1feb05ff0adc9c3af4e0dffcb92` |

The existing hardware GLB is unchanged. `web/v2/assets.json` selects the current bundle. The builder, installer and verifier are `web/station/realism/finish-restaurant-floor.mjs`, `install-restaurant-floor.py` and `verify-restaurant-floor.mjs`. They run against a parent manifest whose restaurant floor has no tile maps yet; the current source already has the finish.

The source and runtime replace their previous versions in place. The native layout remains shared between the source and station through a symlink. Small receipts remain in `current/components/restaurant-floor/`; the four small generated maps are in `current/source/textures/`. Temporary full-scene files and the stopped candidate preview's generated overlay/layout were removed at delivery. Disk check: current bundle 613 MiB, candidate receipts/views 22 MiB, live preview overlay/layout 275 MiB. The restarted main preview reports a ready native worker.
