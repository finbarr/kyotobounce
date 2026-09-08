"""Vertical coverage audit of canonical collision geometry and authored routes.
Run with Blender -b --python tools/audit_atrium_gaps.py -- LAYOUT OUTPUT.
The route test includes walking ramps for stairs/moving lanes; floor grids use
only authored static panel/box solids. This is coverage evidence, not CCD proof.
"""
import json,sys,math
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
layout_path,out=sys.argv[sys.argv.index('--')+1:]
x=json.loads(Path(layout_path).read_text());out=Path(out);out.mkdir(parents=True,exist_ok=True)
verts=[];faces=[];ids=[]
def add(v,t,name):
 base=len(verts);verts.extend(Vector(p)for p in v);faces.extend(tuple(base+j for j in f)for f in t);ids.extend([name]*len(t))
for p in x['panels']:
 if not p['collision'] or p.get('playerOnly'):continue
 add([(v['x'],v['y'],v['z'])for v in p['vertices']],[p['triangles'][i:i+3]for i in range(0,len(p['triangles']),3)],p['id'])
for p in x['boxes']:
 if not p['collision']:continue
 c=Vector(tuple(p['center'][a]for a in 'xyz'));d=Vector(tuple(p['size'][a]*.5 for a in 'xyz'));r=Matrix.Rotation(math.radians(p.get('yaw',0)),3,'Y')
 v=[c+r@Vector((i*d.x,j*d.y,k*d.z))for i,j,k in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
 add(v,[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)],p['id'])
static=BVHTree.FromPolygons(verts,faces)
# Route height acceptance uses authored walking interpolation, same as native.
for f in x['flights']:
 if f['role']=='escalator':continue
 rows=f['contours'];v=[(p['x'],f['baseElevation']+i*f['rise'],p['y'])for i,row in enumerate(rows)for p in row['points']];n=len(rows[0]['points'])
 add(v,[(i*n+j,i*n+j+1,(i+1)*n+j+1,(i+1)*n+j)for i in range(len(rows)-1)for j in range(n-1)],f['id'])
for f in x['escalators']:
 c=Vector(tuple(f['lowerCenter'][a]for a in 'xyz'));u=Vector(tuple(f['uphill'][a]for a in 'xyz'));side=Vector((u.z,0,-u.x));v=[]
 for p in f['path'][:f['publicPointCount']]:
  q=c+u*p['z']+Vector((0,p['y'],0));v.extend([q-side*f['width']/2,q+side*f['width']/2])
 add(v,[(i*2,i*2+1,i*2+3,i*2+2)for i in range(f['publicPointCount']-1)],f['id'])
walk=BVHTree.FromPolygons(verts,faces)
def hit(tree,x,y,z):
 p,n,i,d=tree.ray_cast(Vector((x,y,z)),Vector((0,-1,0)),150)
 return None if p is None else {'surface':ids[i],'y':p.y,'normal':list(n)}
route_report=[]
for r in x['routes']:
 bad=[];count=0
 for a,b in zip(r['points'],r['points'][1:]):
  a=Vector(tuple(a[k]for k in 'xyz'));b=Vector(tuple(b[k]for k in 'xyz'));steps=max(1,math.ceil((b-a).length/.1))
  for i in range(steps):
   p=a.lerp(b,i/steps);h=hit(walk,p.x,p.y+.4,p.z);count+=1
   if not h or abs(h['y']-p.y)>.45:bad.append({'point':list(p),'hit':h})
 route_report.append({'id':r['id'],'samples':count,'bad':bad})
# Scan entire concourse at 20 cm, then retain connected missing regions.
missing=set()
for ix in range(1050):
 for iz in range(350):
  h=hit(static,-84.9+ix*.2,.1,-40.9+iz*.2)
  if not h or h['y']<-.61:missing.add((ix,iz))
clusters=[]
while missing:
 seed=missing.pop();todo=[seed];group=[]
 while todo:
  p=todo.pop();group.append(p)
  for d in [(-1,0),(1,0),(0,-1),(0,1)]:
   q=(p[0]+d[0],p[1]+d[1])
   if q in missing:missing.remove(q);todo.append(q)
 clusters.append({'samples':len(group),'boundsXZ':[[round(-84.9+min(p[0]for p in group)*.2,3),round(-84.9+max(p[0]for p in group)*.2,3)],[round(-40.9+min(p[1]for p in group)*.2,3),round(-40.9+max(p[1]for p in group)*.2,3)]]})
report={'layout':layout_path,'concourseGrid':{'spacing':.2,'samples':367500,'missingClusters':clusters},'routes':route_report}
(out/'coverage.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'clusters':clusters,'routeFailures':[{'id':r['id'],'bad':len(r['bad']),'first':r['bad'][:1]}for r in route_report if r['bad']]},indent=2))
