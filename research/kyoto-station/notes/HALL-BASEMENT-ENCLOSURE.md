# Central hall: floor joins and basement enclosure

28 September 2026. [Comparison gallery](hall-basement-enclosure/index.html) · [Previous source-profile banks](HALL-BANK-PROFILES.md).

## Construction

The upper hall floor and lower deck now exclude the retained source landing plates. This removes the previously measured overlapping surfaces while retaining all three upper openings and both lower holes. The visible paving and native collision use the same revised outlines.

The enclosure follows the municipal model's curved well faces and stepped soffit heights. Source faces come from `Untitled.200`, selected below the upper floor within the basement region. They are clipped at the actual upper floor underside (Y=−0.2 m) and first lower deck (Y=−4.913583 m), with the established −0.036583 m datum shift. The old source lower slab is excluded so it does not duplicate the constructed floor.

The municipal exterior backing ends at source Y=−2.3887317 m while its visible inner faces continue upward. Four hidden exterior edges are extended to the upper floor underside to close the solid. These closures are an explicit construction assumption, not surveyed geometry. All other added faces are horizontal cut caps.

The source model still does not establish a deeper route below the first deck or resolve its B1F/B2F label. Storefronts, signage, ceiling fittings, final material response, lighting, nearby public-route connections and the final photographic match remain unfinished. The full station remains courtyard life04/browser04; this component is uninstalled.

## Floor agreement

[Independent floor proof](hall-basement-enclosure/floor-joins-proof.json) compares the emitted geometry with the old floors minus the actual source plate footprints. It checks coverage, overlap, paving containment, topology and all unchanged records.

| Check | Upper floor | Lower floor |
| --- | ---: | ---: |
| Removed overlap | 0.00010449697 m² | 0.01083038453 m² |
| Remaining floor area | 452.964384545 m² | 157.799657941 m² |
| Interior openings | 3 | 2 |
| Footprint difference from expected | 3.0e−15 m² | 5.82e−9 m² |
| Remaining plate overlap | 4.93e−18 m² | 2.21e−12 m² |
| Float32 boundary error | 0.484 µm | 0.362 µm |

All checks pass the existing 1e−6 m² footprint limit. There is no paving outside the new footprint. Only two parent records change: 673 others and every moving mechanism remain exact. The lower outline receives a 0.1 µm simplification to remove computationally redundant points; its resulting coverage difference is recorded above.

## Source and collision evidence

The source inventory SHA256 is `1965c3845f76d5e0405d14dc7fc62f8a4030305a14f3016cf1cf822d0a84cebe`; the municipal GLB is `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`. Kyoto City, CC BY 4.0. Numerical precision is not a claim of survey accuracy.

An independent face-coverage verifier compares clipped original source triangles with emitted wall geometry in their original planes. It also classifies every added triangle as a cut cap or declared exterior backing closure. Floor, source, export and native receipts are linked from the gallery.

The rebuilt hall passes 13,764 native/browser ray probes, maximum position difference 0.322 mm, with four independently validated shared-boundary ties. The 1 mm tolerance is unchanged.

The first wall candidate passed 324 support/headroom checks, 24 through walks and four standing rides, but two detailed underside-cap probes failed by 2.164 and 3.232 mm. Their triangles combined a long diagonal with a submillimetre edge. Constrained cap triangulation with boundary segments no longer than 0.5 m fixes those caps without moving their surfaces. The next candidate exposed a 1.762 mm error on a residual source floor sliver. Near-level source vertices are now aligned to the common lower deck, with a maximum height adjustment of 0.048306 mm; X/Z remain unchanged. This removes the duplicate floor sliver. The original failure remains in [prior-wall-native-failure.json](hall-basement-enclosure/prior-wall-native-failure.json). No failed check is replaced by a broader movement pass.

## Reproduction

Worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`. Construction and verification tools are under `web/station/realism/`; binary/intermediate artifacts remain under `.local/station-realism/`.

1. `reconcile-hall-bank-floors.py` derives both revised floor specifications from the parent specifications and actual landing-plate faces.
2. Existing hall/descent builders produce hall12 and descent12; `verify-hall-floor-joins.py` independently checks their emitted surfaces.
3. `prepare-hall-well-lining.py` selects and clips the source enclosure. `closed_mesh_clip.py` provides exact triangle-plane clipping and planar constrained caps. Its first attempt correctly rejected the source's open exterior backing; that failure led to the explicit closure described above.
4. `remesh-hall-lining-caps.py` inserts boundary points and uses constrained planar triangulation without moving the surface. The earlier `refine-hall-lining-caps.py` midpoint-subdivision diagnostic exceeded its 10,000-split budget and emitted no candidate; the retained spec03–05 failures are not used.
5. `build-hall-well-lining.mjs` emits the same wall geometry for browser/native use. `verify-hall-well-lining.py` checks source preservation; the native component audit checks collision surfaces; the descent audit exercises all four lanes.

No C# or service changes are involved. Full-station campaign, gameplay performance and the twenty-minute audio/context soak remain separate open gates.

## Next connected work

Inspect the remaining underside/reveal joins and establish the lower route's continuation from maps and dated imagery. Build the visible lower architecture, shopfronts and ceiling systems from that evidence, then reconcile Balcony course support and adjacent hall/gate/roof connections before station installation. Keep the full reconstruction plan active.

## Final verification and artifact identities

Final enclosure03 uses 1,664 triangles and one provisional material. All 1,664 native ray probes pass, maximum error 0.109 mm. Source verification checks 318 wall/soffit fragments after the explicit lower-deck alignment and separately checks all 16 floor faces against their actual floor and landing-plate components. The floor uses the existing hash-verified 10 µm topology grid; all 16 faces have zero missing area under that established construction rule. Raw unsnapped differences are reported separately. No source or collision tolerance was widened.

The original wall-only source check expected a 33.097 m² floor face inside the wall component and failed. Its exact verifier and output are retained as `source-verifier-before-floor-ownership.py` and `floor-ownership-failure.json`. The corrected check requires positive coverage by the separate floor; it does not silently exclude those faces.

Final assembly15 contains 676 static records, 62,106 triangles, 122,592 vertices and 13 material batches, in a 5,891,592-byte GLB. Browser/native export indices and winding agree; maximum Float32 error is 1.035 µm. These are isolated construction counts, not a full-game performance result.

| Artifact | SHA256 |
| --- | --- |
| Enclosure03 GLB | `2487917ca27eaa3d26f6d677052a15d0af22c21f2d4f92768e6665ed79f7401d` |
| Enclosure03 native | `432ddadd2fcf451b03348ab2649b910423e71291e1334e2e4c05d1d509b5b19e` |
| Assembly15 GLB | `11b20d6ef0f4e52f5b98106b75e56e27df09e0e5609c05b19751d115dd6d87ee` |
| Assembly15 native | `0ad1aead1d97bbdf0007c49c186ab015f32f56fbb1ef609d1f73d6c5ad4896fc` |

Final assembly15 was directly tested by native09: all 324 support/headroom points, 24 through walks and four standing rides pass, with zero ray mismatches or obstructions. Final Chrome close and lower-deck views were inspected. The browser asset build passes.

Gallery QA passes in Chrome at 1440 and 390 px: all three images and local links load, with no overflow or page errors. Desktop capture inspected. All 221 downloaded source hashes verify. The eight isolated worker logs have no open handles; the gallery browser/server are closed.
