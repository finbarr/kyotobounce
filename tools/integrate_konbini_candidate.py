"""Import the camera-owned shop bytes, with a bounded 2F public connection.
The standalone builder and registration are inputs, never reimplemented here.
"""
import bpy,hashlib,json,math,re
from mathutils import Vector,Matrix


def build(layout,mesh,box,materials,handoff):
    checks=json.loads((handoff/'checksums.json').read_text())
    for name in ['WestExitHeartIn.blend','konbini.glb','colliders.json']:
        assert hashlib.sha256((handoff/name).read_bytes()).hexdigest()==checks[name], 'Handoff checksum mismatch: '+name
    metadata=json.loads((handoff/'colliders.json').read_text())
    assert metadata['registration']['threshold']=={'x':-54,'y':7.35,'z':-18}
    assert metadata['registration']['inwardYaw']==90
    proposals={p['id']:p for p in metadata['boxes']+metadata['decorativeOnly']}
    with bpy.data.libraries.load(str(handoff/'WestExitHeartIn.blend'),link=False) as (src,dst):dst.objects=src.objects
    # Linked objects must participate in dependency evaluation before world transforms.
    staging=bpy.data.collections.new('Shop import staging');bpy.context.scene.collection.children.link(staging)
    for obj in dst.objects:
        if obj is not None:staging.objects.link(obj)
    bpy.context.view_layer.update()
    imported=[];errors=[]
    for obj in dst.objects:
        if obj is None:continue
        if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True);continue
        name=obj.name;mat=obj.data.materials[0];rec=proposals.get(name)
        assert rec is not None or name=='konbini-shop-name', 'Unexpected source mesh '+name
        if rec:
            assert json.loads(obj['kyoto_candidate_record'])==rec, 'Source metadata differs: '+name
        if mat.name not in materials:
            materials[mat.name]=mat;bs=mat.node_tree.nodes.get('Principled BSDF');rgba=list(bs.inputs['Base Color'].default_value)
            layout['authoredMaterials'].append({'id':'shop-'+re.sub('[^a-z0-9]+','-',mat.name.lower()).strip('-'),'label':mat.name,'physical':rec['material']if rec else'stone','linearColor':dict(zip('rgba',rgba)),'metallic':float(bs.inputs['Metallic'].default_value),'roughness':float(bs.inputs['Roughness'].default_value),'alpha':float(bs.inputs['Alpha'].default_value),'normalScale':1})
        vertices=[obj.matrix_world@v.co for v in obj.data.vertices]
        if rec:
            center=Vector(tuple(rec['center'][k]for k in 'xyz'));d=Vector(tuple(rec['size'][k]/2 for k in 'xyz'));m=Matrix.Rotation(math.radians(rec['yaw']),3,'Y')
            expected=[center+m@Vector((i*d.x,j*d.y,k*d.z))for i in [-1,1]for j in [-1,1]for k in [-1,1]]
            actual=[Vector((v.x,v.z,v.y))for v in vertices]
            error=max(abs(fn(v[i]for v in actual)-fn(v[i]for v in expected))for fn in [min,max]for i in range(3))
            assert error<.00001,(name,error)
            errors.append(error)
        # Free original name before creating the transformed world-space mesh.
        faces=[tuple(p.vertices)for p in obj.data.polygons];bpy.data.objects.remove(obj,do_unlink=True)
        o=mesh(name,vertices,faces,mat,rec['material']if rec else'stone',bool(rec and rec['collision']))
        o['kyoto_role']=rec['role']if rec else'shop identity sign'
        imported.append(name)
    bpy.data.collections.remove(staging)
    assert set(proposals).issubset(imported)
    paving=bpy.data.objects['west-2f-landing'].data.materials[0]
    glass=materials['Garden guard glazing']
    def slab(name,bounds,mat=paving,physical='stone'):
        o=box('k019-'+name,bounds,mat,physical);o['kyoto_role']='shop public approach';return o
    slab('west-2f-gallery',(-56.6,-54,6.85,7.35,-21.16,-13.49))
    slab('gallery-west-guard',(-56.65,-56.6,7.35,8.45,-21.21,-13.5),glass,'glass')
    slab('gallery-south-guard',(-56.65,-54,7.35,8.45,-21.21,-21.16),glass,'glass')
    slab('gallery-north-east-guard',(-54,-53.95,7.35,8.45,-14.84,-13.5),glass,'glass')
    return {'sourceChecksums':checks,'sourceMetadata':metadata,'imported':imported,'maxSourceColliderBoundsErrorM':max(errors),'connection':{'floorBounds':[-56.6,-54,6.85,7.35,-21.16,-13.49],'existingLanding':'west-2f-landing','existingEdgeZ':-13.5,'overlapM':.01,'clearWidthM':2.4,'registrationChanged':False,'existingGeometryRemoved':False,'rationale':'Actual landing polygon stops at Z-13.5; bounded public gallery connects the fixed shop doorway without cutting existing building floors or walls.'}}
