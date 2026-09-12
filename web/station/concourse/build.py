"""Append the ground-floor concourse layer to the reviewed assets-v3 source.
Original geometry; dimensions and placement interpret the reference register.
All accessible protruding fixtures have matching native boxes. Shop dressing
behind retained solid glazing does not introduce inaccessible collision bodies.
"""
import argparse,copy,hashlib,json,math,shutil,sys
from pathlib import Path
import bpy
ROOT=Path(__file__).resolve().parents[3]
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--baseline',type=Path)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
base=a.baseline/'station-layout.json' if a.baseline else ROOT/'runtime/station-layout.json';sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
assert sha(base)=='485daa6d8189436f526f6f89e7b82818ff3171de92f45ac40bf65da5e2419b2d'
layout=json.loads(base.read_text());baseline=copy.deepcopy(layout)
bpy.ops.wm.open_mainfile(filepath=str(a.baseline/'KyotoAtrium.blend' if a.baseline else ROOT/'art-source/atrium/KyotoAtrium.blend'))
# Original service glyphs are superseded by the registered bilingual artwork.
# Hide only these non-colliding text meshes; retain their historical seed records.
for office in ['tickets','information']:
 for suffix in ['title','subtitle']:bpy.data.objects[f'central-hall-{office}-{suffix}'].hide_render=True
collection=bpy.data.collections.new('Ground floor concourse / September 2026');bpy.context.scene.collection.children.link(collection)
materials={};added=[];labels=[];solids=[]
def mat(name,color,rough=.5,metal=0,emission=0):
 name='concourse-'+name;m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
 rgb=tuple(((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in color)
 n.inputs['Base Color'].default_value=(*rgb,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
 n.inputs['Emission Color'].default_value=(*rgb,1);n.inputs['Emission Strength'].default_value=emission
 layout['authoredMaterials'].append(dict(id=name,label=name,physical='metal' if metal else 'stone',linearColor=dict(zip('rgba',(*rgb,1))),roughness=rough,metallic=metal,alpha=1,emission=emission,emissionColor=dict(zip('rgb',rgb))))
 materials[name[10:]]=m;return m
for spec in [('graphite',(.11,.13,.14),.36,.55),('steel',(.57,.61,.61),.3,.8),('ivory',(.86,.85,.80),.42,.15),('wood',(.43,.25,.12),.66,0),('oak',(.67,.45,.24),.62,0),('red',(.73,.12,.10),.34,.1),('blue',(.06,.29,.52),.38,.15),('green',(.13,.39,.29),.38,.1),('amber',(.78,.44,.10),.23,.2),('glass-dark',(.08,.18,.18),.12,.45),('paper',(.92,.89,.80),.9,0),('warm-light',(1,.78,.48),.65,0,1.5),('white-light',(.88,.96,1),.5,0,1.2)]:mat(*spec)
faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
def box(name,c,s,material='graphite',collision=False,role='interior display behind retained glazing'):
 name='concourse-'+name
 # Build in native x,y,z then convert to Blender x,z,y; reverse winding.
 v=[(c[0]+dx*s[0]/2,c[2]+dz*s[2]/2,c[1]+dy*s[1]/2) for dx in [-1,1] for dy in [-1,1] for dz in [-1,1]]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],[tuple(reversed(f)) for f in faces]);mesh.update()
 obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj);mesh.materials.append(materials[material])
 obj['kyoto_surface']=name;obj['kyoto_collision']=collision;obj['kyoto_physical']='metal' if material in ['steel','graphite'] else 'stone';obj['kyoto_role']=role
 added.append(obj)
 if collision:
  r=dict(id=name,center=dict(zip('xyz',c)),size=dict(zip('xyz',s)),yaw=0,material=obj['kyoto_physical'],collision=True,role=role)
  layout['boxes'].append(r);solids.append(r)
 return obj

def label(name,c,w,h,kind,ja='',en='',face='north',accent='#d4ae65',**extra):
 # A face lies 8 mm in front of its registered support, with no new silhouette.
 d=dict(id='concourse-'+name,center=list(c),width=w,height=h,face=face,kind=kind,ja=ja,en=en,accent=accent,**extra);labels.append(d)

