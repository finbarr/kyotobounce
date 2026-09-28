from pathlib import Path
import json,hashlib,math,html
R=Path(__file__).resolve().parents[1];W=Path('./.local/station-realism');O=R/'notes/paid-concourse-openings';O.mkdir(exist_ok=True);C=W/'central-gate-passage-03'
files={n:C/n for n in ['report.json','serialization.json','normals.json','opening-proof.json']};files.update({'spec.json':W/'central-gate-passage-spec-03/spec.json','native-walks.json':W/'central-gate-passage-walk-05/report.json','existing-floor-walks.json':W/'central-gate-existing-floor-walk-01/report.json','floor-coverage.json':W/'gate-floor-integration-02/report.json','initial-floor-check.json':W/'gate-floor-integration-01/report.json','integration-component.json':W/'central-gate-integration-component-01/report.json','integration-serialization.json':W/'central-gate-integration-component-01/serialization.json','integration-normals.json':W/'central-gate-integration-component-01/normals.json'})
for label,p in [('before',W/'central-gate-passage-02/reference'),('after',C/'reference'),('front',C/'front')]:files[label+'.png']=p/'source.png';files[label+'-receipt.json']=p/'projection.json'
for n in ['native-walks.json','existing-floor-walks.json']:
 q=json.loads(files[n].read_text());assert q['pass']and len(q['checks'])==54 and len(q['walks'])==12
manifest=[]
for n,p in files.items():
 b=p.read_bytes();(O/n).write_bytes(b);manifest.append({'file':n,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)})
# Metrically uniform engineering plan from saved floor-coverage polygons.
r=json.loads(files['floor-coverage.json'].read_text());s=json.loads(files['spec.json'].read_text());scale=16;X=lambda x:80+(x+14)*scale;Y=lambda z:65+(z-4)*scale
paths=[]
def path(g):
 if g['type']=='GeometryCollection':return ' '.join(path(q)for q in g['geometries'])
 rings=g['coordinates']if g['type']=='Polygon'else [r for p in g['coordinates']for r in p]if g['type']=='MultiPolygon'else []
 return ' '.join('M '+' L '.join(f'{X(x):.3f},{Y(z):.3f}'for x,z in ring)+' Z'for ring in rings)
for p,color in zip(r['candidateFloorPanels'],['#abd2e2','#a6cbbb']):paths.append(f'<path d="{path(p["geometry"])}" fill="{color}" fill-rule="evenodd" stroke="none"/>')
paths.append(f'<path d="{path(r["proposedFootprint"])}" fill="none" stroke="#243b34" stroke-width="2"/>')
for x in [-10,0,10]:paths.append(f'<text x="{X(x)}" y="48" text-anchor="middle" font-size="12">{x}m</text>')
for z in [5,10,15,20,25]:paths.append(f'<text x="65" y="{Y(z)+4}" text-anchor="end" font-size="12">{z}m</text>')
b=s['bridge'];L=s['portal']['westX'];E=s['portal']['eastX'];mid=(L+E)/2;half=(E-L)/2;rad=(half*half+b['bowM']**2)/(2*b['bowM'])
ring=[]
for i in range(49):
 x=L+(E-L)*i/48;d=b['frontGlassDepthM']+rad-b['bowM']-math.sqrt(rad*rad-(x-mid)**2);ring.append((x,s['frame']['frontZ']+s['frame']['slope']*x+d))
for x in [E,L]:ring.append((x,s['frame']['frontZ']+s['frame']['slope']*x+b['rearDepthM']))
paths.append('<path d="M '+' L '.join(f'{X(x):.3f},{Y(z):.3f}'for x,z in ring)+' Z" fill="none" stroke="#735234" stroke-width="2" stroke-dasharray="6 4"/>')
paths.append(f'<text x="{X(1.4)}" y="{Y(17)}" text-anchor="middle" font-size="13">Existing concourse</text><text x="{X(1.4)}" y="{Y(8)}" text-anchor="middle" font-size="13">Existing hall paving</text>')
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 605"><rect width="640" height="605" fill="#f5f2eb"/><g font-family="system-ui" fill="#243b34"><text x="80" y="25" font-size="16">Ground-floor coverage · north up</text>'+''.join(paths)+'<text x="80" y="500" font-size="13">Black outline: proposed passage footprint,560.792m²</text><text x="80" y="524" font-size="13">Blue: concourseY0 · green: pavingY0/backing−2mm</text><text x="80" y="548" font-size="13">Brown dashes: bridge above, dimensions provisional</text><text x="80" y="574" font-size="12">X east / Z south. Geometry from saved native triangles.</text></g></svg>'
(O/'floor-coverage.svg').write_text(svg);data=svg.encode();manifest.append({'file':'floor-coverage.svg','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
(O/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
figs=''.join(f'<figure><img src="{n}" alt="{title}"><figcaption>{title}</figcaption></figure>'for n,title in [('before.png','Before: long return wall blocks the paid-concourse sightline'),('after.png','After: short pier and upper bearing leave the lateral opening clear'),('front.png','Revised local passage, viewed from the hall'),('floor-coverage.svg','Actual existing floor coverage. No duplicate ground slab is needed.')])
links=''.join(f'<li><a href="{n}">{n}</a></li>'for n in files if n.endswith('.json'))
(O/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paid concourse openings</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f2eb;color:#243b34;font:16px/1.55 system-ui}main{max-width:1248px;margin:auto;padding:24px}h1{line-height:1.15}a{color:#176749;overflow-wrap:anywhere}figure{margin:24px 0}img{width:100%;display:block}figcaption{padding:12px;background:#e1e8e0}.status{padding:18px;background:#f1dfb6}li{margin:7px 0}</style><main><a href="../../index.html">Research library</a><h1>Opening the paid concourse</h1><p>Short piers and upper bearings replace the earlier long return walls. The bridge itself remains unchanged. Three fixed-camera sightline checks now clear the former obstruction.</p><p class="status">Uninstalled component study. Current full-station and active game assets remain unchanged. Bridge dimensions, broader connections, gate fixtures, full-game routes and photographic/performance acceptance remain unfinished.</p><p>The standalone component and its version on the existing station floor each pass54 support/headroom probes and12 actual native walks. The integration component omits only its duplicate ground slab, preserving146 other records exactly.</p>'''+figs+'''<p><a href="../PAID-CONCOURSE-OPENINGS.md">Findings and integration limits</a> · <a href="../central-gate-passage-bridge/index.html">Bridge dimension study</a> · <a href="../../photos/hall-maeda-2026.jpg">July2026 photograph</a> · <a href="../../maps/gate-universal-detail.gif">Historical access diagram</a> · <a href="../../maps/jr-west-plan-preview.png">JRWest diagram</a>.</p><h2>Evidence</h2><ul>'''+links+'''<li><a href="manifest.json">Published hashes</a></li></ul></main></html>''')
print(O)
