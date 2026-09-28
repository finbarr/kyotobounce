"""Cut the source metal enclosure around the existing dynamic lane envelopes."""
import bpy,sys,json,hashlib,math
from pathlib import Path
from mathutils import Vector,Matrix
args=sys.argv[sys.argv.index('--')+1:];profilep,lanep,nativep,out=map(Path,args);out.mkdir()
load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();spec=load(profilep);lanes=load(lanep);native=load(nativep);bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def object_mesh(name,vertices,indices,preserve_faces=False):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[indices[i:i+3]for i in range(0,len(indices),3)]);mesh.update();
 if preserve_faces:
  for face in mesh.polygons:
   material=bpy.data.materials.new(name+'-source-face-'+str(face.index));mesh.materials.append(material);face.material_index=face.index
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return o

def box(name,O,U,R,z0,z1,w0,w1,y0,y1):
 vertices=[tuple(O+U*z+R*w+Vector((0,y,0)))for z,w,y in [(z0,w0,y0),(z1,w0,y0),(z1,w1,y0),(z0,w1,y0),(z0,w0,y1),(z1,w0,y1),(z1,w1,y1),(z0,w1,y1)]]
 # The local frame (along, lateral, height) is left handed; oriented faces below use its world determinant.
 ids=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]
 volume=sum(Vector(vertices[ids[i]]).dot(Vector(vertices[ids[i+1]]).cross(Vector(vertices[ids[i+2]])))/6 for i in range(0,len(ids),3))
 if volume<0:ids=[j for i in range(0,len(ids),3)for j in ids[i:i+3][::-1]]
 return object_mesh(name,vertices,ids)

def subtract(obj,cutter):
 bpy.context.view_layer.objects.active=obj;obj.select_set(True);mod=obj.modifiers.new('Preserve source outside game mechanism','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);obj.select_set(False);bpy.data.objects.remove(cutter,do_unlink=True)
 obj.data.calc_loop_triangles();volume=sum(obj.data.vertices[t.vertices[0]].co.dot(obj.data.vertices[t.vertices[1]].co.cross(obj.data.vertices[t.vertices[2]].co))/6 for t in obj.data.loop_triangles);print('CUT VOLUME',obj.name,volume,flush=True)

receipts=[]
for core in spec.pop('metalCores'):
 bank=next(b for b in lanes['banks']if b['name']==core['bank']);U=Vector(bank['uphillRenderer']);R=Vector((-U.z,0,U.x));O=Vector(bank['lowerCenterRenderer']);O.y=0;obj=object_mesh(core['id'],core['vertices'],core['indices'],preserve_faces=True);cuts=[]
 for lane in [e for e in native['escalators']if core['bank']in e['id']]:
  p=Vector((lane['lowerCenter']['x'],0,-lane['lowerCenter']['z']));w=(p-O).dot(R);half=lane['width']/2+.05;z0=-lane['flatLength']-.71;z1=lane['run']+lane['flatLength']+.71
  subtract(obj,box(lane['id']+'-clearance',O,U,R,z0,z1,w-half,w+half,-8,3));cuts.append(dict(kind='tread-and-casing-clearance',lane=lane['id'],along=[z0,z1],lateral=[w-half,w+half],y=[-8,3]))
 for end in ['lower','upper']:
  outline=bank[end+'PlateOutline'];zs=[(Vector((x,0,z))-O).dot(U)for x,z in outline]
  z0,z1=(-5,max(zs))if end=='lower'else(min(zs),15);y=lanes['lowerY']if end=='lower'else 0
  subtract(obj,box(core['id']+'-'+end+'-plate-mask',O,U,R,z0,z1,-2,2,y-2,y+.0025));cuts.append(dict(kind='existing-landing-plate-clearance',end=end,along=[z0,z1],lateral=[-2,2],y=[y-2,y+.0025]))
 mesh=obj.data;mesh.calc_loop_triangles();vertices=[list(v.co)for v in mesh.vertices];indices=[int(i)for t in mesh.loop_triangles for i in t.vertices]
 spec['meshes'].append(dict(id=core['id'],vertices=vertices,indices=indices,material='steel',role='hall-basement-steel-trim',sourceFaces=core['sourceFaces'],booleanCuts=cuts,sourceMetalCoreVolumeM3=core['volumeM3']))
 receipts.append(dict(id=core['id'],inputVertices=len(core['vertices']),inputTriangles=len(core['indices'])//3,outputVertices=len(vertices),outputTriangles=len(indices)//3,cuts=cuts))
spec['metalTrimInputs']={str(p):sha(p)for p in [profilep,lanep,nativep]};spec['limits'].append('Source metal enclosure is cut only at the existing native lane/casing envelopes and fixed landing plates; boolean output is Float32 Blender geometry.')
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(out/'boolean-receipt.json').write_text(json.dumps(dict(blender=bpy.app.version_string,solver='MANIFOLD',preservedSourceFaceMaterials=True,inputs=spec['metalTrimInputs'],banks=receipts),indent=2)+'\n');print(json.dumps(receipts,indent=2))
