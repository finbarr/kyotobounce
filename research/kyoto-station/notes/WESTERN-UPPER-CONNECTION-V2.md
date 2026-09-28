# Western upper connection: measured discrepancy

28 September 2026. This is an investigation checkpoint for the unfinished landing-to-plaza connection. No station geometry changes are accepted by this note.

## Current native geometry

Layout SHA-256: `03f075a5406af5f283cff979304e0398c5ad2ad6a50195016f3e102cdaee2055`.

`audit-west-upper-connection.mjs` casts 136 downward rays: X from −48 to −80 m at 2 m intervals, Z at 18, 10, 0 and −5 m, and origins at Y=16.2 and 23 m. It records the native hit even when waypoint placement is rejected. The complete private measurements at `.local/v2/checks/west-upper-connection/report.json` contain both successful and unsuccessful placement responses (SHA-256 `ab88f22bfef8ba0f8499d306f97237fbb267e281551e4fa83a7ac8bb3c790b74`). The table below keeps the decisive samples in Git; the report can be regenerated with the checked-in probe.

At Z=0, rays from Y=23 find:

| X (m) | Hit height (m) | Surface |
| --- | --- | --- |
| −50, −52 | 15.614658 | Source-derived upper landing |
| −54, −56 | 0 | Ground concourse |
| −58, −60 | 19.585964 | Inherited Muromachi Square |

The two elevated floors differ by **3.9713 m**. The lower ray origin starts beneath the inherited plaza and therefore hits ground there; those low-ray hits alone do not establish a missing floor. The four sections do not rule out an alternate route elsewhere. Current-game Chrome views also show the disconnected masses; captures remain private under `.local/v2/candidate/current-views/`.

Reproduce with an isolated native worker:

```sh
node web/station/realism/audit-west-upper-connection.mjs \
  .local/v2/current/station/station-layout.json \
  .local/v2/checks/west-upper-connection
```

## Reference evidence and its limits

