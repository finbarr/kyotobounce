# East Square / NIWA paving interface — combined assembly03

27 September 2026. [Before/after gallery](east-court-niwa-interface/index.html). This turn joins previously isolated construction components and verifies their shared routes. The complete station remains unchanged.

## Why the provisional court level changed

Court03's generic raised garden overlapped NIWA08's lower walkway by49.95m² and sat0.286349805m above it. The registered photographs suggest continuous lower paving through this foreground. The previous1.12m garden rise was an unconstrained construction assumption, while the NIWA lower datum comes from the jointly fitted planter base. Preserving the former height would retain an unsupported floor discontinuity.

`derive-niwa-court-interface.mjs` creates a new explicit spec. Court04's nominal garden/forecourt top is Y30.807027344, equal to NIWA's lower walkway. Its east edge is trimmed from localu44.5 to41.8, with the north approach stair width also trimmed. The18.5m common edge is a component boundary, not a modeled architectural step. The source outer footprint, its hole and the eastern Skyway datum remain unchanged.

Whole-court coplanarity remains a hypothesis. This revision does not establish an as-built elevation for every part of East Square. The approach rise is now0.833650195m; seven nominal risers are0.119092885m each, and the unchanged16.8m ramp run has grade0.049622. Counts, runs and boundaries still require stronger photographic or drawing evidence.

## Foreground seat and exterior terrace

The old seat was not translated blindly. `fit-east-court-seat.py` refits it using the fixed joint JR camera and the revised court plane. Seven backrest corners give3.309617px RMS: rotation170.763541°, back length2.750588m, depth0.891573m, top0.887802m above the assumed ground. Seat/base/plinth/left-step elevations and hidden supports remain inferred; the photographic outline is a fitting input, not independent validation.

Current seat/terrace component06 contains the refitted five-part seat plus five terrace treads and an outside landing:11parts,540triangles. The nominal terrace spans v21.4..32.6; five0.158594531m risers over1.56m, with0.312m goings, reach Y31.60. The1.2m outside landing spans u44.92..46.12; the lower paving keeps1.56m clear width. The texture set is reused from the warm stone seat.

The first terrace core ended directly at the glazing, and its drafted route continued through the closed glass. That was rejected by geometry inspection before walking; no executed failure is claimed. The current core projects outward and ends on an exterior landing. Its uniform steps are still a provisional access core, not the final sculpted terrace silhouette seen in the reference.

## Verification

- Actual component footprint checks: old49.95m² overlap removed; new overlap0; common paving height difference0; shared edge18.5m. Analysis-coordinate rounding changes no source vertices and is below4.93e−10m. All foreground seat vertices are over the court and its base meets the new floor. Terrace-to-cafe landing seam is within2.29e−6m horizontally and3.82e−7m vertically.
- Fresh final assembly03 walking:28/28 normal-speed traversals,14routes in both directions;233sample points/466rays, zero mismatches/obstructions, two exact shared-edge ties. Minimum sampled covered headroom2.719999695m. Includes the original court routes with the retained foreground-seat detour, both NIWA flights, two court-to-NIWA connections, the lower walkway and two exterior terrace approaches. It does not test cafe interior access or the whole station.
- Fresh seat/terrace06 native proof:540/540 sampled triangle hits, maximum point error0.0000318521m. Earlier seat04's468probes and intermediate assembly01's24walks also passed; they are retained but are not substituted for the final tests.
- Final assembly03 serialization:315parts,88,624vertices,55,788triangles,16materials; winding/indices preserved, maximum coordinate error0.00000735747m. Material/UV verification preserves9images and5,964UVvertices, about12MiB decoded RGBA8 with mips. Both registered Chrome views render11calls/3,288triangles; these are frustum-specific inventories, not full-game timing.
- Court04 and seat/terrace06 repeat builds are byte-identical. Updated builder defaults reproduce court03 and seat03 GLB/native bytes exactly. Court04 flat normals pass all680triangles. Browser asset build, tool syntax and diff checks pass.
- Gallery checks cover desktop/mobile layouts, six images, comparison controls and local evidence links. Both current camera renders and gallery layouts are visually inspected. Temporary workers and Chrome servers are stopped.

## Artifacts and next work

- Court04 GLB`8cb34a8c5ce12db0508caa8a0a74b8afc331daf85a61775bdeb30b3d30cbf4fe`; native`679650f6e6660c602865c8d31df2457f48c5955783b24c6859e6f68af8e07e86`.
- Seat/terrace06 GLB`ea44a787598304ad3fd3cba20d4d827f328f82dbd84a44e29c0bf782c8350128`; native`6eb2464393deb23fd2744b26c0970f02affbca6a0fde33b9ada7db35ea716a1a`.
- Combined `.local/station-realism/east-court-niwa-03/`:4,963,396bytes, GLB`a66886250b49fd808bcf10850e41095f11c213b5c77c3510bd1269a579e3d06f`; native`43030a6046efd8d9d956f3e7f0f8fa264e163da97a21ad8a332939be5340e8cd`.
- Compared with the diagnostic old-court/seat plus NIWA composite: +6parts,+120triangles,+41,136bytes, no new texture set.

Next: inventory the source facade/floor pieces that conflict with this combined candidate and prepare a full-station contextual integration. Keep the missing4Fdescent, eastern lift/toilet corridor and southern connection explicit; their incompleteness must not be hidden by an isolated walking pass. Finish the photographed terrace forms, furnishings, planting and doors/interior as part of the complete area. Full station inner-roof01 and overall Skyway09 remain unchanged, including the open SkywayTrapdoor authored-shot failure. Thirteen other registered target areas and all final visual/light/exterior/runtime/performance gates remain open. No commit, push or deployment.
