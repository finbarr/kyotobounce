# Granvia north bank: parking to hotel lobby

## Evidence and scope

The hotel-supplied plan on printed page 8 of the [MLIT accessibility case study](https://www.mlit.go.jp/common/001264618.pdf) identifies the north bank as the lifts connecting underground parking, reception and guest floors. It shows two opposing cars beside the central entrance. The separate lift from the 1F drop-off to 2F is a different installation.

The [current hotel floor guide](https://jrwest-hotels.jp/granvia-kyoto/floor/) corroborates the opposing north-bank layout. The [firsthand parking guide](https://kyoto-rys.com/hotel/granvia/parking/) places the hotel entrance at the eastern end of B3 and shows a warm stone vestibule and dark hotel fascia within the concrete garage.

Saved references are `maps/granvia-mlit-accessibility-case.pdf`, `maps/granvia-2f-map.jpg`, `maps/east-parking-access-2026.jpg` and `photos/granvia-parking-entrance-guide.jpg`, relative to the research folder. These are reference copies; the game uses original geometry and lettering.

This increment connects the two constructed stops, B3 and 2F. Guest floors remain unfinished. Position and dimensions are fitted to the existing station model; the diagrams are not dimensioned surveys.

## Acceptance

- Two opposing cars connect B3 parking and the hotel 2F lobby.
- Both cars have usable thresholds and closed landing doors when the car is away.
- Shafts pass through actual openings in every intersecting slab and retained building surface.
- Garage aisles reach the lower vestibule; the central entrance and main hotel lobby reach the upper vestibule. The east–west lobby route passes south of the bank.
- The adjoining Porta aisle remains usable.
- Native and browser geometry agree, including retained texture coordinates and normals; the editable source is saved and reopened successfully.
- Native and Chrome walking and lift checks pass, along with local gameplay and browser asset checks.

## Implementation

The bank occupies X 34.7–43.7 and Z −5.85–−2.35. The lower approach enters from the north and the upper approach from the south. Nonstop levels remain enclosed. The current garage's eastern wall meets the core; its small extension supports the eastern car.

The ground-floor recess and concourse share a coplanar granite top in the browser export. Their opening is cut together, including the recess underside, then the retained hotel faces are reconstructed with their original UVs and normals. A 0.0072 m² omission in the old thin recess rim is restored from the canonical geometry.

Build tools: `prepare-granvia-parking.py`, `build-granvia-parking.mjs`, and `integrate-granvia-parking.mjs`, with the existing static replacement, floor opening, source installation and lift verification helpers.

## Verification

- Twelve native route walks, 1,685 samples: both garage aisles, central entrance, main lobby, southern lobby bypass and Porta aisle.
- Ten native lift checks and 1,204 ride samples: both cars, grounded rides, both thresholds, doorway sensing and closed landing doors when the car is away.
- Ten Chrome lift checks, including matching native/rendered part positions; six ordinary keyboard routes with 29 waypoints.
- Independent checks of both car travel volumes and all four doorways, plus browser/native geometry, texture coordinates and normals.
- The editable Blender scene is saved and reopened; 77 added panels, 16 retired panels, 17 modified surfaces and 36 moving lift parts match the candidate.
- Local `npm run test:runtime`, Chrome gameplay and `npm run build:web` pass, including walking, full translation/spin rest, recall and home from the final aisle spawn.
- Five Chrome views after texture warmup: 600 frame intervals, median 16.7 ms and p99 16.8 ms at 1440 × 900; 374 textures and seven reflection captures remain stable. This is a short check, not a release soak.

The first browser inspection caught mirrored sign lettering. Its UV correction was checked against a hash of every other native input, allowing unchanged native checks to be reused. Chrome also caught a test waypoint too close to a retained column; the central route and bypass now give it proper clearance and were rechecked. The initial spawn faced the garage wall too closely, so entry now starts in the clear north aisle at X 35, Z 3.5.

The static GLB grows by 878,568 bytes. Escalator hardware is unchanged. Higher guest floors, exact surveyed dimensions and detailed hotel finishes remain outside this increment.

## Delivery

The complete local bundle and editable source are promoted in place, with small component files and receipts retained under `.local/v2/current/components/granvia-parking/`. The temporary full candidate and port 4426 overlay are removed after verification. `web/v2/assets.json` identifies the playable build; run `npm run dev:v2 -- 4425`.

Canonical layout: `63a9f12ea3c9c3772e7f441d2ec9ae183152625761f0f8c5eefd5cb8aa42b7d5`.
Static geometry: `3b2688f34f07fc830b09a036fffdca4e6e84f5d9fcdc256d75cf96fd3f75f1b6`.
Editable source: `d22993206fdd2772144463cc15743220d720dae25a99bea293704d6d7a23ec0d`.
