"""Original K029 props. Blender 5.2.1; runtime meters X/right Y/up Z/north.
Outputs only task-local editable source, separate layers and matching collisions.
"""
import bpy, bmesh, json, math, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'.local/station-detail/candidate';OUT.mkdir(parents=True,exist_ok=True)
spec=json.loads((Path(__file__).with_name('spec.json')).read_text())
assert (ROOT/'.local/station-detail/anchors.json').exists(), 'Emit supported anchors before export'
bpy.ops.wm.read_factory_settings(use_empty=True)
materials={}
def mat(name,color,rough=.4,metal=0,alpha=1):
 m=bpy.data.materials.new('k029-'+name);m.diffuse_color=(*color,alpha);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED';m.use_transparency_overlap=False
 materials[name]=m
mat('lacquer',(.012,.018,.024),.19);mat('ivory',(.88,.87,.80),.3);mat('ebony',(.005,.006,.008),.25);mat('brass',(.5,.3,.075),.28,.75);mat('red',(.48,.008,.016),.88);mat('screen',(.7,.68,.59),.87);mat('frame',(.035,.065,.072),.32,.65);mat('glass',(.52,.73,.77),.12,.05,.13);mat('stone',(.57,.60,.60),.65);mat('window',(.045,.19,.25),.23,.35);mat('green',(.14,.28,.065),.9)
objects=[]; origin=None; layer=None
V=lambda p:(p[0],p[2],p[1])
def mesh(name,pts,faces,material,solid=True):
 full='k029-'+layer+'-'+name;data=bpy.data.meshes.new(full);data.from_pydata([V(tuple(p[i]+origin[i] for i in range(3))) for p in pts],[],faces);data.update();bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free();obj=bpy.data.objects.new(full,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[material]);obj['layer']=layer;obj['collision']=solid;objects.append(obj);return obj
faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def box(name,c,s,m,solid=True,bevel=0):
 x,y,z=c;a,b,d=[v/2 for v in s];pts=[(x-a,y-b,z-d),(x+a,y-b,z-d),(x+a,y-b,z+d),(x-a,y-b,z+d),(x-a,y+b,z-d),(x+a,y+b,z-d),(x+a,y+b,z+d),(x-a,y+b,z+d)];o=mesh(name,pts,faces,m,solid)
 if bevel:
  mod=o.modifiers.new('Edge radius','BEVEL');mod.width=bevel;mod.segments=2
 return o
def beam(name,a,b,width,m,solid=True):
 direction=Vector(b)-Vector(a);side=direction.cross(Vector((0,1,0)))
 if side.length<.0001:side=direction.cross(Vector((1,0,0)))
 side.normalize();up=side.cross(direction).normalized();pts=[Vector(p)+side*u*width/2+up*v*width/2 for p in [a,b] for u,v in [(-1,-1),(1,-1),(1,1),(-1,1)]];return mesh(name,pts,faces,m,solid)
def cylinder(name,c,r,h,m):
 pts=[(c[0]+r*math.cos(i*math.tau/12),c[1]+h*j,c[2]+r*math.sin(i*math.tau/12)) for j in [0,1] for i in range(12)];fs=[tuple(reversed(range(12))),tuple(range(12,24))]+[(i,(i+1)%12,(i+1)%12+12,i+12) for i in range(12)];return mesh(name,pts,fs,m)
def prism(name,outline,y0,y1,m):
 n=len(outline);return mesh(name,[(x,y,z)for y in [y0,y1] for x,z in outline],[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)],m)
def text(name,body,at,size,m):
 curve=bpy.data.curves.new(name,'FONT');curve.body=body;curve.size=size;curve.align_x='CENTER';curve.extrude=.0005;obj=bpy.data.objects.new('k029-'+layer+'-'+name,curve);bpy.context.collection.objects.link(obj);obj.location=V(tuple(at[i]+origin[i] for i in range(3)));obj.rotation_euler=(math.pi/2,0,math.pi);obj.data.materials.append(materials[m]);obj['layer']=layer;obj['collision']=False;bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False);objects.append(obj)
