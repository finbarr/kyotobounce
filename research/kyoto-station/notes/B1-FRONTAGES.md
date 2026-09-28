# B1F frontage construction study

28 September 2026. **Provisional and uninstalled.** The full-station candidate remains courtyard life04/browser04; this study does not establish photographic accuracy or whole-station readiness.

## What changed

The first descent is now identified as B1F by the [official route evidence](BASEMENT-ROUTE-UPDATE.md). The previous isolated well enclosed the lower level with continuous walls. The new candidate cuts six lower portals and adds recessed floor, ceiling and shop glazing with 1.8 m clear entrances. It introduces blue upper lining, dark portal framing and simple warm interior backing as material placeholders.

The source floor, first-flight mechanisms and 675 existing hall/descent records are unchanged. Six new floor areas meet the retained lower-deck outline and add 112.8 square metres. Their overlap with the retained floor is below 1e-8 square metres; the complete threshold edge is checked within 1 nm computational precision. This is numerical construction agreement, not survey precision.

## Explicit assumptions

- Three openings on each side; widths 8.8, 5.9 and 8.8 m. These are provisional allocations around bank endpoints, not measured shop boundaries or a six-shop inventory.
- Recess depth 2.4 m, showing only shallow interior context. Tenant plans establish adjacency, not these dimensions.
- Portal head Y=-1.55 m, leaving a provisional 50 mm header below the source soffit; B1 floor Y=-4.913583 m.
- Original source geometry is preserved outside the intentional portal removals. Final geometry requires no vertex coalescing or source-soffit alignment.
- Glass and light fixtures are generic construction placeholders. The 2025 renovation announcement contains proposed CG, so it is not used as an as-built texture or exact shop fit-out.

## Candidate and checks

Worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`.

- Specification: `.local/station-realism/hall-b1-frontages-spec-05/spec.json`.
- Frontage component: `.local/station-realism/hall-b1-frontages-04`.
- Combined hall: `.local/station-realism/hall-descents-assembly-19`.
- 111 frontage records, 5,424 triangles and eight material batches. Combined assembly: 786 records, 65,866 triangles, 20 materials; 6,212,968-byte GLB.
- Combined export agreement: all indices and winding match; maximum Float32 position error 1.035 micrometres.
- Browser asset build passes. No service or C# changes.
- Final frontage04 passes 5,160 native collision probes, maximum error 0.0985 mm, with seven independently validated shared-boundary ties. Final assembly19 passes 24 support/headroom samples and twelve actual doorway walks. [Construction gallery and full receipts](b1-frontages/index.html).

## Retained diagnostic failures

The first cut at the nominal -1.5 m source soffit produced microscopic slivers, then ten native discrepancies, up to 25.04 mm. An attempted near-plane alignment was rejected by the closed-mesh check and emitted no candidate. The final design keeps a 50 mm header below that plane; it removes the sliver construction without changing collision tolerances. The intermediate corrected component passed 5,160 probes (maximum 0.0985 mm), and its combined assembly passed 24 support/headroom samples and twelve walks.

The first walking verifier incorrectly required a ceiling over the open well. It now compares every upward native ray against the serialized construction: a ceiling must agree within 1 mm; an open browser ray must also be clear natively. The first failed report remains in `hall-b1-walks-01`.

## Next work

Register the B1 corridor against multiple architectural landmarks before accepting shop widths or materials. The new walking-height renders also expose bulky escalator undersides and the missing second B2 flight; investigate the source body and return mechanism against the route photographs. Continue the actual B1 passage beyond both ends. Resolve adjoining hall/course connections before installation, then complete photographic comparisons, full-game performance pairs and the audio/context soak. All wider station, plaza and street milestones remain active.
