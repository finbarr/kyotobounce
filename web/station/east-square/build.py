"""K027 original furniture layer. Blender 5.2.1; native coordinates in spec.json.
Writes only an isolated layer, collision proposal and assembled scratch copy.
Run: blender -b --python web/station/east-square/build.py
"""
import bpy,json,math,random,hashlib,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'.local/station-detail/candidate';OUT.mkdir(parents=True,exist_ok=True)
S=json.loads((Path(__file__).with_name('spec.json')).read_text());Y=S['floorY'];rng=random.Random(2707)
assert (ROOT/'.local/station-detail/anchors.json').exists(),'Write anchor proposal before exporting'
bpy.ops.wm.read_factory_settings(use_empty=True)
collection=bpy.data.collections.new('k027-east-square');bpy.context.scene.collection.children.link(collection)
materials={};groups={};records=[]
def mat(name,color,rough=.6,metal=0,physical='stone'):
 label='K027 '+name;m=bpy.data.materials.new(label);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 materials[name]=m;records.append({'id':'k027-'+name,'label':label,'linearColor':dict(zip('rgb',color)),'alpha':1,'roughness':rough,'metallic':metal,'physical':physical});return name
mat('pale limestone',(.66,.60,.45),.78);mat('cut stone edge',(.77,.72,.58),.65)
mat('white enamel',(.87,.88,.83),.3,.35,'metal');mat('bark',(.14,.105,.059),.95,0,'wood')
mat('support timber',(.22,.21,.12),.85,0,'wood');mat('hemp ties',(.37,.30,.18),.95,0,'wood')
mat('soil',(.085,.070,.045),1);mat('dark bronze',(.065,.075,.055),.42,.7,'metal');mat('buds',(.28,.24,.12),.9,0,'wood')
mat('lamp lens',(.39,.47,.32),.22,.3,'metal')
def mesh(name,material,verts,faces,collision=True,smooth=False):
 # Convert native to Blender and reverse handedness, matching existing exporter.
 g=groups.setdefault((name,material,collision,smooth),[[],[]]);n=len(g[0]);g[0].extend((x,z,y) for x,y,z in verts);g[1].extend(tuple(n+i for i in reversed(f)) for f in faces)
def tube(name,material,points,radii,sides=8,collision=True):
 pts=[Vector(p) for p in points];radii=[radii]*len(pts) if isinstance(radii,(int,float)) else radii
 verts=[];faces=[]
 for i,p in enumerate(pts):
  tangent=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized();ref=Vector((0,1,0)) if abs(tangent.y)<.95 else Vector((1,0,0));u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized()
  for j in range(sides):
   a=j*math.tau/sides;r=radii[i]*(1+.05*math.sin(j*5+i*.8) if material=='bark' else 1);verts.append(tuple(p+r*(math.cos(a)*u+math.sin(a)*v)))
 for i in range(len(pts)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]);mesh(name,material,verts,faces,collision,True)
def box(name,material,c,size,angle=0):
 a=math.radians(angle);verts=[]
 for xx,yy,zz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
  x=xx*size[0]/2;z=zz*size[2]/2;verts.append((c[0]+x*math.cos(a)-z*math.sin(a),c[1]+yy*size[1]/2,c[2]+x*math.sin(a)+z*math.cos(a)))
 mesh(name,material,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)])
# Three shallow, continuous limestone tiers with real chamfered nosings.
for s in S['seats']:
 a=math.radians(s['rotation']);name='k027-seat-'+s['id']
 def seatpos(u,h,w):return (s['x']+u*math.cos(a)-w*math.sin(a),Y+h,s['z']+u*math.sin(a)+w*math.cos(a))
 for tier in range(3):
  depth=s['depth']-tier*.4;z=tier*.2;h=(tier+1)*.18
  # Blocks abut without horizontal ledges hidden beneath visible caps.
  box(name,'pale limestone',seatpos(0,tier*.18+.075,z),(s['length'],.15,depth),s['rotation'])
  # Individual 1.15m dressed cap stones with 3mm real joints.
  n=round(s['length']/1.15)
  for i in range(n):box(name+'-caps','cut stone edge',seatpos((i+.5)*s['length']/n-s['length']/2,h-.015,z),(s['length']/n-.003,.03,depth+.015),s['rotation'])
# Central tree: asymmetric root flare, winding trunk, tapering leaders and twigs.
t=S['tree'];cx,cz=t['x'],t['z']
def local(x,y,z):return (cx+x,Y+y,cz+z)
trunk=[local(0,.035,0),local(-.08,.45,.03),local(.04,1.1,-.08),local(-.08,1.75,-.09),local(.13,2.45,.02),local(.06,3.15,.15),local(.23,4,.12),local(.19,4.65,.23)]
tube('k027-tree-trunk','bark',trunk,[.27,.22,.18,.15,.115,.084,.048,.012],12)
for i in range(7):
 a=i*math.tau/7;tube('k027-tree-roots','bark',[local(.62*math.cos(a),.025,.62*math.sin(a)),local(.3*math.cos(a),.12,.3*math.sin(a)),trunk[1]],[.018,.085,.12],8)
