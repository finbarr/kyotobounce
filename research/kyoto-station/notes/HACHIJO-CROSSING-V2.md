# Hachijo Street: public underground crossing

29 September 2026. Connect the subway South lobby to the south side of Hachijo Street, with a continuous passage, two street lifts, a sunken garden, stairs and an Avanti receiving lobby.

## Evidence and correction

The [Kintetsu step-free subway route](https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_BF_03.pdf), dated 20 January 2026, supplies a more specific position for the northern passage lift. Page 3 shows it outside on the station frontage, followed by about 50 m of underground passage before the turn toward the subway gate. The provisional lift beside the indoor stair was too far north. This increment moves it to the forecourt and restores the four old shaft openings, including the railway subgrade. Pages 2–3 were rendered and visually inspected; the reference is saved as `maps/kintetsu-subway-step-free-2026.pdf`.

The [city's station page](https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm) confirms accessible exits on both sides of Hachijo Street. Page 2 of the saved [municipal forecourt brochure](https://www2.city.kyoto.lg.jp/html/shikai/img/joho/kankobutsu/siryou/H28/13-2.pdf) shows the southern bus area and sunken garden. It is a 2016 architectural reference. The [Avanti B1 plan](https://www.kyoto-avanti.com/guide/floor_b1f.html) and [Card Labo's entrance photographs](https://www.c-labo.jp/shop/kyoto/access/) inform the station-facing connection, tiled descent, handrails and receiving lobby. The photographs are undated, with 2017 upload paths; they are not evidence of current tenants.

Saved references and their hashes are in `sources.json`. Game signs are original text and shapes; no research image pixels are included in the game.

## Construction

The public passage opens beside the retained southern stair and ticket machines. It continues at Y−6.2 m to the station-frontage lift at X166, Z−189.8, then beneath the fitted street to the southern garden. The northern lift reaches the existing forecourt at Y0. A second lift, at X178, Z−236, connects the garden's eastern lobby to the southern pavement. Both reuse the verified native car, doors, sensors and rider mechanics. The other two lifts and all thirty escalator lanes remain unchanged.

The southern arrival is open to the sky. A guarded two-flight stair reaches the surrounding pavement; a west-facing portal connects to a usable Avanti entrance lobby. Retaining walls and headers close the exposed ground above both lower portals while preserving 3.4 m headroom. Upper guards, thresholds, tactile routes, original bilingual signs and corridor fixtures complete the connection. A local road and zebra crossing make a walkable loop between the two street landings. Sixteen fixtures share the existing pool of at most two active lights.

The evidence establishes the public connections and the exterior northern lift. Corridor dimensions, floor elevations, stair counts, street alignment, garden outline and finishes are fitted approximations. Avanti's wider shopping floor, complete building and the bus terminal remain unfinished.

## Verification and rebuild

Browser/native correspondence covers 474 added or replacement panels, 17,928 vertices and 5,976 triangles. Thirty-two obsolete surfaces remove 600 triangles. Unrelated native records and retained browser buffer bytes remain unchanged. The lift verifier checks the deliberate replacement and addition against the same definitions in both exports.

An independent coverage check proves that the four indoor slabs are restored, the outdoor shaft and garden openings are clear, and the public floors form one continuous 1,596.5 m² footprint without overlapping floor plates. It clips nearby static faces against both cars' complete travel volumes and finds no obstruction.

Twelve normal-speed native walks pass with 8,514 position samples. They cover the complete underpass, both street approaches, garden stair, Avanti lobby and surface crossing in both directions. All endpoints meet the floor-height checks. Four boundary checks pass at the upper garden edge, tunnel side wall and both portal guards. The wall-contact check permits only the rise established by its explicit 22 cm skirting panel; the measured capsule rise is about 11 cm, with no fall or wall crossing. Verified route samples are reused only when both the complete layout hash and route points match.

Both lifts pass seven Chrome checks: entry, doorway obstruction, independent private sessions, upper landing exit, the protected empty lower shaft, throw/recall during descent, and the return trip. Twelve surrounding Chrome views cover the indoor connection, both lift lobbies, street arrivals, garden, stair and Avanti entrance. Short 1440×900 samples record about 16.7 ms median and 16.8 ms p99, with 369 textures and seven reflection captures stable. These are short view checks, not a sustained performance benchmark.

The native play loop and normal Chrome controls pass walking, complete translation/spin rest, free results, recall, menu and home. `npm run build:web` passes. The existing lift-capable native worker is reused. The editable Blender source saves and reopens with matching static geometry, normals, UVs, retained bindings and 36 lift parts; its SHA-256 is `316b15ef6a216330e97f0914e53394f3a8523c71cfa2c1fbe0c44459e38ced28`.

The first visual inspection found exposed ground above the tunnel and southern lift-lobby openings. Retaining headers and upper rails close those gaps; the updated views were inspected again. The first lift check also exposed a test-client handshake timeout during initial texture loading. The second test client now connects after loading, and both lift checks pass. No service behavior changes were required.

Run `prepare-hachijo-crossing.py`, `prepare-east-transfer-base.mjs`, `build-hachijo-crossing.mjs`, `web/v2/compose-component.mjs` and `integrate-hachijo-crossing.mjs` in order against the parent manifest. Checks use `verify-east-transfer-geometry.mjs`, `verify-hachijo-crossing-openings.py` and `verify-east-transfer.mjs`. The parameterized `inspect-exit-five-chrome.mjs` accepts a lift ID from `lift-specs.json`; `hachijo-crossing-views.json` defines the surrounding views. `install-east-transfer.py` removes the superseded lift's editable parts and installs both verified cars and the new construction in the Blender source.

Net static growth is 5,376 triangles; the component appends 818,844 browser bytes. One existing moving car is relocated and one eighteen-part car is added. Current asset identities are pinned in `web/v2/assets.json`; private verification receipts are kept under `.local/v2/current/components/hachijo-crossing/` after delivery. Superseded full scenes are removed after promotion.

The promoted local build passes a 1.35 m walk, complete translation/spin rest at 8.53 s, free results, recall and home. Cleanup removed 1,271,654,450 bytes of superseded candidate scenes, layouts and stopped preview output. The current editable source, texture links and verification receipts remain.
