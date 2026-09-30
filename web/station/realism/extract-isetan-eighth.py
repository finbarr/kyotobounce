"""Record the exact editable source faces selected for the eighth-floor opening."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest,out=map(Path,sys.argv[sys.argv.index('--')+1:]);m=json.loads(manifest.read_text());spec=json.loads((out/'spec.json').read_text());raw=Path(m['layout']).read_bytes()
assert spec['componentPrefix']=='isetan-eighth-' and hashlib.sha256(raw).hexdigest()==spec['parentLayoutSha256']==m['layoutSha256']
bpy.ops.wm.open_mainfile(filepath=str(Path(m['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
rows=[]
for o in bpy.context.scene.objects:
 id=o.get('kyoto_surface',o.name)
 if o.type!='MESH' or id not in spec['retiredIds'] and not id.startswith('add-fukunaga-'):continue
 vs=[o.matrix_world@v.co for v in o.data.vertices]
 rows.append(dict(name=id,dynamic=bool(o.get('kyoto_dynamic')),vertices=[[v.x,v.z,-v.y]for v in vs],materials=[m.name for m in o.data.materials],faces=[dict(vertices=list(p.vertices),material=p.material_index)for p in o.data.polygons]))
extra=sorted({r['name']for r in rows}-set(spec['retiredIds']));assert all(id.startswith('add-fukunaga-')for id in extra)
spec['retiredSourceOnlyIds']+=extra;spec['retiredIds']+=extra
(out/'spec.json').write_text(json.dumps(spec)+'\n')
assert {r['name']for r in rows}==set(spec['retiredIds'])
# Preserve the existing cafe solids; translate them to the actual eighth floor.
cafe=[r for r in rows if r['name'].startswith('add-fukunaga-')]
(out/'cafe-source.json').write_text(json.dumps(cafe)+'\n')
used={name for o in cafe if o['name']!='add-fukunaga-floor'for name in o['materials']};existing={m['id']for m in spec['materials']}
spec['materials'] += [m for m in json.loads(raw)['authoredMaterials']if m['label']in used and m['id']not in existing]
(out/'spec.json').write_text(json.dumps(spec)+'\n')
(out/'retired-source.json').write_text(json.dumps(rows)+'\n');print('ISETAN_EIGHTH_SOURCE',len(rows),flush=True)
