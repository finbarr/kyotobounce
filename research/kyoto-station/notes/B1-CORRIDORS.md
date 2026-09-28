# B1 continuous outer aisles

28 September 2026. [Before/after review](b1-corridors/index.html).

## Architectural change

The preceding study divided the area outside the escalator well into six shallow rooms. The operator's [B1 plan](../maps/porta-shopguide-2026.pdf) and [corridor photograph](../photos/porta-b2-route-03.jpg) show public circulation between the well and retail frontages. The new local candidate sets the shopfronts back and provides continuous north and south aisles. It retains the existing well portals, hall geometry, four moving lanes and underside cladding.

The aisles are provisionally 3 m wide. Shop depth remains 2.4 m and the six earlier bay widths remain provisional. These are construction assumptions, not surveyed dimensions or confirmed tenant boundaries. The pale aisle material establishes the surface distinction visible in the reference; stone texture, ceiling forms, vents, shop fit-out and lighting remain unfinished.

The aisle ends are unfinished interfaces. They still need their real Isetan, service and stair connections. This component remains uninstalled; its open ends are not a completed public route.

## Evidence and rejected hypotheses

- An audit searched all municipal mesh nodes for horizontal faces within X ±45 m, Z −35…30 m and Y −5.05…−4.8 m. The retained B1 floor occupies the existing well footprint; this band contains no adjoining outer corridor floor. This does not rule out surfaces at other heights or sloped connections. [Extent receipt](b1-corridors/source-extent.json).
- Two initial camera poses were diagnostic. One west approach was blocked by the retained end wall.
- A four-corner underside fit was rejected: maximum image residual 29.71 pixels in a 672-pixel-wide reference, camera roll −21.38°, eye-height bound active. The lower corners are partly occluded and all four points are coplanar. It supplies no accepted registration or reason to change the source bank thickness. [Rejected hypothesis](b1-corridors/rejected-camera.json).
- The [B2 section audit](BASEMENT-SECTIONS.md) still leaves the second-flight elevation unresolved.

## Verification

| Check | Result | Scope |
|---|---|---|
| Native/browser collision probes | 5,304 pass; maximum error 0.0985 mm; 25 verified shared-boundary ties | New corridor component only |
| Actual capsule walks | 16 pass | Both directions through six portals and along both aisles |
| Floor/headroom sampling | 50 locations pass | Portal crossings and aisle length |
| Independent floor interfaces | Eight floor records; maximum pair overlap 4.10×10⁻¹⁵ m² | Exact analytical floor seams, including six shop joins |
| Parent preservation | 711 non-frontage records and four moving lanes retained | Material indices renumbered where required |
| GLB/native serialization | Indices/winding agree; maximum Float32 error 1.035 µm | Complete assembly21 |
| Chrome and browser build | Before/after rendered and inspected; asset build passes | Inspection viewer, not a full-game performance result |

Assembly21 contains 834 records, 66,450 triangles, 22 materials and a 6,388,960-byte GLB. Relative to assembly20, the change adds 144 triangles, one material and 12,932 bytes. The two new aisles add 169.19322 m² beyond the previous floor area. This geometric cost does not establish a frame-time result.

## Reproduction

Worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`.

- Specification: `.local/station-realism/hall-b1-corridors-spec-01/spec.json`
- Component: `.local/station-realism/hall-b1-corridors-01`
- Assembly: `.local/station-realism/hall-descents-assembly-21`
- Build: `web/station/realism/build-hall-b1-corridors.mjs`
- Independent floor checks: `web/station/realism/verify-hall-b1-corridor-interfaces.py`
- Native walking checks: `web/station/realism/verify-hall-b1-corridor-walks.mjs`
- Gallery publisher: `scripts/build-b1-corridors.py`

No C# or service code changed. Full-station integration, all-course proof, registered visual comparisons, paired gameplay performance and the 20-minute audio/context soak remain open. No final visual milestone is accepted.
