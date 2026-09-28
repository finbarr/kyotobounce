"""Publish an engineering review of the gate assembly against the full station."""
import hashlib,json,shutil,html
from pathlib import Path
root=Path(__file__).resolve().parents[1]
w=Path('/Users/finbarr/.codex/worktrees/performance-audit/kyoto')
a=w/'.local/station-realism/central-gate-architecture-01'
out=root/'notes/gate-integration-review';out.mkdir(exist_ok=True)
layout=json.loads((w/'.local/station-realism/station-hall-basement-05/station-layout.json').read_text())
component=json.loads((a/'native-panels.json').read_text())
inventory=json.loads((w/'.local/station-realism/gate-replacement-inventory-01/inventory.json').read_text())
source={p['id']:p for p in layout['panels']};new={p['id']:p for p in component['panels']}
# Native X/-Z are plotted metrically, north up. Hulls show plan envelopes, not
# exact collision unions or walkable areas (especially the curved bridge).
def hull(points):
 points=sorted(set(points))
 def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
 lo=[];hi=[]
 for p in points:
  while len(lo)>=2 and cross(lo[-2],lo[-1],p)<=0:lo.pop()
  lo.append(p)
 for p in reversed(points):
  while len(hi)>=2 and cross(hi[-2],hi[-1],p)<=0:hi.pop()
  hi.append(p)
 return lo[:-1]+hi[:-1]
def xy(x,z):return (80+(x+18)*12,75+z*12)
def poly(p,color,fill,opacity=1):
 h=hull((v['x'],-v['z'])for v in p['vertices']);pts=' '.join('%.2f,%.2f'%xy(x,z)for x,z in h)
 return f'<polygon points="{pts}" stroke="{color}" fill="{fill}" fill-opacity="{opacity}" stroke-width="1.5"/>'
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="650" viewBox="0 0 1080 650"><rect width="1080" height="650" fill="#f7f8fa"/><g font-family="Arial,sans-serif" fill="#142331"><text x="40" y="32" font-size="22">Gate replacement: current model and proposed architecture</text><text x="40" y="55" font-size="14">Plan envelopes in metres. North up; X east, renderer Z south. This is not a survey.</text>']
for x in range(-15,31,5):
 a1,b1=xy(x,0);a2,b2=xy(x,40);svg.append(f'<path d="M{a1},{b1}L{a2},{b2}" stroke="#dbe1e6"/><text x="{a1}" y="{b2+20}" font-size="12" text-anchor="middle">{x}</text>')
for z in range(0,41,5):
 a1,b1=xy(-18,z);a2,b2=xy(32,z);svg.append(f'<path d="M{a1},{b1}L{a2},{b2}" stroke="#dbe1e6"/><text x="{a1-12}" y="{b1+4}" font-size="12" text-anchor="end">{z}</text>')
for p in component['panels']:
 if p['id'].startswith(('hall-bay-west-gate-dark-back','hall-bay-east-gate-dark-back','gate-passage-west-','gate-passage-east-')) and p.get('collision',True):svg.append(poly(p,'#077f76','#60c3b8',.4))
for id in ['central-hall-curved-mezzanine-slab']:
 svg.append(poly(source[id],'#af642c','#e8b78d',.55))
for p in component['panels']:
 if p['id'].startswith('gate-bridge') and 'floor' in p['id']:svg.append(poly(p,'#077f76','#60c3b8',.5))
# The bridge naming contract is checked rather than silently publishing an empty shape.
bridge=[p for p in component['panels']if 'bridge' in p['id']and 'floor' in p['id']]
assert bridge
for p in bridge:
 if not p['id'].startswith('gate-bridge'):svg.append(poly(p,'#077f76','#60c3b8',.5))
for i in range(11):svg.append(poly(source[f'central-gate-{i:02d}-body'],'#af642c','#e8b78d',.9))
for text,x,z in [('New portal / front wall',-11,3),('Provisional new bridge',-5,10),('Old bridge',-5,25),('Old barrier bank',0,30)]:
 xx,yy=xy(x,z);svg.append(f'<text x="{xx}" y="{yy}" font-size="15">{html.escape(text)}</text>')
svg.append('<rect x="45" y="604" width="16" height="12" fill="#60c3b8"/><text x="70" y="616" font-size="14">Proposed assembly</text><rect x="270" y="604" width="16" height="12" fill="#e8b78d"/><text x="295" y="616" font-size="14">Existing placeholders</text><text x="45" y="639" font-size="12">Floor omitted from the component; current hall and concourse floors are retained. Bridge end connections and equipment remain unresolved.</text></g></svg>')
(out/'plan.svg').write_text(''.join(svg))
files={'full-station-overlay.png':a/'full-overlay-02/source.png','chrome-overlay.json':a/'full-overlay-02/projection.json','assembly.json':a/'report.json','serialization.json':a/'serialization.json','normals.json':a/'normals.json','inventory.json':w/'.local/station-realism/gate-replacement-inventory-01/inventory.json','facade-selection.json':w/'.local/station-realism/central-gate-selected-facade-01/report.json'}
for name,path in files.items():shutil.copyfile(path,out/name)
manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in sorted(out.iterdir())if p.is_file()and p.name!='manifest.json'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'files':len(manifest),'bridgePanels':len(bridge),'inventory':inventory['counts']}))
