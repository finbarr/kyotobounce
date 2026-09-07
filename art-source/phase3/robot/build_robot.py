"""Original rigid-shell robot, editable armature and starter motion clips."""
from pathlib import Path
import bpy, math, json
from mathutils import Vector, Matrix
OUT=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.render.fps=60

def material(name,color,metal=0,rough=.4,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
shell=material('Warm porcelain',(0.77,.79,.74),.28,.29)
dark=material('Graphite joints',(.028,.046,.055),.62,.34)
orange=material('Vermilion enamel',(.95,.19,.07),.25,.29)
light=material('Soft cyan display',(.18,.83,.87),.15,.3,2)
sole=material('Rubber soles',(.055,.072,.07),0,.75)
arm_data=bpy.data.armatures.new('ORI articulated rig');rig=bpy.data.objects.new('ORI',arm_data)
scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bones={}
def bone(name,head,tail,parent=None):
 b=arm_data.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=arm_data.edit_bones[parent]
 bones[name]=(Vector(head),Vector(tail));return b
bone('root',(0,0,0),(0,0,.15))
bone('hips',(0,0,.86),(0,0,1),'root')
bone('spine',(0,0,1),(0,0,1.19),'hips')
bone('chest',(0,0,1.19),(0,0,1.43),'spine')
bone('neck',(0,0,1.43),(0,0,1.50),'chest')
bone('head',(0,0,1.50),(0,0,1.72),'neck')
for sign,side in [(-1,'R'),(1,'L')]:
 def p(x,y,z):return (x*sign,y,z)
 bone('thigh.'+side,p(.115,0,.9),p(.115,-.012,.51),'hips')
 bone('shin.'+side,p(.115,-.012,.51),p(.115,0,.12),'thigh.'+side)
 bone('foot.'+side,p(.115,0,.12),p(.115,-.15,.06),'shin.'+side)
 bone('shoulder.'+side,p(.10,0,1.38),p(.245,0,1.38),'chest')
 bone('upper_arm.'+side,p(.245,0,1.38),p(.365,-.02,1.105),'shoulder.'+side)
 bone('forearm.'+side,p(.365,-.02,1.105),p(.365,-.035,.845),'upper_arm.'+side)
 bone('hand.'+side,p(.365,-.035,.845),p(.365,-.035,.735),'forearm.'+side)
 for digit,offset,length in [('index',-.027,.079),('middle',-.009,.085),('ring',.010,.078),('little',.029,.062)]:
  start=Vector(p(.365+offset,-.035,.749));parent='hand.'+side
  for i,fraction in enumerate([.43,.32,.25]):
   end=start+Vector((0,-.005,-length*fraction));name=f'{digit}{i+1}.{side}'
   bone(name,start,end,parent);parent=name;start=end
 start=Vector(p(.329,-.038,.806));parent='hand.'+side
 for i,delta in enumerate([p(-.017,-.012,-.023),p(.004,-.018,-.027),p(.013,-.005,-.018)]):
  end=start+Vector(delta);name=f'thumb{i+1}.{side}';bone(name,start,end,parent);parent=name;start=end
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
parts=[]
def skin(obj,name,mat):
 obj.name=name;obj.data.materials.append(mat)
 group=obj.vertex_groups.new(name=name.split('/')[0]);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
 parts.append(obj);return obj

def box(name,center,size,mat,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);obj=bpy.context.object;obj.scale=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=obj.modifiers.new('Rounded shell edges','BEVEL');mod.width=bevel;mod.segments=3
  bpy.ops.object.modifier_apply(modifier=mod.name)
 for face in obj.data.polygons:face.use_smooth=True
 mod=obj.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return skin(obj,name,mat)

def joint(name,center,radius,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=radius,location=center);obj=bpy.context.object
 for f in obj.data.polygons:f.use_smooth=True
 return skin(obj,name,mat)

def segment(name,start,end,width,depth,mat):
 a,b=Vector(start),Vector(end);obj=box(name,(a+b)/2,(width,depth,(b-a).length*.80),mat,min(width*.22,.025))
 obj.rotation_mode='QUATERNION';obj.rotation_quaternion=(b-a).to_track_quat('Z','Y');return obj
box('hips/body',(0,0,.925),(.285,.18,.18),dark,.035)
box('spine/waist',(0,0,1.06),(.20,.155,.14),dark,.025)
box('chest/torso',(0,-.005,1.28),(.37,.23,.33),shell,.065)
box('chest/bib',(0,-.122,1.26),(.225,.032,.16),orange,.027)
box('chest/core',(0,-.144,1.28),(.10,.011,.031),light,.01)
joint('neck/bearing',(0,0,1.469),.054,dark)
box('head/housing',(0,-.008,1.601),(.252,.22,.239),shell,.057)
box('head/visor',(0,-.117,1.605),(.211,.046,.107),dark,.025)
for x in [-.055,.055]:box('head/eye',(x,-.144,1.615),(.029,.009,.031),light,.010)
box('head/brow',(0,-.132,1.685),(.142,.018,.016),orange,.006)
for sign,side in [(-1,'R'),(1,'L')]:
 def p(x,y,z):return (x*sign,y,z)
 for part,width,depth in [('thigh',.128,.139),('shin',.115,.12),('upper_arm',.113,.116),('forearm',.097,.103)]:
  name=part+'.'+side;a,b=bones[name];segment(name+'/shell',a,b,width,depth,shell)
  joint(name+'/bearing',a,min(width,depth)*.47,dark)
 box('foot.'+side+'/shoe',p(.115,-.051,.093),(.16,.263,.133),shell,.033)
 box('foot.'+side+'/sole',p(.115,-.054,.029),(.165,.271,.049),sole,.014)
 joint('shoulder.'+side+'/cap',p(.245,0,1.38),.074,orange)
 name='hand.'+side;a,b=bones[name];segment(name+'/palm',a,b,.086,.035,shell)
 joint(name+'/wrist',a,.035,dark)
 for digit in ['index','middle','ring','little','thumb']:
  for i in range(1,4):
   name=f'{digit}{i}.{side}';a,b=bones[name]
   segment(name+'/phalange',a,b,.013 if digit!='thumb' else .017,.015,shell)
   joint(name+'/knuckle',a,.0085,dark)
# One skinned render mesh, rigid weights preserve mechanical shell shapes.
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
mesh=bpy.context.object;mesh.name='ORI body';mod=mesh.modifiers.new('Articulated bones','ARMATURE');mod.object=rig;mesh.parent=rig
rig.animation_data_create()
def arm_to(target,hand_direction,pole_direction=(-1,0,0)):
 bpy.context.view_layer.update()
 shoulder=rig.pose.bones['upper_arm.R'].head.copy();target=Vector(target)
 l1=(bones['upper_arm.R'][1]-bones['upper_arm.R'][0]).length
 l2=(bones['forearm.R'][1]-bones['forearm.R'][0]).length
 delta=target-shoulder;distance=min(delta.length,l1+l2-.003);direction=delta.normalized()
 target=shoulder+direction*distance
 along=(l1*l1-l2*l2+distance*distance)/(2*distance)
 pole=Vector(pole_direction);side=(pole-direction*pole.dot(direction)).normalized()
 elbow=shoulder+direction*along+side*math.sqrt(max(0,l1*l1-along*along))
 def align(name,a,b):
  rest=arm_data.bones[name]
  q=(rest.tail_local-rest.head_local).rotation_difference(b-a) @ rest.matrix_local.to_quaternion()
  rig.pose.bones[name].matrix=Matrix.Translation(a) @ q.to_matrix().to_4x4()
  bpy.context.view_layer.update()
 align('upper_arm.R',shoulder,elbow);align('forearm.R',elbow,target)
 align('hand.R',target,target+Vector(hand_direction).normalized()*.11)

def action(name,poses):
 a=bpy.data.actions.new(name);rig.animation_data.action=a
 for b in rig.pose.bones:b.rotation_mode='QUATERNION'
 for frame,arm_pose in poses:
  for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
  if arm_pose:arm_to(*arm_pose)
  for b in rig.pose.bones:b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
 track=rig.animation_data.nla_tracks.new();track.name=name
 track.strips.new(name,1,a);track.mute=True
 return a
hold=((-.31,-.20,1.02),(0,-1,.15),(0,1,0))
wind=((-.36,.24,1.65),(0,-.3,1))
release=((-.22,-.32,1.48),(0,-1,.20))
follow=((-.32,-.39,1.16),(0,-1,-.4))
idle=action('Idle',[(1,hold),(120,hold)])
action('Windup',[(1,hold),(72,wind)])
action('Throw',[(1,wind),(8,release),(32,follow),(60,hold)])
rig.animation_data.action=idle
scene.frame_set(1)
# Export only the avatar; research/render setup is never included.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ORI.blend'))
bpy.ops.export_scene.fbx(filepath=str(OUT/'ORI.fbx'),use_selection=True,object_types={'ARMATURE','MESH'},add_leaf_bones=False,bake_anim=True,bake_anim_use_all_actions=True,bake_anim_use_nla_strips=False,axis_forward='-Z',axis_up='Y')
(OUT/'model.json').write_text(json.dumps({'name':'ORI','author':'Original procedural Blender model for Kyoto Ricochet','boneCount':len(arm_data.bones),'vertices':len(mesh.data.vertices),'polygons':len(mesh.data.polygons),'actions':[a.name for a in bpy.data.actions],'status':'Base rig and starter clips; pose/grip review and runtime integration pending'},indent=2)+'\n')
print('KYOTO_ROBOT_BASE_READY',len(arm_data.bones),'bones',len(mesh.data.vertices),'vertices')
