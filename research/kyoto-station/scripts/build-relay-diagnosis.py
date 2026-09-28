"""Publish the relay obstruction and bounded sensitivity study, without claiming a repair."""
from pathlib import Path
import hashlib
import html
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('/Users/finbarr/.codex/worktrees/performance-audit/kyoto')
LOCAL = WORK / '.local/station-realism'
OUT = ROOT / 'notes/relay-diagnosis'
OUT.mkdir(exist_ok=True)
read = lambda p: json.loads(p.read_text())
files = {
    'before-proof.json': 'relay-before-proof-01/summary.json',
    'before-hint.json': 'relay-before-proof-01/0-kyoto-cascade5.json',
    'before-repeat.json': 'relay-before-proof-01/1-kyoto-cascade5.json',
    'before-neighbor.json': 'relay-before-proof-01/2-kyoto-cascade5.json',
    'design-study.json': 'relay-route-study-01/report.json',
    'angle-study.json': 'relay-route-study-02/report.json',
    'charge-spin-study.json': 'relay-route-study-03/report.json',
    'after-six-target-diagnostic.json': 'relay-route-study-02/7.json',
    'after-neighbor.json': 'relay-route-study-02/11.json',
    'charge-divergence.json': 'relay-route-study-03/2.json',
    'angle-inputs.json': 'relay-inputs-02.json',
    'charge-spin-inputs.json': 'relay-inputs-03.json',
}
for name, source in files.items():
    shutil.copyfile(LOCAL / source, OUT / name)
proof = read(OUT / 'before-proof.json')
assert len(proof['receipts']) == 3
assert all(r['pass'] and r['fullClear'] and r['rest'] for r in proof['receipts'][:2])
assert proof['receipts'][2]['rest'] and not proof['receipts'][2]['pass']
design, angles, charges = [read(OUT / p) for p in ['design-study.json', 'angle-study.json', 'charge-spin-study.json']]
assert [len(r['results']) for r in [design, angles, charges]] == [8, 12, 8]
assert sum(bool(r.get('rest')) for r in angles['results']) == 10
assert [r['index'] for r in angles['results'] if r.get('prefixComplete')] == [7]
assert not any(r.get('prefixComplete') for r in charges['results'])
assert all(r.get('rest') for r in charges['results'])
before = read(OUT / 'before-hint.json')
after = read(OUT / 'after-six-target-diagnostic.json')
assert len(before['challenge']['waypoints']) == 7 and len(after['challenge']['waypoints']) == 6
assert len(after['waypointHits']) == 6
catalog = read(WORK / 'web/starter-challenges.json')
course = next(c for c in catalog if c['id'] == 'kyoto-cascade5')
assert len(course['waypoints']) == 7
holes = read(LOCAL / 'hall-concourse-join-spec-02/spec.json')['basementHoles']
# Native X / -Z, with one scale on both axes. The detail panel enlarges the same data.
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><title>Escalator Relay: unchanged six-target descent, final handrail obstruction</title><rect width="960" height="540" fill="#192029"/>']
for label, box, bounds in [('Full route · height omitted', (30, 45, 900, 190), (-111, 18, -12, 14)), ('Concourse detail · original target 7 is over a moving escalator', (30, 285, 900, 195), (-20, 17, -11, 1))]:
    ox, oy, width, height = box
    xmin, xmax, ymin, ymax = bounds
    scale = min(width / (xmax-xmin), height / (ymax-ymin))
    xy = lambda x, y: (ox+(x-xmin)*scale, oy+(y-ymin)*scale)
    pts = lambda ps: ' '.join('%.2f,%.2f' % xy(x,y) for x,y in ps)
    svg.append(f'<text x="30" y="{oy-12}" fill="white" font-family="sans-serif" font-size="17">{html.escape(label)}</text>')
    svg.append(f'<clipPath id="clip{oy}"><rect x="{ox}" y="{oy}" width="{width}" height="{height}"/></clipPath><g clip-path="url(#clip{oy})">')
    for hole in holes:
        svg.append(f'<polygon points="{pts(hole)}" fill="#0a1017" stroke="#899aab"/>')
    for trace, color in [(before,'#69bfff'),(after,'#ffae79')]:
        ps = [(p['p']['x'],-p['p']['z']) for p in trace['poses'][::3]]
        ps.append((trace['poses'][-1]['p']['x'],-trace['poses'][-1]['p']['z']))
        svg.append(f'<polyline points="{pts(ps)}" fill="none" stroke="{color}" stroke-width="2"/>')
    for i,w in enumerate(course['waypoints'],1):
        x,y=xy(w['center']['x'],-w['center']['z'])
        svg.append(f'<circle cx="{x}" cy="{y}" r="{w["radius"]*scale}" fill="none" stroke="#e6e9b3"/><text x="{x+6}" y="{y-8}" fill="#e6e9b3" font-size="12" font-family="sans-serif">{i}</text>')
    contact = next(c for c in after['contacts'] if c['surface']=='hall-basement-west-source-handrails')
    x,y=xy(contact['point']['x'],-contact['point']['z'])
    svg.append(f'<circle cx="{x}" cy="{y}" r="4" fill="#ffae79" stroke="white"/></g>')