def panel(name,c,w,h,kind,ja='',en='',face='north',accent='#d4ae65',**extra):
 depth=.045;size=(w,h,depth) if face in ['north','south'] else (depth,h,w)
 box(name,c,size,'graphite',True,'mounted sign or service panel')
 p=list(c);axis=2 if face in ['north','south'] else 0;p[axis]+=(1 if face in ['north','east'] else -1)*(depth/2+.008)
 label(name,p,w-.025,h-.025,kind,ja,en,face,accent,**extra)

# East ground-floor north frontage: current operator map identifies the bar at
# the western end of the east district, with 7 Taps farther east.
for i,x in enumerate([34.375,39.125,43.875,48.625]):
 name='osake' if i==0 else '7taps'
 label('shop-header-'+str(i),(x,2.548,-1.837),3.74,.204,'shop','お酒の美術館' if i==0 else '7 TAPS TAVERN','KYOTO CENTRAL GATE' if i==0 else 'PUB & GRILL',accent='#e4c06f' if i==0 else '#c7c4a2')
 # Warm dark interiors, shelves, real silhouettes seen through the existing panes.
 box('shop-back-'+str(i),(x,1.25,-3.96),(4.56,2.5,.08),'wood')
 box('shop-ceiling-'+str(i),(x,2.33,-2.96),(4.55,.10,1.98),'graphite')
 for j in [-1,1]:box(f'shop-cove-{i}-{j}',(x+j*1.10,2.265,-2.8),(.78,.035,.11),'warm-light')
 for row in range(3):
  y=.85+row*.43;box(f'shelf-{i}-{row}',(x,y,-3.65),(3.8,.055,.30),'oak')
  for col in range(15):
   bx=x-1.68+col*.24;bh=.22+(col%3)*.04;material=['amber','green','ivory','red'][col%4]
   box(f'bottle-{i}-{row}-{col}',(bx,y+bh/2+.03,-3.63),(.105,bh,.105),material)
   box(f'bottle-neck-{i}-{row}-{col}',(bx,y+bh+.065,-3.63),(.048,.07,.05),'graphite')
   box(f'bottle-label-{i}-{row}-{col}',(bx,y+bh*.6,-3.571),(.083,.09,.01),'paper')
 box('shop-counter-'+str(i),(x,1.00,-2.7),(3.9,.10,.6),'oak')
 box('shop-counter-base-'+str(i),(x,.48,-2.94),(3.9,.96,.18),'wood')
 for j in range(5):
  sx=x-1.5+j*.75;box(f'stool-seat-{i}-{j}',(sx,.61,-2.10),(.35,.085,.32),'wood')
  for dx in [-.12,.12]:box(f'stool-leg-{i}-{j}-{dx}',(sx+dx,.30,-2.10),(.035,.60,.035),'graphite')
 # Typography and menus sit behind glazing, on the back wall.
 label('inside-menu-'+str(i),(x,1.9,-3.909),2.9,.42,'menu','WHISKY  ·  HIGHBALL' if i==0 else 'CRAFT BEER  ·  KYOTO GRILL','SEASONAL SELECTION',accent='#e1bf79')
# North shop window graphics and menus: surface artwork attached to glass.
for i,x in enumerate([34.375,39.125,43.875,48.625]):
 panel('shop-menu-'+str(i),(x-1.40,1.13,-1.83),.46,.68,'menu','本日のおすすめ','TODAY’S SELECTION',accent='#bd7047')
 label('window-hours-'+str(i),(x+.9,1.05,-1.82),.85,.34,'hours','ようこそ','WELCOME / 京都',accent='#d8d1b9')
