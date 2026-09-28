# Eastern draft-envelope removal

Source: Kyoto City's station model, CC BY 4.0, https://data.city.kyoto.lg.jp/resource/?id=21224 . Source SHA-256 and exact input/layout/measurement hashes are in `east-upper-envelopes.json`.

The registered source and the World Architecture 61 station axonometric/sections contradict two generic draft boxes:

- `east-north-roof`: native X63.574397–112.639391, northing8.826107–19.826107, height59.27–59.55 m. Exact clipping finds no source triangle intersecting this volume. The source roof below is curved and changes height along the eastern mouth. Seven transverse source sections and 35 downward rays document the relationship.
- `east-north-upper-backing`: the same X span, northing9.021107–9.271107, height37.1–59.55 m. Thirty-nine source triangles cross the wall volume, mostly curved roofing and attachments, totaling 17.062802 m². None forms a near-parallel backing face (absolute renderer Z normal >.95). The old wall cuts through the curved canopy and falsely divides the open courtyard.

Remove these two draft boxes from Blender and the native layout; retain the source-derived roof and municipal facade/attachments. Do not translate the boxes onto a different wall. This decision uses the source sections, complete triangle/box intersections, source-context image and the published axonometric together. Coarse source geometry is not an interior survey.

`audit-east-envelopes.mjs` reproduces the measurements and diagrams. `remove-east-draft-envelopes.py` verifies source/input hashes and object world bounds before applying the removal in a fresh candidate. Existing box seed indices were stale after previous layout reordering; selection uses stable `kyoto_surface` IDs. Remaining formerly box-tagged objects are reindexed by stable ID; the already triangulated `south-concourse-hall-return-east` is mapped to its existing native panel. No other geometry is changed. This is not a claim that every historical tag in the complete source has been audited.
