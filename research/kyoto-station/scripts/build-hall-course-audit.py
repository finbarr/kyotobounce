"""Publish native course diagnostics and the bounded Locker Loop repair."""
from pathlib import Path
import hashlib
import html
import json
import math
import shutil

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('.')
LOCAL = WORK / '.local/station-realism'
OUT = ROOT / 'notes/hall-course-audit'
OUT.mkdir(exist_ok=True)


def read(path):
    return json.loads(path.read_text())


files = {
    'all-placement-checks.json': 'all-course-support-01/report.json',
    'routes-before.json': 'hall-route-traces-before-01/report.json',
    'routes-after.json': 'hall-route-traces-02/report.json',
    'locker-placement.json': 'locker-finish-04/report.json',
    'locker-proof.json': 'locker-proof-01/summary.json',
    'locker-proof-before.json': 'locker-proof-before-01/summary.json',
    'locker-floor-probes.json': 'locker-obstacles-02/report.json',
    'rejected-search-02.json': 'locker-finish-02/report.json',
    'rejected-search-03.json': 'locker-finish-03/report.json',
}
for name, source in files.items():
    shutil.copyfile(LOCAL / source, OUT / name)

audit = read(OUT / 'all-placement-checks.json')
catalog = {c['id']: c for c in read(WORK / 'web/starter-challenges.json')}
before = {r['id']: r for r in read(OUT / 'routes-before.json')['traces']}
after = {r['id']: r for r in read(OUT / 'routes-after.json')['traces']}
placement = read(OUT / 'locker-placement.json')
proof = read(OUT / 'locker-proof.json')
baseline_proof = read(OUT / 'locker-proof-before.json')
assert placement['pass']
assert len(proof['receipts']) == len(baseline_proof['receipts']) == 3
assert all(r['pass'] and r['fullClear'] and r['rest'] for r in proof['receipts'])
assert all(r['pass'] and r['fullClear'] and r['rest'] for r in baseline_proof['receipts'])
assert len(audit['features']) == 166
assert len(audit['beforeFailures']) == 11 and len(audit['afterFailures']) == 31
holes = read(LOCAL / 'hall-concourse-join-spec-02/spec.json')['basementHoles']
rows = []
cards = []
for course_id in ['kyoto-cafe', 'kyoto-balcony', 'kyoto-cascade5', 'kyoto-terracedrop']:
    a, b = before[course_id], after[course_id]
    assert a['pass'] and b['pass'] and a['rest'] and b['rest']
    traces = []
    for mode, directory in [('before', 'hall-route-traces-before-01'), ('after', 'hall-route-traces-02')]:
        source = LOCAL / directory / f'{course_id}.json'
        name = f'{course_id}-{mode}.json'
        shutil.copyfile(source, OUT / name)
        traces.append(read(source))
    points = [(p['p']['x'], -p['p']['z']) for t in traces for p in t['poses']]
    points += [tuple(p) for hole in holes for p in hole]
    xmin, xmax = min(p[0] for p in points)-3, max(p[0] for p in points)+3
    zmin, zmax = min(p[1] for p in points)-3, max(p[1] for p in points)+3
    scale = min(570/(xmax-xmin), 280/(zmax-zmin))
    ox, oy = (620-scale*(xmax-xmin))/2, (320-scale*(zmax-zmin))/2
    xy = lambda x, z: (ox+(x-xmin)*scale, oy+(z-zmin)*scale)
    pts = lambda ps: ' '.join('%.2f,%.2f' % xy(x, z) for x, z in ps)
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 370" role="img">',
           f'<title>{html.escape(a["name"])}: before and after native trajectories</title>',
           '<rect width="620" height="370" fill="#192029"/>']
    for hole in holes:
        svg.append(f'<polygon points="{pts(hole)}" fill="#080d13" stroke="#9aaabd" stroke-width="1"/>')
    for trace, color in zip(traces, ['#62baff', '#ffa16f']):
        ps = [(p['p']['x'], -p['p']['z']) for p in trace['poses'][::3]]
        ps.append((trace['poses'][-1]['p']['x'], -trace['poses'][-1]['p']['z']))
        svg.append(f'<polyline points="{pts(ps)}" fill="none" stroke="{color}" stroke-width="2"/>')
    contact = b['newHallContacts'][0] if b['newHallContacts'] else None
    if contact:
        x, y = xy(contact['point']['x'], -contact['point']['z'])
        svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#ffa16f" stroke="white"/>')
    svg.append(f'<path d="M25 339h{5*scale:.3f}" stroke="white" stroke-width="3"/><text x="25" y="360" fill="white" font-family="sans-serif" font-size="13">5 m · height omitted</text>')
    svg.append('<text x="280" y="350" fill="#62baff" font-family="sans-serif" font-size="14">Before</text><text x="400" y="350" fill="#ffa16f" font-family="sans-serif" font-size="14">After</text></svg>')
    (OUT / f'{course_id}.svg').write_text(''.join(svg))
    event = f'{contact["surface"]} at {contact["time"]:.3f} s' if contact else 'No new hall impact recorded; the final rolling segment crosses the floor boundary.'
    rows.append({'id': course_id, 'name': a['name'], 'beforePathM': a['pathLengthM'], 'afterPathM': b['pathLengthM'], 'firstNewHallContact': contact})
    cards.append(f'<section><h2>{html.escape(a["name"])}</h2><p>Path: {a["pathLengthM"]:.2f} m → {b["pathLengthM"]:.2f} m. {html.escape(event)}</p><img src="{course_id}.svg" alt="Paired plan projections of the native trajectories"><p>Unranked diagnostic traces; this plot alone does not prove course completion.</p></section>')

