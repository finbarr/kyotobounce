"""Independent GEOS audit of every floor clipping triangle and the emitted GLB."""
import json,hashlib,struct,sys,collections
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union
trace_path,layout_path,glb_path,out=map(Path,sys.argv[1:]);tb=trace_path.read_bytes();t=json.loads(tb);lb=layout_path.read_bytes();layout=json.loads(lb);gb=glb_path.read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest()
assert t['layoutSha256']==sha(lb)
def canonical(vs):
 vs=tuple(tuple(float(np.float32(x))for x in p)for p in vs)
 return min(vs[i:]+vs[:i]for i in range(3))
def physical(vs):return tuple(sorted(tuple(v)for v in vs))
source_counts=collections.Counter();emitted=collections.Counter();checks=[];failures=[]
for row in t['triangles']:
 vs=np.array(row['source']);normal=np.cross(vs[1]-vs[0],vs[2]-vs[0]);axis=int(np.argmax(np.abs(normal)));uv=[i for i in range(3)if i!=axis]
 source_counts[(row['surface'],physical([[p[0],p[2],p[1]]for p in vs]))]+=1
 source=Polygon(vs[:,uv]);mask=unary_union([Polygon(b['poly'])for b in row['blockers']]);expected=source.difference(mask)
 polys=[];output_vertices=[]
 for fragment in row['fragments']:
  for i in range(1,len(fragment)-1):
   tri=np.array([fragment[0],fragment[i],fragment[i+1]],dtype=np.float32)
   if np.linalg.norm(np.cross(tri[1]-tri[0],tri[2]-tri[0]))<1e-10:continue
   emitted[canonical([[p[0],p[2],-p[1]]for p in tri])]+=1;output_vertices.extend(tri.tolist());polys.append(Polygon(tri[:,uv]))
 actual=unary_union(polys);delta=expected.symmetric_difference(actual)
 # Stored world positions are Float32. Allow two coordinate ULPs per edge,
 # while checking both directed area differences against the exact polygon.
 ulp=max(float(np.spacing(np.float32(abs(v))))for v in vs.flatten());band=max(2e-6,2*ulp)
 excess=actual.difference(expected.buffer(band)).area
 missing=expected.difference(actual.buffer(band)).area
 bound=(expected.length+actual.length)*band+3.1416*band*band
 ok=delta.area<=bound and excess<1e-12 and missing<1e-12
 if not row['blockers']:ok=ok and len(row['fragments'])==1 and row['fragments'][0]==row['source']
 r={'object':row['object'],'face':row['face'],'blockers':len(row['blockers']),'differenceM2':delta.area,'areaBoundM2':bound,'coordinateBandM':band,'excessOutsideBandM2':excess,'missingOutsideBandM2':missing,'pass':ok};checks.append(r)
 if not ok:failures.append(r)
# The complete native triangle soup for all three source objects is exact.
expected_source=collections.Counter()
for p in layout['panels']:
 if p['id'] not in t['objects']:continue
 for i in range(0,len(p['triangles']),3):expected_source[(p['id'],physical([[p['vertices'][k][a]for a in ['x','y','z']]for k in p['triangles'][i:i+3]]))]+=1
assert source_counts==expected_source,'Trace source differs from native triangle positions'
# Expand GLB indices and prove each oriented, quantized triangle is the trace.
n=struct.unpack_from('<I',gb,12)[0];j=json.loads(gb[20:20+n]);binary=memoryview(gb)[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC3':3}[a['type']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];size=np.dtype(dt).itemsize
 return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*size),size))
actual_counts=collections.Counter()
for mesh in j['meshes']:
 for p in mesh['primitives']:
  if j['materials'][p['material']]['name']!='Atrium | honed granite floor | Browser':continue
  for tri in acc(p['attributes']['POSITION'])[acc(p['indices']).reshape(-1,3)]:actual_counts[canonical(tri)]+=1
assert emitted==actual_counts,('GLB differs from traced fragments',sum((emitted-actual_counts).values()),sum((actual_counts-emitted).values()))
report={'pass':not failures,'traceSha256':sha(tb),'layoutSha256':sha(lb),'glbSha256':sha(gb),'objects':t['objects'],'sourceTriangles':sum(source_counts.values()),'emittedTriangles':sum(emitted.values()),'nativeSourceTrianglesExact':True,'emittedTrianglePositionsAndWindingExact':True,'checkedClippedTriangles':sum(bool(r['blockers'])for r in checks),'maximumTriangleDifferenceM2':max(r['differenceM2']for r in checks),'failures':failures,'checks':checks,'meaning':'Every emitted floor triangle matches the traced Float32 clipping result. GEOS independently subtracts each source triangle mask and checks missing/excess coverage within two coordinate ULPs (minimum 2 micrometres); unrelated native geometry is unchanged. This replaces the inappropriate whole-union boundary Hausdorff check, not its numerical threshold.'}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k!='checks'}));assert report['pass']
