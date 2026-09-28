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
