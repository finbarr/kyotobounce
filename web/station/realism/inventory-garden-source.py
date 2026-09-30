"""Find decorative roof-garden objects omitted from the collision layout."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest,out=map(Path,sys.argv[sys.argv.index('--')+1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];l=json.loads(raw)
bpy.ops.wm.open_mainfile(filepath=str(Path(m['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode();known={p['id']for p in l['panels']+l['boxes']}
ids=[o.get('kyoto_surface',o.name)for o in bpy.context.scene.objects if o.type=='MESH'and o.get('kyoto_surface',o.name).startswith('add-garden-')and o.get('kyoto_surface',o.name)not in known]
(out/'source-inventory.json').write_text(json.dumps(dict(parentLayoutSha256=m['layoutSha256'],sourceOnlyIds=ids))+'\n');print('GARDEN_DECORATIVE_OBJECTS',len(ids))
