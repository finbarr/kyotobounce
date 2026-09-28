import json,math,hashlib,sys
from pathlib import Path
base=Path('.local/station-realism')
restaurant,bridge,out=sys.argv[1:];r=json.loads((Path(restaurant)/'report.json').read_text());a=json.loads((base/'west-skyway-approach-source-01/audit.json').read_text())
faces=[f for f in a['faces'] if f['object']=='Untitled.203' and f['normal'][1]>.99 and abs(f['center'][1]-45.08334)<.001]
def contains(p,tri):
 def cross(a,b,c):return (b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0])
 signs=[cross(tri[i],tri[(i+1)%3],p) for i in range(3)]
 return min(signs)>=-1e-7 or max(signs)<=1e-7
s=r['geometry']['stairThresholdRenderer'];e=s['center'];o=s['outward'];side=s['across'];samples=[]
for d in [i*.1 for i in range(12)]:
 for w in [i*.116 for i in range(-10,11)]:
  p=[e[k]+o[k]*d+side[k]*w for k in range(3)];hits=[f['face'] for f in faces if contains(p,f['points'])];samples.append({'point':p,'sourceFaces':hits})
old=json.loads((base/'west-skyway-04/native-panels.json').read_text())['panels'];new=json.loads((Path(bridge)/'native-panels.json').read_text())['panels'];old={p['id']:p for p in old};checks=[]
for p in new:
 if 'arch-' in p['id'] or 'roof-' in p['id']:
  q=old[p['id']];assert p['triangles']==q['triangles'];error=max(math.dist(list(v.values()),list(w.values())) for v,w in zip(p['vertices'],q['vertices']));checks.append({'surface':p['id'],'maximumChangeM':error})
br=json.loads((Path(bridge)/'report.json').read_text());a0,a1=br['geometry']['sourceEndpointsRenderer'];dx,dz=a1[0]-a0[0],a1[2]-a0[2];den=dx*dx+dz*dz;deck=next(p for p in new if p['id']=='west-skyway-deck');deckErrors=[]
for v in deck['vertices']:
 t=((v['x']-a0[0])*dx+(-v['z']-a0[2])*dz)/den;sourceY=a0[1]+t*(a1[1]-a0[1]);
 if v['y']<sourceY+.01:deckErrors.append(abs(v['y']-sourceY))
assert deckErrors and max(deckErrors)<1e-8
report={'deckUndersideVertices':len(deckErrors),'maximumDeckUndersideErrorM':max(deckErrors),'thresholdSamples':len(samples),'outsideSourceLanding':[s for s in samples if not s['sourceFaces']],'roofPanelsChecked':len(checks),'maximumRoofChangeM':max(c['maximumChangeM'] for c in checks),'roofChecks':checks,'samples':samples}
Path(out).write_text(json.dumps(report,indent=2)+'\n')
print({k:v for k,v in report.items() if k not in ['samples','roofChecks','outsideSourceLanding']},'outsideSourceLanding',len(report['outsideSourceLanding']))
assert not report['outsideSourceLanding'];assert report['maximumRoofChangeM']<1e-10
