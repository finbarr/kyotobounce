# Central Skyway and western connection

27 September 2026. [Visual construction study](central-skyway-construction/index.html).

## What changed

The new uninstalled `central-skyway-03` component connects the measured western bridge to a corridor following the registered roof axis. The bridge is extended 4.277804 m to the western boundary plane of the main roof; the corridor spans 147.687955 m to the corresponding eastern boundary. Renderer coordinates: turn (-72.691383,44.942414,-14.230713), eastern end (74.976435,44.942839,-16.669479). These are geometric construction anchors, not surveyed interior floor/endpoints. The source model does not provide a verified continuous corridor floor.

The floor is one closed mitered polygon with all three northern viewing bays. Glazed screens, rails, south low panels and vents follow the dated corridor photograph. The western connection has a continuous lofted arch; the first draft’s missing roof coverage is corrected. The official 10F map establishes topology, not metric scale. The 2.56 m corridor width, bay positions, 6 m bay widths, screen dimensions and floor datum remain provisional.

The initial 3.8 m bay projection put part of the headroom volume through the registered exterior glass. Candidate03 uses 3.4 m, keeping all three bays and their widths. Triangle/volume checks now find no exterior glass or outer framing in these audited spaces. The remaining 96/97/97 intersecting members are inner chords, diagonals and depth struts. They need purposeful opening frames and support connections; no geometry has yet been removed.

## Validation

- 290 component native/browser probes pass, including points across the new curved approach glazing. Maximum hit difference 0.000009512 m.
- 666 assembly ray comparisons pass with no native/browser mismatches. 14 bay-clearance points remain failures.
- 12/12 actual native capsule walks pass: central corridor and bridge connection, both directions on three lanes each. The first corridor trial’s 35-second deadline expired while the player was still moving near the target. The corrected deadline scales with route length; position tolerance and geometry were unchanged to resolve that harness issue.
- Current component: 2,575 closed panels /32,940 triangles /four materials. Complete five-component assembly: 28,345 panels /353,168 triangles /14 materials.
- Every serialized coordinate and triangle/winding index matches native geometry within 4.24e-6 m. Independent reconstruction yields identical GLB, native JSON and report bytes.
- JavaScript syntax, `npm run build:web` and diff checks pass. No C# or service changes.

The central corridor, western connection and obstructed north bay were all inspected in Chrome. These use component inspection lighting and unregistered cameras, so they are not photorealism or performance acceptance. The full-station game and courses have not been altered in this step.

## Current work and next step

The assembly is `.local/station-realism/roof-skyway-assembly-03`; the current clearance/walk receipt is `roof-skyway-clearance-04/report.json`. Its inputs are central roof04, western roof02, eastern roof01, western Skyway04 and central Skyway03. Maintained tools: `build-central-skyway.mjs`, `compose-roof-skyway.mjs`, `audit-skyway-assembly.mjs`, `audit-skyway-bay-volumes.mjs`, `verify-component-serialization.mjs`. `registrations/central-skyway.json` records evidence and all construction assumptions.

Next: frame the three viewing-bay openings, refine their photographed proportions, construct suspended supports and the eastern landing/descent, then integrate the roof/Skyway assembly with matching source-facade interfaces and remove the obsolete canopy. Full station routes, all authored courses, Chrome performance and runtime must then be checked. The complete long-term objective remains active; no final visual milestone, commit or deployment is implied.

The visual study passes Chrome checks at 1440 and 390 px: six images (including the generated plan), twelve valid links, no overflow or page errors. Its desktop rendering was visually inspected.
