"""K028 original geometry. Blender 5.2.1; never mutates canonical assets.
Local coordinates (u, depth, height) map to Blender (x, native z, native y).
Collision triangles are extracted after all bevels/conversions, from visible meshes.
"""
import argparse,sys,json,math,hashlib,shutil
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[3]
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'artifacts/station-detail/plaza-landmarks/candidate');p.add_argument('--assemble',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);(out/'textures').mkdir(exist_ok=True)
spec=json.loads(Path(__file__).with_name('specification.json').read_text());base_path=ROOT/'runtime/station-layout.json';base_bytes=base_path.read_bytes();layout=json.loads(base_bytes)
bpy.ops.wm.read_factory_settings(use_empty=True)
materials={};records=[];objects=[];current=None

def material(name,color,metal=0,rough=.5,texture=None):
    name='k028-'+name;m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    rec={'id':name,'label':name,'physical':'steel' if metal else 'stone','linearColor':dict(zip('rgba',(*color,1))),'metallic':metal,'roughness':rough,'alpha':1}
    if texture:
        image=bpy.data.images.load(str(texture));image.pack();t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image;m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color']);rec['albedo']=texture.stem
    materials[name]=m;records.append(rec);return m

# Authored physical pigment image, no photographs, baked lighting or normal data.
w,h=1024,256;xx,yy=np.meshgrid(np.linspace(0,1,w),np.linspace(0,1,h));colors=np.array([[.88,.38,.56],[.29,.68,.77],[.53,.76,.52],[.93,.69,.20],[.45,.71,.63]])
i=np.minimum((xx*5).astype(int),4);rgb=colors[i]*(.8+.2*yy[...,None]);local=xx*5-i
# Petals, ripples, moon, geometric leaves and winter stars are original analytic motifs.
angle=np.arctan2((yy*4)%1-.5,(local*3)%1-.5);rad=np.hypot((yy*4)%1-.5,(local*3)%1-.5)
petals=(rad<.20+.07*np.cos(5*angle))&(i==0)
ripples=(np.abs(np.sin(45*yy+5*np.sin(local*9)))<.16)&(i==1)
moon=(np.hypot(local-.60,yy-.70)<.18)&(i==2)
leaves=(np.abs(((local*5+yy*3)%1)-.5)+np.abs(((yy*6)%1)-.5)<.24)&(i==3)
stars=((np.abs((local*5)%1-.5)<.025)|(np.abs((yy*5)%1-.5)<.025))&(i==4)
mask=petals|ripples|moon|leaves|stars;rgb[mask]=rgb[mask]*.3+np.array([1,.96,.85])*.7
im=bpy.data.images.new('K028 original seasons',width=w,height=h);rgba=np.concatenate([rgb,np.ones((h,w,1))],axis=2).astype(np.float32);im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(out/'textures/k028-seasons.png');im.file_format='PNG';im.save()
red=material('vermilion-enamel',(.68,.035,.012),.32,.32);seam=material('vermilion-seam',(.22,.018,.006),.25,.42)
stone=material('plinth-granite',(.24,.27,.26),0,.72);dark=material('basalt',(.045,.055,.058),0,.6)
pale=material('space-pale-stone',(.68,.65,.55),0,.61);silver=material('insert-rim',(.4,.44,.46),.65,.29)
blue=material('inset-blue',(.008,.30,.58),.3,.23);yellow=material('inset-gold',(.78,.55,.045),.45,.3);coral=material('inset-coral',(.65,.035,.055),.25,.28)
season=material('original-seasonal-letterwork',(1,1,1),.22,.43,out/'textures/k028-seasons.png')

