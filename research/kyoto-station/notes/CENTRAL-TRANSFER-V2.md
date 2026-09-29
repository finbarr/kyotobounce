# JR–Shinkansen central transfer connection

29 September 2026. Replace the blank end of the JR paid bridge with a route to the Shinkansen concourse.

## Evidence and correction

The saved [JR West station plan](https://www.jr-odekake.net/station/img/premises/0610116.pdf), dated 31 January 2026, and [JR Central's station map](https://railway.jr-central.co.jp/station-guide/shinkansen/kyoto/map.html) place the central transfer gate at the southern end of the conventional railway crossing. Both maps were visually inspected for the transfer relationship, conventional stair access and Nara terminal ends. The current reconstruction instead had a closed bridge end and a closed concourse wall, at two different elevations.

Track 10's provisional western extension also occupied the lower transfer volume. Its western rail, ballast, sleeper and wire ends now match the fitted X−9 m terminal limit already used for track 9. Its platform remains, including the existing access stair and the western end repaired in the Kintetsu delivery. The operator plans establish the terminal arrangement; the exact endpoint remains fitted.

## Connected route

Two eleven-step flights and a 1.8 m middle landing descend from the retained Y7.35 m JR bridge to the Y3.675 m transfer floor. An opening replaces the appropriate bridge floor section. Guardrails and supported side walls enclose the stairwell, while western and eastern side aisles retain access to the conventional-platform stairs.

The lower landing leads through one open lane in a transfer gate bank, then through a matching portal into the Shinkansen paid concourse. Existing stairs continue to both Shinkansen islands. Gate cabinets, retracted leaves, reader panels, direction signs, tactile strips and three light emitters make the connection legible. A closed gate bank remains visible around the open lane.

Floor heights, width, stair count, gate count, finishes and structure are fitted approximations. Gate equipment is static. Lifts, moving transfer escalators, the eastern transfer route and detailed shops remain unfinished. The source plans are research references; no photograph is used as a game texture. Labels use the [documented font](PLATFORM-NUMBER-FONT.md).

## Verification and rebuild

The component replaces sixteen panels and 5,256 browser triangles with 177 panels and 12,012 triangles, a net increase of 6,756 triangles. The correspondence check covers all 36,036 added vertices and their normals. Retained native records and encoded browser data are unchanged. Composition appends 1,020,944 bytes in fourteen material batches. The three emitters use the existing pool of at most two active lights.

Build in order with `prepare-central-transfer.mjs`, `build-central-transfer.mjs` and `web/v2/compose-component.mjs` against the Kintetsu-delivery parent. `central-transfer-scope.mjs` identifies the exact replacement scope. `verify-central-transfer-geometry.mjs` checks matching exports; `verify-central-transfer.mjs` walks the connection and retained routes. `install-central-transfer.py` integrates the component into the editable Blender source and verifies the saved scene after reopening.

The Blender scene saves and reopens with matching geometry, materials, lights and retained bindings. `npm run build:web` and `test:runtime` pass. The native gameplay check includes a 1.35 m walk, complete translation-and-spin rest in 13.94 seconds, a free result, recall and home.

Twelve actual Chrome views cover the stair approaches, landing, both gate faces, Shinkansen arrival, both retained upper aisles, JR10 below the landing, the shortened track end, the Shinkansen stair and the public hall. All views were inspected and have no page errors. Across 1,080 short 1440×900 samples, frame time is 16.7 ms median and approximately 16.8 ms p99/maximum. This is a short visual check, not a sustained performance/audio soak.

The Chrome gameplay check passes entry, walking, a complete throw, result presentation, recall during flight, menu and home. All twenty native walks pass, with 9,872 position samples and endpoint floor heights within 0.06 m. These cover both directions through the transfer stair and gate, connections to both Shinkansen islands, retained JR platform stairs, both bridge side aisles, the JR10 route below the landing, the public hall and the existing Shinkansen entrance. Receipts are retained under `.local/v2/current/components/central-transfer/` after promotion.

The local preview is ready with its native worker, normal entry spawn and the exact verified browser geometry. The promoted Blender source hash matches its installation receipt. Prepared, composed and source candidate copies have been removed; the editable source and current runtime remain in the existing checkout.
