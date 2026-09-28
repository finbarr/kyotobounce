# Hall floor physics and clipping correction

28 September 2026. [Route comparison and evidence gallery](hall-physics-integration/index.html). This supersedes the unresolved floor-clipping status in the [candidate04 integration note](HALL-FULL-INTEGRATION.md).

## What changed

The private final native candidate is now **station-hall-basement-05**, with matching **hall-basement-browser-05**. Its hall floor uses the original concourse's registered `granite` physics response. The prior `floor` key was absent from `StationWorld`'s material table and silently fell back to `stone`, changing rebound and friction. Ten new basement floors now name `stone` explicitly, retaining their previous effective response. One uninstalled upper-floor sample also receives that explicit alias.

Every triangle, normal, UV, surface ID, visual material, image, moving lane and other physical field is retained. Only the hall floor's effective physical response changes. Component builders now emit recognized names, and the installer rejects unknown physical keys before opening Blender. No C# change or worker rebuild was needed; fresh isolated workers loaded the revised layout.

## Floor export audit: resolved

The earlier whole-union Hausdorff metric compared topological boundaries that differ through microscopic Float32 slits. Increasing its threshold would not establish correct geometry.

The replacement [independent audit](hall-physics-integration/clipping.json) reads every floor source triangle and the clip masks from Blender. GEOS independently subtracts the masks. Each result must have no missing or excess area beyond two coordinate ULPs, with a two-micrometre minimum, and satisfy its area bound. The final GLB's oriented triangle positions must exactly match the traced fragments.

**252 native source triangles, 320 emitted triangles and all 14 clipped source triangles pass.** The three audited source objects are the concourse, eastern recess floor and curved mezzanine stone. Both original and corrected-material candidates pass. Original failed diagnostics remain available; this is a more appropriate geometric check, not a widened Hausdorff threshold or a geometry edit.

## Course repair remains necessary

All 74 full-radius placements were rerun against the exact candidate05. The same 16 rejections and four changed surface identities remain across six courses.

Pillar Carom initially looked like a surface-ID-only repair. A private revision rebinds `bank-3` to `hall-bay-floor-surface`, leaving every target coordinate, radius, normal, hint, start and scoring rule unchanged. The strict campaign verifier now permits this change only when a hashed native placement receipt supports the exact new surface and current layout.

Actual throws reject that repair:

- Before integration, the original shot collects all three targets and makes the required pillar bank, finishing at full physical rest.
- After the material correction, both repeated authored shots and the nearby yaw input finish at rest but collect **zero targets**.
- The authored shot hits `hall-bay-well-glass-oval` at **4.222 seconds**, at native `(0.0538, 0.7505, 3.4784)` metres. The first five contact locations differ from the old route by at most about 2.04 mm; the new guard then redirects it.

![Paired native route traces](hall-physics-integration/route.svg)

The surface-only repair is therefore **not accepted**. The real well and glass guard remain. The course needs a source-compatible route that retains its pillar-bank identity and difficulty; deleting the guard or reducing the course to an easier nearby toss would not satisfy the goal. No canonical course or score was changed.

## Verification and appearance

- Fresh candidate05: all 35 basement support/headroom checks and ten return walks pass.
- All 191,286 installed attributes and 17 materials pass source comparison; unrelated 1,900 batches, 304 images and 489 material definitions remain preserved.
- The regenerated browser export differs from candidate04 only in one **unused UV channel** on the untextured charcoal soffit. JSON, used geometry attributes, materials and image bytes remain exact, and the game's material classifier applies no UV-dependent treatment there. The existing static construction screenshots remain representative; no new visual improvement or FPS result is claimed.
- Private motion metadata and runtime packaging are regenerated for the current layout. Original course definitions remain unmodified in that runtime workspace; the failed repair is kept separately as diagnostic evidence.

## Final identities

- Native layout: `47693cafa1aa635c6ceb88cedc1794a1d53fff612ba022661a4c5b6d986ff341`.
- Raw browser GLB: `3dcd94e590b4f3f910f64dad916be8d9dae7dc52b3e076ab1cd96daf9993b29d`.
- Runtime GLB: `3c08c23032f7f2f1a12f34e3e0f0497844e4e756fc8a866c8fdce43de0210c5c`, 122,594,084 bytes.
- Derived motion/detail metadata: `cb230e8ccb3277e2ca8c921a3ee38ff52fbe9bced5d78ecb915a3f042f145819`.

## Remaining work

Reconstruct the six affected course routes and prove complete shots, then finish the hall/gate interfaces and defensible B2 geometry. Shopfront dimensions, materials, lighting, the remaining station/plaza/street reference views, vegetation, all-course/runtime gates and the full Chrome gameplay/audio soak remain open. The candidate is local and unaccepted; nothing was committed or deployed.
