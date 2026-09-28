# Eastern Skyway landing and paired descent

27 September 2026. [Construction review](east-skyway-construction/index.html).

## Evidence and decision

The official 10F schematic and dated 2014 photograph establish paired escalators continuing eastward from the Skyway and arriving beside East Square. The current game uses an explicitly inferred 33.5 m arrival floor and a bank roughly 14 m south of the newly registered corridor. Reusing that position would break the source-aligned roof/route relationship.

The municipal source has 37 upward courtyard faces around 29.973 m, with 0.000144 m maximum plane residual. This is a coarse envelope that flattens local level changes, not an as-built interior survey. Candidate01 uses that envelope for its provisional lower datum, a 30 degree incline and existing one-metre lanes. Exact placement, incline and garden/arrival relationships remain open.

Upper endpoint renderer [74.97643479116476, 44.942838819652714, -16.669478987557532]; lower datum 29.973372603 m; rise 14.969466217 m; inclined run 25.927876049 m. The upper landing joins the current central corridor. The short lower apron does not replace the complete court or onward routes.

## Construction and checks

- Existing functioning eastern rail, casing, pit and glass construction is transformed to the new bank. Lane widths, tread height, operating speeds and phase settings are retained. The six visible native casing surfaces are rebuilt from the exact new public path, without duplicate colliders.
- 73 closed positive-volume panels /51,948 static triangles /four materials; two moving lanes of 165 steps. Complete assembly07:28,487 panels /405,944 static triangles /18 materials, plus moving treads.
- Native04: 14/14 walking trials and2/2 stand-still riding trials pass. 210 headroom checks agree with native physics; 42 fixed support samples pass. Actual walking proves support through the moving portion because placement RPCs intentionally reject moving treads.
- 64,000 browser/native-box-oracle height samples over80 phases pass; maximum height error4.79417e-7 m, adjacent join error1.86265e-6 m.23,248 continuous return-loop corner checks remain within the housing envelope; minimum end clearance0.058893 m.
- Upper deck/corridor seam error6.1e-10 m.99 source-support samples cover the arrival apron; maximum source height difference0.0000924 m. All component and assembly serialized coordinates/winding indices checked; maximum float conversion error4.28178e-6 m.
- Component GLB/native/report rebuild byte for byte. Browser asset build, relevant JavaScript syntax and diff checks pass. No C# or service changes, native rebuild, game installation, commit or deployment.

## Retained discrepancies and harness corrections

The untouched source has two vertical closure faces (`Untitled.203`6713 and6724) crossing the upper route boundary.2/138 conservative body-volume samples intersect them. A subsequent audit checks those two volumes against all 740 municipal station panels actually installed in the game and finds zero intersections. The imported frontage is clipped to native Z ≥18, while this route is near Z16.7. These source-only closures require no cut to the currently imported walls. See `east-skyway-construction/installed-entrance.json`; whole-route integration remains open.

First native audit stopped because the strict fixed-target helper rejected a narrow face. Raw replies now retain ray hits even when an entire scoring target cannot fit. The next trial completed four walks before a0.3m start circle was rejected near the corridor rail; fixtures now start on the wider landing, and the corridor joint has two separate walking trials. A subsequent run completed all14 walks but its mid-escalator positioning deadline expired while trying to settle within0.18m of an exact moving-lane target. The standing-ride trial now stops anywhere within0.75m of the lane midpoint; displacement tolerances are unchanged. The source-context camera’s first attempt used an unsanitized GLTF object name and timed out; it now uses the verified `Untitled203` render name, and the viewer surfaces page errors promptly.

The source aerial, component side/top and municipal-context views were inspected in Chrome. They use unregistered cameras and inspection lighting. The dated photograph has a different camera. No final visual or performance milestone is accepted.

## Reproducibility

- Component GLB `f0c97ae615c88cef6d84c1619e952e5f6c4cf0b08f026dcbbac01218a875549c`; native `f2c1250fe34266b9c234fe4a65d491e2fa19db744bb08e2543e019ce3c00e9f0`.
- Assembly GLB `c6aabeb555bbadb056ad4b43de88102e255911a04df0ac5fdd0b2542e48f6cef`; native `421e361c1f2c7543d50b47a985ecda648da03d38877ab124d60a530772defe52`.
- Tools: `audit-east-skyway-source.mjs`, `build-east-skyway.mjs`, `audit-east-skyway.mjs`, `verify-east-skyway-geometry.mjs`, `verify-east-skyway-motion.mjs`, `audit-east-skyway-source-clearance.mjs`; registration `registrations/east-skyway.json`.
- Composition now carries optional escalator specifications and comb supports. The source viewer can use the actual game tread renderer at a fixed recorded time. Previous static components remain unchanged.
- Receipts are copied into the linked gallery. Authoritative scratch outputs are `.local/station-realism/east-skyway-01`, `east-skyway-native-04`, and `roof-skyway-assembly-07` in the isolated worktree.

Next: refine the photographed eastern landing/court levels, resolve the remaining source interfaces and inner shell, add suspended supports, and integrate the complete roof/Skyway with replacement of obsolete geometry. Preserve other routes/course identities, resolve Skyway Trapdoor against the final geometry, and continue the full materials, lighting, plazas/streets, vegetation/evening and Chrome performance scope. The full long-term goal remains active.

Gallery QA passes in Chrome at 1440/390 px: six images, fourteen links, no overflow or page errors. Desktop rendering inspected. Receipt: `east-skyway-construction/gallery-qa.json`.
