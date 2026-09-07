"""Editable Blender hardware pass, registered to the retained walking layout.

Only surface-scale finishes are added: glass clamps, screw heads, flush comb
plates and protective tread-end plates. No new furniture obstructs circulation.
Run with Blender --background --python tools/build_atrium_detail.py.
"""
from pathlib import Path
import bpy, json, math, hashlib
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
LAYOUT=ROOT/'runtime/station-layout.json'
OUT=ROOT/'web/public/assets'
SOURCE=ROOT/'art-source/phase3/atrium-detail'
SOURCE.mkdir(parents=True,exist_ok=True)
p=json.loads(LAYOUT.read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
groups={}
materials={}
for name,color,metal,rough in [('Brushed stainless hardware',(.32,.37,.38),.85,.28),
        ('Recessed comb grooves',(.023,.03,.032),.5,.5),
        ('Escalator yellow safety enamel',(.69,.46,.035),.12,.5),
        ('Dark fastener heads',(.11,.14,.15),.8,.3)]:
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Metallic'].default_value=metal;bsdf.inputs['Roughness'].default_value=rough;materials[name]=m

def box(group,mat,center,size,u=(1,0,0)):
    # Author in Unity coordinates, write Blender Z-up. A lane's U axis follows
    # the incline in plan and V spans its width; every component is stationary.
    g=groups.setdefault((group,mat),{'v':[],'f':[]});base=len(g['v'])
    u=Vector(u);v=Vector((-u.z,0,u.x));c=Vector(center)
    for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]:
        pt=c+u*x*size[0]/2+Vector((0,y*size[1]/2,0))+v*z*size[2]/2
        g['v'].append((pt.x,pt.z,pt.y))
    for face in [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]:
        # The axis swap changes handedness; this order is outward in Blender.
        g['f'].append(tuple(base+i for i in face))

counts={'glassClamps':0,'combPlates':0,'combGrooves':0,'fasteners':0}
landings=[]
for s in p['escalators']:
    u=Vector((s['uphill']['x'],0,s['uphill']['z']));v=Vector((-u.z,0,u.x));origin=Vector(tuple(s['lowerCenter'][k] for k in ('x','y','z')))
    name=s['id'];width=s['width'];public=s['path'][:s['publicPointCount']]
    def pt(along,y,lateral=0):return origin+u*along+Vector((0,y,0))+v*lateral
    for end in (0,1):
        along=(-s['flatLength']-.22) if end==0 else (s['run']+s['flatLength']+.22)
        y=0 if end==0 else s['height'];at=pt(along,y)
        box(name+' comb plates','Brushed stainless hardware',at+Vector((0,.001,0)),(.42,.002,width+.15),u)
        # Grooves and safety threshold are flush finishes on the existing apron.
        for j in range(int(width/.018)):
            lateral=-width/2+(j+.5)*.018
            box(name+' comb plates','Recessed comb grooves',pt(along,y+.0025,lateral),(.27,.001,.005),u);counts['combGrooves']+=1
        box(name+' comb plates','Escalator yellow safety enamel',pt(along+(.20 if end==0 else -.20),y+.003),(.018,.001,width+.1),u)
        counts['combPlates']+=1
        for x in (-.17,.17):
            for z in (-width/2-.045,width/2+.045):
                box(name+' fasteners','Dark fastener heads',pt(along+x,y+.003,z),(.012,.001,.012),u);counts['fasteners']+=1
        warning=pt(along+(-.42 if end==0 else .42),y+.003)
        landings.append({'id':name+('-lower' if end==0 else '-upper'),'position':dict(zip(('x','y','z'),warning)),
            'uphill':s['uphill'],'width':width+.14,'direction':1 if (s['speed']>0)==(end==0) else -1})
    # Glass fixing shoes and their visible screw heads repeat along the actual
    # eased public rail, not a straight approximation of the escalator slope.
    for along in range(1,math.ceil(s['run']),2):
        closest=min(public,key=lambda q:abs(q['z']-along));y=closest['y']
        for side in (-1,1):
            lateral=side*(width/2+.075)
            for h in (.2,.78):
                box(name+' glass clamps','Brushed stainless hardware',pt(along,y+h,lateral),(.065,.095,.034),u)
                box(name+' fasteners','Dark fastener heads',pt(along,y+h,lateral+side*.018),(.022,.018,.002),u)
                counts['glassClamps']+=1;counts['fasteners']+=1

for (name,mat),g in groups.items():
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(g['v'],[],g['f']);mesh.update()
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh)
    assert bm.calc_volume(signed=True)>0, 'Hardware normals must face outward: '+name
    bm.free()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(materials[mat])
    o['detail_scope']='Surface hardware registered to existing collider; no new walking obstacle'

# Anchor legible sign artwork to existing solid fascia/board faces, retaining
# the existing shape and the collision envelope.
signs=[]
for m in p['panels']:
    name=m['id'];vs=m.get('vertices',[])
    if not vs:continue
    if name in ('central-hall-information-board-structure','central-hall-central-gate-sign') or 'sign recess' in name or '-sign-recess-' in name:
        bounds=[[min(v[k] for v in vs),max(v[k] for v in vs)] for k in ('x','y','z')]
        signs.append({'id':name,'bounds':bounds})

bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'AtriumHardware.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'atrium-detail.glb'),export_format='GLB',export_yup=True,export_animations=False,export_extras=True)
meta={'sourceLayoutSha256':hashlib.sha256(LAYOUT.read_bytes()).hexdigest(),'counts':counts,'signs':signs,'landings':landings,
    'scope':'Photo-guided finish and hardware estimates on the retained station; not surveyed construction dimensions'}
(OUT/'atrium-detail.json').write_text(json.dumps(meta,separators=(',',':'))+'\n')
(SOURCE/'build.json').write_text(json.dumps(meta,indent=2)+'\n')
print('ATRIUM_DETAIL_READY',counts,flush=True)
