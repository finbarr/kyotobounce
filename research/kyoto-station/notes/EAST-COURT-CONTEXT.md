# East Square and NIWA in the complete station

27 September 2026. **Construction candidate 03; no final visual or release acceptance.**

[Visual review](east-court-context/index.html) · [Long-term plan](../LONG-TERM-PLAN.md) · [Previous isolated assembly](EAST-COURT-NIWA-INTERFACE.md)

## Result

The photo-registered courtyard, terrace, NIWA frontage and eastern Skyway component now share a full-station candidate. All **28 normal-speed native walks** pass, with **466 floor/headroom rays**, no mismatches, no obstructions and no failed spawns. The two ramp-edge ties are verified against actual exported triangles. Minimum sampled covered clearance is 2.72 m. These tests cover the 14 declared courtyard paths in both directions; they do not prove every station route or authored course.

Both registered cameras now render unobstructed in the complete exported station and in the actual Chrome game. The camera positions, focal lengths and rolls remain unchanged. Static-viewer lighting and game lighting are presented separately.

## Evidence and construction

The geometry uses the licensed [Kyoto municipal station model](https://data.city.kyoto.lg.jp/resource/?id=21224), the existing paired [JR Central NIWA photograph](https://souda-kyoto.jp/blog/01367.html) and [Rurubu photograph](https://rurubu.jp/andmore/article/23413), and the joint registration study. The [official floor guide](https://www.kyoto-station-building.co.jp/floorguide/) still lists NIWA on 7F when checked during this pass. Floor levels, concealed seat shapes and detailed access dimensions remain construction hypotheses, not measurements from an as-built drawing.

Candidate 02 replaced displaced court, cafe, upper/lower escalator and landmark drafts with the 315-panel registered assembly. It restored the courtyard-facing municipal facade strip, removed 53 source floor faces and cut four coarse source facade faces only inside the documented cafe opening. Original installed triangulation is retained outside those cuts. The independent scope check preserved 42,449 unrelated native records and 2,421 installed source triangles.

That first full-scene candidate failed visual and spawn inspection: `east-north-lower-mass` and older facade pieces still filled the new courtyard. The unchanged reference camera was inside the draft block. Floor/headroom rays alone missed this because they began inside a solid volume; native spawn validation correctly rejected it.

Candidate 03 clips only axis-aligned `east-north-` and `east-south-` draft boxes against native-coordinate bounds X74.8–125, Y29.373377–67.1, Z−18.4–25.5. It changes 819 boxes and retains 34 outside fragments. The independent volume partition check preserves 8,030 other boxes, all non-box records and every part of the changed boxes outside the cut. The cut removes 1,969.404 m³ of obsolete draft volume. Its rectangular boundary is an explicit interface hypothesis, not a surveyed wall; fragment end faces retain draft materials and stretched UVs.

## Verification and cost

- [Full-station walks and rays](east-court-context/walking.json): 28/28 walks, 466 rays, two verified shared-edge ties, zero obstructions or spawn failures.
- [Initial installation scope](east-court-context/scope-02.json) and [draft volume preservation](east-court-context/draft-cut.json).
- [Material and attribute check](east-court-context/materials.json): all 16 component materials and nine texture maps match their effective source values. 168,930 exported vertex occurrences checked; 1,709 require triangle interpolation after coplanar clipping. Maximum surface distance 9.20 μm, UV difference 0.00000763 and normal angle 0.04964°. The check explicitly allows 10 μm / 0.00001 UV for interpolated vertices and 0.05° for Blender normal quantization; this is not a lossless-normal claim.
- [Export](east-court-context/export.json): 1,989,982 triangles, 1,874 batches and 460 materials; [optimized asset](east-court-context/optimization.json): 114,771,088 bytes. Parent inner-roof01 had 2,119,891 triangles, 1,921 batches and 117,488,244 bytes. Fewer submitted assets do not alone prove better frame times.
- 293 embedded images estimate 868.875 MiB of RGBA texture storage including mipmaps. This is a size estimate, not measured GPU allocation. Further texture budgeting remains necessary.
- Browser asset build and relevant tool syntax/diff checks pass. No service, scoring or native C# code changed.

The initial raw-ray harness incorrectly treated a rejected waypoint placement as a missing ray result; the corrected harness retains both the hit and placement-validation reason. An exact vertex/normal comparison also failed because the export creates interpolated coplanar-cut vertices and quantizes normals; the final check measures those operations explicitly. Both earlier diagnostic failures remain saved locally.

The historical tutorial replay fixture was rejected by the new layout's course check. Actual-game visual captures therefore use a fresh live native session, not that old fixture. The JR capture at 1224×816 records p95/p99 frame intervals of 17.5/17.7 ms and GPU p95 4.81 ms; Rurubu at 1200×800 records 17.6/17.9 ms and GPU p95 3.56 ms. Both have no browser errors/warnings, hidden measurement frames or skipped music steps. Each contains about four seconds of measurements. Their short timings are diagnostics only. Full campaign compatibility, runtime integration, repeated matched 720p performance trials and the 20-minute audio/context soak remain open.

## Remaining work

1. Rebuild current landmarks, furniture and vegetation at the registered levels; retired drafts are recoverable from the immutable parent, not considered completed or out of scope.
2. Finish the cafe door return and interior, sculpted terrace silhouette and documented post/beam details using both photographic views.
3. Replace coarse hotel facades with registered openings, cladding, joints and reflection detail. Complete the material and daylight rubric.
4. Reconstruct the lower 4F approach, east service/lift corridor and south connection; integrate the separately verified overall Skyway assembly.
5. Revalidate all retained routes and course identities, including the previously open Skyway Trapdoor failure, before release.

## Reproducible local state

Worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`, branch `codex/station-research`.

- Final candidate: `.local/station-realism/station-east-court-context-03`.
- Layout SHA-256: `ffbb208d172877fbcd9996b8cc692194e94375f43c61ea7f2e292638fd6e924c`.
- Blender SHA-256: `85975a61d33b36891cff6ab626c46e9c6ed8f3709cb58c0af0a05b63482a5348`.
- Browser asset: `.local/station-realism/east-court-context-browser-03/atrium.runtime.glb`.
- Runtime asset SHA-256: `1fff69b6b4887f97434cab10a0fb0e8b5bfdb2ce87b4ac45e3fc5114c1bba528`.
- Fresh native report: `.local/station-realism/east-court-installed-walk-05/report.json`.

Tools and commands are recorded in `web/station/realism/README.md` in that worktree. Research source counts remain 208 entries / 193 downloaded files. No commit, push or deployment was made.
