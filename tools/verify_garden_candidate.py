"""Candidate static support/clearance audit. Blender -b --python SCRIPT -- DIR.
Finite geometric samples do not substitute for native walking/ball trials.
"""
import json,sys,math
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
out=Path(sys.argv[sys.argv.index('--')+1]);l=json.loads((out/'station-layout.json').read_text());r=json.loads((out/'garden-integration.json').read_text());fit=r['fit'];top=fit['floorY'];base=fit['lowerY'];verts=[];faces=[];ids=[]
def add(v,f,name):
 b=len(verts);verts.extend(Vector(p)for p in v);faces.extend(tuple(b+j for j in t)for t in f);ids.extend([name]*len(f))
for p in l['panels']:
 if p['collision'] and not p.get('playerOnly'):add([tuple(v[k]for k in 'xyz')for v in p['vertices']],[p['triangles'][i:i+3]for i in range(0,len(p['triangles']),3)],p['id'])
for p in l['boxes']:
 if not p['collision']:continue
 c=Vector(tuple(p['center'][k]for k in 'xyz'));d=Vector(tuple(p['size'][k]/2 for k in 'xyz'));m=Matrix.Rotation(math.radians(p.get('yaw',0)),3,'Y')
 add([c+m@Vector((i*d.x,j*d.y,k*d.z))for i,j,k in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]],[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)],p['id'])
tree=BVHTree.FromPolygons(verts,faces)
def ray(x,y,z,dy=-1,d=.1):
 p,n,i,dist=tree.ray_cast(Vector((x,y,z)),Vector((0,dy,0)),d)
 return None if p is None else (p,n,ids[i],dist)
fail=[];count=0
for ix in range(259):
 x=-167.9+ix*.1;t=(x+168)/26;lo=fit['fittedSouthEnds'][0]*(1-t)+fit['fittedSouthEnds'][1]*t;hi=fit['fittedNorthEnds'][0]*(1-t)+fit['fittedNorthEnds'][1]*t
 for iz in range(math.ceil((hi-lo-.2)/.1)):
  z=lo+.1+iz*.1
  if -157.301<x< -154.699 and -31.001<z< -22.319:continue
  h=ray(x,top+.02,z);count+=1
  if not h or abs(h[0].y-top)>.006:fail.append({'kind':'garden-floor','x':x,'z':z,'hit':None if not h else[h[2],h[0].y]})
# Clear stair volume sampled across the whole requested 2.4m, 28 treads.
step_checks=0
for i in range(28):
 z=-31+(i+.5)*.31;y=base+(i+1)*(top-base)/28
 for j in range(25):
  x=-157.2+j*.1;h=ray(x,y+.04,z);head=ray(x,y+.03,z,1,1.8);step_checks+=1
  if not h or abs(h[0].y-y)>.006:fail.append({'kind':'tread-support','step':i+1,'x':x,'hit':None if not h else[h[2],h[0].y]})
  if head:fail.append({'kind':'head-clearance','step':i+1,'x':x,'hit':head[2]})
# Crossing from actual landing14/flight14 arrival through the widened turn.
turn=0
for ix in range(25):
 for iz in range(25):
  x=-157.2+ix*.1;z=-33.5+iz*.1;h=ray(x,base+.04,z);head=ray(x,base+.03,z,1,1.8);turn+=1
  if not h or abs(h[0].y-base)>.006:fail.append({'kind':'turn-support','x':x,'z':z,'hit':None if not h else[h[2],h[0].y]})
  if head:fail.append({'kind':'turn-headroom','x':x,'z':z,'hit':head[2]})
# Every source surface stays behind both original facade planes. This is a
# conservative vertex bound: the half-space contains every mesh triangle.
clashes=[]
for p in l['panels']:
 if not p['id'].startswith('k008-')or p['id'].startswith(('k008-landing','k008-apron','k008-stair-side')):continue
 for v in p['vertices']:
  if v['y']<top-.31:continue
  south=fit['south'][0]*v['x']+fit['south'][1];north=fit['north'][0]*v['x']+fit['north'][1]
  if v['z']<south+.2 or v['z']>north-.2:clashes.append({'id':p['id'],'vertex':v});break
fail+=clashes
report={'status':'pass'if not fail else'fail','gardenFloorSamples':count,'treadSupportAndHeadroomSamples':step_checks,'turnSamples':turn,'clearWidth':2.4,'bodyHeadroom':1.8,'failures':fail}
(out/'garden-verification.json').write_text(json.dumps(report,indent=2));print(json.dumps({**report,'failures':fail[:15]},indent=2))
if fail:raise AssertionError(str(len(fail))+' garden geometry failures')
