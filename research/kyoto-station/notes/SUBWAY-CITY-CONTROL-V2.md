# Subway placement from the city access study

29 September 2026. Coordinate registration against main `6bbd688`, layout `0f37cb54d346319635feb4fbc54355e902e22262dd9c9a1b1d1450e1942603ee`. This completes the next evidence step in [the subway audit](SUBWAY-REGISTRATION-V2.md). Playable assets have not moved yet.

## Construction decision

Replace the fitted subway and its public approaches using several registered anchors. A single sideways shift would leave the North gate, Central 1 and Exit 5 in the wrong relationship. The northern concourse bends southeast; the southern public passage continues under the railway near X111, substantially west of the current passage.

The [city's north-plaza study](https://www.city.kyoto.lg.jp/tokei/cmsfiles/contents/0000352/352504/P42_P75_sankousiryou.pdf), printed pages 50 and 53, provides a street plan and underground access outline on a common cadastral base. The [2012 Kotochika completion plan](https://www.city.kyoto.lg.jp/sogo/cmsfiles/contents/0000123/123815/kannseizu.pdf) corroborates the two northern stair identities, bent arrangement, gate banks and public passages on both sides. It is historical and unscaled; its tenants and proportions are not construction measurements. The saved current Kotochika plan supplies the current public/paid topology.

### Approximate anchors in native metres

| Feature | X east | Z north | What the reference establishes |
| --- | ---: | ---: | --- |
| North stair outline | 82.7 | 100.0 | Interpreted stair opening; not the entire paid hall |
| Central 1 stair outline | 97.4 | 27.1 | Interpreted stair opening; not the entire paid core |
| Exit 3 street opening | 107.7 | 126.3 | Surface stair area, checked against the numbered OSM entrance |
| Exit 4 street opening | 44.7 | 121.7 | Surface stair area, checked against the numbered OSM entrance |
| Exit 5 street stair | 123.4 | 56.7 | Long axis roughly east–west, supported by the entrance photograph |
| Exit 5 lift zone | 107.5 | 54.2 | Ground EV annotation beside the taxi canopy; no exact shaft footprint |

Use at least a 5 m allowance when fitting plan positions. This is a provisional modelling allowance, not a statistical accuracy claim. Source stroke thickness, icon placement and differences between city datasets matter. The lift annotation is especially approximate. Do not infer elevations, paid-hall widths, track spacing or platform length from these outlines.

Current tread centres are X178/Z22.3 at North and X178/Z−9.3 at Central 1. The reference corrections are therefore approximately −95/+78 m and −81/+36 m respectively. The existing street stair needs a smaller correction and a different orientation; the lift zone is about 40 m west and 14 m north of its current origin. These differences rule out using the old 78 m track discrepancy as a uniform relocation.

## How the registration was checked

1. Intersect the actual retained east-building triangles (`municipal-building-3891868384`) at Y1 m. Use the four ground-section corners, avoiding an assumed roof footprint.
2. Observe those corners in the original embedded street rasters. Fit uniform scale and rotation with the north/pixel-axis reflection. No shear or local distortion is allowed. RMS residuals are 0.246 px on printed page 53 and 0.571 px on printed page 50.
3. Register the page 53 ground raster to its underground counterpart using five common cadastral corners. The 0.353 px RMS residual is an image-registration check, not geographic accuracy. The southern raster continues at pixel offset [0,484].
4. Hold out the plaza building (`municipal-building-4286319776`) from the fit. Its two eastern corners differ by 2.08–2.82 m across the two street plans.
5. Hold out numbered OSM entrances 3 and 4. Their mapped points differ from the traced street-opening centres by 4.53 m and 3.69 m. Entrance points and opening centres need not coincide exactly. No unnumbered OSM node is assigned an exit name.
6. Render and inspect the registered plan and corner checks. The traced outlines align with the original source strokes. The plan uses the model's native metre coordinates; the live game is not used as a target for warping the source.

The PDF, observations, script, current layout, OSM report and extracted images are hashed in the private receipt at `.local/v2/current/components/subway-city-control/`. The tool checks the retained control geometry; a deliberately stale manifest was rejected before PDF extraction. The JSON observations are tracked; reference PDFs, extracted images and overlays stay outside Git and are not game assets. Native and browser gameplay tests are deferred to the geometry replacement because this increment changes only research tools and records.

## Replacement scope

The audit enumerates 4,312 panels across eight affected component groups, plus five subway lifts and four escalator lanes. This is an inspection list, **not a blanket deletion list**. Several groups contain retained interfaces or shared slabs.

Complete the following as one connected replacement before promoting playable assets:

1. Rebuild the North and Central 1 public/paid cores around the registered stair outlines. Preserve open public routes around both cores and their east/west gates. Place the Kotochika cross-plaza and storefront envelopes between them using the current operator topology. Reuse motion mechanics with correctly placed hardware and collision.
2. Rebuild Exit 5's east–west street stair and taxi-side lift approach together. Fit their street thresholds to municipal paving and the photographed enclosures. Close the old stair/lift holes in both source and collision before cutting new ones. Do not leave the former glazed pavilion or invented connecting corridor in place.
3. Replace the affected Porta East and western approach segments. The old mall floor levels differ from the subway concourse; model actual level changes explicitly. Retain unaffected mall routes and rebuild all cut boundaries without overlapping slabs or sealed corridor ends.
4. Rebuild the public passage under the railway from its northern bend through the Central 2/South approaches and Hachijo branches. The city outline supplies the public passage, not the southern paid-hall footprints. Use the operator plan for gate order and which side opens to the platform.
5. Reconcile the platform, both tracks, four stairs, two platform lifts and four escalator lanes with these halls. The northern plan does not prove a platform length or below-ground route. Resolve those connections as part of the component; do not simply stretch the platform to the city outline.
6. Reconnect the JR eastern underpass and the retained Hachijo public entrances at their actual endpoints. Inventory panels, boxes, beams, lights, motion instances and route records before retirement. The generated prefix inventory alone is insufficient to approve removals.

### Acceptance

- Source scene, native layout, browser mesh and moving hardware agree in position, openings and orientation.
- Old shafts and route records are removed or restored as appropriate; there is one coherent station network.
- Walk public and paid connections in both directions: Exits 3/4 and Porta to North, both Central 1 gates, platform lift through Central 1 to Exit 5 lift, Exit 5 stairs, Central 2/South and Hachijo. Check gates, doorways, landings, headroom and empty-shaft protection.
- Verify normal gameplay in the complete native station and real Chrome, including a throw that rests in translation and spin and recall forfeiture. Run the relevant build checks and inspect frame behaviour on the changed routes.
- Commit and merge the verified replacement into local main; then remove its superseded full generated bundle.

## Reproduce

With `pyproj`, `numpy`, `shapely` and Poppler available, run from the repository root:

```sh
python web/station/realism/audit-subway-registration.py web/v2/assets.json research/kyoto-station/maps/north-station-osm.xml .local/v2/candidate/subway-registration-control
python web/station/realism/map-subway-context.py web/v2/assets.json .local/v2/candidate/subway-registration-control/registration.json .local/v2/candidate/subway-registration-control
python web/station/realism/register-subway-city-plan.py web/v2/assets.json .local/v2/candidate/subway-registration-control/registration.json .local/v2/candidate/subway-registration-control/city-plan
```

The last command extracts only PDF pages 9 and 12 and writes `city-registration.json`, `registered-plan.svg` and `control-checks.svg`. These are small research outputs, not duplicate station builds. The registered plan is the placement input for the next construction step.
