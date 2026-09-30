# Hachijo ASTY public street

29 September 2026. Connected public street and room shells.

## Defect and intended repair

The main Hachijo foyer ends at its glazed eastern wall at X66. The eastern foyer
has a solid western wall at X138. Between them, the strip Z-181 to -174 has no
ground floor or enclosing public interior. Chrome inspection shows a gap down
beside the forecourt and a long blank station wall.

The repair connects these halls through a continuous covered ASTY street. The
restaurant passage bends toward the eastern gate, with enclosed receiving rooms
on both sides and three exits to the retained southern forecourt. Existing rail
gates, paid stair routes and underground connections stay usable.

Acceptance requires normal native walking through the complete street in both
directions, all three public exits, every new room doorway, and the retained
eastern gate approach. Final browser/native geometry must match; inspect the
result in real Chrome and carry the replacement into the editable station before
committing and merging it into local main.

## Primary evidence and limits

- The [current ASTY floor guide](https://www.asty-kyoto.co.jp/asty_kyoto/floor_guide/)
  establishes the continuous ground-floor street between the two entrances,
  northern restaurant row, angled eastern end, southern shop islands and gaps
  to the forecourt. Both the full map and eastern detail were downloaded and
  visually inspected on 29 September 2026. They contain no metric scale.
- Page 2 of [JR Central's renewal announcement](https://jr-central.co.jp/news/release/_pdf/000027332.pdf),
  dated 6 July 2015, supplies a historical south-up arrangement and concept
  renders. Those renders guide the timber frontages, shallow eaves, pale panel
  ceiling and stone floor. They do not prove current tenant interiors.
- Positions X66 to X138, ground Y0, ceiling Y3.225 and all room dimensions are
  fitted to the retained entrance halls. This pass does not claim surveyed
  dimensions. Rooms are architectural shells; restaurant and shop fitouts
  remain unfinished.

Sources and hashes are recorded in `sources.json`. Research images and the PDF
are local references, excluded from Git and game textures.

## Construction

The builder retires ten exact authored panels: the main foyer's glazed end and
its mullions, the eastern foyer's west wall, the blank ground-storey boundary and
the affected part of the lower paid-lobby wall. It replaces the retained wall
returns, adds the missing floor strip and ceiling, and encloses thirteen bays
with usable doorways. The northern backs stay south of the working paid stairs.
The southern rooms use the existing level forecourt floor.

`build-hachijo-asty.mjs` generates the static component and native routes. Reuse
`prepare-east-transfer-base.mjs` and `web/v2/compose-component.mjs` with the exact
removal receipt in one staging folder. `verify-static-replacement.mjs` checks
unchanged native records and final browser triangles. The existing static source
installer carries the verified component into the editable Blender scene.

## Verification and cost

- The complete native station supports 23 route walks: all thirteen room
  doorways, the street in both directions, all three forecourt exits in both
  directions and the retained eastern gate/stair approach in both directions.
- Final browser/native geometry matches for all 329 panels, 11,844 vertices and
  3,948 triangles. Ten retired panels remove 120 old triangles. Other native
  records, moving equipment and retained browser buffer bytes remain unchanged.
- Net increase: 3,828 triangles and nine material batches; the added browser
  component is 338,968 bytes.
  Nine fixtures share the existing pool of at most two active lights. This pass
  adds no textures or reflection captures.
- The saved Blender scene reopens with matching geometry, normals, materials,
  UVs and retained object bindings. Shared room walls are deduplicated.
- Ten real Chrome views cover both joins, the street, bend, forecourt, rooms and
  paid approach. Short samples show a 16.7 ms median and about 16.8 ms p99; this
  is not a sustained performance benchmark. There are no page errors.
- Native gameplay and Chrome controls pass: walking, throwing, full translation
  and spin rest, recall, menus and return to the start. `npm run build:web`
  passes. The Chrome home check now waits for the returned player snapshot.

The exit test initially placed its start circle on the Z-181 floor seam; the
stair return test placed it too close to the first tread. Both now start on clear
floor and walk through the affected approaches. A separate stair-walk timeout
occurred while positions were still advancing; the isolated rerun passed.
These test corrections did not change the geometry.

The current asset manifest pins the delivered layout and geometry. Private
receipts live under `.local/v2/current/components/hachijo-asty/`. The editable
source and playable exports replace their existing current paths; the full
candidate copy is removed after promotion. Tenant fitouts and the remaining
western shopping street stay in the queue.
