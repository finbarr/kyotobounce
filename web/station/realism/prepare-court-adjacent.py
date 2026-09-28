"""Prepare source-bound hotel returns and service walls in fixed photographic cameras.

Source planes constrain architecture; panel joints and hidden construction remain estimates.
"""
import json,struct,hashlib,sys,math
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from scipy.optimize import least_squares
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
root=Path('.local/station-realism');out=Path(sys.argv[1]);assert root.resolve() in out.resolve().parents;out.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
source=root/'station-shell/municipal-station.glb';data=source.read_bytes();assert sha(data)=='0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1';n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);binary=data[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];w={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=struct.calcsize(fmt);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.array([struct.unpack_from('<'+fmt*w,binary,offset+k*v.get('byteStride',w*size)) for k in range(a['count'])])
node=next(q for q in j['nodes'] if q.get('name')=='Untitled.203');pr=j['meshes'][node['mesh']]['primitives'][0];vs=acc(pr['attributes']['POSITION']);tri=vs[acc(pr['indices']).astype(int).ravel()].reshape((-1,3,3))
cams={};references={}
for name in ['jr','rurubu']:
 d=root/'niwa-frontage-joint-01'/name;fit=json.loads((d/'fit.json').read_text());p=json.loads((d/'render/projection.json').read_text());c=p['camera'];w,h=fit['reference']['size'];assert sha(Path(fit['reference']['localFile']).read_bytes())==fit['reference']['sha256'];assert fit['withinTolerance'];cams[name]=(np.array(c['position']),Rotation.from_quat(c['quaternion']),h/(2*np.tan(np.deg2rad(c['fov']/2))),np.array([w/2,h/2]));references[name]={'fitSha256':sha((d/'fit.json').read_bytes()),'projectionSha256':sha((d/'render/projection.json').read_bytes()),'reference':fit['reference']}
def project(p,name):
 C,R,f,mid=cams[name];q=R.inv().apply(np.asarray(p)-C);return mid+f*q[...,:2]*[1,-1]/-q[...,2:]
def polygons(g):
 if g.is_empty or g.area<1e-7:return []
 if g.geom_type=='Polygon':
  if not g.interiors:return [g]
  # Split through every opening edge so earcut never has to bridge several
  # narrow vent holes inside one backing polygon. The union is unchanged.
  x0,y0,x1,y1=g.bounds;cuts=sorted(set([x0,x1]+[p[0] for ring in g.interiors for p in ring.coords]))
  result=[]
  for a,b in zip(cuts,cuts[1:]):
   if b-a<1e-10:continue
   piece=g.intersection(box(a,y0-1,b,y1+1))
   for q in ([piece] if piece.geom_type=='Polygon' else list(getattr(piece,'geoms',[]))):
    if q.geom_type=='Polygon' and q.area>1e-7:assert not q.interiors;result.append(q)
  assert abs(sum(p.area for p in result)-g.area)<1e-6
  return result
 return [p for child in g.geoms for p in polygons(child)]
def serial(p):
 q=p.simplify(1e-9,preserve_topology=True);assert p.hausdorff_distance(q)<1e-8
 return {'outer':[list(v) for v in q.exterior.coords[:-1]],'holes':[[list(v) for v in ring.coords[:-1]] for ring in q.interiors]}
patches=[];parts=[];openings=[];observations=[]
for id,faces,kind,minimum in [
 ('hotel-return',list(range(4668,4673)),'return',35.3),('foreground-tower',list(range(4721,4730)),'tower',34.38),
 ('vent-front',[8366,8367],'vent',35.22),('vent-side',[8368,8369],'pale',35.22),
 ('dark-front',[8287,8288,8289,8290],'dark',30.0),('dark-side',[8347,8348,8349,8350],'dark',36.31),
 ('upper-return',[7034,7035],'glass',58.46)]:
 ts=tri[faces];areaVectors=np.cross(ts[:,1]-ts[:,0],ts[:,2]-ts[:,0]);normal=areaVectors.sum(axis=0);normal[1]=0;normal/=np.linalg.norm(normal);u=np.cross([0,1,0],normal);origin=ts[0,0].copy();origin[1]=0
 uv=np.stack([(ts-origin)@u,ts[:,:,1]],axis=-1);shape=unary_union([Polygon(t) for t in uv]).intersection(box(-1000,minimum,1000,1000));assert shape.geom_type=='Polygon',id
 departure=float(np.abs((ts-origin)@normal).max());assert departure<.02,(id,departure)
 patch={'id':id,'kind':kind,'faces':faces,'origin':origin.tolist(),'u':u.tolist(),'normal':normal.tolist(),'sourceMaximumPlaneDepartureM':departure,'minimumY':minimum,'boundary':serial(shape),'areaM2':shape.area,'bounds':list(shape.bounds)};patches.append(patch)
 world=lambda x,y:origin+u*x+np.array([0,y,0])
 holes=[]
 if kind=='return':
  obs=[{'row':0,'col':0,'pixel':[141.5,144.5],'use':'fit'},{'row':0,'col':1,'pixel':[180.0,152.5],'use':'fit'},{'row':1,'col':0,'pixel':[141.2,170.0],'use':'fit'},{'row':1,'col':1,'pixel':[179.7,177.5],'use':'withheld'}]
  def ray(pixel):
   C,R,f,mid=cams['jr'];d=R.apply(np.r_[(np.asarray(pixel)-mid)*[1,-1]/f,-1]);return C+d*(np.dot(origin-C,normal)/np.dot(d,normal))
  a,b,c=[ray(o['pixel']) for o in obs[:3]];seed=[np.dot(a-origin,u),np.dot(b-a,u),a[1],a[1]-c[1]]
  def point(x,o):return world(x[0]+o['col']*x[1],x[2]-o['row']*x[3])
  fit=least_squares(lambda x:np.concatenate([project(point(x,o),'jr')-o['pixel'] for o in obs if o['use']=='fit']),seed);assert fit.success
  x=fit.x;assert 2<x[1]<8 and 2<x[3]<5
  for o in obs:
   p=point(x,o);o.update(patch=id,camera='jr',world=p.tolist(),projected=project(p,'jr').tolist(),errorPixels=float(np.linalg.norm(project(p,'jr')-o['pixel'])));observations.append(o)
   # Only the four photographically observed windows; hidden openings are unresolved.
   center=[float(x[0]+o['col']*x[1]),float(x[2]-o['row']*x[3])];opening={'patch':id,'id':f'window-{o["col"]}-{o["row"]}','center':center,'width':.88,'height':1.92,'kind':'window'};openings.append(opening);holes.append(box(center[0]-.44,center[1]-.96,center[0]+.44,center[1]+.96))
  patch['windowFit']={'firstU':float(x[0]),'spacingU':float(x[1]),'topY':float(x[2]),'spacingY':float(x[3]),'fitCount':3,'withheldCount':1,'fitRmsPixels':float(np.sqrt(np.mean([o['errorPixels']**2 for o in obs if o['use']=='fit']))),'withheldPixels':obs[-1]['errorPixels']}
 if kind=='vent':
  a,y,b,t=shape.bounds
  for k in range(8):
   center=[a+.85+k*.43,t-.87];op={'patch':id,'id':f'vent-{k}','center':center,'width':.085,'height':.60,'kind':'vent'};openings.append(op);holes.append(box(center[0]-.0425,center[1]-.30,center[0]+.0425,center[1]+.30))
 cut=unary_union(holes);assert shape.contains(cut) if holes else True
 opaque=shape.intersection(box(-1000,-1000,1000,51.85)) if kind=='return' else shape if kind!='glass' else Polygon()
 glass=shape.intersection(box(-1000,51.85,1000,1000)) if kind=='return' else shape if kind=='glass' else Polygon();wall=opaque.difference(cut)
 material='ceramic' if kind in ['return','tower'] else 'dark' if kind=='dark' else 'pale'
 # Panel cells close the back and share the photographic face datum. The visible
 # inset tile joints are material detail, while larger joints have shallow depth.
 cw,ch=(1.5,3.3) if kind=='return' else (2.4,4.0) if kind=='tower' else (1.08,.78) if kind=='dark' else (1.24,1.38)
 x0,y0,x1,y1=shape.bounds;y0=35.35 if kind=='return' else y0;gap=.004 if kind in ['return','tower'] else .007
 for col in range(math.ceil((x1-x0)/cw)):
  for row in range(math.ceil((y1-y0)/ch)):
   l=x0+cw*col;b=y0+ch*row;cell=box(l,b,l+cw,b+ch)
   for k,p in enumerate(polygons(wall.intersection(cell))):parts.append({'id':f'{id}-back-{col}-{row}-{k}','patch':id,'kind':'backing','material':'vent' if kind=='dark' else 'joint','front':-.002,'back':-.08,**serial(p)})
   for k,p in enumerate(polygons(wall.intersection(box(l+gap/2,b+gap/2,l+cw-gap/2,b+ch-gap/2)))):parts.append({'id':f'{id}-panel-{col}-{row}-{k}','patch':id,'kind':'panel','material':material,'front':.022,'back':-.002,**serial(p)})
 # Preserve the tiny bottom strip if the registered panel grid starts above it.
 if kind=='return':
  for k,p in enumerate(polygons(wall.intersection(box(-1000,-1000,1000,y0)))):parts.append({'id':f'{id}-bottom-{k}','patch':id,'kind':'panel','material':material,'front':.022,'back':-.08,**serial(p)})
 if not glass.is_empty:
  gx0,gy0,gx1,gy1=glass.bounds
  for col in range(math.ceil((gx1-gx0)/1.5)):
   for row in range(math.ceil((gy1-gy0)/1.35)):
    l=gx0+col*1.5;b=gy0+row*1.35
    for k,p in enumerate(polygons(glass.intersection(box(l+.024,b+.024,l+1.476,b+1.326)))):parts.append({'id':f'{id}-glass-{col}-{row}-{k}','patch':id,'kind':'glass','material':'glass','front':.012,'back':-.015,'collision':False,**serial(p)})
  for k,p in enumerate(polygons(glass)):parts.append({'id':f'{id}-glass-back-{k}','patch':id,'kind':'glass-backing','material':'mullion','front':-.015,'back':-.08,**serial(p)})
 patch['construction']={'tileSizeM':.1 if material=='ceramic' else None,'panelSizeM':[cw,ch],'openingAreaM2':cut.area,'opaqueAreaM2':opaque.area,'glassAreaM2':glass.area}
report={'schema':1,'status':'Source-bound architectural candidate; inferred fine details and unobserved openings remain unresolved.','source':{'file':str(source),'sha256':sha(data),'object':'Untitled.203'},'references':references,'patches':patches,'openings':openings,'parts':parts,'observations':observations,'assumptions':['Cameras remain fixed. Municipal planes and silhouette boundaries set location and scale.','Only four observed hotel-return windows are constructed; hidden rows remain unresolved.','Return window widths/heights use the earlier facade estimate, not an independent dimension survey.','Eight ventilation slots, their widths and depths, dark panel spacing and fasteners are photographic estimates.','Ceramic tile size remains 100mm; large panel joints and material response require close-view validation.','Public/private wall extents below the selected lower boundaries are retained for later study.'],'toolSha256':sha(Path(__file__).read_bytes())}
(out/'spec.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'patches':[{k:p[k] for k in ['id','areaM2','sourceMaximumPlaneDepartureM']} for p in patches],'parts':len(parts),'openings':len(openings),'windowFit':patches[0]['windowFit']},indent=2))
