# Central gate hardware prototype

28 September 2026. [Chrome inspection views and verification receipts](central-gate-hardware/index.html).

## Construction delivered

A reusable local component contains three gate bodies, one closed standard lane and one clear wide lane. The bodies have an asymmetric curved black cover, raised blue-trimmed side, exposed card-reader pads, ticket mouths, service panels and handles, small fasteners, rounded paddles, entry arrows and reverse no-entry indicators. All geometry and symbols are original; no reference photograph pixels are included.

The [Nippon Signal GX-7 brochure](https://www.signal.co.jp/wordpress/wp-content/themes/signal_2021/images/products/afc/pdf/10_Gx-7.pdf), PDF page 4, supplies comparable nominal dimensions: 1600mm length, 1000mm height and 175mm body width, with ±10mm annotations. The brochure's standard/wide passage values motivate the 600/900mm sample. **This does not identify the exact installed Kyoto unit.** The 2020/2022 Kyoto photographs guide finishes and visible details, with profile points, small fixture dimensions and material values explicitly inferred. This is a hardware study, not a measured three-lane station plan.

The source PDF is saved with SHA-256 `d641236349d0a875215efe8cb0cf37eb9f69ae4744a75c6f1b61c26f0a249461`. Its dimensional page was rendered and visually inspected. The printed code is `99.09 30A`; the catalogue is historical, not current installation evidence.

## Verification

- Final component `central-gate-hardware-05`: 7,576 triangles, eight material batches, zero textures, 204 records, 14 colliding solids.
- GLB SHA-256 `5b62a3cc7fa90dbf7a023b8adf99662642af879b75565a39edda6051528cef4a`; native records `59e413a39bfd9c39cec666701527032f7a88dd27053d0962f0a7e39ae54064b5`.
- Every emitted solid is closed and has positive volume. Browser/native vertices and reversed winding agree exactly; all 7,576 face-normal checks pass.
- Nineteen independent static triangle probes confirm sampled closed-paddle obstruction, clear wide-lane paths, solid housings and exposed reader surfaces. They do not simulate a native ball or avatar.
- Three fixed Chrome/Metal views render without script errors. The first close-up exposed buried reader pads; the final asymmetric cover fixes that. Curves and paddles were refined after inspection.

The sample remains separate from the station. Existing candidate05 and all active game assets are unchanged. No runtime, FPS, audio, or final visual milestone is claimed. The studio environment produces provisional highlights; brushed metal response, edge treatment and in-station appearance still need work.

## Integration dependency

Resolve the actual gate identity, full portal/bridge geometry, barrier depth, lane count and public approach before applying a station transform. The prior camera candidate remains rejected for source occlusion. Installation must preserve public circulation, avoid duplicating old gate fixtures, and revalidate affected courses including Pillar Carom. Do not treat this isolated sample as completion of the central hall or either exterior approach.
