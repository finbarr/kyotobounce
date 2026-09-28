"""Register courtyard hotel windows on the municipal facade, with cameras fixed.

The planar source, manual pixels and inferred recess depth are not a survey.
"""
import json,struct,hashlib,sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from scipy.optimize import least_squares
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
root=Path('.local/station-realism');out=Path(sys.argv[1]);assert root.resolve() in out.resolve().parents;out.mkdir(parents=True,exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
source=root/'station-shell/municipal-station.glb';bb=source.read_bytes();assert sha(bb)=='0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1';n=struct.unpack_from('<I',bb,12)[0];j=json.loads(bb[20:20+n]);binary=bb[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];w={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];stride=v.get('byteStride',w*struct.calcsize(fmt));start=v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.array([struct.unpack_from('<'+fmt*w,binary,start+k*stride) for k in range(a['count'])])
node=next(q for q in j['nodes'] if q.get('name')=='Untitled.203');pr=j['meshes'][node['mesh']]['primitives'][0];vs=acc(pr['attributes']['POSITION']);ix=acc(pr['indices']).ravel()
# Plane from the long source wall. Keep its measured normal and position fixed.
a=np.array([165.89012145996094,58.95985794067383,16.916011810302734]);slope=-.016326114999606;slope=float((17.594402313232422-a[2])/(124.33889770507812-a[0]));intercept=float(a[2]-slope*a[0])
region=box(112.95,36.32,165.88,58.94);faces=[];polys=[]
for k in range(0,len(ix),3):
 t=vs[ix[k:k+3]]
 if np.max(np.abs(t[:,2]-(slope*t[:,0]+intercept)))>.065:continue
 poly=Polygon(t[:,:2]);part=poly.intersection(region)
 if poly.area<.01 or part.area<1e-6:continue
 normal=np.cross(t[1]-t[0],t[2]-t[0]);normal/=np.linalg.norm(normal)
 if normal[2]>-.99:continue
 faces.append(k//3);polys.append(part)
shape=unary_union(polys);assert shape.geom_type=='Polygon' and not shape.interiors,(shape.geom_type,shape.area)
# Keep original source edges: isolated near-edge slivers are not expanded.
cams={};inputs={}
for name in ['jr','rurubu']:
 d=root/'niwa-frontage-joint-01'/name;fit=json.loads((d/'fit.json').read_text());p=json.loads((d/'render/projection.json').read_text());c=p['camera'];w,h=fit['reference']['size'];assert sha(Path(fit['reference']['localFile']).read_bytes())==fit['reference']['sha256'];assert fit['withinTolerance'];cams[name]=(np.array(c['position']),Rotation.from_quat(c['quaternion']),h/(2*np.tan(np.deg2rad(c['fov']/2))),np.array([w/2,h/2]));inputs[name]={'fitSha256':sha((d/'fit.json').read_bytes()),'projectionSha256':sha((d/'render/projection.json').read_bytes()),'reference':fit['reference']}
def world(x,y,z=0):return np.array([x,y,slope*x+intercept+z])
def project(p,name):
 C,R,f,mid=cams[name];q=R.inv().apply(np.asarray(p)-C);return mid+f*q[...,:2]*[1,-1]/-q[...,2:]
# r0 is the top row. JR observations are original 816x544 pixels, not enlarged captures.
small_jr=[[[291,158],[309,150],[331,141],[355,131],[383,121],[414,109]],[[292,182],[310,175],[331,169],[355,160],[383,151],[414,141]],[[291,204],[310,198],[331,193],[355,187],[383,181],[414,173]]]
small_ru=[[[468.5,131],[515,115],[570.5,96],[632,75],[704,49],[787,21]],[[467,186],[515,172],[570,157],[631,140],[704.5,121],[787,98]],[[None,None],[515,227],[570,217],[631,206],[704,191],[786.5,171]]]
obs=[]
for name,rows in [('jr',small_jr),('rurubu',small_ru)]:
 for row,ps in enumerate(rows):
  for col,px in enumerate(ps):
   if None not in px:obs.append({'group':'narrow','row':row,'column':col,'camera':name,'pixel':px,'use':'fit' if (row,col) in [(0,0),(0,3),(0,5),(1,1),(1,4),(2,2)] else 'withheld'})
wide=[(0,0,[538,58]),(1,0,[540,96]),(2,0,[540,137]),(3,0,[540,178]),(4,0,[540,217]),(0,1,[598,35]),(1,1,[598,78]),(2,1,[598,124]),(3,1,[599,167]),(1,2,[670,56]),(2,2,[670,106]),(3,2,[672,156]),(4,2,[673,200])]
for row,col,px in wide:obs.append({'group':'wide','row':row,'column':col,'camera':'jr','pixel':px,'use':'fit' if (row,col) in [(0,0),(1,1),(3,2),(4,0)] else 'withheld'})
for row,px in [(2,[1130,86]),(3,[1130,187]),(4,[1130,282])]:obs.append({'group':'wide','row':row,'column':0,'camera':'rurubu','pixel':px,'use':'withheld'})
results={}
for group,seed in [('narrow',[158,4.45,49.8,3.25]),('wide',[123.2,4.2,49.9,3.12])]:
 selected=[o for o in obs if o['group']==group and o['use']=='fit']
 def points(x,o):return world(x[0]-o['column']*x[1],x[2]-o['row']*x[3])
 def residual(x):return np.concatenate([(project(points(x,o),o['camera'])-o['pixel']) for o in selected])
 result=least_squares(residual,seed,bounds=([seed[0]-2,3.7,48,2.8],[seed[0]+2,4.8,51,3.6]),x_scale='jac');assert result.success
 x=result.x;results[group]={'firstColumnX':float(x[0]),'columnSpacingM':float(x[1]),'topCenterY':float(x[2]),'rowSpacingM':float(x[3]),'widthM':.88 if group=='narrow' else 1.40,'heightM':1.92 if group=='narrow' else 1.18,'columns':6 if group=='narrow' else 3,'rows':5}
 for o in obs:
  if o['group']!=group:continue
  p=points(x,o);o.update(world=p.tolist(),projectedPixel=project(p,o['camera']).tolist(),errorPixels=float(np.linalg.norm(project(p,o['camera'])-o['pixel'])))
for group in results:
 for use in ['fit','withheld']:
  rows=[o for o in obs if o['group']==group and o['use']==use];results[group][use]={'count':len(rows),'rmsPixels':float(np.sqrt(np.mean([o['errorPixels']**2 for o in rows]))),'maxPixels':max(o['errorPixels'] for o in rows)}
# Glass band follows a horizontal datum inferred from the observed opaque/glass boundary.
report={'schema':1,'status':'Provisional architectural construction; fixed-camera observations, not survey dimensions.','source':{'file':str(source),'sha256':sha(bb),'object':'Untitled.203','faces':faces},'cameras':inputs,'plane':{'zPerX':slope,'zIntercept':intercept,'maximumSourceDepartureM':.065},'boundary':list(map(list,shape.exterior.coords[:-1])),'patchAreaM2':shape.area,'windowGroups':results,'observations':obs,'glassBandBottomY':51.85,'glassPanelWidthM':1.5,'glassPanelHeightM':1.35,'tileSizeM':.10,'windowRecessM':.14,'assumptions':['Wall plane and outer boundary come from municipal geometry; no camera moved.','Repeated window grids fit selected centre observations; unused centres are checks.','Widths, heights, recess, ceramic tile scale and curtain-wall spacing are photographic estimates.','Hidden lower windows continue observed grids and must be reviewed against equipment/cafe occlusion.','Curved/source wall deviations up to 65 mm are retained as uncertainty; component uses a single plane.','Upper glass is simplified dark reflective glazing; room interiors and photographed reflections are not copied.'],'toolSha256':sha(Path(__file__).read_bytes())}
(out/'facade-spec.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'area':shape.area,'faces':faces,'groups':results},indent=2))
