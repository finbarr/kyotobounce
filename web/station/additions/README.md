# Kyoto Station public spaces

The September 2026 additions implement the 22 packages in the [station queue](../../../docs/STATION-DETAIL-BACKLOG.md). The operator's floor maps establish floors, building wings and connections. Public photographs establish architectural motifs and furnishing types. Dimensions, shelf stock, private interiors and artwork are original interpretations; this is not a measured replica or an official model.

The [acceptance report](ACCEPTANCE.md) records the completed native, browser and performance checks, including measured limits.

## Source and registration

The [operator floor guide](https://www.kyoto-station-building.co.jp/floorguide/) and [public-space photographs](https://www.kyoto-station-building.co.jp/service/square/) are the primary references. Individual inspection cameras retain their source URL and three named anchors in `stationAdditions.views`. Native coordinates use X east, Y up and Z north; browser Z is negated. Floor labels follow the operator map, not a uniform floor-height assumption.

| Packages | Implemented features | Inspection views (`add-` prefix) |
| --- | --- | --- |
| K056 | Registered floor/wing layers, diagnostic roof camera, reference and route metadata, selectable camera inspector | All named views; `garden-arrival` replaces the unusable roof pose |
| K038 | Separate 1F Central Gate Heart-in; striped frontage, open entrance, checkout, stocked shelves, refrigerator wall, rear glazing | `heart1f-hall`, `heart1f-forecourt` |
| K039 | Yojiya, travel and currency exchange in mapped west-to-east order; original counters, screens and displays | `yojiya1f-retail-order`, `yojiya1f-retail-return` |
| K040 | Concourse floor opening, Porta stairs and enclosed lower landing; 1F Isetan vestibule and inner glass doors | `porta-mouth`, `porta-landing`, `isetan1f-arrival`, `isetan1f-inside` |
| K041 | One Osake frontage and wider 7 Taps frontage; east service cluster, lockers, lift, police booth and hotel canopy | `east1f-retail`, `east1f-retail-return`, `east1f-hotel` |
| K042 | Depth behind Central Gate, columns and platform signs; passenger-service windows and original departure displays | `central-gate-arrival`, `central-gate-oblique` |
| K035 | Banded columns, complete soffit bays, round lamps, longitudinal grilles, capitals and trim | `hall-soffit-approach`, `hall-soffit-reverse` |
| K043 | Continuous 2F public passage, north landing connection, West Gate, Porta branch and south stairs | `passage2f-north-arrival`, `passage2f-return` |
| K044 | West Square curved balcony and diamond band, polished columns, retail shutters, side stair and slatted ceiling | `westsquare-approach`, `westsquare-reverse` |
| K033 | Bounded facade bay families, small recess arrays, projecting bands, grilles and end transitions | `facade-long-west`, `facade-long-east` |
| K045 | Theater foyer, entrance doors, poster cases and box office; Washoku Koji entry and dining silhouettes | `theater2f-foyer`, `theater2f-reverse` |
| K046 | 3F south promenade, parapet apertures, drain slots, planting and connections at both ends | `promenade3f-west`, `promenade3f-east` |
| K047 | 4F Wood Square, irregular turf, timber logs and climbing form, dome, peach ceiling form, counters, stools and outlets | `wood4f-turf`, `wood4f-work` |
| K048 | East Square perforated yellow volume, floor lamps and facade base; retained tree, globe gazebo, piano and miniature | `eastsquare-gazebo`, `eastsquare-reverse` |
| K049 | Open NIWA threshold in the south East Square frontage, retained curved canopy, tea counter, menu and lattice | `niwa-arrival`, `niwa-interior` |
| K036 | Denser bamboo, low perimeter planting, screen, benches, warm mineral paving and drainage | `garden-arrival`, `garden-edge` |
| K051 | Skyway frosted bases, clear north glazing, skirtings, brackets, roof ties, lamps and portal signs | `skyway-long`, `skyway-outward`, `skyway-portal` |
| K053 | Physical guidance ribs and dotted junction pads, shop thresholds, drainage and finish transitions | Retail/passage routes and low-angle floor views |
| K055 | Mineral and timber microstructure, retained authored colors/roughness, indirect/daylight balance and emissive fixtures | Matched hall, covered interior and garden comparisons |
| K050 | FUKUNAGA901 at 8F, KATO at 9F and Ramen Koji at 10F; mapped stair landings, visible interiors and original displays | `fukunaga-entry`, `fukunaga-reverse`, `kato-entry`, `kato-reverse`, `ramen10f-arrival`, `ramen10f-inside` |
| K052 | Six north forecourt shelters with Stone Museum sample arrays, benches, lamps, signs and bollards | `stonemuseum-inside`, `stonemuseum-outside` |
| K054 | Original evening artwork at the Grand Staircase risers, East Square wall and Skyway; optional Day/Evening control | Night captures of all three documented installation locations |

Additional tenant checks: [NIWA](https://www.kyoto-station-building.co.jp/restaurant_cafe/004/), [FUKUNAGA901](https://www.fukunaga294.jp/location.html), and [KATO's access directions](https://www.katomodels-kyoto.com/storeinfo). Current tenant identity is separate from the date of a structural reference photograph. Departure times, menus and product packaging are illustrative artwork, not live information.

## Authoring and collision

`geometry.py` creates visible meshes and native colliders from the same dimensions. The builder verifies every generated solid against its Blender world bounds to 0.1 mm numerical tolerance. That tolerance checks export consistency, not real-world survey accuracy. Small printed artwork and leaves are cosmetic; shelves, furniture, raised tactile features, glazing, steps and guards are physical.

`ground.py`, `circulation.py` and `terraces.py` are the authoring layers. `build.py` starts from the pinned assets-v5 source and layout (`b304c84aa1292e9e401c4abde9d305f754548d3b815fba8137802c9a2a385515`) so rerunning cannot accumulate duplicate additions. Use Blender 5.2.1 LTS:

```sh
blender -b --threads 2 --python-exit-code 1 --python web/station/additions/build.py -- \
  --baseline .local/base --output .local/station-candidate
```

The baseline directory contains the pinned `KyotoAtrium.blend`, `station-layout.json` and `textures/`. For ordinary edits to the current asset pack, edit its current Blender source and use the standard [matching export workflow](../../../docs/ASSETS.md); no old source copy is required in the working tree.

The Porta stair mouth replaces the original concourse panel with one matching cut mesh retaining the `concourse` surface ID. Existing solid walls are cut at actual new doorways. Adjacent floor slabs meet at their boundaries; overlapping decorative paving is separated vertically. Paid gate flaps remain closed. The new south promenade connects to the existing approach stair and eastern landing without passing through a facade.

## Verification

Select a compatible `KYOTO_WORKER_EXECUTABLE`. The geometry changes do not modify native C#; the worker loads the selected layout at startup.

```sh
node web/station/additions/check-native.mjs .local/station-candidate/station-layout.json .local/station-walks
node web/station/additions/check-contacts.mjs .local/station-candidate/station-layout.json .local/station-contacts
```

The first script checks floor support, head clearance and actual capsule walking along every authored public route. The second checks actual ball impact events against representative fixtures and architecture. Neither uses a game database or production service. Then run the complete current campaign proof and isolated service integration tests after selecting the matching canonical assets.

For visual review, start `node web/benchmarks/server.mjs 4350 HEAD` and open `http://127.0.0.1:4350/?variant=optimized&inspect`. The inspector provides named cameras, editable camera coordinates, Day/Evening switching and full-resolution captures. Its lighting clock advances so practical lights settle after changing viewpoints. The inspector moves the reverse retail camera clear of the retained escalator casing. The ordinary benchmark retains its four fixed camera routes and drawing-buffer resolution.

Signs share bounded, deduplicated 4096×2048 atlas pages. Night artwork uses three static mesh batches and time uniforms. The practical-light pool remains two shadowless lights; no light is created per LED. Opaque additions use coarser spatial export bins; transparent surfaces retain the original fine bins. The lossless delivery build preserves geometry, texture dimensions, normals and UV seams.

Research photographs remain outside Git and the asset archive. Review captures and measured acceptance receipts are generated artifacts, not shipped textures.
