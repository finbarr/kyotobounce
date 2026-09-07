"""Export the edited Blender atrium to runtime data without rebuilding its surfaces.
Unchanged tagged primitives retain efficient native colliders. Edited geometry is
exported from Blender's evaluated mesh. The .blend owns all authoring decisions.
"""
import bpy,json,hashlib,sys,argparse,math
from pathlib import Path
import numpy as np
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output=a.output.resolve();a.output.mkdir(parents=True,exist_ok=True)
if (a.output/'station-layout.json').exists():raise FileExistsError('Use a fresh export directory')
s=bpy.context.scene;source=Path(bpy.data.filepath)
objects={o.name:o for o in s.objects}
motion_proxy_cached_matrices={o.name:o.matrix_world.copy() for o in s.objects if o.get('kyoto_motion_aux')}
# Viewport-hidden collision proxies still belong to the runtime. Blender can
# retain stale matrix_world values for objects excluded from dependency-graph
# evaluation even when their saved matrix_basis contains the authored edit.
# Enable tagged runtime objects for evaluation; keep render visibility intact.
# This exporter never saves these temporary visibility changes to the source.
required=[o for o in s.objects if any(o.get(k) for k in ('kyoto_physical','kyoto_owner','kyoto_motion_aux','kyoto_lane'))]
required_set=set(required)
# Object.users_collection scans collection contents; calling it for every
# architectural mesh is quadratic in a large scene. Visit each collection once.
required_collections={c for c in bpy.data.collections if any(o in required_set for o in c.objects)}
def enable_evaluation(layer,parents=()):
    if layer.collection in required_collections:
        for branch in (*parents,layer):
            if branch.exclude:branch.exclude=False
            if branch.hide_viewport:branch.hide_viewport=False
            if branch.collection.hide_viewport:branch.collection.hide_viewport=False
    for child in layer.children:enable_evaluation(child,(*parents,layer))
enable_evaluation(bpy.context.view_layer.layer_collection)
for o in required:
    if o.hide_viewport:o.hide_viewport=False
    if o.hide_get():o.hide_set(False)
bpy.context.view_layer.update()
seed=json.loads(bpy.data.texts['Kyoto runtime seed.json'].as_string());s.frame_set(1);bpy.context.view_layer.update()
x={k:v for k,v in seed.items() if k not in ('boxes','beams','panels','flights','escalators','municipalGeometry')}
for k in ('boxes','beams','panels','flights','escalators'):x[k]=[]
textures=a.output/'textures';textures.mkdir(exist_ok=True)
material_records={};texture_records={};changed=[];exported=[]
def sha(b):return hashlib.sha256(b).hexdigest()
def signature(o,matrix=None):
    v=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',v)
    t=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',t)
    return sha(v.tobytes()+t.tobytes()+np.array(o.matrix_world if matrix is None else matrix,dtype=np.float32).tobytes())
def vec(q):return dict(zip('xyz',map(float,q)))
def image_file(im,usage):
    if im.packed_file:raw=bytes(im.packed_file.data)
    else:raw=Path(bpy.path.abspath(im.filepath)).read_bytes()
    ext='.png' if raw.startswith(b'\x89PNG') else '.jpg' if raw.startswith(b'\xff\xd8') else None
    if ext is None:raise ValueError('Unsupported texture format: '+im.name)
    name=sha(raw)[:24]+ext;path=textures/name
    if not path.exists():path.write_bytes(raw)
    if name in texture_records and texture_records[name]['usage']!=usage:raise ValueError('Conflicting image color spaces')
    texture_records[name]={'file':name,'usage':usage,'sha256':sha(raw)}
    return 'AtriumTextures/'+Path(name).stem
