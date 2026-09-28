# NIWA glazing and courtyard reflections

28 September 2026. The playable v2 café now uses the existing thin-glass shader and courtyard reflection capture. The previous material used constant 24% opacity and the main hall environment. The glass and adjacent aluminium/dark metal now reflect the courtyard. The glass retains stronger reflections at grazing angles without making the whole pane opaque.

The existing JR Central September 2025 courtyard photograph (`photos/niwa-jr-02a.jpg`) and Rurubu frontage photograph (`photos/niwa-rurubu-frontage.jpg`) show clear glazing, visible interior fittings and exterior reflections. They guide the appearance; the optical values remain an approximation. Source links and dating are in `COURTYARD-LIFE.md`.

Implementation is in `web/public/station-materials.js` and `station-look.js`. The exact material-name allowlist keeps other station surfaces on their existing environment. The local glass uses Three's standard environment sampler, so the station-wide shader blend cannot silently replace the assigned courtyard map. No new reflection capture, render pass, texture asset, geometry export or collision change is introduced.

Validation: `npm run build:web`, the existing `station-render-integration.mjs` authored-material check, and `node web/tests/courtyard-glass-browser.mjs` pass. The latter compiles and renders the actual v2 assets in Chrome at 1280 × 800, checks glass/frame environment assignment and blend settings, moves the inspection camera, and verifies five fixed captures, stable texture count and no JavaScript/shader errors. A ten-second sample produced 601 frames, p50/p95 16.7 ms and maximum 16.8 ms. This is a focused render check, not a full performance or audio soak.

Current view images and receipt are in `.local/v2/courtyard-glass/`. The v2 source layout, GLB and native worker are unchanged from the foundation. The close view exposes a more significant remaining gap: the café interior is sparse and its broad rear surfaces are uniformly bright. Improve the reference-supported interior next, without compensating by making the exterior glass opaque.