def keyboard(z,y):
 box('keybed',(0,y-.04,z),(1.46,.095,.31),'lacquer',bevel=.008)
 for i in range(52):box('white-key-%02d'%i,(-.61+i*1.22/51,y+.017,z+.018),(.0226,.024,.25),'ivory')
 # 88 notes A0 to C8: raised black keys, omitting B-C and E-F seams.
 for i in range(51):
  if i%7 in [0,2,3,5,6]:box('black-key-%02d'%i,(-.598+i*1.22/51,y+.038,z-.04),(.013,.029,.135),'ebony')
 box('felt-strip',(0,y+.012,z-.13),(1.27,.008,.012),'red')
def seat(z,base,chair):
 box('seat',(0,base+.46,z),(.55,.075,.42),'lacquer',bevel=.018)
 for x in [-.22,.22]:
  for dz in [-.16,.16]:box('seat-leg-%s-%s'%(x,dz),(x,base+.22,z+dz),(.042,.44,.042),'lacquer',bevel=.005)
 if chair:
  for x in [-.22,.22]:box('chair-back-post'+str(x),(x,base+.72,z+.16),(.045,.54,.045),'lacquer')
  box('chair-back',(0,base+.89,z+.16),(.47,.22,.035),'lacquer',bevel=.008)
for e in spec['exhibits']:
 layer=e['id'];origin=e['origin']
 if layer=='grand':
  box('red-mat',(0,.009,0),(2.5,.018,2.7),'red')
  # Straight bass rim at left, rounded tail and concave treble cheek.
  outline=[(-.75,.45),(-.75,-1.12),(-.68,-1.27),(-.51,-1.32),(-.25,-1.28),(.02,-1.15),(.26,-.96),(.39,-.75),(.43,-.48),(.47,-.23),(.60,-.04),(.75,.10),(.75,.45)]
  prism('curved-case',outline,.77,1.015,'lacquer');prism('closed-lid',outline,1.018,1.055,'lacquer')
  box('lid-hinge',(-.67,1.062,-.45),(.015,.012,1.43),'brass')
  box('fallboard',(0,.89,.44),(1.34,.19,.055),'lacquer',bevel=.008);keyboard(.62,.765)
  for x,z in [(-.64,.38),(.64,.38),(-.35,-1.08)]:
   beam('tapered-leg-%s'%x,(x,.15,z),(x,.79,z),.105,'lacquer');cylinder('caster-'+str(x),(x,.025,z),.07,.055,'frame');box('leg-ferrule-'+str(x),(x,.14,z),(.108,.06,.108),'brass')
  box('pedal-lyre',(0,.42,.25),(.065,.5,.07),'lacquer');box('pedal-rail',(0,.20,.32),(.36,.055,.13),'lacquer')
  for i in range(3):box('pedal'+str(i),((i-1)*.105,.18,.43),(.045,.022,.20),'brass',bevel=.008)
  text('maker','DIAPASON',(0,.94,.474),.040,'brass');seat(1.16,.018,True)
 elif layer=='upright':
  prism('red-platform',[(-1.1,-.7),(1.1,-.7),(1.1,.85),(.86,1.12),(-.86,1.12),(-1.1,.85)],0,.065,'red')
  box('tall-case',(0,.69,-.36),(1.5,1.23,.40),'lacquer',bevel=.012);box('top-cap',(0,1.33,-.36),(1.55,.045,.45),'lacquer',bevel=.009)
  box('upper-panel',(0,1.13,-.141),(1.35,.29,.025),'lacquer',bevel=.01);box('lower-panel',(0,.40,-.142),(1.3,.47,.025),'lacquer')
  box('fallboard',(0,.93,-.12),(1.36,.13,.08),'lacquer');keyboard(.08,.83)
  for x in [-.70,.70]:
   box('cheek'+str(x),(x,.84,.04),(.07,.14,.39),'lacquer',bevel=.012);box('front-leg'+str(x),(x,.435,.17),(.065,.74,.085),'lacquer');cylinder('foot'+str(x),(x,.065,.17),.075,.045,'frame')
  for i in range(3):box('pedal'+str(i),((i-1)*.105,.15,.04),(.045,.025,.20),'brass',bevel=.005)
  text('maker','YAMAHA',(0,.95,-.075),.038,'brass');seat(.72,.065,False)
  box('screen-back',(0,1.01,-.675),(2.22,1.89,.035),'screen')
  for x in [-1.10,1.10]:box('screen-wing'+str(x),(x,1.01,-.20),(.035,1.89,.96),'screen')
  box('sign-foot',(-1.40,.025,.28),(.40,.05,.55),'frame');box('sign-post',(-1.40,.75,.1),(.035,1.45,.035),'frame');box('sign-frame',(-1.40,1.40,.12),(.40,.68,.045),'frame');box('sign-paper',(-1.40,1.40,.148),(.36,.64,.009),'ivory')
  text('sign-title','STATION',(-1.4,1.59,.155),.043,'frame');text('sign-piano','PIANO',(-1.4,1.51,.155),.054,'frame');text('sign-status','DISPLAY',(-1.4,1.35,.155),.037,'frame')
 elif layer=='miniature':
  for x in [-2.4,-.8,.8,2.4]:
   for z in [-.5,.5]:cylinder('foot-%s-%s'%(x,z),(x,0,z),.04,.085,'frame')
  box('cabinet',(0,.345,0),(5.2,.54,1.32),'frame',bevel=.01);box('display-deck',(0,.645,0),(5.10,.06,1.24),'ivory')
  for x in [-1.95,-.65,.65,1.95]:
   box('base-panel'+str(x),(x,.34,.665),(1.28,.48,.012),'frame');cylinder('lock'+str(x),(x+.52,.49,.666),.012,.012,'brass')
  for x in [-2.57,-.86,.86,2.57]:
   for z in [-.64,.64]:box('mullion-%s-%s'%(x,z),(x,1.19,z),(.035,1.12,.035),'frame')
  for y in [.69,1.73]:
   for z in [-.64,.64]:box('rail-%s-%s'%(y,z),(0,y,z),(5.2,.04,.04),'frame')
   for x in [-2.57,2.57]:box('end-rail-%s-%s'%(y,x),(x,y,0),(.04,.04,1.32),'frame')
  for z in [-.644,.644]:box('glass-long'+str(z),(0,1.20,z),(5.10,1.02,.008),'glass')
  for x in [-2.574,2.574]:box('glass-end'+str(x),(x,1.20,0),(.008,1.02,1.24),'glass')
  box('glass-roof',(0,1.745,0),(5.14,.008,1.28),'glass')
  # Original massing, a 4.8 x 1.0 x .72 m miniature above the display deck.
  box('model-ground',(0,.693,0),(4.8,.036,1.0),'stone')
  box('hotel-east',(-1.48,1.045,-.24),(1.80,.66,.38),'stone')
  box('hotel-blue-cornice',(-1.48,1.34,-.035),(1.8,.035,.035),'window')
  for x in [-2.30,-2.08,-1.86,-1.64,-1.42,-1.20,-.98,-.76]:
   for y in [.83,.94,1.05,1.16,1.27]:box('hotel-window-%s-%s'%(x,y),(x,y,-.041),(.15,.064,.026),'window',False)
  # West stepped terraces rise away from the open central valley.
  for i in range(12):
   x=.38+i*.165;h=.085+i*.045
   box('west-terrace-%02d'%i,(x,.712+h/2,-.13),(.167,h,.69),'stone')
   box('terrace-tread-%02d'%i,(x,.718+h,.0),(.145,.016,.34),'ivory',False)
  box('west-roof-garden',(2.04,1.345,-.17),(.61,.04,.57),'green',False)
  # Central entrance portal retains a through opening.
  for x in [-.44,.25]:box('portal-pier'+str(x),(x,.91,.24),(.105,.4,.20),'stone')
  box('portal-lintel',(-.095,1.17,.24),(.795,.15,.20),'stone')
  box('skybridge',(-.04,1.33,-.29),(1.10,.045,.09),'ivory')
  # Faceted curved canopy, open below with visible structural ribs.
  for i in range(10):
   a=math.pi*i/10;b=math.pi*(i+1)/10
   pts=[(x,1.055+.20*math.sin(t),.02+.27*math.cos(t))for x,t in [(-.62,a),(.58,a),(.58,b),(-.62,b)]]
   mesh('canopy-pane'+str(i),pts,[(0,1,2,3)],'window',False)
   for x in [-.62,-.22,.18,.58]:beam('canopy-rib-%s-%s'%(i,x),(x,pts[0][1],pts[0][2]),(x,pts[2][1],pts[2][2]),.013,'ivory',False)
  for x in [-1.7,-.9,.8,1.6]:
   box('bus-shelter'+str(x),(x,.78,.4),(.49,.02,.12),'ivory',False)
   for dx in [-.2,.2]:box('shelter-post-%s-%s'%(x,dx),(x+dx,.745,.4),(.012,.08,.012),'frame',False)
  text('cabinet-title','KYOTO STATION  /  ARCHITECTURAL MINIATURE',(0,.39,.674),.095,'ivory')
