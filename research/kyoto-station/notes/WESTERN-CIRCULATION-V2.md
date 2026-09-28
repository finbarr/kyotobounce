# Western circulation — v2

28 September 2026. This iteration replaces the inherited lower western escalators, rectangular intermediate landing, upper escalators and lower staircase with a connected assembly derived from Kyoto City's municipal model. It retains the completed NIWA café work. This is a local v2 delivery; the surrounding western frontage and onward Grand Stairway connection still need reconstruction.

## Architecture

- Two lower lanes rise from 0.0366 m to 5.6520 m over a 9.6916 m incline run. The inherited landing was 7.35 m high and its lower lanes had a 12.6 m run at different plan coordinates.
- Two upper lanes reach the 15.6147 m source landing over a 17.1946 m run. The inherited upper lanes reached 19.5860 m.
- The intermediate and upper landing outlines follow the source's horizontal faces, including the angled connection and curved upper edge. Their plan areas are about 613.87 and 145.19 square metres.
- The adjacent staircase contains 31 source treads, including its intermediate flat section.
- Landing glass, metal caps and shoes follow the source's straight, diagonal and curved guard outlines. The narrow `BuildingInstallation.2030` strip is a guard base; it is not an additional walking platform.
- Old lane casings, steps, landing geometry, attached tactile plates and 20 obsolete hardware batches are retired. No retired course target constrains this change.

Source: [Kyoto City's municipal model](https://data.city.kyoto.lg.jp/resource/?id=21224), CC BY 4.0, already retained in the research workspace. Source SHA is verified and recorded in the generated specification. Lower treads/housing are `BuildingInstallation.1082` / `.1206`; upper treads/housing are `.1562` / `.1557`. Floor and stair faces come from `Untitled.200`; guard caps from `.1261`, `.1243` and `.1118`.

These are model-derived dimensions, not surveyed measurements. Floor topology is joined on a 10-micrometre grid. Slab depths, glass thickness, casing profiles, easing, operating speed and direction remain explicit construction assumptions. Comb elevations meet the source floor datums, approximately 18 mm above the source metal plates.

## Source and local assets

The editable steps are:

1. `prepare-west-circulation-v2.mjs` extracts the relevant source faces.
2. `prepare-west-circulation-v2.py` joins the floors and fits both banks to their tread/plate geometry.
3. `build-west-circulation-v2.mjs` emits matching browser and native geometry, reusing the existing native moving-step mechanism.
4. `install-west-circulation-v2.py` replaces the old authored objects in a private Blender/layout candidate. The normal browser exporter and lossless compressor produce the runtime model.
5. `prepare-west-motion-v2.mjs` retires old hardware nodes and updates the exact comb boundaries and landing markers. Unrelated hardware buffers remain byte-identical.
6. The existing service-counter and alcove builders/composer carry the café improvements into the new station.

Current source component: `.local/v2/west-circulation-component-03/`, 162 closed parts, 76,692 triangles and four material groups. Dynamic tread bodies are separate. The complete asset selection and hashes are in `web/v2/assets.json`.

- Integrated source layout: `deb67ce99da6d400b7bacb34dc2cada2417dd9d0e78c865a5198c286f652c211`
- Runtime GLB: `983f6cce1f1bf552e64ef6c27e3325a7cf6b26005df54b271e72359b13de839e`, 122,413,532 bytes
- Running spawn-only layout: `342f7a543fe7cadf941bbf97d8e04ceb7c7a8929bc3bd6e381d187d4661d3e23`
- Final composed assets: `.local/v2/station-west-complete-04/`
- Source Blender scene: `.local/v2/station-west-circulation-04/KyotoAtrium.blend`

The source, compression and composition receipts remain beside their outputs. Superseded draft Blender/GLB binaries were removed; their diagnostic reports and the previous committed playable checkpoint remain.

The launcher supports a selected hardware GLB and verifies its hash. It also checks the western comb metadata against the native layout. Returning to a selection without a hardware override removes only its own recorded symlink.

## Verification

- Serialization: all 101,532 component vertices and all indices/winding agree; maximum Float32 position difference 2.30 micrometres.
- Complete native collision candidate: both connected lane routes pass uphill and downhill; the staircase passes in both directions. The six traversals contain 873 observed poses. Heights stay within 0.110 m of the eased escalator profile and 0.201 m of the staircase interpolation, including the capsule's floor offset.
- The first stair check exposed an unrelated source fitting incorrectly selected as a tread. The selection now requires the actual stair footprint; the corrected 31-tread route passes.
- Final installed physics records are compared to the walked candidate after Float32 conversion. The only subsequent collision removals are the 16 old lane tactile panels at obsolete positions, at least 7.56 m horizontally from all 873 observed route poses.
- Actual Chrome inspection covers the lower entry, connected route and curved upper landing. All four new tread groups animate; obsolete hardware names are absent. Texture count and five reflection captures remain fixed. The focused ten-second 1280 × 800 sample has p95 16.7 ms and maximum 16.8 ms. The retained café check also passes at those frame times. This is not a long performance soak.
- Browser build and the integrated v2 spawn/walk/throw/full-rest/recall/Home check pass.

Native receipts are in `.local/v2/west-circulation-walk-03/`. Browser captures and receipt are in `.local/v2/west-circulation-browser-check/`. Generated media, layouts and GLBs remain outside Git.

## Iteration cost and next work

Source interpretation, mechanical integration and the full station export dominated this change. Profiling found a repeated linear layout lookup in the Blender installer; the installer now uses indexed lookups. The source, textures, worker binary and moving-step code were reused. A follow-up export removes attached tactile remnants found during actual browser inspection.

Next, reconcile the surrounding western frontage/gallery and onward upper connection against these corrected landings. Several inherited masses and fittings remain visibly provisional. Keep that work separate from the completed escalator/stair route, and continue to ignore retired course placement requirements.
