# Central Gate banks installed in the private station

28 September 2026. Construction progress; this candidate is **not accepted for the active game**.

## What the photograph establishes

The enlarged [2022 Central Gate photograph](../photos/gate-central-2022.jpg) shows four cabinet assemblies on the image left and five on the right, forming three and four lanes. Two notice panels divide the banks; three additional notices stand at the right. Looking south from the hall, image left is station east. The wide open lane is therefore the outer eastern lane.

The [March 2025 ICOCA photograph](../photos/gate-icoca-2025.jpg) is West Gate: its curved wooden ceiling and Commons category contradict its Central Gate caption. It is excluded from Central Gate count and placement. The newly saved Korean-titled Commons page describes a May 2018 image, so it adds no current configuration evidence. The research catalogue now contains 269 entries and 250 saved files, all hash-verified.

## Construction and limits

The new component has nine cabinet assemblies, seven lanes, fourteen narrow hardware modules, eight display panels, five notice stands, side guards and four splayed supports. It replaces 123 old panels and one obsolete boundary box. All 35,445 retained panels, 8,061 boxes, 48 lights, both concourse floors and other station records remain exact.

Cabinet widths, paired-module construction, clear lane widths, sign dimensions and the bank's 8.3 m depth behind the portal are **inferred**, not surveyed or photographically registered. The 2022 count does not establish that equipment is unchanged in 2026. Displays use original illustrative bilingual headings; they are not reproductions of actual departure data. Old ticket offices, information glazing, tactile routing and railway-side scenery remain temporary. Bridge end connections remain incomplete.

The first component view exposed mirrored bank orientation and backward text. Both were corrected before installation; the rejected component remains in the private evidence directory.

## Paired full-station views

Same camera and static studio lighting. These are construction inspections, not final game lighting or a photorealism acceptance claim.

### Before

![Previous gate architecture and old bank](gate-bank-installed/before.png)

### After

![New split gate bank below the bridge](gate-bank-installed/after.png)

### Close view

![Cabinets and notices, with unfinished office context behind](gate-bank-installed/close.png)

## Verification and the remaining conflict

- The open wide lane passes nine native floor/headroom probes and actual walks in both directions. Six closed lanes have matching browser/native paddle hits; the seventh is clear through the tested four-metre region. [Lane evidence](gate-bank-installed/lanes.json).
- The unchanged longer diagnostic routes remain obstructed at the central notices and side guards; the under-bridge lateral route also crosses equipment. Bridge traversal, the rear lateral path and wide-lane traversal pass. The first diagnostic run's centre-seam ray failures were test errors; focused runs corrected the ray offset and limited the open-lane comparison to the actual tested region. [Original diagnostics, including failures](gate-bank-installed/route-diagnostics.json).
- Across 166 canonical course placements, one changed: Cross Station `patch-3`, radius 0.5 m at native `[0.646323, 0, -12.220000]`. The native validator now reports an obstacle. An independent triangle-distance check identifies `gate-bank-center-notice-0-foot--1` at one of the validator's sampled points. Existing failures increased from 31 to 32. [Placement comparison](gate-bank-installed/course-placements.json) · [Foot overlap](gate-bank-installed/crossstation-conflict.json).
- Locker Loop and Pillar Carom each pass two authored throws and one nearby-angle throw at complete translation and spin rest. These are the existing private repairs, with only the layout hash updated. [Throw receipts](gate-bank-installed/course-throws.json).
- Chrome renders both complete-station views without page errors. Twelve new materials and 114,981 exported vertices pass attribute comparison; all eighteen packed masks pass. All 316 previous image streams are byte-identical; one original display atlas was added. [Attributes](gate-bank-installed/attributes.json) · [Textures](gate-bank-installed/textures.json).
- Browser delivery is 123,759,580 bytes, an increase of 376,608 bytes (0.31%). Geometry is 2,252,242 triangles and 1,926 batches. These counts do not establish the full-game frame-time or audio budget. Browser build and focused syntax checks pass.

## Next work

Register the bank depth, notice stands, office frontages and tactile route together against the Central Gate views. Resolve the Cross Station foot overlap after that architectural placement is supported; do not silently move a target, shrink its radius or remove the stand's collision. The candidate stays private until gameplay and the remaining station interfaces pass. Complete both bridge connections and the inherited paid-area enclosure as connected work.

The wider station, plazas, streets, materials, lighting, vegetation and full Chrome/runtime acceptance gates remain part of the active long-term objective.

[Exact replacement scope](gate-bank-installed/scope.json) · [Construction assumptions](gate-bank-installed/spec.json) · [Copied evidence hashes](gate-bank-installed/manifest.json)
