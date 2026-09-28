"""Publish the evidence for the private Pillar Carom approach revision."""
from pathlib import Path
import hashlib
import html
import json
import math
import shutil

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('.')
LOCAL = WORK / '.local/station-realism'
OUT = ROOT / 'notes/pillar-approach'


def read(path):
    return json.loads(path.read_text())


def route_length(poses):
    return sum(math.dist([a['p'][k] for k in 'xyz'], [b['p'][k] for k in 'xyz']) for a, b in zip(poses, poses[1:]))


proof = read(LOCAL / 'pillar-approach-proof-02/summary.json')
assert len(proof['receipts']) == 3
assert all(r['pass'] and r['rest'] and r['fullClear'] for r in proof['receipts'])
assert all(r['nonFloorTargets'] >= 1 and r['sharpTurns'] >= 1 for r in proof['receipts'] if r['kind'] == 'hint')
browser = read(LOCAL / 'pillar-browser-05/report.json')
assert browser['pass'] and browser['result']['result']['success']
assert browser['result']['diagnostics']['sleeping']
confirmation = read(LOCAL / 'pillar-browser-06/report.json')
assert confirmation['pass'] and confirmation['result']['result']['success']
OUT.mkdir(exist_ok=True)
files = {
    'course-proof.json': 'pillar-approach-proof-02/summary.json',
    'repair.json': 'pillar-approach-02/repair.json',
    'original-trace.json': 'hall-pillar-before-01/0-kyoto-pillar-carom.json',
    'blocked-trace.json': 'hall-pillar-proof-02/0-kyoto-pillar-carom.json',
    'revised-trace.json': 'pillar-approach-proof-02/0-kyoto-pillar-carom.json',
    'input-study-original.json': 'pillar-input-study-01/report.json',
    'input-study-approach.json': 'pillar-input-study-02/report.json',
    'input-study-refinement.json': 'pillar-input-study-05/report.json',
    'earlier-native-proposal.json': 'pillar-input-study-03/report.json',
    'keyboard-miss.json': 'pillar-browser-04/report.json',
    'keyboard-miss-replay.json': 'pillar-browser-04/replay.json',
    'browser-proof.json': 'pillar-browser-05/report.json',
    'browser-acceptance.json': 'pillar-browser-05/acceptance.json',
    'browser-replay.json': 'pillar-browser-05/replay.json',
    'browser-aim.png': 'pillar-browser-05/aim.png',
    'browser-result.png': 'pillar-browser-06/result.png',
    'browser-confirmation.json': 'pillar-browser-06/report.json',
    'browser-confirmation-acceptance.json': 'pillar-browser-06/acceptance.json',
    'browser-confirmation-replay.json': 'pillar-browser-06/replay.json',
    'runtime-workspace.json': 'runtime-hall-courses-02/candidate-runtime.json',
}
for name, source in files.items():
    shutil.copyfile(LOCAL / source, OUT / name)
before = read(OUT / 'original-trace.json')
blocked = read(OUT / 'blocked-trace.json')
after = read(OUT / 'revised-trace.json')
course = after['challenge']
authored = next(c for c in read(LOCAL / 'pillar-approach-02/catalog.json') if c['id'] == 'kyoto-pillar-carom')
pillar_surface = course['waypoints'][1]['surface']


def approach(trace):
    contact = next(c for c in trace['contacts'] if c['surface'] == pillar_surface)
    return route_length([p for p in trace['poses'] if p['t'] <= contact['time']])


comparison = {
    'beforeLayout': before['layout'], 'afterLayout': after['layout'],
    'beforeStart': before['challenge']['start'], 'afterStart': course['start'],
    'beforeHint': before['challenge']['hint'], 'afterHint': course['hint'],
    'beforeApproachM': approach(before), 'afterApproachM': approach(after),
    'beforeTotalPathM': route_length(before['poses']), 'afterTotalPathM': route_length(after['poses']),
    'targetCentersRadiiNormalsUnchanged': all({k: a[k] for k in ['id', 'center', 'radius', 'normal']} == {k: b[k] for k in ['id', 'center', 'radius', 'normal']} for a, b in zip(before['challenge']['waypoints'], course['waypoints'])),
    'fullClearProof': {'authored': 2, 'neighborYawDeltaDegrees': .2, 'neighbors': 1, 'actualKeyboardClears': 2},
    'meaning': 'A private current-layout repair. Target difficulty and pillar bank are retained; the approach is longer. No global difficulty equivalence, all-course, final architecture or performance claim.'
}
assert comparison['targetCentersRadiiNormalsUnchanged']
(OUT / 'comparison.json').write_text(json.dumps(comparison, indent=2)+'\n')

