# Daruma ceiling and room illumination

## Delivered

Daruma now has a pale ceiling inside its registered footprint, a fitted ventilation cassette, return grille, access cover, detector and four opal lamp shapes beneath the existing pendant bodies. The corridor keeps its dark ceiling. The new lining closes the former gap at the tops of the shop walls.

A single static reflection capture now supplies the room's materials, including stainless fittings. It is lit by the four existing pendant sources and kitchen strip while capturing, so illumination reflects the authored shop rather than the central hall. Those five temporary shadowless lights are immediately removed and disposed. The existing two realtime spotlights remain the entire practical-light pool during play; nothing recaptures per frame.

Geometry adds 71 closed parts, 2,912 triangles, five batches and 319,476 bytes. The lining, cassette body and access cover have native collision. Small grille, detector and lamp details are noncolliding decoration. All inherited geometry is unchanged.

## Research and uncertainty

- The [June 23 Kyoto visit](https://osumituki.com/kyoto-ramen/225895.html), saved as `research/kyoto-station/photos/daruma-front-20260623.webp`, shows the pale shop interior below the exposed dark corridor ceiling, hanging lamps and ceiling equipment in the surroundings.
- The [June 12 Kyoto opening visit](https://kyotopi.jp/articles/hakatadaruma), particularly its saved interior photograph, establishes the pale serving wall, counters and room finishes.
- The [owner's opening release](https://prtimes.jp/main/html/rd/p/000000008.000131832.html), saved interior collage `daruma-interior-opening-2026.jpg`, supplies equipment-type references: a pale ceiling, access panel, detector and ventilation. The collage does not establish their exact positions in Kyoto; it is not treated as a measured Kyoto ceiling plan.

The lining follows the existing registered footprint at 2.91 m above the shop floor. Equipment dimensions and positions are fitted approximations. The reflection capture is a static, single-point approximation; it does not simulate full indirect lighting, changing interiors or parallax-correct reflections. The kitchen's metal surfaces still need a more complete lighting/material pass.

## Verification

- The component audit matches all 8,736 added vertices, triangles, explicit normals and UVs between browser and native exports. No inherited positions or other encoded data changed.
- The Blender installer saves and reopens the editable source and checks new surfaces, UVs, normals, material bindings and all retained object bindings.
- Eighteen native walks pass, including the entrance, public aisle, dining loop and staff access in both directions. The table height/surface check passes. Three upward native probes hit the ceiling lining, cassette and access cover at their intended heights.
- Typecheck, the test suite and browser asset build pass. Focused reflection tests cover material scope, preserving local stainless reflections, optional capture allocation, authored light properties and exclusion of corridor fixtures.
- Eight actual Chrome views at 1440 × 900 show the ceiling, equipment, dining room and staff passage. Every view retains exactly two spotlights after loading, all 25 Daruma materials use the local capture, and the capture count stays fixed at seven. Median frame samples were 16.7 ms with no page errors.
- The full set of startup captures took 4.83 s in the final run, including the added shader compilation for temporary room lighting. The additional 256-pixel room capture costs 6 MiB of filtered reflection storage; all seven captures total 60 MiB. This is startup work, not recurring frame work.
- One earlier headless inspection showed an audio-clock stall near its end. It did not repeat in a clean rerun or the final inspection. The final extra 30-second audio check sampled every 250 ms and had 1.1 ms aggregate clock skew with no interval stall. This is evidence of continuity in those checks, not a claim that every historical audio problem is resolved.
- Native exploration, full translation/spin rest, recall and home pass. Final Chrome entry, movement, throwing, result presentation, recall and menus are checked before promotion.

## Reproduction and assets

`web/station/realism/build-daruma-ceiling.mjs` builds the component; `install-daruma-ceiling.py` integrates it. `verify-daruma-wall.mjs` accepts the explicit `daruma-ceiling-` prefix and an empty relocation receipt to audit the append-only change. `verify-daruma-ceiling.mjs` checks native ceiling hits. The existing dining-loop checker is reused with `--staff-access`.

Current manifest: `web/v2/assets.json`. Small build, source, native and Chrome receipts are retained in `.local/v2/current/components/daruma-ceiling/`. Generated media and station binaries remain outside Git.

- Layout: `80a48c4328df0c0ef9102711bf4a0f9c4f961c45bbd59494a932badd2a7722a2`
- Runtime geometry: `7a25f2822a9229a43dabd111a286804f1641b47c7ddb2d3a760d0f12da6f20ed`
- Editable source: `53904af3df22c4765739923ec14136aa9c723feccfdd919a60511a4a48ab3aa5`

## Next

Develop the restaurant corridor's exposed overhead services from the actual Kyoto frontage photographs. Its flat dark ceiling remains conspicuous beside the more developed shop interiors. Keep that work within the current bundle and existing light budget.

Promotion removed the temporary full station export, candidate Blender source and port-4426 overlay. Final disk check: current bundle 678 MiB, candidate receipts/scripts/views 43 MiB, active 4425 overlay 275 MiB and retired 4426 metadata/logs 68 KiB. The main preview's served GLB hash matches the manifest and its native worker is ready.