# Glazed west returns get visible dining silhouettes and a backed menu panel.
for i,z in enumerate([-19.006,-14.119,-9.231,-4.344]):
 box('return-back-'+str(i),(34.55,1.15,z),(.09,2.3,4.4),'wood')
 for j in [-1,1]:
  pz=z+j*1.10
  box(f'table-{i}-{j}',(33.20,.74,pz),(1.05,.08,.68),'oak')
  box(f'table-leg-{i}-{j}',(33.20,.36,pz),(.065,.72,.065),'steel')
  for dx in [-.64,.64]:
   box(f'chair-{i}-{j}-{dx}',(33.2+dx,.44,pz),(.34,.07,.38),'wood')
   box(f'chair-back-{i}-{j}-{dx}',(33.2+dx,.69,pz-.15),(.34,.52,.055),'wood')
  box(f'table-card-{i}-{j}',(33.2,.88,pz),(.12,.2,.015),'paper')
 panel('return-menu-'+str(i),(31.89,1.24,z),.70,1.0,'poster','京都駅ビル','DINING · CULTURE · KYOTO','west',index=i)
# Ticketing and information: populate existing public-facing service bays.
label('tickets-header',(21.75,3.84,-28.186),6.40,.42,'service','きっぷうりば','TICKETS',accent='#5fa37f')
label('information-header',(-4.75,3.84,-28.186),6.40,.42,'service','ご案内','INFORMATION',accent='#5f97b3')
for i,x in enumerate([19.3,20.9,22.5,24.1]):
 box('ticket-machine-'+str(i),(x,.88,-27.43),(.80,1.76,.70),'steel',True,'ticket vending machine')
 panel('ticket-face-'+str(i),(x,1.02,-27.054),.72,1.38,'ticket','きっぷ','TICKETS',accent='#5f9975',index=i+1)
 box('ticket-canopy-'+str(i),(x,1.80,-27.42),(.84,.08,.76),'green',True,'ticket machine canopy')
# Information window desks, monitors, brochures stay behind retained glass.
for i,x in enumerate([-7.18,-5.56,-3.94,-2.32]):
 box('info-monitor-'+str(i),(x,1.42,-28.58),(.48,.32,.07),'graphite')
 box('info-desk-'+str(i),(x,.95,-28.65),(1.45,.06,.48),'oak')
 label('info-screen-'+str(i),(x,1.42,-28.535),.43,.27,'map','京都','KYOTO',index=i)
 panel('information-notice-'+str(i),(x,2.25,-28.32),.68,.86,'poster','京都の旅','VISITOR INFORMATION',index=i+4)
# West concourse vending alcove against the existing closed lower cafe volume.
for i,x in enumerate([-43.15,-41.90,-40.65]):
 box('drink-machine-'+str(i),(x,1.0,-15.78),(1.13,2,.82),['ivory','blue','red'][i],True,'drink vending machine')
 panel('drink-face-'+str(i),(x,1.07,-15.338),1.01,1.70,'vending','つめたい','COLD DRINKS',accent=['#588b9e','#327bbb','#b72f2b'][i],index=i)
 box('drink-base-'+str(i),(x,.08,-15.74),(1.16,.16,.85),'graphite',True,'vending plinth')
# Two recycling units, a bank of lockers and a floor directory occupy the same
# service edge, leaving the central walking/tactile routes clear.
for i,x in enumerate([-38.9,-38.2]):
 box('recycling-'+str(i),(x,.52,-15.87),(.58,1.04,.55),'steel',True,'recycling bin')
 panel('recycling-label-'+str(i),(x,.73,-15.565),.5,.34,'recycle','びん・缶' if i==0 else 'ペットボトル','BOTTLES / CANS' if i==0 else 'PET BOTTLES',accent='#6597a0')
for col in range(5):
 x=-35.7+col*.50
 box('locker-column-'+str(col),(x,1,-15.86),(.48,2,.58),'steel',True,'coin locker bank')
 for row in range(3):label(f'locker-{col}-{row}',(x,.38+row*.63,-15.562),.46,.60,'locker','',f'{101+col*3+row}',index=col*3+row)
panel('locker-header',(-34.7,2.20,-15.98),2.48,.30,'service','コインロッカー','COIN LOCKERS',accent='#7796ae')
panel('west-directory',(-30.45,1.53,-16.14),1.75,2.1,'directory','京都駅ビル','FLOOR GUIDE',accent='#688d8e')
# Mundane station infrastructure at supported ground-level walls: clock, fire
# cabinets, AED information, framed posters, no floating ornaments/lights.
panel('hall-clock',(8.5,6.39,-27.03),.78,.78,'clock')
for i,(x,z) in enumerate([(-28.8,-16.14),(24.74,-28.3)]):
 panel('fire-'+str(i),(x,.67,z),.45,1.12,'fire','消火器','FIRE',accent='#bc332a')
 panel('aed-'+str(i),(x,1.69,z),.40,.32,'service','AED','',accent='#5b987a')
