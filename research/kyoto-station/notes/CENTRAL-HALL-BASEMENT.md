# Central hall basement routes and openings

This research extends G01/G11/G13/G17 and the [uninstalled hall passage](CENTRAL-HALL-PASSAGE.md). It adds operator route photographs, B1F/B2F maps and a reproducible city-mesh topology audit. No game geometry, physics, course definitions or deployment changed.

## Findings that affect construction

1. **Preserve three distinct floor openings.** The municipal source has two broad curved openings and a smaller oval between them. The passage07 sample only intersects their southern tips; it does not reconstruct the complete wells.
2. **Build the complete edges and descending routes together.** Source curb shapes surround the two large openings but leave their approach ends open. An oval curb ring surrounds the central opening. The oval's function is still unverified; do not replace it with an assumed elevator, staircase or solid plinth.
3. **Keep route destination separate from landing identity.** The [operator directions](https://www.kyoto-station-building.co.jp/directions/) describe descending from the central concourse to B2F, then following Porta's south area to the subway. The [July 2026 concourse photograph](../photos/hall-maeda-2026.jpg) visibly labels the nearer escalator well B1F. This can describe different stages of a route; it does not establish that the source's first lower deck is B2F. The model has no vertices below Y≈−4.995 m, so it cannot establish a deeper continuation by itself.
4. **Match visible construction details.** The [operator's entrance photo](../photos/official-basement-route-1.jpg) shows curved blue-decorated glass guards, steel top rails, black handrails, metal landing plates and tactile paving. The [lower corridor photo](../photos/official-basement-route-2.jpg) shows glazed storefronts, tiled paving, panel ceilings, downlights and linear vents. These are reference observations; exact materials, dimensions and photograph dates remain unverified.

## New resources

| Source ID | Saved reference | Use and limits |
|---|---|---|
| `official-directions` | [Operator page snapshot](../pages/official-directions.html) | Route order and named destination; image dates unlisted. |
| `official-floor-b1` | [B1F SVG](../maps/floor-b1.svg) | Northern Porta areas and a separate station-side diagram. Schematic, not a dimensioned plan. |
| `official-floor-b2` | [B2F SVG](../maps/floor-b2.svg) | Station-side Porta, Isetan, subway central gate and paired escalator symbols. |
| `official-basement-route-1` | [Entrance photograph](../photos/official-basement-route-1.jpg) | Guard, landing and tactile details; operator's red arrow is an annotation. |
| `official-basement-route-2` | [Lower corridor photograph](../photos/official-basement-route-2.jpg) | Ceiling, shopfront and floor treatment. |
| `official-basement-route-3` | [Subway arrival photograph](../photos/official-basement-route-3.jpg) | Route endpoint and wayfinding context. |
| `official-basement-360` | [Official 360° route video](https://www.youtube.com/watch?v=4q92JI4JhRM) | Embed identity verified on the operator page. Indexed only; playback not inspected. |

Both SVGs and all three photographs were individually inspected. Copyrighted operator imagery remains research-only. The complete architectural as-built set is still unavailable.

## Reproducible geometry evidence

[Plan diagram](central-hall-basement/floor-topology.svg) · [numeric topology](central-hall-basement/floor-topology.json) · [source triangle inventory](central-hall-basement/source-triangles.json).

The source is the retained Kyoto City municipal GLB, SHA-256 `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`, CC BY 4.0. Renderer coordinates are X east, Y up and Z south. All figures below are source geometry measurements, not survey accuracy.

The first stage selects 26,495 candidate triangles across 125 objects by bounding-box overlap. Those triangles are **not** clipped and may extend outside the review volume. The second stage selects upward-facing `Untitled.200` faces within 1 mm of each stated level, unions them at 10 µm computational precision, then clips their X/Z outlines to [−16,18] × [−10,3] m. Precision is for reproducibility and does not imply matching physical accuracy.

| Layer | Source Y | Faces | Clipped area | Interior openings |
|---|---:|---:|---:|---:|
| Main floor | ≈0.0366 m | 204 | 296.118 m² | 3 |
| Curb tops | ≈0.1366 m | 180 | 23.305 m² | 1 enclosed oval; two open-ended sides |
| Lower deck | ≈−4.8770 m | 16 | 157.810 m² | 2 |
| Lower landing faces | ≈−4.9269 m | 8 | 15.093 m² | 0 |

The main-floor openings are approximately 66.511 m² west, 12.865 m² central and 66.506 m² east. They plus the retained floor exactly cover the 442 m² review rectangle within the numerical tolerance. All derived polygons are valid. Two source objects, `BuildingInstallation.1541` and `.2070`, supply the paired tread geometry; their horizontal face levels are retained in the receipt. Their historical mesh does not establish current direction, speed or native motion behavior.

## Next bounded construction step

- Resolve the first landing and any deeper connection using the dated photograph, operator maps and additional route inspection.
- Reconstruct the complete wells, curbs, guards and escalator casings around the source floor openings; keep access ends open.
- Join the hall passage, main floor and supported lower landing with explicit datum decisions. Preserve the oval until its identity is supported.
- Reconcile the Balcony waypoint footprints before installation. Existing point/footprint conflicts are not an executed course failure.
- Verify exported/native agreement, support, clearance, walking and moving-tread behavior before full-station integration. Source topology checks are not gameplay checks.

The full station candidate and passage07 remain unchanged. No final visual milestone or whole-game performance result is claimed by this research.

## Reproduce

From the primary repository, run `node research/kyoto-station/scripts/audit-basement-source.mjs SOURCE.glb research/kyoto-station/notes/central-hall-basement`, then run `research/kyoto-station/scripts/diagram-basement-source.py` with a Python environment containing Shapely. The audit refuses a changed source hash. `scripts/build-index.py` verifies downloaded-source hashes and refreshes the resource register.
