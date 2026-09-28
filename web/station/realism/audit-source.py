"""Read-only audit of source geometry and its embedded collision contract."""
import bpy, json, hashlib, argparse, sys, collections
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--source',required=True,type=Path);p.add_argument('--layout',required=True,type=Path);p.add_argument('--output',required=True,type=Path)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(a.source.resolve()))
layout=json.loads(a.layout.read_text());seed=bpy.data.texts.get('Kyoto runtime seed.json')
report={'source_sha256':hashlib.sha256(a.source.read_bytes()).hexdigest(),'layout_sha256':hashlib.sha256(a.layout.read_bytes()).hexdigest(),'embedded_seed_matches':bool(seed and seed.as_string()==a.layout.read_text()),'collections':[],'materials':[],'exterior_candidates':[],'mesh_count':0,'hidden_mesh_count':0}
for c in bpy.data.collections:
 meshes=[o for o in c.objects if o.type=='MESH'];points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 if not meshes:continue
 report['collections'].append({'name':c.name,'meshes':len(meshes),'hidden':sum(o.hide_render for o in meshes),'bounds_blender':[[min(v[i] for v in points) for i in range(3)],[max(v[i] for v in points) for i in range(3)]]})
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 report['mesh_count']+=1;report['hidden_mesh_count']+=bool(o.hide_render)
 if any(s in o.name.lower() for s in ['municipal','city','forecourt','hachijo','tower','plateau']):report['exterior_candidates'].append({'name':o.name,'hidden':o.hide_render,'collections':[c.name for c in o.users_collection]})
for m in bpy.data.materials:
 report['materials'].append({'name':m.name,'users':m.users})
report['metadata']={k:layout['architecture'].get(k) for k in ['cityContext','northForecourt','plaza','canopyRegistration','nominalGridM']}
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n');print('AUDIT',json.dumps({k:report[k] for k in ['mesh_count','hidden_mesh_count','embedded_seed_matches']}),flush=True)
