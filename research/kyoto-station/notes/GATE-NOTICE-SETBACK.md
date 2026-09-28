# Central notice setback: photo correction and course checks

28 September 2026. The two central notice stands now sit behind the gate fronts in the private station. The newly introduced Cross Station placement conflict is resolved. The complete reconstruction remains unaccepted.

## Evidence for this correction

The [2022 Central Gate photograph](../photos/gate-central-2022.jpg) shows the central notice feet behind the cabinet fronts. The previous geometry put them ahead. A diagnostic camera was fitted to twelve cabinet observations with six held-out observations. Cabinet widths and height are inferred from comparable hardware, so this is a relative check, not a survey or an accepted station camera.

The image EXIF reports Sony ZV-E10,16mm focal length,24mm equivalent,5328×4000 pixels and Photoshop editing. The4000px fixed-focal diagnostic has4.23px fit RMS and6.72px maximum held-out error at1200px width. A free-focal fit and the3300px sensitivity fit reach a camera-height bound; they are not accepted calibrations. Crop, lens and cabinet-dimension uncertainty remain.

Four visible foot picks, projected onto the assumed foot-top level, fall at local depths8.41–9.03m with the4000px diagnostic. Varying focal length3300–4700px and picks by±6 displayed pixels gives8.01–9.80m. This is a sensitivity range, not a confidence interval. The previous foot extent was7.335–7.985m. A rounded1m setback puts it at8.335–8.985m. The setback was chosen from this evidence before rerunning courses.

![Observed feet and previous/corrected projected outlines](gate-notice-setback/feet-overlay.png)

Yellow circles are observed tips; red outlines are the previous feet; green outlines are the corrected feet. This does not establish exact stand dimensions or the absolute bank position. [Observation and sensitivity data](gate-notice-setback/observation.json) · [Camera fit](gate-notice-setback/cabinet-fit.json).

## Installed change

Exactly twelve central-notice panels moved1m south. Every other geometry record, material, floor, course and circulation record is unchanged. The full bank component still matches its native collision geometry. [Installation proof](gate-notice-setback/install.json).

### Before

![Previous notice placement](gate-notice-setback/before.png)

### After

![Notices behind the gate fronts](gate-notice-setback/after.png)

Same camera and studio lighting. The office context, display artwork and tactile routing remain provisional.

## Gameplay and browser checks

- The166-feature native placement comparison restores Cross Station `patch-3` to a valid placement. No other feature changes. Failures return from32 to the preceding31; this is not a clean campaign.
- The wide lane passes nine floor/headroom probes and walking in both directions. All seven open/closed lane states agree with browser geometry.
- Pillar Carom and Locker Loop each pass two authored throws and one nearby-angle throw at full translation and spin rest.
- Cross Station's two authored throws and nearby-angle throw still fail earlier in the hall. The same inputs fail identically on the pre-bank model: all6,487 poses of each authored run and3,837 poses of the nearby run match exactly. Contact data also match after excluding only random attempt UUIDs. The notice correction fixes placement; it does not repair this older trajectory failure.
- Chrome renders the installed correction without errors. Twelve gate materials and114,981 exported vertices pass attribute checks; all eighteen packed masks pass. All317 existing image streams are byte-identical. Browser build, focused syntax checks and diff checks pass.
- The compressed asset is123,759,584bytes, four bytes larger than its parent, with unchanged2,252,242triangles and1,926batches. No full-game frame-time or audio acceptance is claimed.

[Placements](gate-notice-setback/placements.json) · [Lanes](gate-notice-setback/lanes.json) · [Passing nearby courses](gate-notice-setback/carried-courses.json) · [Cross Station comparison](gate-notice-setback/crossstation-comparison.json) · [Export attributes](gate-notice-setback/attributes.json).

## Larger registration issue remains

The existing July2026 upper-landmark camera cannot support floor-level placement. Rendering the complete station from that camera exposes severe foreground occlusion, and its exploratory floor intersections do not put the visible cabinets within the intended portal. Its upper landmark residuals do not establish a valid lower camera. Do not move the entire bank, bridge or floor using that fit.

![Complete candidate from the upper-landmark diagnostic camera](gate-notice-setback/upper-camera-rejected.png)

The close-up cabinet fit also exposes inaccurate board proportions/placement, so it does not accept the complete gate architecture. Re-establish a camera with visible lower and depth anchors, and register the portal, bridge, bank, offices and tactile route together. Preserve the observed cabinet arrangement and corrected relative notice setback, but allow their absolute placement to change when stronger evidence supports it. Resolve the older Cross Station trajectory alongside the seven previously documented course repairs. Full station, plaza, street, material, lighting, vegetation and Chrome/runtime acceptance remain open.

[All copied evidence hashes](gate-notice-setback/manifest.json)
