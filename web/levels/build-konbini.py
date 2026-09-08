"""Standalone source: blender -b --python web/levels/build-konbini.py -- --output .local/konbini/v1
No base Blender source is opened or edited. Native metres are x east, y up, z north.
Every blocking mesh comes from exactly the box record exported alongside the GLB.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser();p.add_argument('--registration',type=Path,default=Path(__file__).with_name('konbini-registration.json'));p.add_argument('--output',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);cfg=json.loads(a.registration.read_text());out=a.output.resolve()
if out.exists():raise FileExistsError('Use a fresh candidate output directory')
out.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
root=bpy.context.scene;root.name='West Exit Heart-in candidate'
angle=math.radians(cfg['inwardYaw']);right=(math.cos(angle),-math.sin(angle));forward=(math.sin(angle),math.cos(angle));origin=cfg['threshold']
def position(u,y,v):return dict(x=origin['x']+right[0]*u+forward[0]*v,y=origin['y']+y,z=origin['z']+right[1]*u+forward[1]*v)
def mat(name,color,metal=0,rough=.5,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if emission:n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emission
 return m
materials={'stone':mat('K025 warm ivory tile',(.58,.54,.46)), 'wall':mat('K025 warm interior panels',(.72,.70,.64)), 'frame':mat('Brushed metal frames',(.29,.31,.31),.8,.3), 'glass':mat('Shop window glazing',(.11,.18,.17),.3,.15), 'green':mat('Green sign band',(.015,.32,.13),emission=.35), 'orange':mat('Orange sign band',(.9,.28,.025),emission=.35), 'red':mat('Red sign band',(.62,.025,.025),emission=.35), 'mat':mat('Receiving mat adaptation',(.16,.23,.2)), 'sign':mat('Ivory signage',(.9,.86,.7),emission=.3)}
# Windows remain visibly distinct and solid, with translucent GLB glazing.
materials['glass'].node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.32
materials['glass'].diffuse_color=(.11,.18,.17,.32)
materials['glass'].surface_render_method='DITHERED'
boxes=[];decor=[]
def box(name,u,y,v,w,h,d,material,physical='stone',collision=True):
 rec=dict(id='konbini-'+name,center=position(u,y,v),size=dict(x=w,y=h,z=d),yaw=cfg['inwardYaw'],material=physical,role='shop receiving interior' if name=='floor' else 'shop boundary',collision=collision)
 if collision:boxes.append(rec)
 else:decor.append(rec)
 c=rec['center'];bpy.ops.mesh.primitive_cube_add(size=1,location=(c['x'],c['z'],c['y']));o=bpy.context.object;o.name=rec['id'];o.dimensions=(w,d,h);o.rotation_euler.z=-angle;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[material]);o['kyoto_candidate_record']=json.dumps(rec);o['kyoto_physical']=physical if collision else '';o['adaptation']=cfg['evidence']['adaptation'];return o
w,d,h,t=map(cfg.get,['width','depth','height','wallThickness']);dw,dh=cfg['doorWidth'],cfg['doorHeight']
assert dw>.0464 and dh>.0464 and cfg['matRadius']*2<min(w,d)
box('floor',0,-t/2,d/2,w,t,d,'stone')
box('back',0,h/2,d+t/2,w+2*t,h,t,'wall')
for side in [-1,1]:
 box('side-'+str(side),side*(w+t)/2,h/2,d/2,t,h,d,'wall')
 # Visible closed side panes frame the open center; no glass collider spans doorway.
 panel=(w-dw)/2
 box('front-pane-'+str(side),side*(dw/2+panel/2),dh/2,0,panel,dh,t,'glass','glass')
 box('door-jamb-'+str(side),side*(dw/2+.04),dh/2,-.025,.08,dh,t+.05,'frame','steel')
box('front-header',0,(h+dh)/2,0,w,h-dh,t,'frame','steel')
box('ceiling',0,h+t/2,d/2,w,t,d,'wall')
# Original authored fixtures and identity; no downloaded textures.
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'station/heart-in'))
from fixtures import furnish
furnish(box,mat,materials,position,angle,cfg)
box('receiving-mat',0,.0015,cfg['matDepth'],2*cfg['matRadius'],.003,2*cfg['matRadius'],'mat',collision=False)
# Local audit camera only, excluded from browser export.
from mathutils import Vector
q=position(6,4,-9);bpy.ops.object.camera_add(location=(q['x'],q['z'],q['y']));cam=bpy.context.object;target=position(0,1.2,1.8);cam.rotation_euler=(Vector((target['x'],target['z'],target['y']))-cam.location).to_track_quat('-Z','Y').to_euler();root.camera=cam
root.render.engine='BLENDER_WORKBENCH';root.display.shading.light='STUDIO';root.display.shading.color_type='MATERIAL';root.display.shading.show_shadows=True;root.render.resolution_x=1100;root.render.resolution_y=800;root.render.resolution_percentage=100;root.render.filepath=str(out/'candidate.png')
root.world=bpy.data.worlds.new('Candidate world');root.world.color=(.3,.3,.3)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'WestExitHeartIn.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'konbini.glb'),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
mat_center=position(0,0,cfg['matDepth']);records=dict(registration=cfg,boxes=boxes,decorativeOnly=decor,destination=dict(center=mat_center,radius=cfg['matRadius'],surface='konbini-floor'),doorway=dict(threshold=origin,inwardYaw=cfg['inwardYaw'],clearWidth=dw,clearHeight=dh),coordinateMapping='Unity (x,y,z) -> Three (x,y,-z)')
(out/'colliders.json').write_text(json.dumps(records,indent=2)+'\n')
bpy.ops.render.render(write_still=True)
checksums={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file()}
(out/'checksums.json').write_text(json.dumps(checksums,indent=2)+'\n');print(json.dumps(checksums))
