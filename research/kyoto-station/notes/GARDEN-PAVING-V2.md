# Rooftop garden paving

## Evidence and scope

The operator's [garden photographs](https://www.kyoto-station-building.co.jp/service/square/)
show pale, warm stone slabs, narrow joints and dark inset squares between the
planted beds. The saved references are `square-img_oozorahiroba_01.jpg` through
`_03.jpg`. The game already has the inset geometry; its continuous public floor
used a generic paving material shared with the garden stair.

This increment gives that floor its own pale stone finish, covering the garden
arrival, court and western passage. It retains every floor triangle, stair,
inset square and planter. The photographs establish the general appearance;
the 0.60 m slab pitch, 4 mm joints and surface reflectance are authored estimates.
The operator currently lists the garden as closed for construction. The game
continues to reconstruct the usable garden requested by the user.

Acceptance: inspect the finish in real Chrome, walk from the rooftop arrival
through the garden to Isetan and back in Chrome and native play, preserve all
physical records, and verify the saved source before merging into local main.

## Implementation

- Four deterministic 512 × 512 maps provide color, normal, roughness/metallic
  and the source's smoothness mask. They contain original mineral grain and
  small slab variations, without photograph pixels or baked lighting.
- Three maps are embedded in the browser asset. Their estimated RGBA8 mip
  allocation is 4 MiB. The GLB grows by 483,644 bytes; geometry, draw batches,
  moving hardware, lights and reflection captures do not increase.
- A separate material isolates the promenade from the stair's shared finish.
  The source stores metric UVs and packs its three maps into the editable scene.

## Verification

The independent verifier checks unchanged physical records, positions, normals,
indices, scene nodes and all inherited encoded buffer bytes. Only one primitive
receives the new material and UVs. The original stair material remains exact.
Embedded map hashes and repeat samplers match the generated assets.

The saved scene was reopened successfully. Its floor geometry and other mesh
bindings match the parent, all 276 UV loops match within 0.000001, and all three
packed texture hashes match. Five Chrome views were inspected; textures remain
at 387 and reflection captures at seven throughout. Short view samples have a
16.7 ms median and p95 of 16.7–16.8 ms. These samples do not establish sustained
performance across the station.

Native walking passes the rooftop arrival–garden–Isetan route in both
directions, with 894 position samples. Chrome completes the same route with
16 grounded waypoint checks and no errors. The browser asset build passes.
The native gameplay test passes movement, a throw from the garden reaching full
translation/spin rest after 13.94 seconds, unsaved exploration results, recall
forfeiture and home.
Chrome gameplay also passes movement, a full throw, result presentation,
recall during flight, menu and home.

| Final asset | SHA-256 |
| --- | --- |
| Layout | `75b5a017ad9fd6998467bb58ffb43240fc861f2ff6508dba637ec50e06c4b4a2` |
| Browser geometry | `9825bad11aaabd111ef623b0c61873ab2a7f759af9ce7426b74000a9b1711c14` |
| Editable scene | `58d4103feb2b2c588fe5bec235d1ed1197735a8e928a49c120e06ddba07a46d5` |

## Rebuild and remaining work

Run `web/station/realism/finish-garden-paving.mjs PARENT COMPONENT`, then
`verify-garden-paving.mjs COMPONENT` and Blender with
`install-garden-paving.py -- COMPONENT`. Use one temporary component directory
under `.local/`; the full candidate replaces the current source and runtime
at delivery. Keep the generated maps and receipts outside Git.

The garden's planting, bench arrangement, arrival screens and darker inset
placement still need refinement against the photographs. In particular, the
western row of coarse triangular planting and the tall arrival screens remain
provisional. These are separate from the completed paving treatment.
