# Restaurant practical lighting

28 September 2026. Warm light sources now follow the seven existing restaurant ceiling fixtures.

## Evidence and scope

The saved [Soul Kyoto corridor photograph](https://soulkyoto.blog.fc2.com/blog-entry-395.html), captioned 9 February 2014, shows a dark ceiling, warm downlighting, illuminated entrance frames and reflected light on the charcoal floor. The fixture meshes already in the reconstructed aisle previously had no practical light sources. Their positions are retained; color, output, range and cone angles are authored approximations. Exact ceiling fixture construction, shop displays and the distant corridor's illumination remain unfinished.

Seven downward spot fixtures are added to the editable Blender scene and its lighting metadata. Their source records use a 7 m range, 85° outer cone and 45° inner cone. The browser places the emitter just below each visible fixture and uses the existing two-light pool. Nearby lights fade out before changing position, then fade in; a 5 m viewing margin keeps illumination visible while approaching the doorway. Lower hall light color, range and cone behavior is retained.

Only two shadowless lights are active globally. This bounds rendering cost but means distant fixtures do not all illuminate simultaneously. The existing reflection capture remains static. These are current rendering limits, not a claim that the entire photographed lighting arrangement has been reproduced.

## Checks

- The installer verifies that all physical geometry, materials and other layout records remain unchanged. The browser and hardware GLBs are reused byte-for-byte.
- Reloading the saved Blender scene verifies all seven light positions, color values, cone angles, ranges, intensity metadata and the embedded layout seed.
- The focused light-pool test covers two fixed shadowless slots, upper-floor selection, authored color/range/cones, doorway viewing margin, zero intensity before relocation, restoration of lower hall settings, leaving the area and clock rollback. It is included in `npm test`.
- `npm run build:web`, `npm run typecheck` and `npm test` pass. The final selection-margin adjustment passes the focused test and Chrome verification.
- Four Chrome views at 1440 × 900 have no page errors. Median frame time is 16.7 ms; p95 is at most 16.8 ms. The audio context remained running, advancing 8.011 s during 8.013 s of wall time. This is a brief continuity check, not a long audio soak or an audible-quality assessment.
- The isolated native test passes a 1.36 m walk, full translation/spin rest (4.24 s), free result, recall forfeiture and home. Chrome controls, full throws, recall and menus pass. Geometry and existing route checks remain valid by exact record identity.

## Asset identity and reproduction

| Asset | SHA-256 |
| --- | --- |
| Layout with lighting metadata | `6d333aaf0d814544caf55e1584b137fbca9bf9c68018a8f4b4c90dfd97fa695e` |
| Editable source | `f84cd71a17f871842f0f24c5649e07992272b0fae59a68da68bee73e53075666` |
| Unchanged station GLB | `30ec79f3f7b50b2fbbe89647c3efe1f8080fa7be7a4c4ff5f876fdcf70b11ef9` |

`web/station/realism/install-restaurant-lighting.py` installs the metadata and editable lights against the preceding floor-finish manifest. Current paths are in `web/v2/assets.json`; the current source already contains these lights. Small installation and Chrome receipts are retained in `current/components/restaurant-lighting/`. The temporary source/layout and candidate preview overlay were removed after promotion; no station GLB copy was created for this task. Disk check: current bundle 613 MiB, remaining candidate receipts/views 24 MiB, live preview overlay/layout 275 MiB. The restarted main preview reports a ready native worker.
