# Central roof section and western Skyway anchors

27 September 2026. [Annotated comparison](roof-bridge-registration/index.html).

This step produces measured construction inputs. The playable candidate remains frontage 02, with layout hash `bee80de912911f8fd39451a436d92a51e13b62d13f29fc76a1a07752fd7d0d92`. No asset promotion or milestone acceptance follows from these measurements.

## Central section

The source outer roof is `Untitled.203` in the registered municipal GLB (SHA-256 `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`). Exact plane cuts were taken at X = −40, −25, 0, 15 and 30 m. The fit uses X = 0 for shape and crowns at −40/0/30 for the longitudinal trend; −25/15 are held-out transverse checks.

Separate arc-length correspondences cover the front toe to crown, crown to rear knee, and rear knee to shallow tail. The 54 authored section stations are retained. The crown-only translation has sampled symmetric maximum/RMS differences of 3.821/1.212 m against the source at X = 0; the full fit gives 0.117/0.016 m. Both held-out curved sections give maximum sampled differences of approximately 0.122 m. Rear tails are not compared away from X = 0 because their clipping varies along the source.

These are fit errors against a coarse model, not construction survey errors. Do not extrapolate the central curve through either flared mouth. End supports and facade bearings need their own source correspondence.

| Anchor at X = 0 | Northward change | Height change |
| --- | ---: | ---: |
| Front toe | 12.099 m | +3.043 m |
| Crown | 12.648 m | −0.592 m |
| Rear knee | 12.607 m | −3.266 m |
| Rear tail | 15.545 m | −3.082 m |

The inner source shell (`Untitled.200`) at the crown is at height 48.691 m; the outer shell is 50.118 m. Their 1.426 m separation is not a measured structural truss depth. The current authored 2 m truss should not be retained or replaced solely on this coarse envelope measurement.

## Western covered bridge

Municipal `Untitled.203` faces 9 and 10 form the diagonal floor rectangle; faces 10522 and 10523 form its flat source top. A direct Chrome render confirms the rectangle's position across the western opening. Its native-coordinate centre endpoints are:

- Western portal: `(−95.874012, 44.942694, −10.238046)`.
- Main-hall end: `(−75.633533, 44.942450, 11.125337)`.

The source centreline is 29.429 m long, versus 39.296 m currently authored. Source outer widths are 3.073–3.074 m; these do not establish the clear walking width. The flat source top is at 47.943 m. It is a coarse enclosure, not a reconstruction of the photographed arched glass roof.

The western portal moves 10.395 m east and 13.221 m north; the hall end moves 0.983 m east and 8.799 m north. Both floor endpoints are approximately 0.257 m below the current floor. In particular, applying the roof crown's 12–13 m northward shift to the bridge is not the correct registration.

The [station operator](https://www.kyoto-station-building.co.jp/service/square/#skyway), checked on 27 September 2026, describes the overall corridor as 185 m long at 45 m height on 10F. That corroborates the general floor identity but does not define how the reported length includes approaches or endpoints. Do not force a route to 185 m by rescaling these measured bridge anchors.

## Outstanding connections

The horizontal-face audit did not identify a continuous central Skyway floor. The absence of a surface in this source audit does not establish the real route. Register the interior corridor and eastern landing from the operator's plan and independent photographs. Join the restaurant approach and bridge enclosures to the new anchors, then resolve hangers and the roof mouths.

Only after that coordinated change should visuals and native collision be regenerated together. Re-run source/native surface probes, public walks, all courses, runtime integration and Chrome performance checks. This registration step changes no service, native worker, browser source or deployed asset.

## Reproduction

From the reconstruction worktree:

```sh
node web/station/realism/audit-roof-attachments.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/roof-registration
node web/station/realism/measure-canopy-registration.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/station-frontage-02/station-layout.json .local/station-realism/roof-registration/sections-with-checks -40,-25,0,15,30
node web/station/realism/fit-canopy-section.mjs .local/station-realism/roof-registration/sections-with-checks/sections.json .local/station-realism/roof-registration/attachments.json .local/station-realism/station-frontage-02/station-layout.json .local/station-realism/roof-registration/fit-02
```

The report contains source hashes, all 54 proposed section points, source bridge corners/face indices, the five section comparisons, and explicit limits. The gallery passed Chrome checks at 1440 px and 390 px widths: three images loaded, eight local targets returned 200, no horizontal overflow or page errors. This is documentation QA, not a gameplay performance result.

## First reconstructed end component

The [western roof construction review](west-roof-construction/index.html) contains the new source-registered outer frame and closed glazing. All 24 isolated native rays agree; the full-station check retains one genuine upper-floor intrusion. The source mouth rises to 57.243 m, so the central 50.118 m crown cannot be extrapolated through this end. The roof is not yet integrated.