for i,x in enumerate([-36.0,-33.0,-30.0]):
 # Registered cafe volume north face at z=-16.2; high mounted advertising.
 panel('west-poster-'+str(i),(x,4.1,-16.18),1.15,1.65,'poster','京都','KYOTO STATION',index=i+8)

# Replace enclosed display bottle boxes with smooth twelve-sided bodies.
for obj in added:
 if obj.name.startswith(('concourse-bottle-','concourse-bottle-neck-')) and not obj.name.startswith('concourse-bottle-label-'):
  points=[v.co for v in obj.data.vertices];lo=[min(v[k] for v in points) for k in range(3)];hi=[max(v[k] for v in points) for k in range(3)];c=[(a+b)/2 for a,b in zip(lo,hi)];rx=(hi[0]-lo[0])/2;ry=(hi[1]-lo[1])/2
  verts=[(c[0]+rx*math.cos(i*math.tau/12),c[1]+ry*math.sin(i*math.tau/12),z) for z in [lo[2],hi[2]] for i in range(12)]
  fs=[tuple(reversed(range(12))),tuple(range(12,24))]+[(i,(i+1)%12,(i+1)%12+12,i+12) for i in range(12)]
  mesh=bpy.data.meshes.new(obj.name+' round');mesh.from_pydata(verts,[],fs);mesh.update();mesh.materials.append(obj.data.materials[0]);obj.data=mesh
  for f in mesh.polygons:f.use_smooth=len(f.vertices)==4
 if any(obj.name.startswith('concourse-'+prefix) for prefix in ['drink-machine','ticket-machine','recycling-','locker-column']):
  bevel=obj.modifiers.new('Folded metal edge','BEVEL');bevel.width=.008;bevel.segments=2

layout['concourseDetails']={'version':1,'checked':'2026-09-12','labels':labels,'source':'web/station/concourse/README.md'}
for key in ['boxes','panels','beams']:
 assert layout[key][:len(baseline[key])]==baseline[key],key
bpy.context.view_layer.update()
for r in solids:
 o=bpy.data.objects[r['id']];vs=[o.matrix_world@v.co for v in o.data.vertices]
 actual=[[min(v[k] for v in vs),max(v[k] for v in vs)] for k in [0,2,1]]
 for axis,k in enumerate('xyz'):
  assert abs(actual[axis][0]-(r['center'][k]-r['size'][k]/2))<1e-4,r['id']
  assert abs(actual[axis][1]-(r['center'][k]+r['size'][k]/2))<1e-4,r['id']
raw=json.dumps(layout,separators=(',',':'))+'\n';(out/'station-layout.json').write_text(raw)
seed=bpy.data.texts.get('Kyoto runtime seed.json');bpy.data.texts.remove(seed)
seed=bpy.data.texts.load(str(out/'station-layout.json'),internal=True);seed.name='Kyoto runtime seed.json';assert seed.as_string()==raw
shutil.copytree(ROOT/'runtime/textures',out/'textures')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'KyotoAtrium.blend'))
triangle_count=0;deps=bpy.context.evaluated_depsgraph_get()
for obj in added:
 evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();triangle_count+=len(mesh.loop_triangles);evaluated.to_mesh_clear()
receipt=dict(baseLayoutSha256=sha(base),layoutSha256=sha(out/'station-layout.json'),sourceSha256=sha(out/'KyotoAtrium.blend'),objects=len(added),triangles=triangle_count,labels=len(labels),solidFixtures=solids,baselineRecordsUnchanged=True)
(out/'concourse.json').write_text(json.dumps(receipt,indent=2)+'\n');print('CONCOURSE_READY',receipt['layoutSha256'],len(added),'objects',len(solids),'solids',len(labels),'artwork faces',flush=True)
