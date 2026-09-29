# Conventional railway and JR West gate

28 September 2026. Structural reconstruction behind the retained north station.

## Change

The JR West gate previously ended at a solid wall. Remove that wall and open its middle gate lane. Extend the paid concourse alongside the public passage and connect it to five platform areas: 2–3, 4–5, 6–7, 8–9 and 10. Each connection has 42 physical steps, a middle landing, handrails and a roof that clears the walking route. Platform numbers identify the entrances and receiving platforms.

The railway now includes platform slabs, coping and tactile strips, canopies and steel supports, eleven track paths with rail profiles and sleepers, overhead wires, and a continuous ground bed. Sleepers share one native mesh per track. Browser geometry is grouped into nine material batches.

## Evidence and fitted dimensions

- The saved [JR West plan](https://www.jr-odekake.net/station/img/premises/0610116.pdf), dated 31 January 2026, establishes platform grouping and access from the elevated concourse. The saved station-building overview provides the north-up arrangement.
- Registered [municipal roof outlines](../geodata/plateau-2024/README.md), particularly buildings 466064, 466178, 466179 and 466180, establish broad alignment and extent. Credit: Kyoto City / MLIT Project PLATEAU. This reconstruction is not an official municipal product.
- JR West's [2015 platform-widening notice](https://www.westjr.co.jp/press/article/2015/12/page_8090.html) reports a 9.4 m width and 126 m length for the platform 8 work, with subsequent access to the elevated station building. Its date matters: it is construction evidence, not a current dimensional survey.
- Rail gauge is modeled as 1.067 m between the railheads, consistent with the conventional gauge illustrated in [MLIT's railway material](https://www.mlit.go.jp/common/000024913.pdf). Rail section sizes and sleeper spacing are fitted detail.
- The platform-number glyphs use the pinned upstream authoring font documented in [the font provenance and license](PLATFORM-NUMBER-FONT.md). Source photographs are not used as game textures.

The current paid floor is Y7.35 m and the new platform floors are Y0. Stairs have a 0.175 m rise, 0.32 m going, two flights of 21 steps and a 1.8 m middle landing. These heights, lengths, roof profiles, platform edges and track alignments are provisional fits to the current model. They should be refined against closer source views. The municipal data supplies roof outlines, not floor thresholds or exact railway alignments.

## Verification and retained receipts

The final native walks, saved-source verification, Chrome views, core gameplay checks and geometry correspondence are recorded under `.local/v2/current/components/railway/` after promotion. The candidate uses a temporary platform spawn for gameplay verification; the integrated game retains its normal station entry.

- Twelve native walks pass: all five stairs in both directions, the gate and paid-concourse approaches, and both directions along the ground between track beds. All 11,488 samples meet the floor-height checks; endpoints finish within 0.06 m of their intended floors.
- The saved Blender scene reopens with matching new geometry, materials, normals and retained bindings. All added browser/native triangles match.
- `npm run build:web`, `test:runtime` and `test:v2:browser` pass. The platform gameplay check reaches full translation-and-spin rest in 9.73 seconds; recall during flight forfeits the shot as required.
- Nine Chrome views have no page errors. The final short 1440×900 samples contain 810 frames, with a 16.7 ms median and about 16.8 ms p99. Wide views were resampled after competing Chrome/Blender work finished. This is not a long performance or audio soak.

Browser and native exports contain the same 990 new panels and 103,004 triangles. The two removed gate obstructions contribute 24 retired triangles. The net browser increase is 102,980 triangles and about 8.66 MB. No additional dynamic lights are introduced. Existing motion hardware, scoring rules and unrelated geometry are retained.

The first complete walk suite covers approximately 958 m at normal speed and takes about twelve minutes. For later localized repairs, test between nearby landings and reuse verified unchanged routes; repeating long platform walks would add time without checking new geometry. The component workflow avoids a full station export, and temporary full-station files are removed at promotion.

## Remaining work

1. Platform 0 and the north rear-floor boundary. The old rectangular concourse ends at Z−41; the provisional sloped track 0 approaches that footprint toward its eastern end. Reconcile these together with the platform 0 access, rather than treating the current northern track edge as finished.
2. Shinkansen and Kintetsu railway, ticket halls and the southern station building around the completed public passage.
3. Western 30–34 bay platforms and the eastern transfer route; closer alignment, curvature and roof-profile refinement; lifts, escalators, platform barriers and operational railway detail.

This pass establishes usable structure. It does not complete the full railway or claim photorealistic finishes.

## Rebuild

Use the parent asset manifest with `extract-railway-gate.py` and `prepare-railway-gate.mjs` to retire the two exact authored obstructions. Then run `build-railway.mjs` and `web/v2/compose-component.mjs`. The authoring font JSON belongs beside the documented research font path in the asset pack. `verify-railway-geometry.mjs` checks native/browser correspondence; `verify-railway.mjs` walks the complete native station. `install-railway.py` saves and reopens the editable Blender source and checks its geometry and retained bindings. These replacement tools assert the expected parent state.
