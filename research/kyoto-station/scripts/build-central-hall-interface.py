"""Publish the central-hall dependency inventory and measured floor mismatch."""
from pathlib import Path
import json, hashlib, html, shutil
R=Path(__file__).resolve().parents[1]
W=Path('/Users/finbarr/.codex/worktrees/performance-audit/kyoto')
D=W/'.local/station-realism'; O=R/'notes/central-hall-interface'; O.mkdir(exist_ok=True)
def load(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
I=load(D/'central-hall-interface-02/inventory.json'); S=load(D/'central-hall-bay-spec-01/spec.json'); N=load(D/'central-hall-bay-03/native-panels.json'); P=load(D/'central-hall-floor-probe-01/report.json')
assert P['pass'] and P['baseLayoutSha256']==I['inputs']['layout']['sha256'] and P['componentNativeSha256']==I['inputs']['component']['nativeSha256']
files={'inventory.json':'central-hall-interface-02/inventory.json','native-floor-probe.json':'central-hall-floor-probe-01/report.json','spec.json':'central-hall-bay-spec-01/spec.json'}
for dst,src in files.items():shutil.copyfile(D/src,O/dst)
colors={'old-hall':'#ae552e','gate-equipment':'#a94775','neighbor':'#7e8a90','roof-or-registered':'#7386a5','shared-concourse':'#b2b6b2','new':'#147c71'}
def esc(t):return html.escape(str(t),quote=True)
def bbox(p):
 vs=[[v['x'],v['y'],-v['z']-S['frame']['frontZ']-S['frame']['slope']*v['x']]for v in p['vertices']]
 return [[min(v[k]for v in vs)for k in range(3)],[max(v[k]for v in vs)for k in range(3)]]
def diagram(kind):
 x0,x1,y0,y1=(-18,31,-8.5,40) if kind=='plan' else (-9,40,0,60)
 scale=9 if kind=='plan' else 8; X=80;Y=70; width=640;height=580 if kind=='plan' else 610
 def pt(x,y):return (X+(x-x0)*scale,Y+(y-y0)*scale) if kind=='plan' else (X+(x-x0)*scale,Y+(y1-y)*scale)
 def rect(a,b,color,opacity,title,cat):
  a=[max(x0,a[0]),max(y0,a[1])];b=[min(x1,b[0]),min(y1,b[1])]
  if b[0]<a[0] or b[1]<a[1]:return ''
  p=pt(a[0],a[1]if kind=='plan'else b[1]);return f'<rect data-category="{cat}" x="{p[0]:.3f}" y="{p[1]:.3f}" width="{max(.5,(b[0]-a[0])*scale):.3f}" height="{max(.5,(b[1]-a[1])*scale):.3f}" fill="{color}" fill-opacity="{opacity}" stroke="{color}" stroke-width=".65"><title>{esc(title)}</title></rect>'
 title='Ground-level plan'if kind=='plan'else'Section through the upper bay (X = 8.6 m)'
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="{title}"><rect width="100%" height="100%" fill="#f7f8f3"/><text x="24" y="28" font-family="system-ui" font-size="20" fill="#213c34">{title}</text><g font-family="system-ui" font-size="11" fill="#52675e">'
 for x in range(-5 if kind=='section'else -15,41 if kind=='section'else 31,5):
  a=pt(x,y0);b=pt(x,y1);svg+=f'<path d="M{a[0]},{a[1]}L{b[0]},{b[1]}" stroke="#dce2d9"/><text x="{a[0]-6}" y="{Y+(y1-y0)*scale+19}">{x}</text>'
 for y in range(0,61 if kind=='section'else 41,5):
  a=pt(x0,y);b=pt(x1,y);svg+=f'<path d="M{a[0]},{a[1]}L{b[0]},{b[1]}" stroke="#dce2d9"/><text x="{X-29}" y="{a[1]+4}">{y}</text>'
 svg+='</g>'
 for r in I['records']:
  a,b=r['boundsLocal'];cat=r['category']
  if not r['collision'] or r['kind'] not in ['panels','boxes']:continue
  if kind=='plan':
   if not(a[1]<3 and b[1]>.05):continue
   svg+=rect([a[0],a[2]],[b[0],b[2]],colors[cat],.12,r['id'],cat)
  elif a[0]<=8.6<=b[0]:svg+=rect([a[2],a[1]],[b[2],b[1]],colors[cat],.12,r['id'],cat)
 for p in N['panels']:
  if p.get('collision')is False:continue
  a,b=bbox(p)
  if kind=='plan':
   if not(a[1]<3 and b[1]>.03):continue
   svg+=rect([a[0],a[2]],[b[0],b[2]],colors['new'],.26,p['id'],'new')
  elif a[0]<=8.6<=b[0]:svg+=rect([a[2],a[1]],[b[2],b[1]],colors['new'],.26,p['id'],'new')
 if kind=='plan':
  for r in I['routes']:
   if r['id']!='concourse-south-hall-in-out':continue
   ps=[pt(p[0],p[2])for p in r['pointsLocal']];svg+='<polyline points="'+' '.join(f'{x},{y}'for x,y in ps)+'" fill="none" stroke="#c23834" stroke-width="2" stroke-dasharray="5 3"><title>Existing hall in/out foot route</title></polyline>'
  for c in I['courseDependencies']:
   if c['id']!='kyoto-balcony':continue
   for f in c['features']:
    if f['feature']=='goal':continue
    x,y=pt(f['pointLocal'][0],f['pointLocal'][2]);svg+=f'<circle cx="{x}" cy="{y}" r="4" fill="#72388f"><title>Balcony {f["feature"]}: buried by sample floor</title></circle>'
  for x,y,t in [(-16,-5,'Sample approach / 5 waypoints'),(-6,2,'New gate opening'),(-6,17,'Current gate-wall opening'),(-6,25,'Current ticket-gate fixtures')]:
   px,py=pt(x,y);svg+=f'<text x="{px}" y="{py}" font-family="system-ui" font-size="11" fill="#173c34" paint-order="stroke" stroke="#f7f8f3" stroke-width="3">{t}</text>'
 else:
  for d,y,t in [(1,31,'New bay'),(19,36,'Current wall'),(22,20.8,'4F walkway'),(29,16.8,'3F walkway')]:
   px,py=pt(d,y);svg+=f'<text x="{px}" y="{py}" font-family="system-ui" font-size="11" fill="#173c34" paint-order="stroke" stroke="#f7f8f3" stroke-width="3">{t}</text>'
 label='Horizontal: east X · vertical: depth behind source wall (m)'if kind=='plan'else'Horizontal: depth behind source wall · vertical: height (m)'
 svg+=f'<text x="24" y="{height-12}" font-family="system-ui" font-size="12" fill="#52675e">{label}</text></svg>'
 (O/(kind+'.svg')).write_text(svg)
for kind in ['plan','section']:diagram(kind)
course_rows=''.join('<tr><td>'+esc(c['id'])+'</td><td>'+esc(', '.join(f['feature']for f in c['features']))+'</td></tr>'for c in I['courseDependencies']if c['features'])
route_rows=''.join('<li>'+esc(r['id'])+'</li>'for r in I['routes'])
count_rows=''.join(f'<tr><td>{esc(k)}</td><td>{v:,}</td></tr>'for k,v in I['counts']['byCategory'].items())
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Central hall · integration dependencies</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf1ed;color:#213c34;font:16px/1.55 system-ui}main{max-width:1320px;margin:auto;padding:32px}h1{font-size:clamp(32px,4vw,48px);line-height:1.12;max-width:960px}h2{margin-top:32px}a{color:#17614d}nav{display:flex;gap:18px;flex-wrap:wrap}.tag,figcaption,.small{font-size:13px;color:#52675e}.notice{padding:18px;border-left:4px solid #ad7b1b;background:#fff0d1}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure{margin:0}img{width:100%;height:auto;display:block}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border-bottom:1px solid #c9d4cc;text-align:left;overflow-wrap:anywhere}li{margin:8px 0}code{overflow-wrap:anywhere}.legend{display:flex;flex-wrap:wrap;gap:18px;font-size:13px}.dot{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:3px}@media(max-width:700px){main{padding:18px}.grid{grid-template-columns:1fr}}
</style><main><header><div class="tag">KYOTO STATION / CENTRAL HALL / INTEGRATION CHECK</div><h1>The bay needs a connected floor and gate passage before installation.</h1><p>The new facade sample lies about 15.87 m forward of the current modeled gate wall. A spatial inventory now identifies the neighboring structure, fixtures and gameplay routes that a coordinated replacement must account for.</p><nav><a href="../../index.html">Research library</a><a href="../central-hall-construction/index.html">Bay and photo study</a><a href="../CENTRAL-HALL-INTERFACE.md">Evidence note</a></nav><p class="notice"><strong>Native physics confirms a floor mismatch.</strong> Adding the sample as built raises support under all five Balcony waypoints from 0 to 0.2366 m. The component remains uninstalled. This check identifies a required correction; it does not validate a replacement or complete the photorealism milestone.</p></header>
<section><h2>Where the current and proposed geometry sit</h2><div class="legend"><span><i class="dot" style="background:#147c71"></i>New sample</span><span><i class="dot" style="background:#ae552e"></i>Current hall</span><span><i class="dot" style="background:#a94775"></i>Current gates</span><span><i class="dot" style="background:#7386a5"></i>Current roof</span><span><i class="dot" style="background:#7e8a90"></i>Other neighbors</span></div><div class="grid"><figure><a href="plan.svg"><img src="plan.svg" alt="Plan showing the sample forward of the current gate wall and ticket gates, with five course waypoints on its paving"></a><figcaption>Ground-level record bounds for objects below 3 m. Red dashed line: current hall foot route. Purple dots: Balcony waypoints. Record bounds illustrate dependencies; they are not exact footprints or a deletion set.</figcaption></figure><figure><a href="section.svg"><img src="section.svg" alt="Section showing the new upper bay forward of the current wall and 3F and 4F walkways"></a><figcaption>Bounds of records crossing X = 8.6 m. The current 3F, 4F and upper circulation must remain connected while their adjoining architecture is reconstructed. Empty space between bounds does not prove native clearance.</figcaption></figure></div></section>
<section><h2>Measured floor result</h2><p>Two fresh private physics workers queried the same five course coordinates: first against the current full-station layout, then against a diagnostic copy with the bay added. Every current hit was on <code>concourse</code> at Y = 0; every diagnostic hit was on a new paving slab at Y ≈ 0.2366 m. No throws, service records or production data were created.</p><p>The source mesh’s 0.2366 m level is not a surveyed floor datum. Resolve it with the wider hall registration and preserve the shared playable floor until its replacement has explicit level connections and course proof. A clean solid-intersection result alone cannot establish safe integration.</p></section>
<section><h2>Inventory scope</h2><div class="grid"><div><p>2,664 records intersect four declared review regions. The inventory includes 1,609 panels, 968 boxes, 29 beams, one stair flight and 57 light positions.</p><table><thead><tr><th>Group</th><th>Records</th></tr></thead><tbody>'''+count_rows+'''</tbody></table></div><div><p>Panel triangles and rotated box solids receive geometry checks. Beams, stairs and escalators use conservative envelopes. No existing colliding panel surface or box intersects the 537 new solid boxes; this result excludes arbitrary mesh containment and is not a gameplay pass.</p><p>The gate passage itself has no current panel/box surface crossing its review volume. The component still lacks completed gate-jamb returns, passage paving, adjacent bays, equipment placement and roof connections.</p><p>Eleven additional courses refer to the shared concourse surface outside the nearby feature region. Their shared surface ID is a preservation dependency, not evidence that every course changes.</p></div></div></section>
<section><h2>Seven courses with nearby authored features</h2><table><thead><tr><th>Course</th><th>Nearby features</th></tr></thead><tbody>'''+course_rows+'''</tbody></table><p class="small">Features are bounded by their authored radius. This does not substitute for measured ball trajectories or an all-course runtime proof. The earlier Skyway Trapdoor failure remains unresolved.</p></section><section><h2>Eleven nominal route dependencies</h2><ul>'''+route_rows+'''</ul><p class="small">Segment clipping includes crossings with both endpoints outside the region. These are foot-point paths, not swept-body clearance tests.</p></section>
<section><h2>Next coordinated change</h2><ol><li>Resolve the floor datum and additional independent depth landmarks. Keep uncertain camera and source dimensions explicit.</li><li>Complete the gate returns, passage, neighboring wall patch and roof bearing as one connected assembly.</li><li>Use exact record IDs, indices and hashes from this inventory when clipping or replacing old geometry. Preserve the shared floor and adjoining 3F/4F routes until replacements are ready.</li><li>Install into a fresh full-station candidate, then verify export parity, native walks, course behavior, actual-game appearance and Chrome performance.</li></ol><nav><a href="inventory.json">Complete inventory</a><a href="native-floor-probe.json">Ten native ray results</a><a href="spec.json">Current component specification</a><a href="verification.json">Input and record verification</a></nav><p class="small">Current full station remains courtyard life04/browser04. No final visual acceptance, deployment or production change.</p></section></main></html>'''
(O/'index.html').write_text(page)
(O/'publication-receipt.json').write_text(json.dumps({'files':{n:sha(O/n)for n in [*files,'plan.svg','section.svg','index.html']},'fullStationChanged':False,'nativeQueryCount':sum(len(r['hits'])for r in P['modes']),'finalVisualAcceptance':False},indent=2)+'\n')
print(O/'index.html')
