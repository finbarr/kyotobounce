# Skyway viewing-bay framing

27 September 2026. [Before/after study](skyway-bay-framing/index.html).

## Evidence and construction

The official 10F schematic and dated 2014 photographs establish three open northern viewing spaces beneath inclined glass. They do not establish their exact widths, positions, support sections or fabrication. The central corridor remains provisional. The construction intentionally preserves the registered exterior envelope and records its inner framing as a hypothesis, not structural engineering validation.

`central-roof-bays-04` replaces 386 intersecting inner members with 231 retained fragments, 36 perimeter frames and 188 ties. All 231 interrupted member endpoints connect to saved frame/tie meshes. Forty-three redundant tie requests share existing longer members. Every one of the 3,155 outer-grid/glass panels is unchanged; 21,547 parent panels are identical overall.

The front headers use the full 100 mm tube envelope when locating them beneath the sloped glass. Independent checks find a minimum 0.0666597 m vertical gap and no complete surface intersections. Bottom-frame tops meet the provisional 160 mm deck underside. The chosen dimensions and load paths need further photographic refinement.

## Results

- Native component: 1,210/1,210 collision probes pass, including exact surface IDs; max position difference 0.000373734 m.
- Isolated assembly: 666/666 floor/head rays agree, 333/333 route points clear; all 36 native walking trials pass (6 corridor, 6 approach, 24 bays).
- All three audited bay volumes contain zero roof members. This checks the declared clearance envelope, not every reachable body position.
- Component: 22,002 closed panels /264,396 triangles /two materials. Five-component assembly: 28,414 panels /353,996 triangles /14 materials.
- All 681,890 serialized vertices and all triangle/winding indices checked; max float difference 4.23973e-6 m. Component GLB, native JSON and report reproduce byte for byte.
- Chrome bay/corridor views inspected; cameras are unregistered and lighting is for construction inspection. No photorealism acceptance or full-game performance claim.
- Browser asset build, relevant JavaScript syntax and diff checks pass. No C# or service changes.
- Review gallery passes Chrome QA at 1440/390 px: four images, fourteen links, no overflow or page errors. Desktop rendering inspected; receipt `skyway-bay-framing/gallery-qa.json`.

## Rejected drafts

Candidate02 passed 36 walks and 1,210 collision probes but a new independent envelope check found six header clashes with glass, worst 0.0435543 m. Candidate03 corrected that clash and passed 36 walks but had one surface-ID discrepancy between overlapping ties. The browser and worker agreed on hit position within 2.22e-7 m. Candidate04 consolidates physically contained parallel ties and passes the unchanged surface-ID verifier. Both rejected reports are retained in the gallery.

## Reproducible inputs

- Framed component GLB `993a2d00f6fa6cdf071c4ef21db360a6546162dd746de02d0693984093b21f82`; native `4ab6064274bd2250072217e448b2b135ddf0d11bf4ff6ad08139ab3daa6c6e52`.
- Assembly GLB `3921ffb88dbaba506df300f821d665da8c77d009cf1fa1ea2540300571d14ef3`; native `60c6d81468eebf9b3ae7e6e53677547d26b3928bbffcf907e227f55358717601`.
- Construction inputs: central roof04, central Skyway03, `registrations/skyway-bay-framing.json`.
- Assembly06 inputs: framed roof04, western roof02, eastern roof01, western Skyway04, central Skyway03.
- Receipts: `central-roof-bays-check-04.json`, `central-roof-bays-native-04/report.json`, `roof-skyway-clearance-07/report.json`, `central-skyway-bay-interference-06.json`, `roof-skyway-serialization-06.json` under the isolated worktree’s `.local/station-realism/`.
- Tools: `reframe-skyway-bays.mjs`, `verify-bay-framing.mjs`, `compose-roof-skyway.mjs`, `audit-skyway-assembly.mjs`, `audit-skyway-bay-volumes.mjs`, `verify-component-serialization.mjs`, and the existing native component verifier.

## Remaining work

Photo registration and refinement of the bay frames, information boards, suspended floor supports, eastern landing/descent and source inner shell remain open. The integrated station is unchanged: its old canopy still conflicts and Skyway Trapdoor fails its authored route. Coordinate complete roof/Skyway replacement before revalidating station routes and all courses. Then continue the full materials, lighting, exterior, vegetation, night and performance scope of LONG-TERM-PLAN. No final visual milestone, commit or deployment is implied.