def finish(o,name,mat,bevel=0,smooth=False):
    o.name=current['id']+'-'+name;o.data.materials.clear();o.data.materials.append(mat)
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    if o.type!='MESH':bpy.ops.object.convert(target='MESH');o=bpy.context.object
    if bevel:
        mod=o.modifiers.new('Actual rounded edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    # Bake local to world once; collision and export consume these same vertices.
    anchor=current['anchor']
    for v in o.data.vertices:v.co+=Vector((anchor[0],anchor[2],anchor[1]))
    if smooth:
        for poly in o.data.polygons:poly.use_smooth=True
    o['kyoto_collision']=True;o['kyoto_physical']='steel' if mat in [red,seam,silver,blue,yellow,coral,season] else 'stone';o['kyoto_role']='plaza-landmark';o['kyoto_surface']=o.name;o['k028_layer']=current['id']
    objects.append(o);o.select_set(False);return o

def mesh(name,verts,faces,mat,bevel=0,smooth=False):
    me=bpy.data.meshes.new(current['id']+'-'+name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(me.name,me);bpy.context.scene.collection.objects.link(o);return finish(o,name,mat,bevel,smooth)

def box(name,c,size,mat,bevel=0):
    x,y,z=c;dx,dy,dz=[s/2 for s in size]
    return mesh(name,[(x+i*dx,y+j*dy,z+k*dz)for i,j,k in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]],[(2,6,4,0),(5,7,3,1),(4,5,1,0),(3,7,6,2),(1,3,2,0),(6,7,5,4)],mat,bevel)

def cylinder(name,c,r,depth,mat,n=48,vertical=False):
    v=[]
    for d in [-depth/2,depth/2]:
        for j in range(n):
            t=2*math.pi*j/n;v.append((c[0]+r*math.cos(t),c[1]+(r*math.sin(t) if vertical else d),c[2]+(d if vertical else r*math.sin(t))))
    f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n)for j in range(n)]
    # Horizontal circles use reversed axes, hence reverse triangle winding.
    if not vertical:f=[tuple(reversed(q))for q in f]
    return mesh(name,v,f,mat,.008,True)

def catmull(points,steps=12):
    p=[Vector(points[0])]+[Vector(v)for v in points]+[Vector(points[-1])];result=[]
    for a,b,c,d in zip(p,p[1:],p[2:],p[3:]):
        for j in range(steps):
            t=j/steps;result.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    return result+[Vector(points[-1])]

def tube(name,points,r,mat,closed=False,n=16):
    pts=[Vector(v)for v in points];v=[];f=[]
    for j,p in enumerate(pts):
        tangent=(pts[(j+1)%len(pts)]-pts[(j-1)%len(pts)]) if closed else pts[min(j+1,len(pts)-1)]-pts[max(0,j-1)]
        tangent.normalize();u=tangent.cross(Vector((0,1,0))).normalized();w=tangent.cross(u).normalized()
        for k in range(n):v.append(tuple(p+r*(u*math.cos(k*2*math.pi/n)+w*math.sin(k*2*math.pi/n))))
    for j in range(len(pts) if closed else len(pts)-1):
        for k in range(n):f.append((j*n+k,j*n+(k+1)%n,((j+1)%len(pts))*n+(k+1)%n,((j+1)%len(pts))*n+k))
    if not closed:f.extend([tuple(reversed(range(n))),tuple(range((len(pts)-1)*n,len(pts)*n))])
    return mesh(name,v,f,mat,0,True)

current=spec['landmarks'][0]
box('stone-plinth',(0,0,.18),(3,2,.36),stone,.035)
# Forked tubular lower body, with feet terminating exactly on the stone plinth.
for side in [-1,1]:
    tube('rounded-leg-'+str(side),catmull([(side*.92,0,.55),(side*.75,0,1.15),(side*.48,.015,1.95),(0,.02,2.75)]),.23,red)
# Tall open central capsule, not a filled collider or decorative circle.
pts=[]
for j in range(32):
    t=math.pi*j/31;pts.append((.42*math.cos(t),0,4.85+.42*math.sin(t)))
for j in range(1,25):pts.append((-.42,0,4.85-(4.85-2.95)*j/24))
for j in range(1,32):
    t=math.pi+math.pi*j/31;pts.append((.42*math.cos(t),0,2.95+.42*math.sin(t)))
for j in range(1,24):pts.append((.42,0,2.95+(4.85-2.95)*j/24))
tube('open-central-loop',pts,.19,red,True)
# Two dissimilar cylindrical armor plates; visible seam reveals between panels.
for side in [-1,1]:
    lo,hi=(3.25,7.0) if side==-1 else (3.5,6.7)
    for band in range(6):
        z0=lo+(hi-lo)*band/6+.008;z1=lo+(hi-lo)*(band+1)/6-.008;v=[];n=18
        for z in [z0,z1]:
            for back in [0,1]:
                for j in range(n+1):
                    t=j/n;u=side*(.32+.65*t);depth=-.24+.32*math.sin(t*math.pi*.72)+back*.10
                    v.append((u,depth,z))
        row=n+1;f=[]
        for j in range(n):
            f.extend([(j,j+1,2*row+j+1,2*row+j),(row+j,3*row+j,3*row+j+1,row+j+1),(j,row+j,row+j+1,j+1),(2*row+j,2*row+j+1,3*row+j+1,3*row+j)])
        f.extend([(0,2*row,3*row,row),(n,row+n,3*row+n,2*row+n)])
        if side==-1:f=[tuple(reversed(q))for q in f]
        mesh('curved-armor-%s-%s'%(side,band),v,f,red,.009)