baked={}
def bake_floor(m,channels=('color','normal')):
    if m.name in baked:return baked[m.name]
    original_scene=bpy.context.window.scene
    bake=bpy.data.scenes.new('Temporary texture bake');bpy.context.window.scene=bake
    bake.render.engine='CYCLES';bake.cycles.samples=1
    span=float(m.get('kyoto_bake_span_m',2.4));resolution=int(m.get('kyoto_bake_resolution',1024))
    bpy.ops.mesh.primitive_plane_add(size=span,location=(span*.5,span*.5,0));plane=bpy.context.object
    copy=m.copy();plane.data.materials.append(copy);nodes=copy.node_tree.nodes;links=copy.node_tree.links
    bs=nodes.get('Principled BSDF');out=nodes.get('Material Output')
    result={}
    for usage in channels:
        im=bpy.data.images.new('Baked atrium floor '+usage,resolution,resolution,alpha=False)
        im.colorspace_settings.name='sRGB' if usage=='color' else 'Non-Color'
        target=nodes.new('ShaderNodeTexImage');target.image=im;nodes.active=target
        if usage=='color':
            emission=nodes.new('ShaderNodeEmission');links.new(bs.inputs['Base Color'].links[0].from_socket,emission.inputs['Color']);links.new(emission.outputs[0],out.inputs['Surface'])
            bpy.ops.object.bake(type='EMIT')
        else:
            links.new(bs.outputs[0],out.inputs['Surface']);bpy.ops.object.bake(type='NORMAL')
        im.file_format='PNG';im.filepath_raw=str(textures/('floor-'+usage+'.png'));im.save()
        result[usage]=image_file(im,usage)
        Path(im.filepath_raw).unlink()
    bpy.context.window.scene=original_scene
    # The temporary bake is not saved into the architectural source.
    baked[m.name]=result;return result

def appearance(m,physical):
    if not m:return ''
    key='blender-'+sha(m.name.encode())[:12]
    if key in material_records:return key
    bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if m.use_nodes else None
    color=list(bs.inputs['Base Color'].default_value) if bs else list(m.diffuse_color)
    row={'id':key,'label':m.name,'physical':physical,'linearColor':dict(zip('rgba',color)),
         'metallic':float(bs.inputs['Metallic'].default_value) if bs else m.metallic,
         'roughness':float(bs.inputs['Roughness'].default_value) if bs else m.roughness,
         'alpha':.16 if physical=='glass' else color[3],'normalScale':1.0}
    if bs and bs.inputs['Emission Strength'].default_value>0:
        if bs.inputs['Emission Color'].is_linked or bs.inputs['Emission Strength'].is_linked:
            raise ValueError('Emission requires a bake or constant color: '+m.name)
        energy=float(bs.inputs['Emission Strength'].default_value)
        row['emissionLinearColor']=dict(zip('rgba',[v*energy for v in bs.inputs['Emission Color'].default_value[:3]]+[1.]))
    if m.name=='Atrium | honed granite floor':
        b=bake_floor(m);row.update(albedo=b['color'],normal=b['normal'],worldTextureSpan=float(m.get('kyoto_bake_span_m',2.4)));row['linearColor']=dict.fromkeys('rgba',1.)
    elif bs:
        if bs.inputs['Base Color'].is_linked:
            node=bs.inputs['Base Color'].links[0].from_node
            if m.get('kyoto_bake_color'):
                # Bake the authored color graph in linear space, then encode its
                # result as sRGB. Normal and roughness maps keep their own inputs.
                row['albedo']=bake_floor(m,('color',))['color']
            else:
                if node.type!='TEX_IMAGE':raise ValueError('Material needs a texture bake: '+m.name)
                row['albedo']=image_file(node.image,'color')
            row['linearColor']=dict.fromkeys('rgba',1.)
        if bs.inputs['Normal'].is_linked:
            n=bs.inputs['Normal'].links[0].from_node
            if n.type!='NORMAL_MAP' or not n.inputs['Color'].is_linked:raise ValueError('Unsupported normal graph: '+m.name)
            row['normal']=image_file(n.inputs['Color'].links[0].from_node.image,'normal');row['normalScale']=float(n.inputs['Strength'].default_value)
        if bs.inputs['Roughness'].is_linked:
            n=bs.inputs['Roughness'].links[0].from_node
            if n.type!='MATH' or n.operation!='SUBTRACT' or not n.inputs[1].is_linked:raise ValueError('Unsupported roughness graph: '+m.name)
            n=n.inputs[1].links[0].from_node
            if n.type!='TEX_IMAGE':raise ValueError('Unsupported mask graph: '+m.name)
            row['mask']=image_file(n.image,'linear')
    material_records[key]=row;return key

