# Eastern roof envelope

Source: [Kyoto City station model](https://data.city.kyoto.lg.jp/resource/?id=21224), CC BY 4.0. Attribution: Kyoto City; selection and construction by Kyoto Bounce, 27 September 2026. The JSON next to this note contains the original source hash, exact object/face identities and measured boundary anchors.

The independent component reconstructs the coarse glass envelope and provisional outer grid. It does not establish surveyed accuracy, glazing specifications, truss depth or module phase. Small source attachment openings remain visible. The source-context comparison and the failed full-station component-only expectations are retained in the primary research library's `notes/east-roof-construction/` gallery.

For integration, filter selected faces in the original triangulated municipal mesh before applying frontage clipping. The existing frontage was clipped before triangulation; non-planar polygons changed diagonals, so post-clipping triangle identity is not reliable. The incomplete diagnostic mask must not be used for broad mesh deletion.