svg.append('<text x="30" y="518" fill="#69bfff" font-family="sans-serif" font-size="15">Before: seven targets cleared</text><text x="340" y="518" fill="#ffae79" font-family="sans-serif" font-size="15">After: six-target diagnostic only</text></svg>')
(OUT/'route.svg').write_text(''.join(svg))
rows = []
for title, study in [('Angle', angles), ('Charge / spin', charges)]:
    for r in sorted(study['results'], key=lambda r:r['index']):
        shot=r['shot']; outcome=', '.join(x.replace('patch-','') for x in r.get('prefixHits',[])) or ('timeout' if 'Timed out' in r.get('error','') else 'cancelled')
        rows.append(f'<tr><td>{title}</td><td>{shot["yaw"]}</td><td>{shot["speed"]}</td><td>{shot["top"]}</td><td>{outcome}</td></tr>')
links=''.join(f'<li><a href="{name}">{name}</a></li>' for name in files)
(OUT/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Escalator Relay diagnosis</title><style>body{margin:0;background:#121920;color:#e6edf5;font:16px/1.55 system-ui}main{max-width:1000px;margin:auto;padding:24px 18px}a{color:#8dcaff}h1{line-height:1.2}img{width:100%;height:auto}p,li{overflow-wrap:anywhere}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;padding:8px;border-bottom:1px solid #394651}.status{padding:16px;border-left:4px solid #ffae79;background:#242932}</style><main><a href="../../index.html">Research library</a><h1>Escalator Relay: obstruction and inherited sensitivity</h1><p class="status">Diagnosis complete; course repair remains open. The original hint clears seven targets before the hall changes. Candidate05 retains the first six, then hits the new western handrail. No course definition or geometry was changed.</p><p>The existing +0.05° neighbor fails on both layouts. Among 20 tests of the supported six-target prefix, only the exact original input collects all six. This is a finite sample, not a proof that another route is impossible.</p><img src="route.svg" alt="Full route and enlarged plan of the final obstruction, showing all seven original target circles"><p>Blue is a full seven-target course proof. Orange temporarily omits invalid target 7 for diagnosis and cannot establish course completion. Both displayed shots finish at complete physical rest.</p><p><a href="../RELAY-DIAGNOSIS.md">Read findings and next steps.</a></p><h2>Supported-target diagnostics</h2><p>Target numbers report authoritative native hits among the original first six. Sparse impact distances in the raw study are not hit tests. Timeout and cancellation are failures.</p><div class="scroll"><table><thead><tr><th>Study</th><th>Yaw °</th><th>Speed m/s</th><th>Top</th><th>Targets hit</th></tr></thead><tbody>'''+''.join(rows)+'</tbody></table></div><h2>Evidence</h2><ul>'+links+'</ul></main></html>')
(OUT/'manifest.json').write_text(json.dumps({'status':'Diagnosis only; seven-target repair remains open','files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir() if p.is_file() and p.name!='manifest.json'}},indent=2)+'\n')
print(OUT)
