# Kyoto Station reference audit — September 12, 2026

Compared navigable interior imagery, operator photographs and an operator plan
document with the deployed `assets-v3` station (`3741821`, layout `485daa6d…`).
The main remaining gap is the building's architectural detail: patterned stone
walls, recessed service bays, layered columns and roof-edge furniture. The roof
lattice, balcony forms, shop, garden and plaza landmarks already exist.

## References actually inspected

### Navigable interior photography

- [360Cities internal atrium photosphere](https://www.360cities.net/image/kyoto-station),
  Creative Office Haruka, December 18, 2014. The spherical viewer loaded without
  login and was rotated to inspect the atrium facade, roof and western stairs.
  It is one verified internal viewpoint, not a verified linked walking tour.
- Google Street View interior coverage was opened from Kyoto Station's
  **Street View & 360°** entry. Its floor selector and panoramic rotation worked.
  All four inspected positions are labelled **February 2017**:

| View | Panorama ID | Observed features |
| --- | --- | --- |
| [1F west concourse](https://www.google.com/maps/@?api=1&map_action=pano&pano=fx-nt8QKKxR0HkRNsB6MCQ&heading=199&pitch=0&fov=75) | `fx-nt8QKKxR0HkRNsB6MCQ` | Stone floor joints; dark granite column courses with pale upper cladding; recessed ceiling fittings; vending alcove and framed notices. |
| [4F Grand Staircase foot](https://www.google.com/maps/@?api=1&map_action=pano&pano=0hqITqL5gioKY5ew0GPwYw&heading=199&pitch=0&fov=75) | `0hqITqL5gioKY5ew0GPwYw` | Rose/brown stone wall panels, red projecting panels with square openings and round outlets, inset windows, stair riser light cassettes and edge drainage. |
| [8F west landing](https://www.google.com/maps/@?api=1&map_action=pano&pano=vpmMem9fO3NSn1uUmXkuTg&heading=120&pitch=0&fov=75) | `vpmMem9fO3NSn1uUmXkuTg` | Tiered stair/landing geometry, cladding courses, glass/metal guards and the relationship to the lower plaza. |
| [Roof terrace](https://www.google.com/maps/@?api=1&map_action=pano&pano=lhZp1gVzWpWBfGNqgiDslw&heading=199&pitch=0&fov=75) | `lhZp1gVzWpWBfGNqgiDslw` | Diagonal metal guard infill, large paving slabs, bamboo beds and yellow circular shelters on columns. |

These dated images establish visible architectural references. They do not
establish today's tenant list or a surveyed transform into the game's coordinates.
Temporary advertisements, event stages and queue barriers are not permanent detail.

### Primary sources and plans

- [Kanebako Structural Engineers: Kyoto Station](https://www.kanebako-se.co.jp/works/view/240)
  provides atrium/roof photographs and the structural grid dimensions. Its
  photographs show the depth of the spaceframe and the alternating pale panels,
  rose stone, dark glazing and projecting bays on the opposite facade. The
  stated 1.44 m structural module does **not** prove every stone slab uses that
  dimension. Existing in-game joint dimensions remain an authored approximation.
- [Station operator: photographed routes and 360° videos](https://www.kyoto-station-building.co.jp/directions/)
  supplies central-gate, escalator and public-passage views. Inspected photographs
  corroborate panelized columns, overhead structure and the relationship between
  the central concourse and 2F. Embedded 360° videos are listed by the operator;
  they were not played or treated as surveyed coverage in this audit.
- [Operator plaza manual, 2025 edition](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/eventspace/pdf/manual.pdf)
  was downloaded and rendered locally. Printed pages **9, 14 and 19** were
  visually inspected: Muromachi Square/stairs and their side routes; the 2F
  north end of the north–south passage beside the open cafe; and West Exit Square.
  Photographs show permanent column/ceiling treatments behind temporary exhibits.
  The plans help register circulation, but their shaded event areas are not walls.
- [JR West station plan page](https://eki.jr-odekake.net/premises?id=0610116)
  identifies a January 31, 2026 plan and links the
  [interactive 3D map](https://3dmap.jrnc.jp/JRW/mobile/#/kyotoja/).
  The map is not photography. The direct PDF returned 403 during this audit;
  it is not claimed as a visually inspected drawing.

All downloaded images and document renders stay in ignored local reference
storage. No source photograph pixels or third-party geometry enter the game.

## Comparison with the current model

Inspection used the final full-game hall/garden/approach captures, canonical
layout, GLB node/material inventory and the hardware generator. Absence of a
descriptive object name alone is not proof of missing geometry: exports batch
many objects by material and region.

| Area | Present in the model | Confirmed mismatch or next verification |
| --- | --- | --- |
| Atrium structure | Dense canopy and wall lattice; curved/projecting balcony fascia and substantial cafe/terrace volumes. | Retain the structure. Facade relief and contrasting material fields need a registered bay comparison, not a replacement roof. |
| Stone floors | Existing 9.6 m atlas with an 8 × 16 tile pattern and normal map. | Retain its UV-authored joints. Filtering at grazing angles should preserve them; do not add a conflicting square grid. |
| Main stone walls | Large `Granite - plain draft` surfaces receive mineral grain but no slab courses. Pale cladding has a very faint procedural seam. | K032 addresses course readability and filtering on explicitly selected materials. |
| Grand Staircase | Flights, nosings, cassettes, escalator hardware and supported landings. | The photographed rose stone fields, red perforated service panels and recessed facade bays are not represented with comparable detail. |
| Covered concourse | Ceiling coffers, circular practical fittings, frontage volumes, gates and station signs. | Column banding, linear grilles, alcove equipment and small service fittings remain simplified. Existing lights must not be duplicated. |
| Roof garden | Supported access, bamboo/planting, benches, lamps and a guarded deck. | The current generic glass guard and sparse paving differ from the photographed diagonal rail and terrace detail. Registration must distinguish garden edge from surrounding building glazing. |

## Bounded jobs

The queue uses these IDs. K032 and the expanded K034 ground-floor pass are deployed; K033, K035 and K036 remain queued. Each geometry owner must work in a separate branch/worktree and
submit a standalone editable layer with a matching collision proposal.

**K032 — Stone courses and floor-map readability.** Own `station-materials.js`.
Preserve the existing floor atlas, tactile geometry, stair/nosing textures and
authored fixture palettes. Add restrained, filtered courses to the untextured
stone surfaces; no physical displacement, new collider, lighting pool or geometry
revision. Acceptance: full-game near/far inspection and moving camera review,
stable resources, browser build and no shader errors. This is a finish improvement,
not completion of the facade geometry jobs below.

Result: integrated as `8a3438d` and deployed in the September 12 pass. Syntax and browser build checks passed. Real
Chrome loaded the full game/native worker without console errors; the floor
pattern, tactile path and facade remained intact. A separate actual-shader
inspection compared baseline/candidate at 4 m and ran continuous orbit at 4 m
and 30 m. Joints remained restrained and became appropriately faint at distance.
Full-game sustained walking was not verified because pointer lock was blocked;
the static game check and controlled shader motion are distinct evidence.
No geometry, native worker or asset-pack revision changed.

**K033 — One south facade / stair-wall bay.** Start from the 4F Street View
position, the internal photosphere and engineer photographs. Audit the existing
`concourse-cafe-*`, facade and stair-side surfaces before choosing the exact bay.
Author rose stone fields, red service-panel relief, square recess arrays and
proper window returns where observed. Do not assume the outlet function from
its shape. Acceptance: a reference-matched wide view and close view; no floating
skin or coplanar overlap; matching substantial collision; retain all stair routes.
Extend to adjacent bays only after the first bay is registered and reviewed.

**K034 — Ground-floor concourse detail.** Deployed. Current operator retail
references and the 1F panorama informed the east shopfronts, vending/ticket
machines, locker/service edge, notices and bilingual artwork. Exact shop-to-model
transforms and service fixture positions are inferred within supported existing
geometry. The result does not claim a measured replica of the old photosphere.
See `web/station/concourse/README.md` for the reference register and native checks.

**K035 — One covered concourse column/soffit module.** Use the 1F panorama and
manual printed page 14. Refine the existing column's dark/pale stone bands,
ceiling slot grilles and inset fittings. Keep existing coffers and the two-light
pool. Acceptance: correct column-to-soffit relationship, intentional material
breaks, no duplicate lights or flickering overlays, and moving gameplay views.
Use that accepted module only in corroborated repeats.

**K036 — Roof terrace edge and landing furniture.** Match the roof panorama to
the current garden boundary and retained level datums before altering geometry.
Prioritize diagonal guard infill, supported paving/drainage detail and yellow
circular shelters in their observed relationships. Do not remove building
glazing merely because a different roof edge has open railings. Acceptance:
matched skyline/near-edge views, preserved garden access and native ball/walking
contacts across every changed guard, shelter support or landing.

These are finite additions. No new tenant, public route, stair contour or opening
is inferred from a single occluded photograph. A geometry change requires a new
matched asset revision and preserved historical bundles before publication.

## Evidence locations

- Local reference photos and rendered plans: `.local/round-two-20260912/references/`.
- K032 source/render receipt and four captures: `.local/round-two-20260912/k032/`.
- Detailed panorama observations: `.local/round-two-20260912/panorama-research.md`.
- Prior accepted game captures: sibling `kyoto-render-integration/.local/render-integration/`.
- Fleet preservation and deletion: `.local/fleet-retained-20260912/cleanup-receipt.json`.
- Latest completed deployment: `.local/ground-floor-20260912/deployment/production-check.json`.

The September 12 ground-floor and connection build is deployed. The game is pre-launch; historical bundles and compatibility migrations have been removed.
