# NIWA frontage and entrance construction 06

27 September 2026. [Two-view comparison gallery](niwa-frontage-construction/index.html). This is a provisional isolated component; full station inner-roof01 and furnished court03 are unchanged.

## Geometry and evidence

The component adds the fitted planter, recessed gravel, lower walkway and drain, a raised landing with two stair flights, timber posts/feet/beams/joists/fascia, framed main glazing, and shallow service-counter/back-wall geometry. It has 148 closed parts, 2,768 vertices, 1,816 triangles and eight materials. The GLB is 461,428 bytes (0.44 MiB); three embedded original wood maps have a 4 MiB decoded RGBA8-with-mips estimate.

The planter follows [joint registration01](NIWA-FRONTAGE-REGISTRATION.md): 1.581252 × 1.499397 × 1.193254 m, base Y30.807027 and top Y32.000281. The proposed landing is Y31.60, reached by six 0.132162 m risers with 0.4 m going. These step dimensions, landing height, flight widths, timber member sections, rear posts and seventeen glazing bays remain hypotheses. They do not constitute an as-built survey. The gallery uses both exact joint cameras, without warping the images. The full surroundings are intentionally absent from the component renders.

## Verification

- Fresh component-only native audit: 1,816/1,816 sampled triangle hits pass, maximum point error 0.00001629 m, zero failures.
- Fresh normal-speed native traversal: both flights in both directions pass (4/4), 20 sample points and 40 rays, no mismatches, ties or obstructions. Minimum sampled covered headroom is 2.815 m. The test covers the outside landing, not cafe interior access.
- Single-component assembly serialization: all 2,768 vertices, triangle indices and winding agree, maximum coordinate error 0.00000736 m. Eight material definitions, 1,472 textured vertices and all three embedded images are preserved.
- Independent repeat build produces identical GLB and native collision bytes. Both Chrome renders show eight draw calls and 1,816 triangles; these counts do not establish whole-game frame timing.
- Browser asset build and tool syntax/diff checks passed. The construction gallery is checked at 1440 and 390 pixels; the QA receipt is saved beside this note's gallery.

The copied walking report uses the reusable courtyard verifier's generic meaning text. For this run its pinned assembly and route hashes refer only to this NIWA entrance; it does not test the entire courtyard or Skyway.

## Retained failures and corrections

Initial native probes found overlapping stair volumes and a duplicate timber surface. Each stair block now occupies only its own tread interval; the upper fascia meets the supporting beam without overlap. Service-counter glazing frames now start above the counter rather than duplicating buried base surfaces. Collision tolerances were not relaxed.

Initial traversal routes attempted to stop on individual tread centres, where the capsule spanned the next riser. The final routes traverse continuously between clear landing points while preserving both original endpoints. Subsequent ray samples landed exactly on riser edges, and overly distant upper waypoints made the verifier's interpolated floor-height profile disagree with the real stair. Moving intermediate checks to the clear lower and upper landings resolved those fixture errors. All earlier failures and build snapshots remain under the local working directory; final06 has its own fresh passing evidence.

## Artifacts

Maintained builder: `web/station/realism/build-niwa-frontage.mjs`; native verifier: `web/station/realism/audit-niwa-component.mjs`. The existing assembly composer now accepts a single explicitly selected component as well as multiple inputs.

- Component: `.local/station-realism/niwa-frontage-06/`.
- Assembly: `.local/station-realism/niwa-entrance-assembly-06/`.
- Component GLB SHA-256: `82552176665213ebcfcadbf69dd0c486286700fd93a1de4da941910eee3f4031`.
- Native panels SHA-256: `8c7f9f71a0e8a0c2730277b0dc37c0adb71e4c3dea1e9d88af730972a584aaab`.
- Assembly GLB SHA-256: `b58740fe83463de02487ab23a8f2f451696b30be9d2c41854ba4f3a502720f4d`.

## Next bounded step

Refine the visible roof/post/glazing profile and complete the terrace/planter details, then join the lower walkway and raised entrance to the provisional courtyard and seat geometry. Keep those interfaces together when revising levels. Remaining public connections must also be completed before replacing the old full-station slab. Materials, lighting, planting, all remaining photographic targets and the final runtime/performance gates stay open. Nothing was committed, pushed or deployed.
