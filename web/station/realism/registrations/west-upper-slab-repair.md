# Western upper-slab construction inputs

Derived from the registered Kyoto City station mesh, CC BY 4.0: https://data.city.kyoto.lg.jp/resource/?id=21224 . Attribution: Kyoto City; geometry measured by Kyoto Bounce on 27 September 2026. Source GLB SHA-256: `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`.

- `west-upper-rear-wall.json`: directly picked face1400 of `Untitled.203`, checked against face1429 and 21 nearly coplanar facade triangles at heights41–54.234m. Maximum coplanarity deviation is .00702m. The repair is limited to their measured X span; retain the north side of this exterior wall.
- `west-upper-hall-footprint.json`: closed horizontal cuts of the same source at height59.4m, inside X[−125,−50]/northing[18,37]. Endpoint welding tolerance .001m yields four degree-two rings. The outer enclosure has63points/748.246m²; the inner enclosure is712.138m²; two smaller rings are separate features. Use the outer ring to bound the highest existing north slab, preserving its intersection with the existing footprint.

These are construction envelope measurements, not an interior floor survey. Lower slab heights are retained. The 54.498m slab extends slightly above the measured facade top; its plan limit follows that facade, while final roof/plaza elevations remain to register. Interior partitions, tenants and finishes remain open. No source-image texture is redistributed by these JSON measurements.

Use with `trim-west-upper-floors.py`; its local candidate records both input hashes, exact plane and outer loop, closed-mesh checks and volume changes. Primary source plan diagrams and reconstruction receipts are in `research/kyoto-station/notes/`.