def mesh_panel(o,id,physical,role,collision,player_only=False,ball_stairs=False):
    if any(m.show_viewport!=m.show_render for m in o.modifiers):raise ValueError('Viewport/render modifier mismatch: '+o.name)
    e=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=e.to_mesh();me.calc_loop_triangles()
    vertices=[];normals=[];uvs=[];triangles=[]
    normal_matrix=e.matrix_world.to_3x3().inverted().transposed();layer=me.uv_layers.active
    # Per-corner values preserve hard/smooth boundaries and UV seams.
    for tri in me.loop_triangles:
        for li in (reversed(tri.loops) if e.matrix_world.determinant()>0 else tri.loops):
            pt=e.matrix_world@me.vertices[me.loops[li].vertex_index].co
            n=(normal_matrix@me.corner_normals[li].vector).normalized()
            vertices.append(vec((pt.x,pt.z,pt.y)));normals.append(vec((n.x,n.z,n.y)))
            uv=layer.data[li].uv if layer else (pt.x/2.4,pt.y/2.4)
            uvs.append(dict(zip('xy',map(float,uv))));triangles.append(len(triangles))
    if len(me.materials)>1 and len({t.material_index for t in me.loop_triangles})>1:
        # Preserve multiple visible finishes as triangle ranges on the same collider.
        groups={}
        for i,t in enumerate(me.loop_triangles):groups.setdefault(t.material_index,[]).extend((i*3,i*3+1,i*3+2))
        finishes=[{'appearance':appearance(me.materials[k],physical),'triangles':v} for k,v in sorted(groups.items())]
    else:finishes=[]
    material=appearance(me.materials[0],physical) if len(me.materials) else ''
    row={'id':id,'material':physical,'role':role,'vertices':vertices,'triangles':triangles,'normals':normals,'uv':uvs,
         'collision':bool(collision),'appearance':material,'finishes':finishes,'playerOnly':player_only,'ballStairs':ball_stairs}
    probe_point=o.get('kyoto_contact_probe_point_local');probe_normal=o.get('kyoto_contact_probe_normal_local')
    if probe_point is not None or probe_normal is not None:
        if physical!='glass' or probe_point is None or probe_normal is None or len(probe_point)!=3 or len(probe_normal)!=3:
            raise ValueError('Glass contact probes need a local point and normal: '+o.name)
        if not all(math.isfinite(float(v)) for v in (*probe_point,*probe_normal)):
            raise ValueError('Nonfinite glass contact probe: '+o.name)
        pt=e.matrix_world@Vector(probe_point);n=normal_matrix@Vector(probe_normal)
        if n.length<1e-8:raise ValueError('Zero glass contact probe normal: '+o.name)
        n.normalize()
        row.update(hasContactProbe=True,contactProbePoint=vec((pt.x,pt.z,pt.y)),contactProbeNormal=vec((n.x,n.z,n.y)))
    e.to_mesh_clear();return row

# Bake first, before acquiring an evaluated graph for the architectural objects.
floor=objects.get('concourse')
if floor:appearance(floor.data.materials[0],'stone')
for o in sorted(s.objects,key=lambda o:o.name):
    if o.get('kyoto_authoring_helper'):
        if o.type!='MESH' or not o.hide_render or o.get('kyoto_physical') or o.get('kyoto_collision'):
            raise ValueError('Authoring helpers must be hidden nonphysical meshes: '+o.name)
        continue
    if o.get('kyoto_owner') and o['kyoto_owner'] not in objects:raise ValueError('Orphaned stair auxiliary: '+o.name)
    if o.type!='MESH' or o.get('kyoto_dynamic') or o.get('kyoto_owner'):continue
    physical=o.get('kyoto_physical');id=o.get('kyoto_surface',o.name)
    if not physical:raise ValueError('Assign kyoto_physical and kyoto_surface before exporting new object '+o.name)
    tag=o.get('kyoto_seed');kind,index=tag.split('/') if tag else ('panels','0')
    unchanged=bool(tag) and not o.modifiers and signature(o)==o.get('kyoto_geometry_signature')
    visual=appearance(o.data.materials[0],physical) if len(o.data.materials) else ''
    if unchanged:
        r=json.loads(json.dumps(seed[kind][int(index)]));r['material']=physical;r['appearance']=visual;r['id']=id;r['role']=o.get('kyoto_role',r.get('role','facade'))
        if kind=='flights' and len(o.data.materials)>1:r['treadAppearance']=appearance(o.data.materials[1],physical)
        if o.name=='concourse':
            span=float(o.data.materials[0].get('kyoto_bake_span_m',2.4))
            r['uv']=[{'x':v['x']/span,'y':v['z']/span} for v in r['vertices']]
        x[kind].append(r)
        if kind=='flights':
            for suffix in (' walking surface',' foundation'):
                q=objects.get(o.name+suffix)
                if q and signature(q)!=q.get('kyoto_geometry_signature'):raise ValueError('Auxiliary stair mesh changed independently: '+q.name)
    else:
        r=mesh_panel(o,id,physical,o.get('kyoto_role','facade'),o.get('kyoto_collision',True),ball_stairs=kind=='flights' and bool(objects.get(o.name+' walking surface')))
        x['panels'].append(r);changed.append(o.name)
        if kind=='flights':
            for suffix in (' walking surface',' foundation'):
                q=objects.get(o.name+suffix)
                if q:x['panels'].append(mesh_panel(q,q.name,physical,'walking-assist' if 'walking' in suffix else 'foundation',True,player_only='walking' in suffix))
    exported.append(o.name)
