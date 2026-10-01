# Remove the obsolete southern café

## Defect and scope

East Square retained an earlier NIWA shell south of the rounded hotel wall,
with its floor at Y34.626, above the court at approximately Y29.973. The current
registered NIWA already occupies the eastern side of the square. The southern
copy included tables, chairs, a counter and four signs, disconnected from the
public walking surface.

Remove the duplicate's six panels, 36 boxes, old route, four labels and one
runtime light. Remove the corresponding browser faces and editable objects.
Preserve the registered café, folded frontage, court floors, public gallery,
lifts and escalators.

The hotel’s [July 2026 floor map](https://jrwest-hotels.jp/granvia-kyoto/files/pdf/floormap.pdf?01=)
shows the southern public hall serving clinics, with separate hotel lifts and
escalators. Its north arrow points down; read it accordingly when comparing
the station operator’s [7F map](https://www.kyoto-station-building.co.jp/floorguide/7f/).
The private reference is `maps/granvia-floormap-2026-07.pdf`, page 8.
That hall and its entrance remain the next connection to reconstruct. This
removal does not establish their dimensions or open the hall.

## Acceptance

- Every retired source face has matching browser removal; retain every other
  browser index and attribute and every other native record.
- Reopen the editable source and check the retained café, terrace and folded
  frontage geometry, UVs, export normals and source bindings.
- Walk the southern approach and registered NIWA entrance in both native
  directions, and inspect and walk them in Chrome.
- Verify local gameplay and the browser build, merge locally, and replace
  the current bundle in place without retaining another full station copy.

## Rebuild

With `COMPONENT` under `.local/`, use the manifest recorded in its parent receipt:

1. `prepare-obsolete-niwa.mjs PARENT COMPONENT`
2. Blender `install-obsolete-niwa.py -- PARENT COMPONENT`
3. `repair-east-canopy-browser.mjs PARENT COMPONENT`
4. `verify-obsolete-niwa.mjs PARENT COMPONENT`
5. `verify-central-transfer.mjs CANDIDATE_LAYOUT COMPONENT OUTPUT`
6. `walk-isetan-stair-chrome.mjs ORIGIN CANDIDATE_MANIFEST COMPONENT OUTPUT`
7. `inspect-east-transfer-chrome.mjs ORIGIN OUTPUT COMPONENT/views.json`

All scripts above are in `web/station/realism/`. The existing browser retirement
tool also synchronizes the removed labels and light in station metadata.

## Geometry verification

The saved source contains 61 obsolete meshes: 42 collision objects and 19
additional visual fixtures. The old light survives only in runtime metadata.
The edit removes 1,326 browser triangles. All other native records, browser
indices and attributes, 48 escalators and 15 lifts remain unchanged.

Four source objects have small surface areas absent from the earlier browser
export: the header, rear wall and two windows. The measured gaps total about
0.176 m². Verification requires those exact pre-existing gaps and scans every
remaining browser material for fragments inside all four object bounds.
The saved source was reopened; geometry, UVs and authored normals for 924
retained nearby objects match, and all native source bindings remain valid.

Four native walks pass: the southern approach and retained NIWA entrance in
both directions. Two Chrome keyboard routes cover the same approaches; three
rendered views were inspected. The hotel hall remains sealed and needs its
own entrance repair. No browser errors were reported.

`npm run build:web`, native gameplay and Chrome gameplay pass. A throw from
the southern court reaches complete translation and spin rest after 9.69
seconds; free exploration saves no score, and recalling a moving shot forfeits
it. Normal spawn, movement and returning home also pass.

Private receipts live in `.local/v2/current/components/obsolete-niwa/` after
promotion. The current source and station bundle replace their predecessors
in place; the complete temporary source, export and server overlay are removed.
