# Eastern Skyway mouth

## Confirmed defect

The current Chrome audit found a dark municipal shell face across the eastern
end of the Skyway. Three browser raycasts identify
`municipal-station-court-east-Untitled.203` at approximately
X74.976 / Y46.115 / Z16.613. The walkway and escalators already exist behind it.
The native player can cross this face, so a walking pass alone did not reveal
the misleading wall seen by the player.

The current native audit also passes the complete 10F landing–ramen corridor–
central Skyway route in both directions (927 and 1,014 movement samples).
That test ends at the central corridor's endpoint; it does not inspect the
visible mouth or ride the eastern escalators.

The operator's [10F guide](https://www.kyoto-station-building.co.jp/floorguide/10f/)
shows the paired escalators at the eastern end of the Skyway. The saved
`zekkeikana-skyway4b.jpg` photograph shows the open descent towards East Square.
Its 2014 watermark makes it historical architectural evidence. Existing lane
positions and dimensions remain fitted reconstruction choices.

## Repair and acceptance

Cut the crossing shell within the existing landing opening. Preserve the
surrounding shell, deck, rails, escalators, moving treads and courtyard.
No additional building parts are needed for this repair.

The old collision record lacks texture coordinates and normals. Retain those
from the browser mesh where available and recover omitted closure faces from
the editable source. Update the single material's triangle indices with the
cut mesh. Independently verify inherited attributes, matching browser/native
triangles, the clear mouth and route headroom.

Before delivery, inspect the opening and both escalator landings in Chrome,
walk both lane approaches in both directions, ride both escalators in their
operating directions, verify gameplay and reopen the saved Blender source.
Integrate one local bundle and remove the full temporary candidate.

Tools: `prepare-east-skyway-mouth.mjs`, `extract-east-skyway-mouth.py`, and
`verify-east-skyway-mouth.mjs` under `web/station/realism/`, together with the
shared opening, composition, source-installation and route checks.

## Verification

The opening removes 9.661 m² from one shell mesh. All 607 whole faces outside
the cut are retained. Its 622 resulting triangles match between the browser
and collision layout. The inherited texture/normal check covers 1,866 corners;
the maximum normal difference is 1.32e-7 and texture-coordinate difference is
2.71e-8. One previously omitted closure triangle is restored from the source,
with texture orientation checked against 1,830 exported corners.

Twenty exit sightlines are clear and all 26 approach volumes have 2.1 m
headroom. Four native approach walks pass, followed by both passive escalator
rides (25.599 m upward and 25.503 m downward) with grounded arrivals. All four
approaches also pass Chrome keyboard walking.

Four final Chrome views show the open mouth, reverse approach, descent and
court arrival. They also expose coarse retained roof overlaps beside the
descent; those are the next structural cleanup, outside this opening's cut.

Both Chrome passive rides pass (25.355 m upward and 25.313 m downward), with
grounded arrivals and visibly moving treads. Reopening the saved Blender scene
confirms matching geometry, texture coordinates, exported normals and embedded
collision layout. Its maximum preview normal difference is 0.01711 degrees.

`npm run build:web`, the isolated native gameplay test and the Chrome gameplay
test pass. Gameplay checks include walking, a throw reaching full translation
and spin rest, a free result, recall during flight and returning home. Runtime
receipts, source checks and the four inspected views identify the same layout
and geometry hashes.

The repair is integrated into the current local station bundle. Full candidate
source and runtime exports are removed during promotion; the small component,
audit and verification receipts remain under
`.local/v2/current/components/east-skyway-mouth/`.
