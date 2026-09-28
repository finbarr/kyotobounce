"""Prepare an exact cut of the existing concourse around the new hall footprint."""
from pathlib import Path
import json,sys,hashlib
from shapely.geometry import Polygon
from shapely.ops import unary_union
base,spec,component,out=map(Path,sys.argv[1:]);out.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
lb=base.read_bytes();sb=spec.read_bytes();nb=(component/'native-panels.json').read_bytes()
l=json.loads(lb);s=json.loads(sb);n=json.loads(nb)
old=next(p for p in l['panels']if p['id']=='concourse')
floor=next(p for p in n['panels']if p['id']=='hall-bay-floor-surface')
def top(p,y=0):
 v=p['vertices'];tri=p['triangles'];polys=[]
 for i in range(0,len(tri),3):
  t=[v[k]for k in tri[i:i+3]]
  if all(abs(q['y']-y)<1e-9 for q in t):
   poly=Polygon([(q['x'],-q['z'])for q in t])
   if poly.area>1e-12:polys.append(poly)
 return unary_union(polys)
a=top(old);f=s['frame'];ring=lambda r:[[x,d+f['frontZ']+f['slope']*x]for x,d in r]
outer=Polygon(ring(s['floor']['footprint']['outer']));holes=[Polygon(ring(h))for h in s['floor']['footprint']['holes']]
assert a.is_valid and outer.is_valid and a.covers(outer)
new=top(floor,-.002);expected=outer.difference(unary_union(holes))
assert new.symmetric_difference(expected).area<1e-6
remaining=a.difference(outer);assert remaining.is_valid and remaining.geom_type=='Polygon'
assert remaining.intersection(new).area<1e-8
assert abs(a.area-remaining.area-outer.area)<1e-7
payload={'meaning':'Uninstalled shared-concourse replacement, cut around the full hall footprint including basement holes. No full station installation.', 'inputs':{'layout':{'path':str(base),'sha256':sha(lb)},'hallSpec':{'path':str(spec),'sha256':sha(sb)},'hallNative':{'path':str(component/'native-panels.json'),'sha256':sha(nb)}},'sourcePanel':old,'outer':[list(p)for p in remaining.exterior.coords[:-1]],'holes':[[list(p)for p in r.coords[:-1]]for r in remaining.interiors],'floorY':0,'depthM':-min(v['y']for v in old['vertices']),'replacementOuter':list(outer.exterior.coords),'basementHoles':[list(h.exterior.coords)for h in holes],'areasM2':{'oldConcourse':a.area,'remaining':remaining.area,'replacementOuter':outer.area,'hallBackingTop':new.area,'basementOpenings':sum(h.area for h in holes),'overlap':remaining.intersection(new).area},'limits':['Only the shared floor interface is prepared. Old hall/gate fixtures, upper routes and whole-station integration remain separate work.','Floor finish in the preview is a plain stand-in; native material, role, collision and surface identity are retained.','No course definitions or scores changed.'],'toolSha256':sha(Path(__file__).read_bytes())}
(out/'spec.json').write_text(json.dumps(payload,indent=2)+'\n');print(json.dumps(payload['areasM2']))
