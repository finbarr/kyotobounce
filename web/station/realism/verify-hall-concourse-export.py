"""Verify the changed concourse against the preceding visible floor and native cut.

The original exporter removes covered coplanar floor faces. Compare that same
visibility mask before/after rather than requiring every hidden native face.
"""
import json,hashlib,struct,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
base_layout,base_glb,new_layout,new_glb,out=map(Path,sys.argv[1:]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def footprint(ts):return unary_union([Polygon([(float(v[0]),float(v[2]))for v in t])for t in ts if all(abs(v[1])<1e-9 for v in t)])
def native(path):
 p=next(p for p in json.loads(path.read_bytes())['panels']if p['id']=='concourse');vs=np.array([[v['x'],v['y'],-v['z']]for v in p['vertices']]);return footprint(vs[np.array(p['triangles']).reshape(-1,3)])
def visible(path):
 gb=path.read_bytes();n=struct.unpack_from('<I',gb,12)[0];j=json.loads(gb[20:20+n]);binary=memoryview(gb)[28+n:]
 def acc(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC3':3}[a['type']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];size=np.dtype(dt).itemsize
  return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*size),size))
 ts=[]
 for m in j['meshes']:
  for p in m['primitives']:
   if j['materials'][p['material']]['name']=='Atrium | honed granite floor | Browser':ts.extend(acc(p['attributes']['POSITION'])[acc(p['indices']).reshape(-1,3)])
 assert ts;return footprint(ts)
a,b=native(base_layout),native(new_layout);av,bv=visible(base_glb),visible(new_glb)
assert b.difference(a).area<1e-8
cut=a.difference(b);expected=av.difference(cut);error=expected.symmetric_difference(bv).area
bound=expected.length*2e-6;distance=expected.boundary.hausdorff_distance(bv.boundary)
difference=expected.symmetric_difference(bv);area_pass=error<bound;boundary_pass=distance<2e-6
old_omissions=a.difference(av);new_omissions=b.difference(bv)
omission_change=new_omissions.symmetric_difference(old_omissions.intersection(b)).area
report={'pass':area_pass and boundary_pass and omission_change<bound,'areaCheckPass':area_pass,'boundaryCheckPass':boundary_pass,'differenceAreaAfterTwoMicrometreErosion':difference.buffer(-2e-6).area,'baseLayoutSha256':sha(base_layout),'layoutSha256':sha(new_layout),'baseGlbSha256':sha(base_glb),'glbSha256':sha(new_glb),'nativeTopAreaM2':b.area,'visibleConcourseAreaM2':bv.area,'intentionalCutAreaM2':cut.area,'expectedVisibleDifferenceM2':error,'areaBoundM2':bound,'maximumBoundaryDistanceM':distance,'inheritedOmittedConcourseAreaM2':new_omissions.area,'omissionMaskDifferenceM2':omission_change,'scope':'Compares the native cut with the preceding visible floor; area comparison passes but boundary topology remains unresolved. Hidden-face omission already present in the preceding export is retained; this is not a station-wide floor/occluder audit.'}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));assert report['pass'],'Boundary topology check remains unresolved; see saved report'
