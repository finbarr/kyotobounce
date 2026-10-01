"""Remove only the superseded NIWA objects from the saved editable station."""
import bpy, json, sys, hashlib, copy
from pathlib import Path
import numpy as np
base_path, component = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert Path('.local').resolve() in component.resolve().parents
base = json.loads(base_path.read_text()); spec = json.loads((component / 'spec.json').read_text())
assert spec['componentPrefix'] == 'obsolete-niwa-'
sha = lambda b: hashlib.sha256(b).hexdigest()
raw = Path(base['layout']).read_bytes()
assert sha(raw) == spec['parentLayoutSha256'] == base['layoutSha256']
old = json.loads(raw); new = copy.deepcopy(old)
for key in ('panels', 'boxes', 'routes', 'authoredLights'):
    new[key] = [p for p in old[key] if p['id'] not in spec['retired'][key]]
new['concourseDetails']['labels'] = [p for p in old['concourseDetails']['labels'] if p['id'] not in spec['retired']['labels']]
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string() == raw.decode()
def identity(o): return o.get('kyoto_surface', o.name)
def signature(o):
    h = hashlib.sha256(np.array(o.matrix_world,dtype=np.float32).tobytes())
    m=o.data
    for values, prop, width, dtype in ((m.vertices,'co',3,np.float32),(m.loops,'vertex_index',1,np.int32)):
        data=np.empty(len(values)*width,dtype=dtype); values.foreach_get(prop,data); h.update(data.tobytes())
    if m.uv_layers.active:
        data=np.empty(len(m.loops)*2,dtype=np.float32); m.uv_layers.active.data.foreach_get('uv',data); h.update(data.tobytes())
    if 'kyoto_authored_normal' in m.attributes:
        data=np.empty(len(m.loops)*3,dtype=np.float32); m.attributes['kyoto_authored_normal'].data.foreach_get('vector',data); h.update(data.tobytes())
    h.update(json.dumps([m.name for m in m.materials]).encode())
    return h.hexdigest()
# Saving must preserve the registered cafe, folded frontage and terrace data.
nearby={identity(o):signature(o) for o in bpy.data.objects if o.type=='MESH' and identity(o).startswith(('niwa-','court-fold-','court-life-'))}
assert len(nearby)>50
removed=[]; surfaces=[]
for o in list(bpy.data.objects):
    id=identity(o)
    if not id.startswith('add-niwa-'): continue
    assert not o.children and not o.modifiers
    if o.type=='MESH':
        for p in o.data.polygons:
            points=[o.matrix_world@o.data.vertices[i].co for i in p.vertices]
            surfaces.append(dict(id=id,label=o.data.materials[p.material_index].name,points=[[v.x,v.z,-v.y] for v in points]))
    else: assert o.type=='LIGHT', (id,o.type)
    removed.append(id); bpy.data.objects.remove(o,do_unlink=True)
expected=set(spec['retired']['panels']+spec['retired']['boxes'])
assert expected<=set(removed), sorted(expected-set(removed))
# This old fixture exists only in runtime metadata; it has no saved lamp object.
absent_lights=set(spec['retired']['authoredLights'])-set(removed)
assert absent_lights=={'add-niwa-ceiling-light'}
assert not any('niwa' in o.name.lower() for o in bpy.data.objects if o.type=='LIGHT')
extra=set(removed)-expected
assert all(id.startswith('add-niwa-') for id in extra)
for group in ('panels','boxes'):
    lookup={p['id']:i for i,p in enumerate(new[group])}
    for o in bpy.data.objects:
        if o.get('kyoto_seed','').startswith(group+'/'):
            id=identity(o); assert id in lookup; o['kyoto_seed']=group+'/'+str(lookup[id])
out=component/'source'; out.mkdir(exist_ok=True)
newraw=json.dumps(new,separators=(',',':'))+'\n'; (out/'station-layout.json').write_text(newraw)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json'])
seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True); seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
bpy.ops.wm.open_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==newraw
objects={identity(o):o for o in bpy.data.objects}
assert not any(id.startswith('add-niwa-') for id in objects)
for id, value in nearby.items(): assert signature(objects[id])==value, id
for o in bpy.data.objects:
    group, _, index=o.get('kyoto_seed','').partition('/')
    if group in ('panels','boxes','beams'): assert new[group][int(index)]['id']==identity(o)
proof=dict(pass_=True,parentSourceSha256=sha(Path(base['sourceScene']).read_bytes()),sourceSha256=sha((out/'KyotoAtrium.blend').read_bytes()),layoutSha256=sha(newraw.encode()),removedObjects=removed,sourceOnlyObjects=sorted(extra),metadataOnlyLights=sorted(absent_lights),retainedNearbyGeometryUVsNormalsExact=True,checkedNearbyObjects=len(nearby),retainedBindingsMatch=True)
proof['pass']=proof.pop('pass_')
(component/'source-installation.json').write_text(json.dumps(proof,indent=2)+'\n')
(component/'retired-surfaces.json').write_text(json.dumps(surfaces)+'\n')
print(json.dumps(proof),flush=True)