holes = read(LOCAL / 'hall-concourse-join-spec-02/spec.json')['basementHoles']
points = [(p['p']['x'], -p['p']['z']) for t in [before, blocked, after] for p in t['poses']]
points += [tuple(p) for h in holes for p in h]
xmin, xmax = min(p[0] for p in points)-2, max(p[0] for p in points)+2
zmin, zmax = min(p[1] for p in points)-2, max(p[1] for p in points)+2
scale = min(550/(xmax-xmin), 660/(zmax-zmin))
xy = lambda x, z: (35+(x-xmin)*scale, 100+(z-zmin)*scale)
pts = lambda ps: ' '.join('%.2f,%.2f' % xy(x, z) for x, z in ps)
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 890" role="img"><title>Pillar Carom: the revised approach between the wells</title><desc>Native replay plan projections. The original route is blue, the blocked route red, and the revised route green. Target circles retain their original positions and radii. Height is omitted.</desc><rect width="620" height="890" fill="#192029"/><g fill="#eef3f8" font-family="sans-serif"><text x="30" y="36" font-size="22">Keep the pillar bank; change the approach</text><text x="30" y="63" font-size="14">Native trajectories · plan projection · height omitted</text></g>']
for hole in holes:
    svg.append(f'<polygon points="{pts(hole)}" fill="#070c12" stroke="#acbac9" stroke-width="1.5"/>')
for trace, color in [(before, '#62baff'), (blocked, '#ef8e7a'), (after, '#8ee5ab')]:
    ps = [(p['p']['x'], -p['p']['z']) for p in trace['poses'][::3]]
    ps.append((trace['poses'][-1]['p']['x'], -trace['poses'][-1]['p']['z']))
    svg.append(f'<polyline points="{pts(ps)}" fill="none" stroke="{color}" stroke-width="2" opacity=".95"/>')
for target in course['waypoints']:
    x, y = xy(target['center']['x'], -target['center']['z'])
    svg.append(f'<circle cx="{x}" cy="{y}" r="{target["radius"]*scale}" fill="none" stroke="#f4d68b" stroke-width="2"/>')
for trace, label, color in [(before, 'Old start', '#62baff'), (after, 'Revised start', '#8ee5ab')]:
    p = trace['challenge']['start']['center']; x, y = xy(p['x'], -p['z'])
    svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{color}"/><text x="{x+12}" y="{y+24}" fill="{color}" font-family="sans-serif" font-size="13" text-anchor="start">{label}</text>')
svg.append(f'<path d="M30 795h{5*scale}" stroke="#ccd7e2" stroke-width="3"/><text x="30" y="818" fill="#ccd7e2" font-family="sans-serif" font-size="13">5 m</text>')
for i, (label, color) in enumerate([('Original: three targets', '#62baff'), ('Old input + new wells: none', '#ef8e7a'), ('Revised: three targets + pillar bank', '#8ee5ab')]):
    y = 804+i*27
    svg.append(f'<path d="M150 {y}h25" stroke="{color}" stroke-width="3"/><text x="185" y="{y+5}" fill="#e2eaf1" font-family="sans-serif" font-size="14">{label}</text>')
svg.append('</svg>')
(OUT / 'route.svg').write_text(''.join(svg))

