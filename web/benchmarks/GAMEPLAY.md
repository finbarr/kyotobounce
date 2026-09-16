# Gameplay regression measurements

Use an isolated worktree with its own current native worker and database:

```sh
npm run dev -- 4386
node web/benchmarks/gameplay-server.mjs 4391 4386 final
```

Open `http://127.0.0.1:4391` in a real browser, finish the local name/robot setup, then click **Run 100-throw benchmark**. Keep that tab foregrounded and close other test scenes. The harness uses the real game renderer, input functions, service, native worker and trajectory playback. It performs ten warmup throws and 100 measured throws, alternating courses every ten throws and recalling each shot three times. It records frame-time percentiles, long frames, render resources, browser heap when available, and local service/worker RSS in `.local/gameplay-benchmark/`. Do not point it at production.

Use **Play suggested shot** for a complete native shot. **Cycle replay 10 times** opens/closes a saved local replay; supply another player's local replay ID to exercise avatar replacement. Check that geometry/texture counts plateau. Heap and RSS include bounded caches and normal garbage collection; a high single sample does not establish a leak.

**Inspect gameplay** exposes the camera, charge and attempt state. **Station seam**, **Inspect seam** and **Sweep view** provide repeatable camera angles at the repaired seams. The separate `/__gameplay/robot-lab.html` page uses the actual rig and pose code to review characters, direction changes, slopes, both windups and celebrations beside the social artwork.

The proxy binds to loopback and adds these hooks only to local responses. None of this harness is included in the production runtime package. Geometry assertions use `node web/tests/station-overlaps.mjs`; actual-rig motion/disposal checks use `npm run test:avatar` and `node web/tests/robot-movement-settle.mjs`. Run `KYOTO_TEST_ORIGIN=http://127.0.0.1:4386 node web/tests/robot-movement-runtime.mjs` for native traversal (including stairs/escalators).

After a real successful shot, **Preview local completion fixture** tests rank 250, final-campaign and custom-course result layouts without submitting scores. It also checks repeated Space keydowns at completion. Use the real Next button or a fresh Space/N press to check navigation; reload after fixtures before further physics tests.
