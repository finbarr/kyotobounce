# Remote readiness — 28 September 2026

The reconstruction source and methods are committed on `codex/station-research`. Private assets were restored as 25,679 independent files on `kyoto-seed`, with every distinct content hash checked. The latest source commit is recorded in Git; this report does not claim the station itself is finished.

## Verified on the CPU seed

- Node typecheck, unit tests and browser asset build.
- All 250 catalogued research-file hashes.
- 188/188 native landing triangle probes and 6/6 carried-course throws.
- Full private station rendered in Chrome with no page errors.
- Fresh full-station Blender export and 114,981 restored vertex attributes.
- Native first-level entry and complete Level 0 tutorial/replay/progress checks.
- Linux missing-font fallback without saving the original source blend.
- Bounded Codex task execution using the BoxHaven wrapper.

Detailed receipts are in `.local/remote-prep/verification`, with the asset manifest and agent/font receipts alongside it. A private copy of these receipts is retained separately for migration.

## Remaining GPU verification

The full-game browser test exposed stale onboarding and canvas selectors, now corrected. Its complete gameplay run has not passed remotely yet. CPU software rendering took several seconds per frame, so the user requested a GPU VM. Hardware WebGL, Blender GPU rendering and the full-game browser check remain required before calling the final worker image ready.

BoxHaven advertised RTX 4000 Ada at $1.82/hour, RTX 6000 Ada and L40S at $3.77/hour. The provider rejected the RTX 4000 create in Toronto. Its authenticated live size API returned no available regions for any of those three plans. These are time-specific capacity observations, not permanent unsupported configurations.

The existing Kyoto base image was copied from New York to Toronto successfully. No GPU VM or worker clones have been created. The prepared CPU seed is retained. Any snapshot labelled `transport` preserves preparation only; it is not the final verified GPU image.

## Next steps

1. Obtain an available RTX/L40S-class GPU machine or select another provider.
2. Install and validate the driver; run `tools/remote/gpu-check.mjs` with hardware ANGLE and inspect the recorded NVIDIA renderer.
3. Restore the private checkpoint and preserve the prior evidence. Run the corrected browser gameplay check and a Blender GPU render.
4. Sanitize the verified seed, snapshot it, and create three independent workers with the ownership proposed in `DELEGATION.md`.
5. Verify each clone's source, asset hashes, unique machine/SSH identities, native worker, renderer and bounded Codex execution. Begin construction only under the next agreed goal.

Production is unchanged. No source push, deployment or autonomous construction was performed during this preparation.
