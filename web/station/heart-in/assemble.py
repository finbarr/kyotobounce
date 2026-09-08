"""Copy release scene and replace ONLY konbini-* meshes/records; no canonical writes.
blender -b --python web/station/heart-in/assemble.py -- --layer DIR --output DIR
"""
import argparse, bpy, json, sys, hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--layer',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output.mkdir(parents=True,exist_ok=False)
source=Path('art-source/atrium/KyotoAtrium.blend');base=Path('runtime/station-layout.json')
layout=json.loads(base.read_text());records=json.loads((a.layer/'colliders.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
removed=[]
for obj in list(bpy.data.objects):
 if obj.name.startswith('konbini-'):removed.append(obj.name);bpy.data.objects.remove(obj,do_unlink=True)
for key in ['boxes','beams','panels']:
 layout[key]=[r for r in layout[key] if not r['id'].startswith('konbini-')]
layout['boxes'].extend(records['boxes'])
for v in [1.2,3.25]:
 layout['authoredLights'].append(dict(id='konbini-ceiling-light-'+str(v),position=dict(x=-54+v,y=10.30,z=-18),direction=dict(x=0,y=-1,z=0),linearColor=dict(r=.93,g=.96,b=1,a=1),intensity=12,range=6,spotAngle=110,innerSpotAngle=75,note='K025 authored ceiling fixture; inferred lighting output, existing bounded light pool.'))
with bpy.data.libraries.load(str((a.layer/'WestExitHeartIn.blend').resolve()),link=False) as (src,dst):dst.objects=[n for n in src.objects if n.startswith('konbini-')]
for obj in dst.objects:
 bpy.context.scene.collection.objects.link(obj)
 obj['kyoto_surface']=obj.name;obj['kyoto_collision']=bool(obj.get('kyoto_physical'))
# Preserve authored material definitions for coordinator export. The candidate
# browser assembler retains source glTF emission, absent from the shared exporter.
for mat in {m for o in dst.objects for m in o.data.materials}:
 bs=mat.node_tree.nodes.get('Principled BSDF');rgba=list(bs.inputs['Base Color'].default_value)
 layout['authoredMaterials'].append(dict(id='k025-'+mat.name,label=mat.name,physical='stone',linearColor=dict(zip('rgba',rgba)),metallic=float(bs.inputs['Metallic'].default_value),roughness=float(bs.inputs['Roughness'].default_value),alpha=float(bs.inputs['Alpha'].default_value),emission=float(bs.inputs['Emission Strength'].default_value)))
(a.output/'station-layout.json').write_text(json.dumps(layout,separators=(',',':'))+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
(a.output/'assembly.json').write_text(json.dumps(dict(baseLayoutSha256=hashlib.sha256(base.read_bytes()).hexdigest(),baseSourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),removed=removed,added=[o.name for o in dst.objects],preserved='All non-konbini geometry and gallery records'),indent=2))
