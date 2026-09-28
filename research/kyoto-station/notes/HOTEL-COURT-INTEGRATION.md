# Courtyard hotel facade: full-station integration

27 September 2026. Local hotel component08 / full station03. [Open actual-game comparisons](hotel-court-integration/index.html).

## Result

The registered hotel wall above NIWA is installed in the full Blender scene, browser asset and native collision layout. It replaces the same bounded municipal wall patch used in the [registration study](HOTEL-COURT-FACADE.md): 39 recessed windows, ceramic cladding and an upper glass band. Both registered cameras have fresh actual-game captures. Final photographic appearance remains unfinished.

Existing JR Central and Rurubu photographs remain the references; no new downloads or catalogue entries were added. The research library remains 208 entries / 193 downloaded source files. Window sizes, recesses, tile scale and hidden lower rows retain the uncertainties in the registration study.

## Installation boundary

The installer clips only two source panels inside the registered wall boundary. It retains 32,527 other native panels exactly, along with every other native record and existing material. It adds 796 panels and nine appearance materials. Of the component panels, 556 collide and 240 small details are decorative. The two source panels retain their non-facade triangles exactly.

An independent Shapely check compares original and replacement polygon coverage. Removed projected area is 1,196.966137048 m². Maximum outside-coverage difference is 0.000201 m² and remaining inside-patch coverage is 0.000057 m² per panel, within the recorded 0.001 m² floating-point boundary tolerance. Component positions differ by at most 7.460 micrometres after Float32 serialization. This is bounded numerical precision, not an exact real-world survey.

## Export correction

The first two installed exports failed the existing material verifier at cut vertices on plain metal mullions. Their unused texture coordinates became sensitive to Float32 interpolation. The final component uses a common local UV origin for textured ceramic and omits unused coordinates from its seven untextured materials. Collision geometry and physical materials are byte-identical across these revisions; no verifier tolerance was relaxed.

The final material check passes nine materials and 35,739 exported vertex occurrences. Effective texture channels match; maximum UV error is zero, maximum normal angle is 0.02990 degrees, and maximum interpolated position distance is 7.630 micrometres. Normal quantization remains within the existing 0.05-degree limit. Repeat construction reproduces the final component bytes.

## Runtime and geometry evidence

- **28 courtyard walks pass**, covering 233 points / 466 rays at normal speed, with zero obstructions, mismatches or failed spawns. Two documented shared-ramp edges remain; minimum covered clearance is 2.72 m.
- **84 installed facade rays pass**, including all 39 window panes and 45 cladding fronts. Maximum browser/native position difference is 0.01836 mm. Decorative upper panes are outside this check.
- Walks and facade rays ran on installed01. An exact comparison proves final03 preserves all native records and physical materials, plus the ordered expanded browser triangle positions, normals and material names. Only UV attributes and architecture provenance changed. The final material check covers those UV revisions.
- **All twelve runtime scripts pass across the main run and resumed tail**, using installed02, whose native records also equal final03. Coverage includes entry/restoration, tutorial, open starts, reconnection, score parity, selected campaign routes, overlapping waypoints, partial completion, concurrent replay reads, fast-forward, level design and rapid recalls. This is not the full 31-course acceptance proof.
- The first attempt correctly rejected the old catalog's layout references. A private candidate catalog changes only its layout field, preserving course identities, revisions, routes and scoring rules. The later main run passed its first seven scripts, then the waypoint-completion harness looked for its database in the wrong directory. The remaining five scripts passed with the explicit private `KYOTO_TEST_DATA_DIR`. Both logs are retained; this was not a single uninterrupted green suite.
- `npm run build:web` passes. No native C# or authoritative service/scoring code changed in this integration.

The earlier **Skyway Trapdoor** failure remains unresolved and is not covered by this selected-course runtime suite. Full campaign compatibility, final visual acceptance and long-term performance gates remain open.

## Chrome inspection and cost

Fresh native final03 sessions and matching final03 browser assets were captured in Chrome153 on this laptop's Apple M2 / Metal renderer, with music running. The cameras are unchanged from the previous courtyard study.

| View | Drawing buffer | Frame p95 / p99 | GPU p95 | Draw calls |
|---|---|---|---|---|
| JR | 1224 × 816 | 18.7 / 18.8 ms | 5.42 ms | 65 |
| Rurubu | 1200 × 800 | 18.5 / 18.8 ms | 4.18 ms | 48 |

Each measurement is about four seconds. Both record zero browser errors/warnings, hidden frames and skipped music steps. These are diagnostic observations, not the paired 720p gameplay benchmark or 20-minute audio/context soak. Historical parent captures were around 17.6 ms p95; the new short results are higher by about 5–6%. Different capture times and such short windows cannot establish whether that regression is repeatable. A controlled repeated comparison is required before accepting the performance milestone.

| Full browser asset | Parent context05 | Hotel03 | Change |
|---|---:|---:|---:|
| Triangles | 1,995,271 | 2,007,202 | +11,931 |
| Material batches | 1,876 | 1,885 | +9 |
| Materials | 462 | 471 | +9 |
| Images | 293 | 298 | +5 |
| Optimized bytes | 114,985,940 | 115,308,888 | +322,948 |
| Estimated decoded RGBA + mipmaps | 868.875 MiB | 875.542 MiB | +6.667 MiB |

The exported image count includes separate metal/roughness images for the two ceramic materials. Texture memory is an estimate, not a measured GPU allocation. No new real-time lights were added. The substantial total texture footprint remains an optimization concern.

## Current artifacts

All generated artifacts are local under the isolated reconstruction worktree's `.local/station-realism/`.

- Component: `hotel-court-facade-08`; GLB SHA `3206a8e8862a7560b74bfa4d9a4b7b609922a020bdb184614c62f7ffb1c8ad6d`; native SHA `c158f15bc30eb92ec92512cb693a50254ed976ef1415615ed0ea215211ff0f34`.
- Full scene: `station-hotel-court-03`; layout SHA `73f718001db52caaaa3d5d0c6a03337f81db041cb93b9deb1ecbcffbcbfde8a0`; Blender SHA `38f3cf72cae479b066753f697ab882d3f0e4b1a91ef001260674ba6638a8f3ee`.
- Browser: `hotel-court-browser-03`; raw SHA `495a79159899de54dc677e4a7f3a821155fbac5bac2d5eb58234d241e3c9a001`; optimized SHA `849063b40739ac0f2118d310d092f908a305da9df2ce93cf20ad222e4f4320ec`.
- Captures: `hotel-court-game-jr-03` and `hotel-court-game-rurubu-03`.
- Maintained construction, scope, ray and runtime-workspace helpers are in `web/station/realism/`; its README records the commands.

The gallery passes Chrome checks at 1440 and 390 px: four images, seventeen local links, working before/after selection, no overflow or page errors. Both gallery screenshots and both game images were visually inspected. This pass’s temporary servers and workers are stopped; pre-existing local test servers remain unchanged.

## Visual findings and next bounded work

The wall openings and ceramic finish are sharper and have geometric depth. Glass is still too flat/dark; several pale panes need reference-led optical treatment. The perpendicular wall, foreground tower and equipment enclosures retain blurred source textures, and the cafe corner, terrace forms, planting and furnishings remain incomplete. Reconstruct those prominent adjacent surfaces from registered source evidence, then improve material/light response with a repeated performance comparison.

The thirteen remaining view registrations, representative central-hall bay, public routes, both plazas, nearby frontages, vegetation/evening and final runtime/performance gates remain part of the active goal. This local integration is not a final photorealism milestone or deployment.
