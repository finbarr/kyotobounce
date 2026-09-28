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