# Freeze evaluated geometry once; both GLB and collision use exactly these vertices.
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();panels=[];audit=[]
for o in objects:
 evaluated=o.evaluated_get(deps);m=bpy.data.meshes.new_from_object(evaluated);o.modifiers.clear();o.data=m;m.calc_loop_triangles()
 pts=[o.matrix_world@v.co for v in m.vertices]
 if o['collision']:
  panels.append({'id':o.name,'vertices':[{'x':round(v.x,6),'y':round(v.z,6),'z':round(v.y,6)}for v in pts],'triangles':[int(i)for t in m.loop_triangles for i in reversed(t.vertices)],'material':'glass' if 'glass' in o.name else 'metal','collision':True,'role':'K029 physical exhibit','generator':'web/station/exhibits/build.py'})
 audit.append({'id':o.name,'layer':o['layer'],'solid':bool(o['collision']),'triangles':len(m.loop_triangles)})
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'StationExhibits.blend'))
(OUT/'collision-proposal.json').write_text(json.dumps({'panels':panels},separators=(',',':')))
layout=json.loads((ROOT/'runtime/station-layout.json').read_text());layout['panels'].extend(panels);(OUT/'station-layout.json').write_text(json.dumps(layout,separators=(',',':')))
sha=hashlib.sha256((OUT/'station-layout.json').read_bytes()).hexdigest()
# Material batches inside independent layers, editable source retains object IDs.
for layer in ['grand','upright','miniature']:
 selected=[o for o in bpy.context.scene.objects if o.get('layer')==layer];batches=[]
 groups=[[o for o in selected if o.data.materials[0]==material] for material in materials.values()]
 for material,group in zip(materials.values(),groups):
  if not group:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();obj=bpy.context.object;obj.name='k029-'+layer+'-'+material.name;batches.append(obj)
 bpy.ops.object.select_all(action='DESELECT')
 for o in batches:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/('k029-'+layer+'.glb')),use_selection=True,export_format='GLB',export_yup=True,export_extras=True)
receipt={'layoutSha256':sha,'sourceGeneratorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'objects':audit,'triangles':sum(x['triangles']for x in audit),'collisionPanels':len(panels),'layers':{name:{'bytes':(OUT/('k029-'+name+'.glb')).stat().st_size,'sha256':hashlib.sha256((OUT/('k029-'+name+'.glb')).read_bytes()).hexdigest()}for name in ['grand','upright','miniature']},'textureBytesAdded':0}
(OUT/'manifest.json').write_text(json.dumps(receipt,indent=2));print('K029',sha,receipt['triangles'],len(panels))
