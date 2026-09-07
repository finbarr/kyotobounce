from pathlib import Path
import bpy
root=Path(__file__).resolve().parents[3]
bpy.ops.wm.open_mainfile(filepath=str(root/'art-source/phase3/robot/ORI.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type in {'MESH','ARMATURE'}:
        obj.select_set(True)
        if obj.type=='ARMATURE':
            bpy.context.view_layer.objects.active=obj
            if obj.animation_data:
                for track in obj.animation_data.nla_tracks: track.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(root/'web/public/assets/ori.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_extras=True)
print('KYOTO_ROBOT_GLTF_READY')
