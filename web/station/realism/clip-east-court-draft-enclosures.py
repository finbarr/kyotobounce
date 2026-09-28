"""Remove obsolete draft enclosure volume from the registered courtyard precinct.

The exact rectangular cut is a construction boundary, not a new surveyed facade.
Only axis-aligned east-north/east-south draft boxes may change. Source geometry,
new courtyard panels, lower station volumes and all other records remain intact.
"""
import argparse,hashlib,json,sys,shutil,copy
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector,Matrix
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--candidate',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert not a.output.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
lb=(a.candidate/'station-layout.json').read_bytes();layout=json.loads(lb)
assert sha(lb)=='78c2efede75e75aa24aad77b3c97e91d1ffa19f848e5daa08b2736fc85389cc8'
# Native coordinates: X east, Y up, Z north. Floor underside is 0.6m below arrival.
cutlo=np.array([74.8,29.3733771488756,-18.4]);cuthi=np.array([125.,67.1,25.5])
def bounds(q):
 c=np.array([q['center'][k] for k in 'xyz']);s=np.array([q['size'][k] for k in 'xyz']);return c-s/2,c+s/2

def subtract(lo,hi):
 il=np.maximum(lo,cutlo);ih=np.minimum(hi,cuthi)
 if np.any(ih-il<=1e-8):return None
 parts=[];rl=lo.copy();rh=hi.copy()
 for k in range(3):
  if il[k]>rl[k]+1e-8:
   nh=rh.copy();nh[k]=il[k];parts.append((rl.copy(),nh));rl[k]=il[k]
  if ih[k]<rh[k]-1e-8:
   nl=rl.copy();nl[k]=ih[k];parts.append((nl,rh.copy()));rh[k]=ih[k]
 return parts
changes=[]
for i,q in enumerate(layout['boxes']):
 if not q['id'].startswith(('east-north-','east-south-')):continue
 lo,hi=bounds(q);parts=subtract(lo,hi)
 if parts is None:continue
 assert abs(q.get('yaw',0))<1e-9
 changes.append({'oldIndex':i,'id':q['id'],'oldBoundsNative':[lo.tolist(),hi.tolist()],'oldRecordSha256':sha(json.dumps(q,separators=(',',':')).encode()),'parts':parts})
assert any(q['id']=='east-north-lower-mass' for q in changes)
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==lb.decode()
old=copy.deepcopy(layout['boxes']);changed={q['oldIndex']:q for q in changes};new=[]
maxerror=0;removed_names=[]
for i,q in enumerate(old):
 if i not in changed:
  new.append(q);continue
 row=changed[i];objects=[o for o in bpy.data.objects if o.get('kyoto_seed')=='boxes/'+str(i)]
 assert len(objects)==1,(q['id'],len(objects))
 obj=objects[0];assert obj.get('kyoto_surface')==q['id']
 assert len(obj.data.vertices)==8 and len(obj.data.polygons)==6,(obj.name,len(obj.data.vertices),len(obj.data.polygons))
 lo,hi=bounds(q);world=np.array([(obj.matrix_world@v.co)[:] for v in obj.data.vertices])[:,[0,2,1]]
 err=max(np.max(abs(world.min(axis=0)-lo)),np.max(abs(world.max(axis=0)-hi)));maxerror=max(maxerror,float(err));assert err<1e-4,(q['id'],err)
 # Every vertex is an actual cuboid corner; this excludes beveled or shaped meshes.
 assert np.max(np.minimum(abs(world-lo),abs(world-hi)))<1e-4
 row['fragments']=[];removed_names.append(obj.name)
 for n,(pl,ph) in enumerate(row.pop('parts')):
  record=copy.deepcopy(q);record['id']=q['id']+'-court-clip-'+str(n)
  record['center']=dict(zip('xyz',((pl+ph)/2).tolist()));record['size']=dict(zip('xyz',(ph-pl).tolist()))
  clone=obj.copy();clone.data=obj.data.copy();clone.name=record['id'];obj.users_collection[0].objects.link(clone)
  # Retain face orientation and UVs. Draft textures are stretched on the changed
  # box pieces; this is explicitly not a final material acceptance claim.
  for v,wp in zip(clone.data.vertices,world):
   ratio=np.where(abs(wp-lo)<abs(wp-hi),0.,1.);point=pl+ratio*(ph-pl);v.co=(point[0],point[2],point[1])
  clone.matrix_world=Matrix.Identity(4);clone['kyoto_surface']=record['id'];clone['kyoto_seed']='boxes/'+str(len(new));clone.data.update()
  vs=np.empty(len(clone.data.vertices)*3,dtype=np.float32);clone.data.vertices.foreach_get('co',vs);loops=np.empty(len(clone.data.loops),dtype=np.int32);clone.data.loops.foreach_get('vertex_index',loops)
  clone['kyoto_geometry_signature']=sha(vs.tobytes()+loops.tobytes()+np.array(clone.matrix_world,dtype=np.float32).tobytes())
  new.append(record);row['fragments'].append({'id':record['id'],'boundsNative':[pl.tolist(),ph.tolist()]})
 bpy.data.objects.remove(obj,do_unlink=True)
# Rebind every retained box after deletions and fragment additions.
index={q['id']:i for i,q in enumerate(new)};assert len(index)==len(new)
for obj in bpy.data.objects:
 if obj.get('kyoto_seed','').startswith('boxes/'):
  assert obj.get('kyoto_surface') in index
  obj['kyoto_seed']='boxes/'+str(index[obj['kyoto_surface']])
layout['boxes']=new
proof={'status':'Draft enclosure clipping candidate; full routes and views must be rechecked.','inputLayoutSha256':sha(lb),'cutBoundsNative':[cutlo.tolist(),cuthi.tolist()],'source':'Registered municipal court footprint and restored municipal frontage, with camera/spawn obstruction receipts in east-court-context-full-02 and east-court-installed-walk-04.','selectionPrefixes':['east-north-','east-south-'],'changes':changes,'removedObjects':removed_names,'maximumOriginalBoxBoundsErrorM':maxerror,'limits':['The rectangular interface boundary is provisional and does not establish a measured building wall.','Clipped private-volume end faces retain draft materials and stretched original UVs.','Lower access, landmarks, current facade details, courses and performance remain unfinished.']}
layout['architecture']['eastCourtDraftClip']=proof
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures')
text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
proof['layoutSha256']=sha(text.encode());proof['blenderSha256']=sha((a.output/'KyotoAtrium.blend').read_bytes());(a.output/'east-court-draft-clip.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps({'changedBoxes':len(changes),'fragments':sum(len(q['fragments']) for q in changes),'maximumOriginalBoxBoundsErrorM':maxerror,'layoutSha256':proof['layoutSha256']}),flush=True)
