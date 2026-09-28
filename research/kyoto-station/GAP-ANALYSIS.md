# Kyoto Station: what the game still needs

Research date: 26 September 2026 (downloads recorded in UTC on 27 September). Baseline: commit `47f98c6`, assets-v7. This is a new fidelity audit, not a reopening of the completed K033–K056 detail checklist.

## Main conclusion

The next large gain will come from making the existing architecture convincing and completing the exterior setting. Many named landmarks are already modeled. Adding another layer of generic props before fixing proportions, surface response, planting and street context would give poor returns.

Evidence: fresh [current-model contact sheets](current-model/sheet-1.png), the [second sheet](current-model/sheet-2.png), source code and layout metadata, compared with [operator photographs](https://www.kyoto-station-building.co.jp/service/square/), [structural engineer photographs](https://www.kanebako-se.co.jp/works/view/240), [published architectural sections](architecture/world-architecture-045.png), and [Hachijo completion documentation](plans/hachijo-completion.pdf). Cameras are not photograph-matched; these are qualitative findings, not measured geometric errors.

Status: **Upgrade** = already represented; **Incomplete** = visible coverage or documented scope is insufficient; **Verify** = evidence supports a research task, not a claim that the object is entirely absent. P0 is foundational, P1 is high visual impact, P2 follows the main spaces, P3 is optional.

## Prioritized gaps

| ID | Priority / status | Work needed | Evidence and current-model comparison | Observable acceptance |
|---|---|---|---|---|
| G01 | P0 / Upgrade | Establish defensible station scale, floor datums, roof profile and wing proportions. | `docs/STATION-REFERENCE-AUDIT.md` explicitly calls dimensions interpreted; published sections and site plan now collected. | Register drawings and at least 12 photo cameras; publish anchors, residuals and uncertainty before moving structural geometry. |
| G02 | P0 / Incomplete | Restore verified municipal context and integrate its boundaries. | A complete source audit found no municipal geometry in the pinned station despite stale layout metadata. The retained northern city source and station shell have been recovered into local candidates; Hachijo is still incomplete. | Adopt only matching visible/collision exports after route, facade-seam, resource-budget and gameplay checks; complete southern coverage from registered evidence. |
| G03 | P0 / Upgrade | Daylight exposure, indirect light and plausible contact shadows. | Hall, West Square and Skyway captures have dark uniform surfaces compared with varied reference lighting. Different photo exposures mean this is an appearance finding, not a lux measurement. | Same-camera daylight/overcast references show readable shade, grounded objects and retained highlights. |
| G04 | P0 / Upgrade | A measured material palette: distinct stone, concrete, painted steel, stainless steel and glazing. | `station-materials.js` uses authored procedural grain; current columns and floors read as broad flat color regions. Engineer and operator close-ups reveal much more surface variation. | Consistent metric texture scale, correct joint layout, roughness and edge response in close and distant views. |
| G05 | P1 / Upgrade | North exterior: facade module sizes, recessed portals, angled glazing, balcony depth and hotel/department-store differences. | [North elevation photograph](photos/structure-594.jpg), [facade detail](photos/structure-595.jpg), published elevations versus `north-exterior.png`. | Silhouette, recesses and window rhythm agree in three exterior views. |
| G06 | P1 / Incomplete | Karasuma forecourt and bus terminal: bay islands, shelters, access mouths, crossings, queue areas and bus-stop furniture. | Current [JR map](maps/jr-west-plan.pdf), operator forecourt images; layout explicitly lists unfinished fixtures/markings/planting. | Model a coherent forecourt from station doors to the opposite street edge, with current bay positions checked against dated imagery. |
| G07 | P1 / Incomplete | Hachijo entrance and forecourt: long facade, covered pedestrian links, raised terrace, stairs/lifts, taxi and bus zones. | [Municipal completion brochure](plans/hachijo-completion.pdf), [facility map](plans/hachijo-municipal-brochure.pdf), sparse `south-exterior.png`. | Continuous southern facade and public approach, checked in an aerial view and two pedestrian views. |
| G08 | P1 / Incomplete | Nearby city frontage and skyline, particularly Kyoto Tower and its base building, Shiokoji street frontage, post-office side and southern blocks. | [Tower access guide](https://www.kyoto-tower.jp/access/), municipal model catalogue and outward views. Confirm each footprint before authoring. | Recognizable, correctly oriented surroundings from forecourt, Skyway and roof; nearby entrances at pedestrian detail, distant blocks simplified. |
| G09 | P1 / Upgrade | Glazing reflections that contain the actual station and city in the chosen lighting state. | Source inspection confirms three existing station-geometry reflection probes. Evening mode retains daytime captures; new city geometry and distant parallax still need review. | Preserve the existing probes while validating reflected direction, context and night appearance at selected views, without full-scene captures every frame. |
| G10 | P1 / Upgrade | Canopy connections: weld/bolt plates where visible, bearings, glazing bars, seals, gutters and edge transitions. | [Construction photograph](photos/structure-1660.jpg), [roof node photograph](photos/structure-596.jpg); current canopy reads as repeated uninterrupted members. | Structural junctions agree with references at close inspection; distant repeated details use cheaper representations. |
| G11 | P1 / Upgrade | Grand Staircase and escalator finishes: worn edges, side casings, brushed metal, comb plates and realistic glass rails. | Current installation/stair capture and operator staircase photographs; moving escalators already exist. | Realistic close-up transitions and uninterrupted escalator animation, with native contact behavior retained. |
| G12 | P1 / Upgrade | Roof-garden planting: fuller canopy, layered beds, varied leaves, soil/mulch and natural boundaries. | `add-garden-arrival/edge` show sparse repeated bamboo and flat green beds; operator garden images show a much fuller landscape. | Match planted mass and shade in two roof views; consistent chosen season; controlled alpha overdraw. |
| G13 | P1 / Upgrade | Public interiors: column band proportions, ceiling grilles, polished floor response, storefront depth and door thresholds. | Existing hall/passage/West Square captures and venue-manual interior photos. These spaces are present. | A complete, convincing route through hall → free passage → West Square, with coherent materials and lighting. |
| G14 | P2 / Upgrade | East Square furniture and planting accuracy, including gazebo, piano and display-case finish. | Existing gazebo/tree/piano/miniature package versus operator close-ups. | Improve detail and arrangement from evidence; preserve rather than duplicate existing landmarks. |
| G15 | P2 / Upgrade | South Promenade and Wood Square: parapet texture, paving modules, wall joints, turf edges and street/rail views. | `add-promenade3f-west`, `add-wood4f-turf`, official photos and railway layout. | Both ends connect visually and physically; outlook contains the appropriate context. |
| G16 | P2 / Upgrade | Stone Museum: individual samples, labels, stone joints and its forecourt setting. | Existing shelters present, but isolated in the captured plaza; [sample close-up](photos/square-img_stonemuseum_02.jpg). | Each close inspection has distinct authored stone appearance and believable mounting; correct shelter placement. |
| G17 | P2 / Upgrade | Signage and service details: correct sign supports, ticket machine recesses, lockers, tactile junctions and threshold hardware. | Authoritative rail maps and current floor guides; many facilities already represented. | Check spatial identity first, then model visible hardware; avoid using diagram reference numbers as physical signs. |
| G18 | P2 / Upgrade | Shopfront visual depth and contemporary tenants. | Current floor guide plus existing retail packages. Interior contents are intentionally authored. | Date every tenancy reference; improve only publicly visible areas supported by photos. |
| G19 | P2 / Incomplete | Visible rail environment beyond public routes: platform canopies, track beds, overhead equipment and bridge views. | JR West/JR Central/Kintetsu maps and platform panorama; complete railway platforms excluded from previous scope. | Convincing views from public spaces; retain paid-area boundaries and avoid turning this into a railway simulation. |
| G20 | P2 / Incomplete | Street finish library: asphalt patches, curb returns, road paint, tactile islands, drain covers, bollards, signal poles, tree pits and bicycle parking. | Hachijo city photographs; `northForecourt.limits` explicitly records unfinished details. | Place each fixture type from a location reference; coherent paving/curb seams; no invisible gameplay obstacles. |
| G21 | P2 / Upgrade | Night lighting hierarchy: warm interiors, cool exterior sky, signage brightness and limited light spill. | Existing original installations and night references. | Three evening comparison views retain readable architecture; animations remain smooth and are original or licensed. |
| G22 | P3 / Optional | Ambient life: small numbers of pedestrians, buses/taxis and distant trains. | Photographs show activity absent from static captures; multiplayer avatars already exist. | Add only after architecture meets budgets; no blocked shots, crowd simulation or traffic system implied. |
| G23 | P3 / Optional | Wet-weather material variant. | Dated rainy-night video lead; insufficient inspected evidence for implementation yet. | Acquire matched wet references, then verify reflections and surface response without adding persistent frame stalls. |

## Already present — improve, do not recreate

The 22 prior detail packages include the two Heart-in locations, mapped retail frontages, Porta/Isetan entrances, Central Gate services, the north–south passage, West Square, theatre arrival, South Promenade, Wood Square, East Square landmarks, upper-floor restaurant/shop entries, garden planting, Skyway hardware, six Stone Museum shelters and original evening installations. Their existence is supported by the current source and inspected renders. The new problem is fidelity and coverage.

## Important limits

- Exterior captures justify an incomplete-context finding, not a claim that every municipal building is missing from all source assets.
- Current model counts are in [inventory.json](current-model/inventory.json). Tens of thousands of authored entries are not evidence of visual accuracy or a rendering budget.
- The published drawings are historical, scanned and small. Full dimensioned as-built CAD/BIM and a current photogrammetric station scan were not obtained.
- Public-area photos often have unknown capture dates and strong color grading. Resolve conflicts with current maps and dated walks before changing geometry or shops.
- Scope assumed for planning: station, both plazas and immediately surrounding street frontages; farther city is visible context. A larger walkable neighborhood is a separate extension.

## Reconstruction follow-up — 27 September

The source audit and local candidate work refined G02 and G09 above. Execution evidence lives in the isolated worktree at `web/station/realism/README.md`. Recovered municipal textures reveal outer-wing forms, but they remain too blurred for close inspection, and their joins expose disagreements with the existing plain central facades. The north-facade source comparison now has eleven registered landmarks within the image-alignment tolerance; the other fourteen target views remain pending. This registration does not establish that the game geometry passes the visual rubric. The current research library is not a claim of completed visual reconstruction.


The eastern roof interface candidate now resolves the imported frontage overlap and passes local native/gameplay checks. The [actual-game review](notes/east-roof-interface/index.html) identified retained `east-north-roof` and `east-north-upper-backing` geometry for source registration. The subsequent [eastern opening review](notes/east-roof-opening/index.html) records their removal from both visuals and native collision after section/intersection checks and published drawing inspection. This advances G01/G05/G10. The new curved outer envelope does not make the full roof complete; inner structure, Skyway, materials and lighting remain open.

The [Skyway construction audit](notes/SKYWAY-CONSTRUCTION.md) refines G01/G10/G13: the official 10F schematic has three northern viewing bays; dated photographs distinguish the western arched bridge from the central truss-enclosed corridor and eastern escalators. A source-anchored bridge component passes isolated collision and capsule tests; two conflicts with the existing canopy remain. This component does not resolve central/eastern metric registration or accept a visual milestone.

The [central roof integration](notes/CENTRAL-ROOF-INTERFACE.md) advances G01/G10 by replacing the imported roof interfaces and inserting the registered outer envelope. It also exposes an explicit G13 dependency: the retained Skyway and old roof bank now make Skyway Trapdoor unsolvable with its authored hint. Preserve that failed course evidence while reconstructing the coordinated roof/corridor assembly; the other thirty authored solutions remain unchanged.

## Hall detail and lighting follow-up

The [recent detail and original lighting review](notes/CENTRAL-HALL-LIGHTING.md) refines G03/G04/G10/G11/G21. July 2026 imagery shows deep upper-bay returns that the city mesh flattens. LPA’s historical publication and gallery establish selective lighting and intentional shadow; a uniform brightness increase would not address that gap. The winter mirror diagram depicts an abandoned proposal and is excluded from built-state evidence. No new hall camera or final visual milestone is accepted.

## First representative hall construction

The [gate and upper-bay component](notes/CENTRAL-HALL-CONSTRUCTION.md) advances G01/G04/G11 with actual returns, open frames, original stone materials and matching native geometry. Its 6,444 component probes pass. It remains uninstalled and visually unfinished; no broad hall camera, final material/lighting milestone, surrounding route or gameplay gate is accepted by this component check.


## Basement route research follow-up

The [basement evidence review](notes/CENTRAL-HALL-BASEMENT.md) refines G01/G11/G13/G17: preserve the three source floor openings, reconstruct complete curbs/guards and paired escalator descents, and connect the lower public route. Official directions name B2F as the destination, while a July 2026 photograph labels the nearer well B1F. First-landing identity and the central oval remain unresolved; the city model stops above −5 m and cannot define a deeper continuation. These are integration dependencies for the representative hall area, not permission to invent an underground layout.


## Complete well openings and guards

The [hall well construction](notes/CENTRAL-HALL-WELLS.md) advances G01/G11/G13 with a complete three-opening floor, source-derived curbs/glass/caps, 13,620 passing isolated native probes and eighteen walks. It remains uninstalled. Moving descents, well lining, lower landings, glass finish and the affected course supports remain unfinished; these are required before integrated station proof.

## Basement evidence update — 28 September

[Official route photographs and current tenant plans](notes/BASEMENT-ROUTE-UPDATE.md) resolve the first descent as B1F, followed by a return descent to B2F. G13/G17/G18 must include open lower retail portals, distinct floor finishes and the 2025-renovated frontage; hidden dimensions remain unverified.

## B1 circulation correction

The [continuous outer aisle study](notes/B1-CORRIDORS.md) advances G13 by replacing six disconnected recesses with two connected public aisles and set-back shopfronts. Sixteen native walks pass. Widths and tenancy boundaries remain provisional; aisle-end connections and B2 remain unfinished. This is a local construction candidate, not accepted photographic reconstruction.
