"""Editable Blender hardware pass, registered to the retained walking layout.

Only surface-scale finishes are added: glass shoes/clamps and service seams,
flush comb plates, and daytime grand-stair riser cassettes. No new furniture obstructs circulation.
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
        ('Dark fastener heads',(.11,.14,.15),.8,.3),
        ('Daytime stair lens',(.35,.39,.36),.32,.38),
        ('Glass gasket grey',(.12,.16,.16),.2,.52)]:
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

def comb_support(lane_id,end,origin,u,v,along,height,width):
    """Use the canonical transfer footprint when physics has supplied it.

    Do not move warning-pad metadata: K010 already uses those exact transforms.
    Legacy lanes retain their existing apron finish until their repair exists.
    """
    name=lane_id+('-lower' if end==0 else '-upper')+'-comb-transfer'
    panel=next((q for q in p['panels'] if q['id']==name),None)
    if panel is None:return {'along':along,'height':height,'length':.42,'width':width+.15,'support':None}
    offsets=[tuple(q[k]-origin[i] for i,k in enumerate(('x','y','z'))) for q in panel['vertices']]
    a=[sum(q[i]*u[i] for i in range(3)) for q in offsets]
    lateral=[sum(q[i]*v[i] for i in range(3)) for q in offsets]
    length=max(a)-min(a)-.002;span=max(lateral)-min(lateral)-.002
    if length<=.05 or span<=.05:raise ValueError('Invalid comb transfer footprint: '+name)
    if abs(max(lateral)+min(lateral))>.002:raise ValueError('Comb transfer is not centered on lane: '+name)
    return {'along':(min(a)+max(a))/2,'height':max(q[1] for q in offsets),
            'length':length,'width':span,'support':name}

counts={'glassClamps':0,'combPlates':0,'combGrooves':0,'fasteners':0}
landings=[]
comb_supports=[]
for s in p['escalators']:
    u=Vector((s['uphill']['x'],0,s['uphill']['z']));v=Vector((-u.z,0,u.x));origin=Vector(tuple(s['lowerCenter'][k] for k in ('x','y','z')))
    name=s['id'];width=s['width'];public=s['path'][:s['publicPointCount']]
    def pt(along,y,lateral=0):return origin+u*along+Vector((0,y,0))+v*lateral
    for end in (0,1):
        along=(-s['flatLength']-.22) if end==0 else (s['run']+s['flatLength']+.22)
        warning_along=along
        y=0 if end==0 else s['height']
        support=comb_support(name,end,origin,u,v,along,y,width)
        along=support['along'];y=support['height'];length=support['length'];span=support['width'];at=pt(along,y)
        if support['support']:comb_supports.append(support)
        # Finishes stay inside the transfer support, including its top datum.
        box(name+' comb plates','Brushed stainless hardware',at+Vector((0,.0001,0)),(length,.0002,span),u)
        groove_width=min(width,span-.03)
        for j in range(int(groove_width/.018)):
            lateral=-groove_width/2+(j+.5)*.018
            box(name+' comb plates','Recessed comb grooves',pt(along,y+.0003,lateral),(min(.27,length-.03),.0002,.005),u);counts['combGrooves']+=1
        box(name+' comb plates','Escalator yellow safety enamel',pt(along+(length/2-.012)*(1 if end==0 else -1),y+.0003),(.018,.0002,span-.02),u)
        counts['combPlates']+=1
        for x in (-(length/2-.025),length/2-.025):
            for z in (-(span/2-.025),span/2-.025):
                box(name+' fasteners','Dark fastener heads',pt(along+x,y+.0003,z),(.012,.0002,.012),u);counts['fasteners']+=1
        warning=pt(warning_along+(-.42 if end==0 else .42),(0 if end==0 else s['height'])+.003)
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

# K006: daytime stair installations and glass-base finish. All new geometry
# is a surface applique, at most 2 mm off a retained face. Reference register:
# docs/STATION-DETAIL-BACKLOG.md. No photo textures or new collision volumes.
surface_groups=set()
surface_audit=[]

def surface(group,mat,points,normal,offset=.001):
    """Batch a convex face, orient it outward through the Unity/Blender swap."""
    normal=Vector(normal).normalized()
    clean=[]
    for v in points:
        v=Vector(v)
        if not clean or (v-clean[-1]).length>1e-7:clean.append(v)
    if len(clean)>1 and (clean[0]-clean[-1]).length<1e-7:clean.pop()
    points=[v for i,v in enumerate(clean)
            if (v-clean[i-1]).cross(clean[(i+1)%len(clean)]-v).length>1e-9]
    if len(points)<3:return
    area=sum((points[i]-points[0]).cross(points[i+1]-points[0]).length/2
             for i in range(1,len(points)-1))
    if area<1e-9:return
    assert 0<=offset<=.002
    if (points[1]-points[0]).cross(points[2]-points[0]).dot(normal)<0:
        points.reverse()
    # Coarse spatial/material batches keep the repeated fittings inexpensive.
    center=sum(points,Vector())/len(points)
    name=f'{group} @ {math.floor(center.x/25)},{math.floor(center.y/12)}'
    key=(name,mat);surface_groups.add(key)
    g=groups.setdefault(key,{'v':[],'f':[]});base=len(g['v'])
    for point in points:
        q=point+normal*offset;g['v'].append((q.x,q.z,q.y))
    for i in range(1,len(points)-1):g['f'].append((base,base+i+1,base+i))

# Follow every segment of the real curved riser contours. The dark cassette
# and pale lens faces are inset vertically, leaving all tread/nosing tops free.
# In daylight these are unlit equipment, not an invented animated light show.
counts.update(stairCassetteSegments=0,stairLensSegments=0,glassShoeFaces=0,glassServiceJoints=0)
for flight in p['flights']:
    if not flight['id'].startswith('daikaidan-flight-'):continue
    rows=flight['contours'];rise=flight['rise']
    for row in range(len(rows)-1):
        contour=rows[row]['points'];next_row=rows[row+1]['points']
        low=flight['baseElevation']+row*rise
        for col in range(len(contour)-1):
            a=Vector((contour[col]['x'],low,contour[col]['y']))
            b=Vector((contour[col+1]['x'],low,contour[col+1]['y']))
            uphill=Vector((next_row[col]['x']-a.x,0,next_row[col]['y']-a.z))
            normal=(b-a).cross(Vector((0,1,0))).normalized()
            if normal.dot(uphill)>0:normal=-normal
            def riser_band(mat,bottom,top,inset,offset):
                left=a.lerp(b,inset);right=a.lerp(b,1-inset)
                surface('Grand stair daytime cassettes',mat,
                    [left+Vector((0,bottom,0)),right+Vector((0,bottom,0)),
                     right+Vector((0,top,0)),left+Vector((0,top,0))],normal,offset)
            riser_band('Recessed comb grooves',.035,rise-.028,.035,.001)
            riser_band('Daytime stair lens',.071,rise-.061,.15,.002)
            counts['stairCassetteSegments']+=1;counts['stairLensSegments']+=1
    surface_audit.append({'id':flight['id'],'support':'exact vertical riser contours',
                          'offsetM':.002,'treadIntrusionM':0})

# Clip face triangles against affine bands. This preserves the actual inclined
# glass outline, including terminal panels; a bounds rectangle would overhang.
def clip(poly,value,limit,keep_above=True):
    result=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da=(value(a)-limit)*(1 if keep_above else -1)
        db=(value(b)-limit)*(1 if keep_above else -1)
        if da>=-1e-8:result.append(a)
        if (da>=0)!=(db>=0):result.append(a.lerp(b,da/(da-db)))
    return result

for panel in p['panels']:
    if '-escalator-' not in panel['id'] or '-glass-' not in panel['id']:continue
    vertices=[Vector(tuple(v[k] for k in ('x','y','z'))) for v in panel['vertices']]
    axis=0 if max(v.x for v in vertices)-min(v.x for v in vertices)>max(v.z for v in vertices)-min(v.z for v in vertices) else 2
    across=2 if axis==0 else 0
    lo=min(v[axis] for v in vertices);hi=max(v[axis] for v in vertices)
    if hi-lo<.01:continue
    low_y=min(v.y for v in vertices if abs(v[axis]-lo)<.001)
    high_y=min(v.y for v in vertices if abs(v[axis]-hi)<.001)
    slope=(high_y-low_y)/(hi-lo)
    height=lambda v:v.y-low_y-slope*(v[axis]-lo)
    along=lambda v:v[axis]
    tris=panel['triangles']
    for t in range(0,len(tris),3):
        tri=[vertices[i] for i in tris[t:t+3]]
        normal=(tri[1]-tri[0]).cross(tri[2]-tri[0]).normalized()
        if abs(normal[across])<.99:continue
        # Layout triangle order is retained; source normals disambiguate winding.
        if panel.get('normals'):
            n=panel['normals'][tris[t]];normal=Vector((n['x'],n['y'],n['z']))
        for mat,bottom,top in [('Brushed stainless hardware',0,.115),('Dark fastener heads',.115,.125)]:
            face=clip(clip(tri,height,bottom),height,top,False)
            if len(face)>=3:
                surface('Glass shoe finish',mat,face,normal);counts['glassShoeFaces']+=1
        # Hairline gasket/service seams divide long panes, stopping short of the
        # rubber rail and carrying no standalone post or unsupported fitting.
        for j in range(1,math.ceil((hi-lo)/1.5)):
            at=lo+j*1.5
            face=clip(clip(clip(clip(tri,along,at-.004),along,at+.004,False),height,.125),height,.81,False)
            if len(face)>=3:
                surface('Glass service joints','Glass gasket grey',face,normal);counts['glassServiceJoints']+=1
    surface_audit.append({'id':panel['id'],'support':'clipped source glass triangles','offsetM':.001})


for (name,mat),g in groups.items():
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(g['v'],[],g['f']);mesh.update()
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh)
    if (name,mat) not in surface_groups:
        assert bm.calc_volume(signed=True)>0, 'Hardware normals must face outward: '+name
    assert all(math.isfinite(c) for v in g['v'] for c in v)
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
    'detailRevision':'K006-surface-1','generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'surfaceAudit':surface_audit,
    'geometry':{'batches':len(groups),'triangles':sum(sum(len(f)-2 for f in g['f']) for g in groups.values()),'maxNewSurfaceOffsetM':.002},
    'combSupports':comb_supports,'scope':'Photo-guided finish and hardware estimates on the retained station; not surveyed construction dimensions'}
(OUT/'atrium-detail.json').write_text(json.dumps(meta,separators=(',',':'))+'\n')
(SOURCE/'build.json').write_text(json.dumps(meta,indent=2)+'\n')
print('ATRIUM_DETAIL_READY',counts,flush=True)