ends=[]
def branch(start,direction,length,radius,depth):
 d=Vector(direction).normalized();p=Vector(start);bend=Vector((rng.uniform(-.2,.2),rng.uniform(.08,.24),rng.uniform(-.2,.2)))
 points=[tuple(p),tuple(p+d*length*.48+bend*.3),tuple(p+d*length+bend)]
 tube('k027-tree-branches' if depth>1 else 'k027-tree-twigs','bark',points,[radius,radius*.6,radius*.23],8 if depth>1 else 5,collision=depth>1)
 end=Vector(points[-1]);ends.append(end)
 if depth:
  for j in range(2 if depth<3 else 3):
   direction=d+Vector((rng.uniform(-.75,.75),rng.uniform(-.05,.4),rng.uniform(-.75,.75)))
   branch(end,direction,length*rng.uniform(.53,.69),radius*.49,depth-1)
for i in range(9):
 a=i*2.39996;h=1.5+i*.29;branch(local(.025,h,0),(math.cos(a)*.8,.75,math.sin(a)*.8),1.1+(i%3)*.12,.085-i*.005,3)
# A few small retained leaves / buds; never a solid canopy or collision fill.
for p in ends[::3]:
 u=Vector((.035,.065,.008));v=Vector((.012,0,.023));mesh('k027-tree-buds','buds',[tuple(p-u),tuple(p+v),tuple(p+u),tuple(p-v)],[(0,1,2),(0,2,3)],False)
# Flush root well, slim bronze perimeter and timber braces with shoes and lashings.
tube('k027-root-well','soil',[local(0,.002,0),local(0,.018,0)],.76,48)
tube('k027-root-edging','dark bronze',[local(.79*math.cos(i*math.tau/64),.022,.79*math.sin(i*math.tau/64)) for i in range(65)],.022,6)
for i in range(4):
 a=i*math.pi/2+.45;foot=local(1.35*math.cos(a),.06,1.35*math.sin(a));head=local(.27*math.cos(a),2.25,.27*math.sin(a))
 tube('k027-tree-stakes','support timber',[foot,head],[.072,.060],10)
 box('k027-tree-shoes','dark bronze',(foot[0],Y+.035,foot[2]),(.21,.07,.21))
 for sign in [-1,1]:tube('k027-tree-bolts','dark bronze',[(foot[0]+sign*.075,Y+.07,foot[2]),(foot[0]+sign*.075,Y+.09,foot[2])],.016,6)
 # Four-strand visible rope wraps around each brace and knot tails.
 tangent=(Vector(head)-Vector(foot)).normalized();u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u);center=Vector(head)-tangent*.21
 pts=[tuple(center+tangent*(j/95-.5)*.15+.079*(u*math.cos(j/95*math.tau*4)+v*math.sin(j/95*math.tau*4))) for j in range(96)]
 tube('k027-tree-lashings','hemp ties',pts,.011,5)
 tube('k027-tree-lashings','hemp ties',[tuple(center),local(.1,2.1,.05),local(.16,1.85,.02)],.014,6)
 # Low uplight housings; geometry only, no new realtime lights.
 fx,fz=cx+1.63*math.cos(a+.25),cz+1.63*math.sin(a+.25)
 box('k027-ground-fittings','dark bronze',(fx,Y+.035,fz),(.18,.07,.22))
 tube('k027-ground-lights','dark bronze',[(fx,Y+.10,fz),(fx-.045*math.cos(a),Y+.26,fz-.045*math.sin(a))],.08,10)
 tube('k027-ground-lenses','lamp lens',[(fx-.045*math.cos(a),Y+.26,fz-.045*math.sin(a)),(fx-.047*math.cos(a),Y+.268,fz-.047*math.sin(a))],.065,10)
# Spherical openwork gazebo. Lower arcs leave opposite 1.35m minimum foot-level door openings.
g=S['gazebo'];gx,gz,r=g['x'],g['z'],g['radius'];bottom=math.asin(-.8)
def globe(a,l):return (gx+r*math.cos(l)*math.cos(a),Y+1.72+2.15*math.sin(l),gz+r*math.cos(l)*math.sin(a))
for i in range(16):
 a=i*math.tau/16;door=abs(math.cos(a))<.42
 lo=bottom
 if door:
  low,high=.20,.36
  for _ in range(32):
   mid=(low+high)/2;x=r*math.cos(mid)*math.cos(a)
   arch=2.15+.30*math.sqrt(max(0,1-(x/.75)**2))
   if 1.72+2.15*math.sin(mid)<arch:low=mid
   else:high=mid
  lo=(low+high)/2
 pts=[globe(a,lo+(math.pi/2-lo)*j/40) for j in range(41)]
 tube('k027-gazebo-ribs','white enamel',pts,g['ribRadius'],8)
 if not door:
  p=pts[0];box('k027-gazebo-feet','dark bronze',(p[0],Y+.018,p[2]),(.15,.036,.15))
