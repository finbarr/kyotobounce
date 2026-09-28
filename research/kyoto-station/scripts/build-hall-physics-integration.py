"""Publish the material correction, independent floor audit and paired course evidence."""
from pathlib import Path
import json,hashlib,shutil,html,math
root=Path('research/kyoto-station');w=Path('.');r=w/'.local/station-realism';out=root/'notes/hall-physics-integration';out.mkdir(exist_ok=True)
files={'compression.json':'hall-basement-browser-05/compression.json','motion.json':'hall-basement-motion-02/proof.json','runtime-workspace.json':'runtime-hall-basement-02/candidate-runtime.json','clipping.json':'hall-floor-clipping-02/proof.json','material-change.json':'station-hall-basement-05/material-proof.json','native-scope.json':'station-hall-basement-05/scope-proof.json','attributes.json':'hall-basement-browser-05/attribute-proof.json','browser-scope.json':'hall-basement-browser-05/scope-proof.json','render-equivalence.json':'hall-basement-browser-05/render-equivalence.json','walks.json':'full-station-b1-return-02/report.json','placement-conflicts.json':'hall-full-course-support-06/report.json','pillar-before-summary.json':'hall-pillar-before-01/summary.json','pillar-after-summary.json':'hall-pillar-proof-02/summary.json','pillar-before-trace.json':'hall-pillar-before-01/0-kyoto-pillar-carom.json','pillar-after-trace.json':'hall-pillar-proof-02/0-kyoto-pillar-carom.json'}
for name,source in files.items():shutil.copyfile(r/source,out/name)
a=json.loads((out/'pillar-before-trace.json').read_text());b=json.loads((out/'pillar-after-trace.json').read_text());spec=json.loads((r/'hall-concourse-join-spec-02/spec.json').read_text());course=next(c for c in json.loads((w/'web/starter-challenges.json').read_text())if c['id']=='kyoto-pillar-carom');hit=next(c for c in b['contacts']if c['surface']=='hall-bay-well-glass-oval')
comparison={'beforeLayout':a['layout'],'afterLayout':b['layout'],'originalShot':dict(yaw=155,pitch=15,speed=15,top=0,kick=0),'beforeTargets':[h['waypointId']for h in a['waypointHits']],'afterTargets':[h['waypointId']for h in b['waypointHits']],'newGuardContact':hit,'earlyFloorContactDifferencesM':[math.dist(list(x['point'].values()),list(y['point'].values()))for x,y in zip(a['contacts'][:5],b['contacts'][:5])],'meaning':'The same authored shot clears all targets before integration and is deflected by the real oval-well guard afterward. Small earlier contact differences exist on the new tiled floor; the guard is the first new obstacle contact. No course repair is accepted.'};(out/'trajectory-comparison.json').write_text(json.dumps(comparison,indent=2)+'\n')
# A metrically uniform plan projection of native replay positions and source well outlines.
scale=13;ox=290;oy=430
xy=lambda x,z:(ox+x*scale,oy+z*scale)
pts=lambda ps:' '.join('%.2f,%.2f'%xy(x,z)for x,z in ps)
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 860" role="img" aria-labelledby="title desc"><title id="title">Pillar Carom route conflict</title><desc id="desc">Plan projection of the original and new physical trajectories, source well openings, three target centers and the first new glass guard collision. Height is omitted.</desc><rect width="620" height="860" fill="#192029"/><text x="30" y="34" fill="#fff" font-family="sans-serif" font-size="22">Pillar Carom: route meets the new well</text><text x="30" y="60" fill="#bcc8d7" font-family="sans-serif" font-size="14">Native replay positions · plan view · height omitted</text>']
for h in spec['basementHoles']:svg.append(f'<polygon points="{pts(h)}" fill="#070b11" stroke="#b4bfc9" stroke-width="2"/>')
for trace,color in [(a,'#5cbaff'),(b,'#ff9a71')]:svg.append(f'<polyline points="{pts([(p["p"]["x"],-p["p"]["z"])for p in trace["poses"][::3]])}" fill="none" stroke="{color}" stroke-width="2" opacity=".9"/>')
for i,t in enumerate(course['waypoints']):
 x,y=xy(t['center']['x'],-t['center']['z']);svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#b7e485"/><path d="M{x+7} {y}H465" stroke="#b7e485"/><text x="470" y="{y+5}" fill="#dcead0" font-family="sans-serif" font-size="13">Target {i+1}</text>')
