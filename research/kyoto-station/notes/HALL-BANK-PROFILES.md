# Central hall: source escalator profiles

28 September 2026. [Comparison gallery](hall-bank-profiles/index.html) · [Previous descent construction](HALL-DESCENTS.md).

## Result and limits

Both paired escalator banks now use the municipal source's handrails, shaped glass, body and metal supports. Component11 has 85 closed records, 45,266 triangles and a 2,279,828-byte GLB, versus 63,576 triangles and 2,542,124 bytes in component02: 28.8% fewer triangles and 10.3% less GLB data. The full game has not been benchmarked with this component.

This remains an isolated, uninstalled construction candidate. Materials, lighting, well walls, lower architecture and the first lower deck's B1F/B2F identity remain unresolved. Source curves are visibly faceted. The full station remains courtyard life04/browser04. No final visual milestone, commit or deployment.

**Floor interfaces fail the separate audit:** retained source plates overlap the upper floor by 0.00010449697 m² and lower floor by 0.01083038454 m². Exact footprints are saved in [floor-interface-audit.json](hall-bank-profiles/floor-interface-audit.json). Reconcile both visual and native floor outlines next, preserving three upper openings and two lower holes. Passing movement tests does not resolve those overlaps.

## Source and construction

Municipal GLB SHA256: `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`. Source triangle inventory SHA256: `1965c3845f76d5e0405d14dc7fc62f8a4030305a14f3016cf1cf822d0a84cebe`. Source geometry is credited to Kyoto City under CC BY 4.0; no survey accuracy is claimed.

West source objects: handrail1354, glass1372, metal1927, plates1601, treads1541, body1460. East: handrail1657, glass1760, metal1917, plates1471, treads2070, body2066. Each glass object contains seven sides; the eighth 62-face side belongs to its adjacent metal object. Opposing profiles and bilateral correspondence identify that material boundary.

- Preserve 3,404 original rail/glass/body triangles exactly after a −0.018263 m datum adjustment that aligns source landing plates with the game floor. Close open material interfaces at original boundary vertices.
- Clip each metal core into three lateral regions around the working lanes. Exact triangle-plane clipping and constrained triangulation preserve the remaining original surfaces. Do not infer source precision from the numerical test tolerances.
- Replace 56 coarse rail/glass/skirt records with 12 source-profile records. Replace four landing infills with eight remaining closed pieces after subtracting the source plates. A 1 nm computational snap separates a numerically touching vertex; maximum infill coverage difference is 2.685e−9 m².
- Preserve 65 other parent records and every moving mechanism, speed, phase and comb transfer. All 590 hall11 records remain unchanged.
- Share vertices only when position and Float32 normal are identical; retain the established 30° normal crease. This deduplication changes no rendered corner or collision triangle.

## Verification

- [Source proof](hall-bank-profiles/source-proof.json): original faces exact; 28 metal sections pass. Maximum area difference 2.095e−7 m² and boundary difference 9.215e−8 m, under unchanged 1e−4 m² and 1e−5 m limits.
- [Closed geometry](hall-bank-profiles/geometry-proof.json): all 85 records closed and positive volume; 4,904 return-chain corner checks per lane.
- [Serialization](hall-bank-profiles/serialization-proof.json): indices and winding agree; maximum Float32 position error 0.536 µm.
- [Motion](hall-bank-profiles/motion-proof.json): 128,000 samples over 80 phases; maximum height error 0.241 µm and join error 0.909 µm, under unchanged 10 µm limits.
- [Native runtime](hall-bank-profiles/native.json): assembly10 passed 324 support/headroom points, 24 through walks and four standing rides. Final11 was produced afterward by exact deduplication. [Equivalence proof](hall-bank-profiles/dedup-proof.json) checks all 135,798 native and browser triangle corners, metadata, materials and mechanisms. This is not a direct native run on11.
- Actual Chrome close and overview renders inspected. `npm run build:web`, syntax checks and Git diff whitespace checks passed. No C# or service changes; no worker rebuild required. Browser gallery QA passes at 1440 and 390 px: three images, all local links, no overflow or page errors; desktop capture inspected. All 221 source download hashes verify. Both native worker logs have no open handles, and the gallery browser/server are stopped.
- No complete-station course acceptance, photographic registration acceptance, full-game frame-time result or twenty-minute audio/context soak is implied.

## Retained failed approaches

The initial Blender EXACT trims produced negative volume or open meshes. MANIFOLD trims produced closed geometry but failed independent source sections, with up to 0.002446 m² area and 10.995 mm boundary discrepancies. Assigning unique face materials or changing section fill from parity to oriented winding did not fix them. [Failed receipt](hall-bank-profiles/rejected-boolean-proof.json) remains available. Exact triangle clipping solved the discrepancy without changing tolerances.

Longitudinal end cuts crossed self-intersecting source plate boundaries. The final construction uses lateral lane cuts and subtracts retained flat plate coverage from infills. One trial infill had a duplicated point separated by floating-point noise and was rejected as open; precision cleanup yielded eight closed pieces. Floor-to-plate overlaps are a separate unresolved issue, retained above.

## Reproduction and identities

Worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`. Tools are in `web/station/realism/`. Intermediate and binary assets are local-only under `.local/station-realism/`.

Construction chain: `prepare-hall-bank-profiles.py` → raw `hall-bank-profiles-spec-02/spec.json`; `clip-hall-bank-metal.py` → `hall-bank-profiles-spec-08/spec.json`; `trim-hall-landing-infills.py` → `joins-02.json`; `build-hall-descents.mjs` → component11; `compose-roof-skyway.mjs` → assembly11. NumPy, SciPy and Shapely 2.1.2 are required by the Python tools. `trim-hall-bank-metal.py` is retained as a rejected diagnostic pipeline.

The shared mesh helper's default behavior was also checked: a rebuild of old descent02 produced byte-identical GLB and native output.

| Artifact | SHA256 |
| --- | --- |
| Component11 GLB | `1b9207244c944443640be5290a78db490278d8a006fb6297a6ddc3f287fef235` |
| Component11 native | `4b736d614f6c2f731d7fd76de5a1f14d12e300b03e4b8685b6832a23128f521d` |
| Assembly11 GLB | `5b893d74c712d8db7832d8168e92072f62ff0d4c7250a46461548f22048b17c9` |
| Assembly11 native | `8a2d4ad8c418b4028c471570a0af82ca61de82a2c4d6060e0c96391bdb33a13c` |

## Next connected work

1. Reconcile retained plates and upper/lower floor boundaries in visual and collision exports together.
2. Establish the lower route from operator maps, photographs and source geometry; build well lining, ceiling and retail architecture without inventing a deeper B2 continuation.
3. Reconcile Balcony waypoints before hall installation, then adjacent gate/roof interfaces and integrated runtime/course/performance checks.

The broader station, plazas, street frontages, materials, lighting and vegetation milestones remain active. Do not spend another construction turn on minor rail finish while these connected spaces remain open.