for l in [-.45,.10,.40,.60,1.0]:
 # Split interrupted lower hoops; no doorway-spanning invisible faces.
 for half in range(2):
  gap=math.asin(.75/(r*math.cos(l))) if 1.72+2.15*math.sin(l)<2.45 else 0
  start=-math.pi/2+gap+half*math.pi;end=math.pi/2-gap+half*math.pi
  tube('k027-gazebo-hoops','white enamel',[globe(start+(end-start)*j/48,l) for j in range(49)],.023,6)
for i in range(8):
 a=i*math.tau/8
 tube('k027-gazebo-crown','white enamel',[globe(a+.8*math.sin(j/40*math.pi),.40+j/40*(math.pi/2-.40)) for j in range(41)],.019,6)
# Continuous arched portal trims join the clipped hoops and meridian ends.
# Constant 1.50m centreline width keeps 1.35m clear at the existing foot pads.
def portal(x,h,sign):
 lat=math.asin((h-1.72)/2.15);z=sign*math.sqrt(max(0,(r*math.cos(lat))**2-x*x))
 return (gx+x,Y+h,gz+z)
for sign in [-1,1]:
 points=[portal(-.75,j/24*2.15,sign) for j in range(25)]
 points += [portal(-.75*math.cos(j/32*math.pi),2.15+.30*math.sin(j/32*math.pi),sign) for j in range(1,33)]
 points += [portal(.75,2.15*(1-j/24),sign) for j in range(1,25)]
 tube('k027-gazebo-portals','white enamel',points,.036,8)
# Scrolled leaf tracery in side bays, leaving door sectors untouched.
for side in [0,math.pi]:
 for sign in [-1,1]:
  pts=[]
  for j in range(49):
   t=j/48*math.tau*1.15;rad=.31*(1-j/60);a=side+sign*.38+rad*math.cos(t);l=.12+rad*math.sin(t);pts.append(globe(a,l))
  tube('k027-gazebo-scrolls','white enamel',pts,.019,6)
# Make compact semantic objects. Every substantial mesh becomes exact native triangles.
proposal=[];cost=[]
for (name,material,collision,smooth),(verts,faces) in groups.items():
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();obj=bpy.data.objects.new(name,m);collection.objects.link(obj);m.materials.append(materials[material]);obj['k027_collision']=collision;obj['k027_reference']=S['reference']
 for p in m.polygons:p.use_smooth=smooth
 if 'seat' in name:
  bpy.context.view_layer.objects.active=obj;obj.select_set(True);bevel=obj.modifiers.new('2mm dressed arris','BEVEL');bevel.width=.002;bevel.segments=1;bpy.ops.object.modifier_apply(modifier=bevel.name);obj.select_set(False);m=obj.data
 m.calc_loop_triangles();native=[{'x':round(v.co.x,6),'y':round(v.co.z,6),'z':round(v.co.y,6)} for v in m.vertices];tri=[j for p in m.loop_triangles for j in reversed(p.vertices)]
 if collision:proposal.append({'id':name,'vertices':native,'triangles':tri,'material':next(r['physical'] for r in records if r['label']==materials[material].name),'role':'furniture','collision':True,'appearance':'k027-'+material})
 cost.append({'id':name,'triangles':len(tri)//3,'collision':collision,'min':[min(p[k] for p in native) for k in ['x','y','z']],'max':[max(p[k] for p in native) for k in ['x','y','z']]})
assert sum(c['triangles'] for c in cost)<=S['budget']['triangles']
(OUT/'collision-proposal.json').write_text(json.dumps({'task':'K027','panels':proposal,'authoredMaterials':records},separators=(',',':')))
(OUT/'geometry.json').write_text(json.dumps({'objects':cost,'triangles':sum(c['triangles'] for c in cost),'newTextureBytes':0,'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'spec':S},indent=2))
anchors=ROOT/'.local/station-detail/anchors.json';anchor_data=json.loads(anchors.read_text());anchor_data['meshOccupied']=cost;anchors.write_text(json.dumps(anchor_data,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'east-square.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'east-square.glb'),export_format='GLB',use_active_scene=True,export_yup=True,export_animations=False,export_extras=True)
# Assemble in memory from the release file, then save a COPY. Never save original.
if '--layer-only' not in sys.argv:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/atrium/KyotoAtrium.blend'))
 with bpy.data.libraries.load(str(OUT/'east-square.blend'),link=False) as (src,dst):dst.collections=['k027-east-square']
 for c in dst.collections:bpy.context.scene.collection.children.link(c)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'assembled.blend'))
 layout=json.loads((ROOT/'runtime/station-layout.json').read_text());layout['panels'].extend(proposal);layout['authoredMaterials'].extend(records)
 (OUT/'station-layout.json').write_text(json.dumps(layout,separators=(',',':')))
 texture=OUT/'textures'
 if not texture.exists():texture.symlink_to(ROOT/'runtime/textures',target_is_directory=True)
 print('K027_READY',len(cost),'objects',sum(c['triangles'] for c in cost),'triangles',flush=True)
