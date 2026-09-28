# Western restaurant and Skyway approach

27 September 2026. Status: **verified construction component, not installed in the full station**. [Visual review](western-approach/index.html).

## Evidence

- The [current Kyoto Ramen Koji operator page](https://www.kyoto-station-building.co.jp/ramen_koji/) and [saved floor guide](../maps/ramen-floor-guide-2026.png) show ten tenants, a public aisle, the western stair entrance, an oblique Skyway branch, an escalator opening and a southern lift. This diagram establishes topology; it supplies no surveyed scale.
- [ZauCats' western bridge photographs](https://www.zekkeikana.com/kyoto/shimogyoku/skyway/skyway11.html) show the double glass doors, dark header, repeated ribs and opaque southern base. The page describes August 2007 while the images carry a 2012 watermark. Individual capture dates remain uncertain.
- [Soul Kyoto's photographs](https://soulkyoto.blog.fc2.com/blog-entry-395.html), captioned 9 February 2014, show the dark ramen corridor, cream illuminated entrance frames, menu displays, Grand Stairway and commemorative riser plaques. Its temporary ramen exhibition board is at the central/western bridge junction; it is not the restaurant doorway.
- [Kyoto City's municipal source model](https://data.city.kyoto.lg.jp/resource/?id=21224), CC BY 4.0, supplies the landing edge, bridge underside and vestibule boundary. Source SHA-256: `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`. Reference photographs and operator maps are not licensed game textures.

## Registration and uncertainty

The selected upward-facing source landing has a weighted height of **45.083343 m**. The bridge's lower source face is an underside, not an interior finish. A provisional **0.140649 m** floor raise connects the component to that landing while keeping all 48 checked bridge arch/roof panels in place (maximum coordinate change 1.42e-14 m). The new deck underside coincides with the source lower plane.

Two anchors fit the schematic at **0.0845681 m per pixel**: the chosen midpoint of the landing edge and the bridge-axis intersection with the vestibule back wall. The landing midpoint is **21.24 mm** off the extended vestibule facade plane. Both source anchors are retained; there is no claim of a perfectly straight facade. The entrance midpoint, corridor dimensions and common finished floor still need independent photograph registration.

The threshold follows the actual skewed source landing rather than a perpendicular rectangle. All **252 samples** lie within the selected source triangles. The first perpendicular draft extended beyond one corner; its failed check is retained.

## Construction and checks

The component contains the ten shop boundaries, public floor/ceiling, doorway frame and held-open glass leaves, the oblique vestibule, preliminary fixtures and a guarded escalator opening. Door collision follows the visible leaves. Shop interiors, text, signs and material finishes are unfinished; the escalator bank and lower connection are absent.

The floor triangulator originally generated a triangle only **0.110 mm** high over a long span. One native ray then returned a point **0.213 m** away from the requested ray. Improving internal diagonals preserved every vertex, outline and horizontal area, while raising the floor's minimum triangle altitude to **0.61945 m**. Closed mesh/positive-volume checks still pass.

- **584 browser/native rays**, 292 sample locations across three lanes: zero unmatched hits or obstructions.
- **4 shared-edge ties**: neighboring surface IDs at the same geometric join. Each is recorded with a position error below 0.01 mm and checked against that surface's actual rendered triangles; they are not reported as identical surface IDs.
- **6/6 native capsule walks**: three lanes, stair threshold to the far end of the western bridge and back. Start lanes follow the skewed threshold cross-section; the earlier perpendicular lane start failed circle support and is retained as a test-path diagnostic.
- Minimum covered headroom along the sampled lanes: **2.78844 m**. This is not an exhaustive clearance certificate for all public space.
- **523 panels, 18,076 triangles, 10 material batches**. Every serialized vertex/index and winding matches the native component; maximum coordinate quantization error **0.000007124 m**.
- Five Chrome construction views captured without page errors. The first corridor pose was partly obstructed by a shop corner; the gallery uses a second pose farther along the aisle. These are isolated geometry views, not photo matches or game-performance benchmarks.

## Next integration work

The full-station candidate remains `station-inner-roof-01` unchanged. Before installation, align the central Skyway and eastern connection to the chosen floor datum, resolve the existing stairs/restaurant/facade replacement inventory, and connect the escalator and lower landing. Full gameplay, the outstanding Skyway Trapdoor course, Chrome paired trials and the music/context soak remain open. No architectural, material, lighting or exterior milestone is marked complete here.

## Receipts

- Registration: [registration.json](western-approach/registration.json)
- Source threshold and retained roof: [datum-check.json](western-approach/datum-check.json)
- Full native walk/ray observations: [native-audit.json](western-approach/native-audit.json)
- Browser/native serialization: [serialization.json](western-approach/serialization.json)
- Outline-preserving triangle changes: [triangulation.json](western-approach/triangulation.json)
- Assembly GLB SHA-256: `5883eb275fb85e12c270fdd0f3926c341aeaf0b348bf1d31fb2cc16e58ade0ec`
- Assembly native SHA-256: `d5477e9f583b881ab75f8bf27587b937e222fe8c077aefd3a46c582528d134da`
