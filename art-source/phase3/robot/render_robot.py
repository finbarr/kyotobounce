from pathlib import Path
import os
import bpy
from mathutils import Vector
root=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(root/'ORI.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True
s.render.threads_mode='FIXED';s.render.threads=2
s.render.resolution_x=720;s.render.resolution_y=900;s.render.resolution_percentage=100
s.world=bpy.data.worlds.new('Studio world');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.06,.085,.105,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,pos,energy,size in [('Key',(2,-3,4),350,3),('Fill',(-3,-1,2),250,3),('Rim',(0,2,3),450,2)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
 o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Preview');cam=bpy.data.objects.new('Preview',data);s.collection.objects.link(cam);cam.location=(2.7,-5,2.5);cam.rotation_euler=(Vector((0,0,.88))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=2.13;s.camera=cam
pose=os.environ.get('KYOTO_ROBOT_POSE','Idle')
rig=bpy.data.objects['ORI'];rig.animation_data.action=bpy.data.actions[pose];s.frame_set(72 if pose=='Windup' else 8 if pose=='Throw' else 1)
s.view_settings.view_transform='AgX';s.render.filepath=str(root/('ORI-preview.png' if pose=='Idle' else 'ORI-'+pose+'.png'));bpy.ops.render.render(write_still=True)