for lane in seed['escalators']:
    o=objects.get(lane['id']+' operating chain')
    if o:
        if sha(np.array(o.matrix_world,dtype=np.float32).tobytes())!=o.get('kyoto_geometry_signature'):raise ValueError('Escalator frame moved; update its shared motion path: '+lane['id'])
        if abs(o['speed_m_s']-lane['speed'])>1e-6 or abs(o['phase_in_step_pitches']-lane['phase'])>1e-6:raise ValueError('Escalator settings require motion-path export: '+lane['id'])
        for suffix in (' walking surface',' foundation'):
            q=objects.get(lane['id']+suffix)
            if q:
                if suffix==' foundation':
                    # Retained static foundation meshes use world-space vertices
                    # and are not children of the animated operating chain.
                    if signature(q)!=q.get('kyoto_geometry_signature'):
                        raise ValueError('Moving-lane foundation changed: '+q.name)
                    continue
                # Legacy tags captured the hidden object's cached world matrix.
                # Validate its mesh against that tag, then independently require
                # the factory's identity local transform under the shared lane.
                # This catches edits to a hidden local transform even when its
                # old cached world matrix would have passed the legacy check.
                cached=motion_proxy_cached_matrices.get(q.name)
                identity=lambda m:max(abs(m[i][j]-(i==j)) for i in range(4) for j in range(4))<=1e-6
                if cached is None or signature(q,cached)!=q.get('kyoto_geometry_signature') or q.modifiers:
                    raise ValueError('Moving-lane auxiliary mesh changed: '+q.name)
                if q.parent!=o or not identity(q.matrix_basis) or not identity(q.matrix_parent_inverse):
                    raise ValueError('Moving-lane auxiliary local frame changed: '+q.name)
                if max(abs(q.matrix_world[i][j]-o.matrix_world[i][j]) for i in range(4) for j in range(4))>1e-5:
                    raise ValueError('Moving-lane auxiliary does not follow its shared frame: '+q.name)
        x['escalators'].append(lane)
        x['flights'].extend(f for f in seed['flights'] if f['id']==lane['id'])
x['authoredMaterials']=list(material_records.values())
x['authoredLights']=[]
for o in sorted(s.objects,key=lambda o:o.name):
    if not o.get('kyoto_fixture'):continue
    if o.type!='LIGHT' or o.data.type!='SPOT':raise ValueError('Only explicit spot fixtures are supported: '+o.name)
    direction=(o.matrix_world.to_quaternion()@Vector((0,0,-1))).normalized()
    position=o.matrix_world.translation
    intensity=float(o['kyoto_unity_intensity']);distance=float(o['kyoto_range_m'])
    if not math.isfinite(intensity) or intensity<=0 or not math.isfinite(distance) or distance<=0:
        raise ValueError('Invalid fixture intensity/range: '+o.name)
    x['authoredLights'].append({'id':o.name,'position':vec((position.x,position.z,position.y)),
        'direction':vec((direction.x,direction.z,direction.y)),
        'linearColor':dict(zip('rgba',list(o.data.color)+[1.])),
        'intensity':intensity,'range':distance,'spotAngle':math.degrees(o.data.spot_size),
        'innerSpotAngle':math.degrees(o.data.spot_size)*(1-float(o.data.spot_blend)),
        'source':o.get('reference',''),'note':o.get('inference','')})
x['blenderSource']={'path':str(source),'sha256':sha(source.read_bytes()),'geometryAuthority':'Blender; unchanged compact records verified against native geometry signatures'}
path=a.output/'station-layout.json';path.write_text(json.dumps(x,separators=(',',':'))+'\n')
report={'sourceSha256':x['blenderSource']['sha256'],'layoutSha256':sha(path.read_bytes()),'counts':{k:len(x[k]) for k in ('boxes','beams','panels','flights','escalators','routes','authoredLights')},'meshEdits':changed,'exportedObjects':len(exported),'materials':len(material_records),'textures':list(texture_records.values())}
(a.output/'export-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('ATRIUM_EXPORT',report['counts'],'mesh edits',len(changed),'materials',len(material_records),flush=True)