note = f'''# Pillar Carom: a verified approach between the wells

28 September 2026. [Route comparison and actual-game screenshots](pillar-approach/index.html).

## What changed

The private Pillar Carom revision moves its suggested launch spot **8 m east along the concourse**, from native X=−12 to X=−4, keeping Y=0 and Z=−21. Suggested yaw changes from **155° to 168.95°**. The marked speed is refined from **15 to 14.85 m/s**; pitch remains 15° and both spin controls remain zero.

All three target **IDs, centers, normals and radii remain exact** in the authored catalog: a 0.60 m floor target, a 0.35 m target on the original pillar face, and a 0.45 m return target. The return target binds to the replacement hall floor at the same position. Start radius, allowed controls, scoring, chapter, title and course description remain unchanged. Private revision 1 becomes revision 2.

The course is still a long approach into a sharp pillar bank. Its measured path before the pillar grows from **{comparison['beforeApproachM']:.2f} m to {comparison['afterApproachM']:.2f} m**. The information glazing provides the initial bank, and the ball uses the gap between the oval and eastern wells. Total path falls from {comparison['beforeTotalPathM']:.2f} m to {comparison['afterTotalPathM']:.2f} m because the real guard stops the trailing roll after the required targets; the displayed distance is updated to {authored['campaign']['distance']:.1f} m. These measurements support the retained route challenge, not a claim that every player's perceived difficulty is identical.

## Native acceptance

On exact candidate05, two repeated authored shots and the existing **+0.2° yaw neighbor** collect all three targets and finish at full translational and rotational rest. Both authored shots satisfy the original wall-target and sharp-turn requirements. No timeout or recall counts as completion.

The initial proposal passed exact 15 m/s trials, but a real keyboard throw at 15.052 m/s missed the first circle. The final input study clears at 14.8, 14.85, 14.9 and 15.0 m/s, while 14.95 m/s misses the return target. These sampled outcomes do not establish a continuous success range. The final marked 14.85 m/s input passes the repeated native proof and the actual keyboard check; all failed trials remain available. The original-start study found no full clears among its 16 configurations: 13 rested without clearing, two left the station, and one observation timed out. Those unsuccessful trials remain saved.

The strict campaign verifier permits this bounded revision only with hashed native trace, input-study and original-route evidence. It reconstructs the expected catalog from the original definitions, rejects changes beyond the declared start/aim/marked-charge/distance and floor rebinding, and then replays the authored inputs. Native Float32 geometry is compared to the exact Float32 conversion of the original values; authored target numbers remain unchanged.

## Actual browser game

Chrome loads the complete candidate station and matching moving-lane metadata. Normal onboarding, the H hint control and a Space-key throw verify the new launch location and aim. Two actual keyboard throws clear all three targets and save authoritative scores at physical rest. The second screenshot waits for the score counter to settle. [Browser receipt](pillar-approach/browser-proof.json).

The initial browser check waited for readiness without completing the player-name form. Its timeout is a test setup failure, retained separately; subsequent setup fixes select the explicit game canvas and wait for both the briefing and its transition to finish. These test harness failures remain saved; none changed the game. These screenshots are gameplay inspection views, not registered architectural comparisons or performance acceptance.

## Private integration and remaining scope

The combined catalog in `pillar-approach-02` includes both this repair and the previously verified Locker Loop finish. The isolated `runtime-hall-courses-02` workspace serves that catalog with native layout `47693cafa1aa635c6ceb88cedc1794a1d53fff612ba022661a4c5b6d986ff341` and matching browser05 assets. The active game catalog remains unchanged.

**Seven other courses remain unresolved:** Balcony Express, Escalator Relay, East-to-West Ricochet, Fascia Flip, Garden Switchback, Skyway Trapdoor and Sculpture Square Slingshot. Wider gate/upper-floor architecture, B2 geometry, final materials and lighting, station/plaza/street views, vegetation, full runtime checks and paired Chrome performance/audio acceptance also remain open. Future architecture changes must revalidate this route.

No geometry, native C#, physical material or scoring rule changed in this repair. The long-term reconstruction goal remains active. Nothing was committed, pushed or deployed.
'''
(ROOT / 'notes/PILLAR-APPROACH.md').write_text(note)
links = ''.join(f'<li><a href="{name}">{html.escape(name)}</a></li>' for name in [*files, 'comparison.json'])
(OUT / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pillar Carom approach repair</title><style>body{margin:0;background:#131a21;color:#e8eef5;font:16px/1.6 system-ui}main{max-width:1000px;margin:auto;padding:28px 20px}a{color:#8dcaff}h1{line-height:1.2}p,li{overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto;margin:24px auto}.route{width:min(100%,620px)}.status{border-left:4px solid #8ee5ab;background:#20312a;padding:16px}</style><main><a href="../../index.html">Research library</a><h1>A clear approach to the original pillar bank</h1><p>Private candidate05 · 28 September 2026</p><p class="status">Two authored shots and the original +0.2° neighbor clear all three targets at full rest. All target positions and sizes remain unchanged. The launch shifts 8 m along the concourse and uses a new aim.</p><p><a href="../PILLAR-APPROACH.md">Read the measurements, verification and remaining scope.</a></p><img class="route" src="route.svg" alt="Original, blocked and revised Pillar Carom trajectories with unchanged targets and well openings"><h2>Actual game inspection</h2><p>Chrome, 1280 × 720. These show course behavior; they are not final architectural or performance acceptance.</p><img src="browser-aim.png" alt="Revised Pillar Carom launch location in the complete station"><img src="browser-result.png" alt="Completed three-target course after a keyboard throw"><h2>Evidence</h2><ul>'''+links+'</ul></main></html>')
(OUT / 'manifest.json').write_text(json.dumps({'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir() if p.is_file() and p.name != 'manifest.json'}, 'status': 'Two private course repairs verified; seven other course conflicts and wider reconstruction gates remain open.'}, indent=2)+'\n')
print(OUT)