course_failures = []
for course_id in sorted({r['course'] for r in audit['afterFailures']}):
    course_failures.append({'id': course_id, 'name': catalog[course_id]['name'], 'before': sum(r['course'] == course_id for r in audit['beforeFailures']), 'after': sum(r['course'] == course_id for r in audit['afterFailures'])})
comparison = {'meaning': 'Private diagnostic integration. Four paired design traces are not four course clears. Only Locker Loop has a successful repair in this report.', 'layout': proof['layout'], 'features': 166, 'courses': 31, 'beforeFailures': 11, 'afterFailures': 31, 'affectedCourses': course_failures, 'routes': rows, 'lockerGoalShiftM': placement['centerShiftM'], 'lockerRestCenterMarginM': placement['restCenterMarginM']}
(OUT / 'comparison.json').write_text(json.dumps(comparison, indent=2)+'\n')

table = '\n'.join(f'| {r["name"]} | {r["before"]} | {r["after"]} |' for r in course_failures)
route_table = '\n'.join(f'| {r["name"]} | {r["beforePathM"]:.2f} m | {r["afterPathM"]:.2f} m |' for r in rows)
note = f'''# Hall course audit and Locker Loop repair

28 September 2026. [Trajectory diagrams and receipts](hall-course-audit/index.html).

## One bounded repair passes

Locker Loop's finish moves **{placement['centerShiftM']*100:.2f} cm**, from the old concourse to the replacement `hall-bay-floor-surface`. Its **1 m radius, four original waypoints, start, shot hint and scoring remain unchanged**. The private catalog increments this course from revision 2 to 3; all other course definitions differ only in their candidate layout hash.

Two repeated authored shots and the existing +0.05° yaw neighbor each collect all four targets and finish inside the destination at full native rest. The same three inputs also pass on the preceding layout. The new authored rest has {placement['restCenterMarginM']*100:.1f} cm of radial margin; the neighbor has about 14.7 cm. These three trials prove these inputs, not an exhaustive tolerance envelope.

The accepted private files are `locker-finish-04/catalog.json` and `proof-inputs.json`; native evidence is in [the placement receipt](hall-course-audit/locker-placement.json), [after proof](hall-course-audit/locker-proof.json) and [before proof](hall-course-audit/locker-proof-before.json). They remain separate from the active game's catalog.

## Why the first search failed

Native rays distinguish two problems: the western 1F–2F stair blocks some one-metre circles, and other circles span the `concourse` / `hall-bay-floor-surface` boundary. All 388 sampled floor points retain the expected height; this is not a floor hole at the finish.

The search initially imposed an unnecessary requirement to retain the old surface name. It therefore rejected one valid native placement in the 197-position search and 51 in the expanded 1,125-position search. Those failed receipts are preserved and superseded. Allowing the replacement floor, then validating the entire challenge natively, finds the repair without shrinking the circle or changing the shot. Native validation and its tolerances are unchanged.

## Full placement audit: inherited problems exposed

The earlier hall-only audit covered 74 concourse features. The expanded audit tests **166 starts, waypoints and goals across all 31 courses**, with their authored radii and normals. The preceding courtyard layout already has **11 failures**. The new hall candidate adds **20**, giving **31 affected placements across nine courses** before the Locker Loop repair.

| Course | Before hall integration | After hall integration |
|---|---:|---:|
{table}

These are placement checks, not 31 played courses. A ray hitting a valid floor metres below the original start is counted as a mismatch. East-to-West Ricochet's authored start is **3.527 m above** its current support in both layouts, so its diagnostic throw is refused. Garden Switchback, Fascia Flip and Skyway Trapdoor also have inherited placement failures. The Locker Loop proof resolves one of the nine courses privately; the other eight remain open.

## Paired trajectories explain the new conflicts

Four unchanged authored inputs were replayed in unranked native design sessions, on both complete layouts, to full translational and rotational rest. Starts must resolve within 1 mm of the authored position; target placement checks are not bypassed in the actual campaign proof.

| Course | Before path | New path |
|---|---:|---:|
{route_table}

Locker Loop stays close to its original route. Balcony Express hits the western well glass at 10.544 s. Escalator Relay first contacts the western basement handrail at 37.111 s. Sculpture Square Slingshot falls through the newly opened well and first contacts the basement floor at 9.533 s; it rests on B1 rather than crossing the old flat concourse. The previous [Pillar Carom comparison](HALL-PHYSICS-INTEGRATION.md) separately identifies the oval guard collision.

These are consequences of the reconstructed openings and guards, not evidence that the new geometry should be removed. The remaining routes need explicit revisions that retain their characteristic banks, traversal and difficulty, followed by complete native proofs. The diagnostic design captures are not replacement course definitions.

## Scope and remaining work

Native layout remains `47693cafa1aa635c6ceb88cedc1794a1d53fff612ba022661a4c5b6d986ff341`; no architecture, browser geometry, C#, physics parameters or production data changed in this audit. No performance or final visual acceptance is claimed.

Next: reconcile the remaining course routes and inherited upper-level support mismatches; finish gate/upper interfaces and evidence-based B2 geometry; then complete the plan's station, plaza, street, material, light, vegetation, 15-view and Chrome/runtime acceptance gates. The long-term goal remains active. Nothing was committed, pushed or deployed.
'''
(ROOT / 'notes/HALL-COURSE-AUDIT.md').write_text(note)
links = ''.join(f'<li><a href="{name}">{name}</a></li>' for name in [*files, 'comparison.json'])
(OUT / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hall course audit</title><style>body{margin:0;background:#121920;color:#e5edf5;font:16px/1.6 system-ui}main{max-width:1000px;margin:auto;padding:28px 20px}a{color:#8dcaff}h1{line-height:1.2}section{margin:26px 0;padding:20px;background:#192029;border-radius:12px}img{display:block;width:min(100%,620px);height:auto;margin:18px auto}p,li{overflow-wrap:anywhere}.status{border-left:4px solid #98cd9d;padding:16px;background:#20302a}</style><main><a href="../../index.html">Research library</a><h1>One course repaired, wider conflicts measured</h1><p>Private candidate05 · 28 September 2026</p><p class="status">Locker Loop keeps its four targets and one-metre finish. A 17 cm finish shift passes two authored shots and the existing nearby shot, all at full physical rest.</p><p>The expanded 166-feature audit finds 11 inherited placement problems and 20 added by the hall. Eight other courses still need reconciliation. These diagrams show unranked diagnostic trajectories; only Locker Loop has a passing repair here.</p><p><a href="../HALL-COURSE-AUDIT.md">Read the full findings and limitations.</a></p>'''+''.join(cards)+'<h2>Evidence</h2><ul>'+links+'</ul></main></html>')
(OUT / 'manifest.json').write_text(json.dumps({'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir() if p.is_file() and p.name != 'manifest.json'}, 'status': 'private Locker Loop repair verified; eight other courses and broader reconstruction acceptance remain open'}, indent=2)+'\n')
print(OUT)
