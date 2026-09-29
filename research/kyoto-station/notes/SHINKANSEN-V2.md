# Shinkansen concourse, platforms and railway

29 September 2026. Connect the southern public hall to the elevated Shinkansen railway.

## Delivered structure

One central gate lane now opens into the paid concourse. The temporary receiving-room end wall is removed. Two staircases, each with 36 risers and an intermediate landing, lead through matching ceiling and deck openings to islands 11–12 and 13–14. Their upper landings join the platform floors; guardrails protect the openings and platform ends.

The railway has four tracks, sleepers, profiled rails, an elevated deck and bearings, canopy supports, overhead wires, tactile strips, platform numbers and closed pipe-style platform barriers. The canopies use the two registered municipal roof outlines. The public north–south passage remains open below the deck.

The paid floor is Y3.675 m, platform floor Y9.975 m and rail head Y8.725 m in the current game frame. The two islands run 410 m along X; track/deck geometry runs 495 m. These elevations, lengths, widths, stair locations, curves, support positions and concourse boundary are fitted approximations. The 1.435 m nominal rail gauge follows the technical reference below.

Kintetsu's terminal, JR transfer gates, eastern and ground-level entrances, lifts, escalators, shops and the complete Hachijo frontage remain unfinished. Platform doors are static barriers. The source establishes the barrier type; it does not establish exact module spacing. Large surfaces have simple provisional finishes. This delivery makes the route and railway usable before those refinements.

## Evidence

- [JR Central's Kyoto map](https://railway.jr-central.co.jp/station-guide/shinkansen/kyoto/map.html) establishes the central entrance, lower concourse and two elevated islands numbered 11–12 and 13–14. The saved operator map is listed in `sources.json`.
- [Kintetsu's transfer route](https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_01.pdf), dated 20 January 2026, places the opposing operator entrances across the lower public hall.
- Kyoto City / MLIT Project PLATEAU's registered buildings `26100-bldg-466069` and `26100-bldg-466062` supply the canopy outlines. Their height ranges inform the broad fit, not surveyed floor elevations. Registration and provenance are saved with the municipal footprint data. This is an independently fitted reconstruction, not an official municipal product.
- [JR Central's 3 December 2014 platform-door notice](https://jr-central.co.jp/news/release/_pdf/000024986.pdf) provides the pocket/pipe-door design and Kyoto installation schedule. **Its example photograph is Shin-Osaka platform 27.** It is used as a barrier-type reference, not a Kyoto roof photograph or proof of current equipment state. The downloaded PDF was rendered and inspected.
- [MLIT's Technical Regulatory Standards on Japanese Railways](https://www.mlit.go.jp/english/2006/h_railway_bureau/Laws_concerning/14.pdf), printed page 13 / PDF page 21, specifies a 1.435 m Shinkansen gauge in the model specifications related to Article 12. This establishes nominal gauge only.

Original geometry and font-derived labels are used in the game. Research imagery is not used as a texture. The [font license](PLATFORM-NUMBER-FONT.md) is retained with the private component.

## Verification

The exact browser/native correspondence check covers 713 new panels, 191,772 vertices and 63,924 triangles. Two obsolete panels and 24 rendered triangles are removed. Retained native records and browser buffer bytes remain unchanged. Net browser cost is 63,900 triangles and eleven material batches; composition appends approximately 5.38 MB. Twenty concourse emitters share the existing pool of at most two active lights.

The Blender scene saves and reopens with matching new geometry, materials, lights and retained object bindings. `npm run build:web`, `test:runtime` and `test:v2:browser` pass. Native gameplay includes a 1.37 m walk, complete translation-and-spin rest in 12.66 seconds, free result, recall and home. Chrome passes entry, walking, throwing, results, recall during flight, menus and home from a platform spawn.

Twelve actual Chrome views cover the gate, concourse, both stair approaches and arrivals, both platforms, the adjacent conventional railway, the public hall below and a southern overview. There are no page errors. Across 1,080 short 1440×900 frame samples, median time is 16.7 ms and p99 is 33.3 ms. Eleven walking-height/adjacent views stay below 16.9 ms; the broad aerial overview has eleven approximately 33.3 ms frames and renders about 2.52 million triangles in 1,720 calls. This is a short check, not a sustained performance/audio soak. Wider-view rendering remains an optimization opportunity.

All sixteen native walks pass with 5,858 position samples: the central gate to each island and back, east/west platform sections in both directions, the paid concourse and the retained public passage. Endpoint floor heights remain within 0.06 m. Receipts live under `.local/v2/current/components/shinkansen/`; the scene is integrated into the current editable station. Superseded full-station candidates are removed after promotion.

## Rebuild

Use `prepare-shinkansen.mjs`, `build-shinkansen.mjs` and `web/v2/compose-component.mjs` against the expected southern-gates parent. Preparation removes the receiving-room wall and one gate flap using exact triangle/material signatures. `verify-shinkansen-geometry.mjs` checks the replacement scope and native/browser correspondence. `verify-shinkansen.mjs` walks both stairs in both directions, platform ends, the new concourse and retained public hall. `install-shinkansen.py` integrates the component into the editable Blender source and reopens it for verification.
