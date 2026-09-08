"""Audit final shop floor, public connection and doorway in native coordinates.
Blender -b --python-exit-code 1 --python SCRIPT -- CANDIDATE_DIR
"""
import json,sys,math
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
out=Path(sys.argv[sys.argv.index('--')+1]);layout=json.loads((out/'station-layout.json').read_text());verts=[];faces=[];ids=[];original_near=[]
region=((-57,-49),(6.8,10.7),(-21.3,-13.3))
def add(v,f,name):
    bounds=[(min(p[i]for p in v),max(p[i]for p in v))for i in range(3)]
    if any(hi<r[0]or lo>r[1]for (lo,hi),r in zip(bounds,region)):return
    if not name.startswith(('konbini-','k019-')):original_near.append({'id':name,'bounds':bounds})
    base=len(verts);verts.extend(Vector(p)for p in v);faces.extend(tuple(base+i for i in t)for t in f);ids.extend([name]*len(f))
for p in layout['panels']:
    if p['collision']and not p.get('playerOnly'):
        add([tuple(v[k]for k in 'xyz')for v in p['vertices']],[p['triangles'][i:i+3]for i in range(0,len(p['triangles']),3)],p['id'])
for p in layout['boxes']:
    if not p['collision']:continue
    c=Vector(tuple(p['center'][k]for k in 'xyz'));d=Vector(tuple(p['size'][k]/2 for k in 'xyz'));m=Matrix.Rotation(math.radians(p.get('yaw',0)),3,'Y')
    add([c+m@Vector((i*d.x,j*d.y,k*d.z))for i,j,k in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]],[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)],p['id'])
# Conservatively reject any existing beam whose full radius envelope overlaps.
beam_clashes=[]
for p in layout['beams']:
    if not p['collision']:continue
    bounds=[(min(p['a'][k],p['b'][k])-p['radius']*1.5,max(p['a'][k],p['b'][k])+p['radius']*1.5)for k in 'xyz']
    if all(hi>=r[0]and lo<=r[1]for (lo,hi),r in zip(bounds,region)):beam_clashes.append(p['id'])
assert not beam_clashes,beam_clashes
assert {p['id']for p in original_near}=={'west-2f-landing'},original_near
# Exact support, headroom, and ball-clearance rays use triangles, not bounds.
tree=BVHTree.FromPolygons(verts,faces);fail=[];counts={}
def sample(name,x0,x1,z0,z1,spacing=.05):
    count=0
    for ix in range(math.ceil((x1-x0)/spacing)+1):
        x=min(x1,x0+ix*spacing)
        for iz in range(math.ceil((z1-z0)/spacing)+1):
            z=min(z1,z0+iz*spacing);count+=1
            p,n,i,d=tree.ray_cast(Vector((x,7.37,z)),Vector((0,-1,0)),.1)
            if p is None or abs(p.y-7.35)>.00001:fail.append({'kind':'support','region':name,'x':x,'z':z,'hit':None if p is None else[ids[i],p.y]})
            p,n,i,d=tree.ray_cast(Vector((x,7.38,z)),Vector((0,1,0)),1.8)
            if p is not None:fail.append({'kind':'headroom','region':name,'x':x,'z':z,'hit':ids[i]})
    counts[name]=count
sample('public-gallery',-56.5,-54.15,-21.05,-13.4)
sample('shop-interior',-53.8,-49.7,-20.8,-15.2)
sample('threshold',-54.15,-53.8,-18.85,-17.15,.025)
# Full doorway has 1.8m clear width / 2.25m clear height. Sphere checks include
# the handoff's actual jambs and all base station triangles in this region.
ball_samples=0;r=.0232
for x in [-54.14,-54,-53.86]:
    for z in [-18.9+r+.01,-18,-17.1-r-.01]:
        for y in [7.35+r+.01,8.475,9.6-r-.01]:
            p,n,i,d=tree.find_nearest(Vector((x,y,z)));ball_samples+=1
            if d<r:fail.append({'kind':'doorway-ball','position':[x,y,z],'hit':ids[i],'distance':d})
report={'status':'pass'if not fail else'fail','floorAndHeadroomSamples':counts,'doorwayBallSamples':ball_samples,'originalNearbyGeometry':original_near,'conservativeBeamClashes':beam_clashes,'doorwayClearWidthM':1.8,'doorwayClearHeightM':2.25,'publicCirculationClearWidthM':2.4,'failures':fail}
(out/'shop-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({**report,'failures':fail[:15]}))
assert not fail,str(len(fail))+' shop clearance/support failures'