x,y=xy(hit['point']['x'],-hit['point']['z']);svg.append(f'<circle cx="{x}" cy="{y}" r="7" fill="#ff9a71" stroke="#fff"/><path d="M{x-8} {y}H35V{y-25}" fill="none" stroke="#ff9a71"/><text x="35" y="{y-32}" fill="#ffbb9f" font-family="sans-serif" font-size="14">New guard contact · {hit["time"]:.3f}s</text>')
x,y=xy(course['start']['center']['x'],-course['start']['center']['z']);svg.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#fff"/><text x="{x+12}" y="{y+5}" fill="#fff" font-family="sans-serif" font-size="14">Original start</text>')
svg+=['<path d="M30 778H95" stroke="#c8d2df" stroke-width="3"/><text x="30" y="799" fill="#c8d2df" font-family="sans-serif" font-size="13">5 m</text><path d="M150 786H178" stroke="#5cbaff" stroke-width="3"/><text x="188" y="791" fill="#d6e5f2" font-family="sans-serif" font-size="14">Before: all 3 targets</text><path d="M150 818H178" stroke="#ff9a71" stroke-width="3"/><text x="188" y="823" fill="#d6e5f2" font-family="sans-serif" font-size="14">After: no targets</text></svg>'];(out/'route.svg').write_text(''.join(svg))
text='''# Hall floor physics and clipping correction

28 September 2026. [Route comparison and evidence gallery](hall-physics-integration/index.html). This supersedes the unresolved floor-clipping status in the [candidate04 integration note](HALL-FULL-INTEGRATION.md).

## What changed

The private final native candidate is now **station-hall-basement-05**, with matching **hall-basement-browser-05**. Its hall floor uses the original concourse's registered `granite` physics response. The prior `floor` key was absent from `StationWorld`'s material table and silently fell back to `stone`, changing rebound and friction. Ten new basement floors now name `stone` explicitly, retaining their previous effective response. One uninstalled upper-floor sample also receives that explicit alias.

Every triangle, normal, UV, surface ID, visual material, image, moving lane and other physical field is retained. Only the hall floor's effective physical response changes. Component builders now emit recognized names, and the installer rejects unknown physical keys before opening Blender. No C# change or worker rebuild was needed; fresh isolated workers loaded the revised layout.

## Floor export audit: resolved

The earlier whole-union Hausdorff metric compared topological boundaries that differ through microscopic Float32 slits. Increasing its threshold would not establish correct geometry.

The replacement [independent audit](hall-physics-integration/clipping.json) reads every floor source triangle and the clip masks from Blender. GEOS independently subtracts the masks. Each result must have no missing or excess area beyond two coordinate ULPs, with a two-micrometre minimum, and satisfy its area bound. The final GLB's oriented triangle positions must exactly match the traced fragments.

**252 native source triangles, 320 emitted triangles and all 14 clipped source triangles pass.** The three audited source objects are the concourse, eastern recess floor and curved mezzanine stone. Both original and corrected-material candidates pass. Original failed diagnostics remain available; this is a more appropriate geometric check, not a widened Hausdorff threshold or a geometry edit.

## Course repair remains necessary

All 74 full-radius placements were rerun against the exact candidate05. The same 16 rejections and four changed surface identities remain across six courses.

Pillar Carom initially looked like a surface-ID-only repair. A private revision rebinds `bank-3` to `hall-bay-floor-surface`, leaving every target coordinate, radius, normal, hint, start and scoring rule unchanged. The strict campaign verifier now permits this change only when a hashed native placement receipt supports the exact new surface and current layout.

Actual throws reject that repair:

- Before integration, the original shot collects all three targets and makes the required pillar bank, finishing at full physical rest.
- After the material correction, both repeated authored shots and the nearby yaw input finish at rest but collect **zero targets**.
- The authored shot hits `hall-bay-well-glass-oval` at **4.222 seconds**, at native `(0.0538, 0.7505, 3.4784)` metres. The first five contact locations differ from the old route by at most about 2.04 mm; the new guard then redirects it.

![Paired native route traces](hall-physics-integration/route.svg)

The surface-only repair is therefore **not accepted**. The real well and glass guard remain. The course needs a source-compatible route that retains its pillar-bank identity and difficulty; deleting the guard or reducing the course to an easier nearby toss would not satisfy the goal. No canonical course or score was changed.

## Verification and appearance

- Fresh candidate05: all 35 basement support/headroom checks and ten return walks pass.
- All 191,286 installed attributes and 17 materials pass source comparison; unrelated 1,900 batches, 304 images and 489 material definitions remain preserved.
- The regenerated browser export differs from candidate04 only in one **unused UV channel** on the untextured charcoal soffit. JSON, used geometry attributes, materials and image bytes remain exact, and the game's material classifier applies no UV-dependent treatment there. The existing static construction screenshots remain representative; no new visual improvement or FPS result is claimed.
- Private motion metadata and runtime packaging are regenerated for the current layout. Original course definitions remain unmodified in that runtime workspace; the failed repair is kept separately as diagnostic evidence.

## Final identities

- Native layout: `47693cafa1aa635c6ceb88cedc1794a1d53fff612ba022661a4c5b6d986ff341`.
- Raw browser GLB: `3dcd94e590b4f3f910f64dad916be8d9dae7dc52b3e076ab1cd96daf9993b29d`.
- Runtime GLB: `3c08c23032f7f2f1a12f34e3e0f0497844e4e756fc8a866c8fdce43de0210c5c`, 122,594,084 bytes.
- Derived motion/detail metadata: `cb230e8ccb3277e2ca8c921a3ee38ff52fbe9bced5d78ecb915a3f042f145819`.

## Remaining work

Reconstruct the six affected course routes and prove complete shots, then finish the hall/gate interfaces and defensible B2 geometry. Shopfront dimensions, materials, lighting, the remaining station/plaza/street reference views, vegetation, all-course/runtime gates and the full Chrome gameplay/audio soak remain open. The candidate is local and unaccepted; nothing was committed or deployed.
'''
(root/'notes/HALL-PHYSICS-INTEGRATION.md').write_text(text)
links=''.join(f'<li><a href="{name}">{name}</a></li>'for name in [*files,'trajectory-comparison.json'])
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hall physics and route conflict</title><style>body{margin:0;background:#151b22;color:#e6edf5;font:16px/1.6 system-ui}main{max-width:1000px;margin:auto;padding:28px 20px}a{color:#8dcaff}h1{line-height:1.2}img{display:block;width:min(100%,620px);height:auto;margin:28px auto}.status{border-left:4px solid #d8b56f;padding:16px;background:#352f23}code{overflow-wrap:anywhere}</style><main><a href="../../index.html">Research library</a><h1>Correct floor response, real route conflict</h1><p>Private candidate05 · 28 September 2026</p><p>The hall now uses the original concourse's granite physics. Every floor clipping triangle passes an independent geometric audit, and all ten basement return walks pass.</p><p class="status">Course acceptance still fails. The original Pillar Carom shot clears three targets before integration, then strikes the new oval-well glass at 4.222 seconds afterward. Its surface-ID-only repair is rejected.</p><img src="route.svg" alt="Paired native replay trajectories showing the new oval-well guard conflict"><p><a href="../HALL-PHYSICS-INTEGRATION.md">Read the correction, evidence and remaining requirements.</a></p><h2>Evidence</h2><ul>'''+links+'</ul></main></html>')
(out/'manifest.json').write_text(json.dumps({'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in out.iterdir()if p.is_file()and p.name!='manifest.json'},'status':'private unaccepted candidate05; course failures preserved'},indent=2)+'\n')
print(out)
