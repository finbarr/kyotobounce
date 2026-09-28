# Replacing the coarse inner roof without cutting its adjoining walls

27 September 2026. Local construction candidate; not committed or deployed.

The registered canopy exposed an opaque soffit in the imported municipal model. The new candidate removes **67.9 m²** of that overlapping surface from two station meshes. It retains uncovered transition areas and every adjoining vertical return. The two eastern collision probes that previously hit the soffit now reach the researched roof. The western boundary and eastern cladding junction remain open architectural issues.

## Source and construction method

The geometry comes from [Kyoto City's station model](https://data.city.kyoto.lg.jp/resource/?id=21224), licensed CC BY 4.0. Three collision intersections trace to original `Untitled.200` source faces 103 and 105. Growing across the connected, downward-facing roof finds 33 triangles; all 33 neighboring unselected faces are vertical returns. This selection is stable across the tested 15–40 degree normal thresholds.

The first coverage audit showed why deleting the entire selection would be wrong: the eastern transition extends beyond the replacement canopy. The final mask partitions each source triangle by its normal projection onto the registered outer roof. It removes covered polygons and retains uncovered fragments. The 4 m search distance is a correspondence limit, not an asserted truss depth.

Before frontage clipping, 2,776.339 m² of the selected source shell is covered and 73.906 m² remains. Much of that source shell was never imported into the game. The actual installed removal is 15.350 m² west and 52.539 m² east. These two sets of area measurements must not be confused.

The rebuilt meshes preserve source UV coordinates and corner normals. Every unselected source face retains its area exactly; plane error is below 0.002 mm. All other station panels, route records, lights, materials and layout fields compare exactly. A material-name suffix differs between the source GLB and Blender import; the rebuild keeps the actual imported material and authoritative layout record.

## Independent checks

- **10,725 source samples:** independent Three.js rays agree with membership in the saved removal mask at every sampled point.
- **1,867 exported-scene/native rays:** all browser/native positions and normals agree, with maximum position difference 0.374 mm. This includes 105 new retained-boundary samples; two negligible triangles totaling 1.79×10⁻⁸ m² are explicitly excluded from that sampler.
- In 26 boundary probes, a roof member is in front of the retained source fragment. Both render and native geometry hit that member. These are recorded separately from the two unresolved station interfaces.
- **30/31 authored shots pass.** All thirty executed shots reach full physical rest and reproduce the previous candidate's complete pose sequences exactly. Skyway Trapdoor still fails placement on a removed old-canopy target before it can launch.
- The existing terrace destination revision is revalidated from a fresh native trace, with both passage walks passing.
- **284 embedded images and all material definitions are unchanged.** Clipping adds 82 triangles. The final export has 2,119,891 triangles, 1,921 batches, 465 materials and 117,488,244 compressed bytes. Provisional texture allocation remains about 846 MiB.

The complete isolated runtime suite also passes: full-rest finale, scoring, connection recovery, replay/sharing, both playback speeds, designer validation and 64 rapid recalls. This does not override the separate Skyway Trapdoor failure.

## Remaining interfaces

The western conflict falls in a submillimetre source boundary outside the coverage mask. It remains in the candidate rather than being deleted to satisfy an expected first-hit identity. Roof-to-wall detailing still needs a coherent construction decision.

The fourth original intersection is `east-north-cladding-4-5`, a separate legacy facade box. It is untouched. Its roof/court relationship needs eastern facade registration; the nearest source face along the probe is not a matching vertical wall.

The old Skyway and its access routes are also untouched. Both the western restaurant approach and eastern court must be connected before replacing the merged old floor. A new western source audit identifies roof/underside surfaces and stepped terraces, but it does not establish a continuous public walking floor. Downward faces and group bounding boxes must not be promoted into route geometry without supporting evidence.

## Visible result

Close inspection confirms that the eastern opaque roof patch is removed and the adjoining facade stays in place. The western change is smaller and leaves the unresolved return boundary intact. At the concourse camera, the improvement is localized near the roof ends. Blurred facade finishes, dark interior contrast, the retained old Skyway and its supports still prevent final visual acceptance.

## Evidence

The [source-mask diagram](inner-roof-interface/source-mask.svg) shows the imported removal and retained transition in plan.

The final Chrome pair stayed on battery with low-power mode off, verified before and after every view. At 1280×720, with five seconds warmup and twenty seconds measurement per view, candidate frame-time p95 was about 17.6 ms and p99 at most 17.8 ms. Draw calls were unchanged, and there were no browser errors, warnings, hidden frames, timer disjoints or dropped GPU queries. An earlier pair crossed an AC-to-battery transition and is retained only as diagnostic evidence. These are short fixed-view measurements; no overall speedup is claimed.

The [matched Chrome gallery](inner-roof-interface/index.html) contains before/after views and linked mask, reconstruction, collision, course, texture and runtime receipts. The cameras are construction inspections, not registered reference photographs. Full visual acceptance, repeated gameplay performance trials and the twenty-minute music/context soak remain required.

Candidate layout: `3633a22e8d03322578730b0bc8465b9863f6f837caa5e266f5f0a90e8546536e`.
Runtime GLB: `7db3683564c229437638533a554bcf627e5ab6e08fa9be2fce2b046f34348772`.

The full [long-term plan](../LONG-TERM-PLAN.md) remains active. This is a local geometry milestone, not a completed photorealistic station.
