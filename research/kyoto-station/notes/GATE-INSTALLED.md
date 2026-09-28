# Gate architecture installed in a private full station

28 September 2026. **Construction candidate; active game assets are unchanged.** The assembled facade and passage now replace the duplicate old bridge in a complete Blender/native/browser station.

## Same-camera comparison

### Before

![Preceding full-station candidate](gate-installed/before.png)

### After

![Gate architecture installed in the complete station](gate-installed/after.png)

These are actual Chrome captures at identical camera settings, using studio lighting. They show the changed opening, stone courses, blind recesses, soffit and single glazed bridge. They are not registered photographic acceptance views. The old barrier bank, departure boards, offices and adjacent shop fronts remain temporary. Missing railway scenery is visible beyond them.

### Inside the bridge

![Bridge interior in the complete station](gate-installed/inside.png)

The bridge is now present in the full scene. Its materials are preliminary, and its short end landings still need continuous connections into both wings. The photographed slender supports and detailed sign suspension must be reconciled with the proposed bridge position; removing the old misplaced supports is not completion of the new structure.

## Exact change scope

The candidate adds 598 component records. It retires 165 old panels, two portal boxes and 48 authored lights: the former bridge, railings, glazing, supports, old portal returns/soffit and attached light fixtures.

All 34,970 retained panels, 8,062 retained boxes and 48 retained lights are identical to the preceding layout. Both `concourse` and `hall-bay-floor-surface` are unchanged. Routes, moving escalators and other top-level station data are also unchanged. No course, score or native C# code was edited.

The installer removes fixtures and their corresponding lights together. New fixture meshes are emissive; final photometric lighting is still unfinished.

## Verification and limits

| Check | Result |
| --- | --- |
| Installed gate attributes | All twelve materials and 22,434 retained/clipped export vertices match source geometry, normals, UVs and effective texture channels |
| Packed material maps | All eighteen exported masks retain their metallic/roughness channels |
| Existing textures/materials | All 310 previous image byte streams and 503 retained material definitions are exact; three unused old materials disappear |
| Full-station native support/headroom | All 54 sampled locations pass |
| Native walking | Six bridge/lateral walks pass; three long ground routes remain blocked at the retained gate equipment |
| All authored course placements | 166 disks checked before and after; zero changed results; the same 31 existing failures remain |
| Existing private Pillar/Locker repairs | Four authored and two nearby-input throws clear, all at full translation-and-spin rest |
| Chrome static views | Before, after and bridge interior captured without page errors and visually inspected |
| Browser build and helper syntax | Pass |

The unchanged placement results do not prove unchanged trajectories. The separate six throws cover the two repaired private courses only. The full campaign, real-browser gameplay and audio/performance soak remain open.

## Texture-profile correction and asset cost

The first export accidentally used original municipal maps, including 4096-pixel images, rather than the preceding candidate's 1024-pixel derivatives. That produced a 172.9 MB delivery asset. It remains a rejected intermediate artifact.

The corrected export applies the existing derivative profile, checking each original image hash before replacement and preserving every geometry buffer. Full-resolution authoring sources remain intact. All 310 preceding image streams now match exactly. The six new maps belong to the gate materials. This restores the preceding profile; it does not establish that the provisional municipal resolution is sufficient for final close-up street views.

| Complete station asset | Before | Candidate |
| --- | ---: | ---: |
| Triangles | 2,234,498 | 2,228,965 |
| Material/spatial batches | 1,919 | 1,921 |
| Materials | 506 | 515 |
| Images | 310 | 316 |
| Lossless delivery bytes | 122,594,084 | 123,382,972 |

The delivery increase is 788,888 bytes, about 0.64%. These are asset counts, not measured FPS or GPU time.

## Next construction

1. Rebuild the photographed barrier bank, offices and sign suspension in a coherent position relative to the bridge. The old eleven-barrier bank and its roughly 22 m recess remain estimates, not accepted source geometry.
2. Resolve both bridge-end connections and the supporting structure with the surrounding wings; retain uncertainty in unmeasured elevations/depths.
3. Complete adjacent paid-concourse scenery and remaining upper facade connections.
4. Repeat affected native routes/throws and inspect actual game lighting/performance before accepting the milestone.

The wider station, both plazas, immediate streets, B2, remaining courses and all fifteen final reference comparisons remain unfinished. No commit, push or deployment occurred.

## Evidence

[Installation scope](gate-installed/scope.json) · [Native walks, including failures](gate-installed/walks.json) · [All-course placement comparison](gate-installed/course-placements.json) · [Six native throws](gate-installed/course-throws.json) · [Gate attributes](gate-installed/attributes.json) · [Texture parity](gate-installed/texture-parity.json) · [File hashes](gate-installed/manifest.json)