box('identification-plaque',(0,-1.004,.20),(.44,.012,.16),silver,.008)

current=spec['landmarks'][1]
cylinder('dark-octagonal-base',(0,0,.16),1.37,.32,dark,8,True)
cylinder('stone-upper-plinth',(0,0,.41),1.05,.18,pale,8,True)
# Uneven silhouette: pointed upper left, sloping shoulder, right elbow, narrow ankle.
outline=[(-1.0,.5),(.80,.5),(.73,1.2),(1.06,3.1),(.74,4.7),(.67,5.13),(-.30,5.45),(-1.2,6.4),(-1.02,4.8),(-1.13,4.40),(-.89,2.0)]
center=Vector((0,3.35));n=160;v=[]
def outer_radius(dx,dz):
    best=100
    for j,a in enumerate(outline):
        b=outline[(j+1)%len(outline)];ex,ez=b[0]-a[0],b[1]-a[1];ax,az=a[0],a[1]-center.y;det=dx*(-ez)-(-ex)*dz
        if abs(det)<1e-9:continue
        t=(ax*(-ez)+ex*az)/det;s=(dx*az-ax*dz)/det
        if t>0 and 0<=s<=1:best=min(best,t)
    assert best<100;return best
for back in [-1,1]:
    for inner in [False,True]:
        for j in range(n):
            t=2*math.pi*j/n;dx,dz=math.cos(t),math.sin(t)
            radius=1/math.sqrt((dx/.64)**2+(dz/1.83)**2) if inner else outer_radius(dx,dz)
            x=dx*radius;z=center.y+dz*radius;depth=back*.18+.08*math.sin(z*.8)
            v.append((x,depth,z))
f=[]
for j in range(n):
    k=(j+1)%n;f.extend([(j,k,n+k,n+j),(2*n+j,3*n+j,3*n+k,2*n+k),(j,2*n+j,2*n+k,k),(n+j,n+k,3*n+k,3*n+j)])
mesh('asymmetric-open-frame',v,f,pale,.012)
for j,(x,z,r,mat) in enumerate([(-.91,5.85,.085,yellow),(-.78,5.42,.145,blue),(.44,4.96,.09,yellow),(.66,4.86,.065,blue),(-.93,4.51,.095,yellow),(-.91,4.13,.06,coral),(.70,3.45,.09,coral),(.37,1.25,.20,coral)]):
    depth=-.18+.08*math.sin(z*.8)
    cylinder('circular-insert-rim-%d'%j,(x,depth-.013,z),r+.032,.028,silver)
    cylinder('colored-insert-%d'%j,(x,depth-.030,z),r,.019,mat)
# Blue vertical inlay on solid lower leg, terminating at bottom of opening.
box('blue-lower-inlay',(-.18,-.175,1.0),(.042,.045,1.0),blue,.003)

current=spec['landmarks'][2]
box('monument-base',(0,0,.14),(7.6,1.1,.28),dark,.025)
# Five individually extruded glyphs with open O counters and actual side walls.
for j,letter in enumerate('KYOTO'):
    curve=bpy.data.curves.new('Original freestanding '+letter,'FONT');curve.body=letter;curve.align_x='CENTER';curve.size=2.3;curve.extrude=.18;curve.bevel_depth=.015;curve.bevel_resolution=3;curve.resolution_u=16
    o=bpy.data.objects.new('letter',curve);bpy.context.scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object
    # Font initially in XY. Map text up to local Z, extrusion depth to local Y.
    minx=min(v.co.x for v in o.data.vertices);maxx=max(v.co.x for v in o.data.vertices);miny=min(v.co.y for v in o.data.vertices);maxy=max(v.co.y for v in o.data.vertices)
    for q in o.data.vertices:
        x,y,z=q.co;q.co=((x-(minx+maxx)/2)*1.30/(maxx-minx)+(j-2)*1.45,-z,(y-miny)*1.7/(maxy-miny)+.40)
    # Mapping reflection flips the winding; repair normals before export.
    import bmesh
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    for old in list(o.data.uv_layers):o.data.uv_layers.remove(old)
    uv=o.data.uv_layers.new(name='Original seasonal artwork');uv.active_render=True
    for poly in o.data.polygons:
        for li in poly.loop_indices:
            co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=((co.x+3.65)/7.3,(co.z-.4)/1.7)
    finish(o,'letter-%d-%s'%(j,letter),season)
    box('letter-foot-%d'%j,((j-2)*1.45,0,.34),(.12,.25,.12),silver,.006)

