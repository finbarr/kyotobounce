# Central hall: recent detail and original lighting intent

27 September 2026. [Visual reference gallery](hall-lighting/index.html). This extends the research evidence; it does not accept a camera registration or change the station candidate.

## Sources inspected

- **July 2026 concourse photograph:** [MaedaAkihiko's original file page](https://commons.wikimedia.org/wiki/File:JRW_Kyoto-STA_Central-Inside.jpg), [local image](../photos/hall-maeda-2026.jpg), 2665 × 1777, CC0 1.0 declared on the file page. The visible upper bays have substantial side walls and returns, stepped stone fronts, recessed glazing and deep openings. The municipal model compresses much of this into textured faces. Its vertices cannot define finished construction on their own.
- **November 2019 roof/bay photograph:** [Another Believer's original file page](https://commons.wikimedia.org/wiki/File:Interior_of_Kyoto_Station_in_Kyoto,_Japan_(2019)_-_100.jpg), [local image](../photos/hall-believer-2019-100.jpg), 4000 × 3000, CC BY-SA 4.0. Useful for corbels, glazing returns, roof depth and suspended bridge relationships. Historical signs do not establish current tenants.
- **Original lighting publication:** Kaoru Mende + LPA, *Lighting Design for Urban Environments and Architecture*, Rikuyosha, **30 May 2005**. [Local PDF](../architecture/lighting-design-station.pdf), PDF pages 21–22 / printed pages 66–69. Publication date comes from PDF page 2; the 2017 PDF metadata and 2024 upload folder are different dates. Both complete Kyoto spreads were visually inspected, including text and diagrams.
- **Designer project gallery:** [Lighting Planners Associates](https://www.lighting.co.jp/en/projects/kyoto-station-building/), [saved page](../pages/lighting-lpa-project.html). Five architectural photographs were inspected individually; the illustration and concept model were inspected in a contact sheet. Exact capture dates are unlisted. These document the historical 1997 project, not present-day lamp specifications.

## What the original design establishes

The publication describes a north-facing roof supplying diffuse daylight, black granite concourse flooring, and selective 150 W metal-halide spotlights below the elevated walkway. Ambient lighting addresses the trusses and ceiling. The photographs show directional floor highlights and strongly differentiated bright and dark surfaces.

The winter section is a **discarded proposal**: mirrors were intended to redirect daylight, but tests with the actual glass failed to produce the desired effect. It must not be modeled as an installed system. The colored circles and rays on printed pages 66–67 are a lighting concept diagram, not a measured floor plan or current fixture inventory.

## Consequences for the representative bay

These are implementation decisions inferred from the references, rather than specifications supplied by the lighting designer:

1. Resolve the gate wall, upper-bay recesses and stone returns before tuning materials. A flat photographic surface gives incorrect parallax and cannot supply the visible edge shadows.
2. Build a material sample containing pale stone, rose stone, dark stone, metal framing, glazing and joints. Judge scale and roughness at close range and normal walking distance. A photographed green cast does not establish green paint.
3. Preserve intentional shadow while keeping navigation and the ball readable. Compare the contrast between floor, bay interiors, ceiling structure, glass and exterior sky; increasing global exposure alone is insufficient.
4. Separate daylight from evening verification. Test local indirect light and a bounded set of light contributions; measure GPU cost before expanding across the station. This evidence does not justify many shadow-casting spotlights.
5. Use recent references to verify fixture placement, signs, retail fronts and temporary equipment. Do not reproduce historical lamps, advertisements or crowds as current facts.

## Camera-study status and reproducibility

The two earlier portrait fits remain rejected as recorded in [the geometry study](CENTRAL-HALL-BAY.md). The new west-escalator and July 2026 studies have **initial poses only**, with no accepted correspondences or residual proof. Camera metadata is a starting estimate; the 2026 image records Photoshop Express processing, so crop and calibration remain uncertain.

Worktree evidence:

- `.local/station-realism/central-hall-second-view-01/`: initial western view and revised diagnostic pose.
- `.local/station-realism/central-hall-maeda-01/`: initial 1200 × 800 pose and source-vertex suggestions.
- `project-source.mjs` now accepts optional `pickObjects` to restrict suggested vertex identities. It does not remove objects from rendering or visibility rays. Default selection remains unchanged.

Next measurable step: independently identify gate and upper-bay features across the new images, verify their source identities and visibility, then resolve the large wall/opening discrepancy. A source-only fit is insufficient if the actual bay depth is flattened in the source mesh. Do not move uncertain observations or relax the 2% threshold to obtain a pass.

The current full station remains courtyard life04 / browser04. No game, collision, native worker, service, scoring or production change was made in this research pass. Full reconstruction, photographic acceptance and complete Chrome/gameplay checks remain open.

## Collection limits

The 2006 mezzanine photo's provenance page is saved, but the original image returned HTTP 429. It is not counted as downloaded or visually inspected. No complete as-built CAD/BIM set was obtained. Research copies retain source rights; the LPA images and publication are not game texture assets.

## Verification

The regenerated library verifies all 215 downloaded source SHA-256 hashes across 231 catalogue entries. The new gallery passes Chrome 153 checks at 1440 and 390 pixels: all 11 images and 15 local links load, with no horizontal overflow, page errors or failed requests. Both screenshots were visually inspected. The comparison tool’s optional source-object filter produces an identical camera, render statistics and image hash while narrowing vertex suggestions from 230,265 to 11,626. No game runtime or performance claim follows from these research checks.