- The operator's [Muromachi Square plan](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/eventspace/pdf/drawing_muromachi.pdf) shows the plaza, northern descending bank, adjacent stairs and southern approach. The newly fetched file is byte-identical to the existing traced copy at `tmp/pdfs/phase2/muromachi-plan.pdf`: SHA-256 `bfbd2424826dd3fb90aef6a0303cf1d00befb86c7ab5a65128cf6b33be1c3925`. The duplicate download was removed. Plan dimensions establish local scale; they do not establish the shared model origin or floor height.
- The [operator's 4F guide](https://www.kyoto-station-building.co.jp/floorguide/4f/) locates Muromachi Square on 4F. Existing source notes identify the northern connection to 2F. The guide is schematic, so its endpoint coordinates must not be treated as surveyed positions.
- The [operator's square description](https://www.kyoto-station-building.co.jp/service/square/) currently gives 171 steps and a 35 m height difference for the Grand Stairway. The inherited builder uses a 30 m rise over 171 main steps, plus a separate inferred roof continuation. Resolve the endpoint/count convention before changing every riser from this number alone.
- The municipal model supplies the new upper landing at 15.614658 m. Its selected interior object ends near X=−53 m. Other horizontal patches in the coarse exterior object have not been identified as the same plaza floor; their elevations do not resolve the join. The source GLB has no node transforms that explain the discrepancy. Source SHA-256: `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`.

`tools/build_layout.py` derives the inherited plaza height from a 45.2 m Skyway constraint and 146 inferred risers of 30/171 m. Its horizontal offset is also explicitly inferred. These are construction assumptions, not measured anchors that the new landing must preserve.

## Continue this task

Establish the correspondence between the plan's northern arrival bank, the source upper landing and the plaza edge using a view that includes all three. Then replace the affected plaza/stair/facade connection coherently, with matching visual and collision geometry. Check a complete walk from the upper escalator exit onto the plaza and first Grand Stairway flight in both directions, then inspect the installed game in Chrome. An arbitrary connecting ramp would conceal the unresolved placement rather than follow the reference architecture.

No additional full-scene export is needed for this investigation. Keep the current playable bundle until the corrected candidate passes those checks.

## Registration and floor candidate

The next pass found a useful correspondence in the coarse municipal exterior. Its curved lower landing boundary at approximately 14.5974 m can be fitted to the dimensioned first-stair contour without changing plan scale. The source boundary has a side-route notch; the fit bridges that notch and its endpoint correspondence remains a modeling assumption.

`prepare-west-plaza-v2.mjs` now reproduces the fit from the original GLB vertices and current layout. In native X/Z coordinates it rotates by −6.08545 degrees and translates by `(2.96050, 5.92016)` m. The resampled contour residual is 0.3515 m RMS, with a 0.7060 m maximum. These residuals describe agreement between models, not survey accuracy.

As a separate check, the transformed plan's northeastern plaza corner lands 0.3667 m from the source upper landing's northwestern corner. That corner was not part of the contour fit. This supports the correspondence, but does not establish the stage, sculpture, side-bank or upper-storey positions. An exploratory comparison of the second flight still showed roughly metre-scale departures from the coarse landing boundary; do not apply this transform blindly to every upper floor.

The small floor candidate uses the interior upper landing's 15.614658 m finished height. The exterior boundary is about 1.0172 m lower, so shared floor height is an explicit construction choice. The east side of the candidate extends to the interior floor's straight cut edge, with up to 2.9346 m of added width. This hidden join is inferred. The original 0.35 m slab thickness is retained; the finish is temporary.

Candidate: `.local/v2/candidate/plaza/`, 312 triangles and one material batch. Its closed mesh has positive volume. Browser/native serialization agrees within 3.79 micrometres. `verify-west-plaza-join.mjs` exercises the isolated candidate, current upper floor and its guards at Z=−4, 4 and 16 m, in both directions. All six walks pass; the fixture and reports occupy under 0.5 MiB together with the component. No new full-station copy was created.

This floor is **not installed**. The running game still uses the committed bundle. Continue by coordinating the first Grand Stairway flight and attached landing/facade/guard geometry with this floor, then reconcile the onward route before promotion. Reuse this candidate and its recorded fit; do not repeat the source search or generate another complete station for an isolated seam test.

## Coordinated candidate and current integration issue

28 September, continuation. The single private candidate now includes the plaza,
all fourteen Grand Stairway flights, their shared landings, eight northern
escalator lanes, attached guards and western facades. It uses the recorded rigid
plan registration. Heights are interpolated between the source approach, plaza
and retained 45.2 m Skyway datum; the upper flight allocation remains an explicit
construction assumption, not a new survey result.

Reproducible implementation:

- `prepare-west-connected-layout.mjs` coordinates the collision records.
- `install-west-connected-layout.py` rebuilds the corresponding editable meshes,
  retains unrelated authored objects and incorporates the previously appended
  NIWA and stair-guard components into the source scene.
- `tools/build_atrium_detail.py` regenerates the complete hardware from that
  layout; `prepare-west-connected-motion.mjs` preserves the component transfer
  contracts and packages its delivery GLB.
- `verify-west-connected-source.py` compares saved panel topology and rotated
  box corners with native records and rejects duplicate native bindings.
- `verify-west-grand-stairway.mjs` exercises the source upper approach through
  every Grand Stairway flight in both directions.

Current private receipts:

| Item | Evidence |
| --- | --- |
| Candidate native layout | `26250ce9fa86725d7baf1319c2abfb6819a3529d624f16b752885d7d5429ea74` |
| Saved Blender scene | `243448ba2a027bdab0924f535331d6c544071aebbe3032cdd32baece512a2984` |
| Browser delivery GLB | `46acb8668c8f1ad00da8355a2ea35e0ed32c5b47cf324134b63547f6dba00975` |
| Hardware delivery GLB | `30a66ac3bd020082731d57c2c7b8b4cd6e7f681b494d527ecc84159adbf02b61` |
| Source comparison | 309 panels, 3,626 boxes; maximum corner error 0.0000142 m; exact panel triangle order; 46,020 unique native bindings |
| Native traversal | Uphill 766 samples, downhill 767 samples; both pass, maximum sampled height deviation 0.182 m |
| Gameplay runtime | Configured spawn/home, 1.38 m walk, full translation and spin rest, unsaved exploration result and recall forfeiture pass |
| Chrome | Three fixed views, zero page errors; median frame interval 16.7 ms, sampled p95 at most 16.8 ms; brief views, not a long performance soak |

The local review runs through `.local/v2/candidate/assets.json` on port 4426.
The committed main asset manifest still selects the previous playable bundle.
The candidate is **not accepted or merged into that bundle**.

The upper-door inspection established a concrete remaining break. A native ray
line perpendicular to the relocated 10F doorway hits the stair landing at
45.2 m. At 2–20 m beyond the doorway it hits `west-south-floor-07` at 40.33665 m,
then finds the old `skyway-circulation-floor` at 45.2 m at 22 m. This is a sampled
4.86335 m drop behind the doorway, not proof about every possible alternate
route. The Chrome doorway view agrees with the missing connection. Detailed
rays and views are in `.local/v2/candidate/upper-interface.json` and `views/`.

Continue this same task by integrating the already researched western restaurant
and bridge component described in [WESTERN-APPROACH.md](WESTERN-APPROACH.md),
reconciling its stair threshold and central Skyway endpoint with matching physics.
Also check the southern lower approach and remove or update stale western route
and datum metadata. Reuse the source, registration and candidate; do not restart
reference collection. Main promotion requires those connected routes and the
complete browser/runtime checks to pass.

### Shorter build cycle

A one-second sample of the slow Blender process found its main thread spending
all samples inside `Text.write` / character insertion while embedding a 247 MB
single-line layout. Loading the same file with `bpy.data.texts.load` let the
candidate save successfully. The installer also uses a set for created-object
membership and resolves repeated beam IDs using their actual geometry rather
than stale ID-only indices. Render-only fixtures keep their meshes without
invented colliders. The browser exporter now excludes zero-area source triangles
before attribute interpolation, using its existing output-area threshold.