# Keep three distinctly named layers in both blend and GLB hierarchy.
for landmark in spec['landmarks']:
    col=bpy.data.collections.new(landmark['id']);bpy.context.scene.collection.children.link(col)
    parent=bpy.data.objects.new(landmark['id'],None);col.objects.link(parent)
    for o in objects:
        if o['k028_layer']==landmark['id']:
            for c in list(o.users_collection):c.objects.unlink(o)
            col.objects.link(o);o.parent=parent
# Visible evaluated triangles, including curved gaps, are the collision proposal.
proposals=[];deps=bpy.context.evaluated_depsgraph_get();deps.update()
for o in objects:
    me=o.evaluated_get(deps).to_mesh();me.calc_loop_triangles();verts=[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)}for v in me.vertices];tris=[i for t in me.loop_triangles for i in reversed(t.vertices)]
    proposals.append({'id':o.name,'material':o['kyoto_physical'],'role':'plaza-landmark','collision':True,'appearance':o.data.materials[0].name,'vertices':verts,'triangles':tris,'layer':o['k028_layer']});o.evaluated_get(deps).to_mesh_clear()
# Support evidence is sampled against the actual source triangles, never an AABB.
anchors=[]
for landmark in spec['landmarks']:
    support=next(p for p in layout['panels'] if p['id']==landmark['support']);vs=[Vector(tuple(v[k]for k in 'xyz'))for v in support['vertices']];bvh=BVHTree.FromPolygons(vs,[support['triangles'][i:i+3]for i in range(0,len(support['triangles']),3)],all_triangles=True)
    group=[q for p in proposals if p['layer']==landmark['id'] for q in p['vertices']];bounds={k:[min(v[k]for v in group),max(v[k]for v in group)]for k in 'xyz'}
    contacts=[]
    for x in np.linspace(*bounds['x'],17):
        for z in np.linspace(*bounds['z'],11):
            hit,n,idx,d=bvh.ray_cast(Vector((x,landmark['anchor'][1]+.05,z)),Vector((0,-1,0)),.1)
            if hit is None:raise ValueError('Unsupported footprint '+landmark['id']+str((x,z)))
            contacts.append([float(x),float(hit.y),float(z),idx])
    anchors.append({**landmark,'occupiedVolume':bounds,'supportSamples':contacts,'baseGap':bounds['y'][0]-landmark['anchor'][1]})
layout['panels'].extend(proposals);layout['authoredMaterials'].extend(records)
(out/'collision-proposal.json').write_text(json.dumps({'baseLayoutSha256':hashlib.sha256(base_bytes).hexdigest(),'panels':proposals,'authoredMaterials':records},separators=(',',':'))+'\n')
(out/'station-layout.json').write_text(json.dumps(layout,separators=(',',':'))+'\n')
sha=hashlib.sha256((out/'station-layout.json').read_bytes()).hexdigest()
(out/'anchors.json').write_text(json.dumps({'coordinateSystem':'native Y up','sourceLayoutSha256':hashlib.sha256(base_bytes).hexdigest(),'candidateLayoutSha256':sha,'landmarks':anchors},indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'PlazaLandmarks.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'plaza-landmarks.glb'),export_format='GLB',export_yup=True,export_extras=True,export_animations=False)
summary={'layoutSha256':sha,'baseLayoutSha256':hashlib.sha256(base_bytes).hexdigest(),'objects':len(objects),'triangles':sum(len(p['triangles'])//3 for p in proposals),'materials':len(records),'texturePixels':w*h,'glbBytes':(out/'plaza-landmarks.glb').stat().st_size,'landmarks':[p['id']for p in spec['landmarks']]}
(out/'build.json').write_text(json.dumps(summary,indent=2)+'\n');print('K028_LAYER',json.dumps(summary),flush=True)
if a.assemble:
    # Read release source, append our layer to its scene and save only a scratch copy.
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/atrium/KyotoAtrium.blend'))
    with bpy.data.libraries.load(str(out/'PlazaLandmarks.blend'),link=False) as (src,dst):dst.collections=[n for n in src.collections if n.startswith('k028-')]
    for c in dst.collections:bpy.context.scene.collection.children.link(c)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'AssembledCandidate.blend'))
    for f in (ROOT/'runtime/textures').iterdir():
        if f.is_file() and not (out/'textures'/f.name).exists():(out/'textures'/f.name).symlink_to(f.resolve())
