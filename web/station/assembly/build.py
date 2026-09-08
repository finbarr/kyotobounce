"""Combine reviewed standalone layers into a new editable station and exact seed.

blender -b -t 2 --python-exit-code 1 --python web/station/assembly/build.py --
  --inputs .local/inputs --output .local/assembly
Never edits the baseline or standalone inputs. No release publication.
"""
import argparse, copy, hashlib, json, math, shutil, sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
p = argparse.ArgumentParser()
p.add_argument('--inputs', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
inputs, out = a.inputs.resolve(), a.output.resolve()
out.mkdir(parents=True, exist_ok=False)
base = ROOT / 'runtime/station-layout.json'
source = ROOT / 'art-source/atrium/KyotoAtrium.blend'
sha = lambda f: hashlib.sha256(f.read_bytes()).hexdigest()
assert sha(base) == '7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775'
layout = json.loads(base.read_text())
baseline = copy.deepcopy(layout)
bpy.ops.wm.open_mainfile(filepath=str(source))
old_ids = {r['id'] for k in ['boxes', 'beams', 'panels'] for r in layout[k] if r['id'].startswith('konbini-')}
removed = []
for obj in list(bpy.context.scene.objects):
    if obj.name in old_ids:
        removed.append(obj.name)
        bpy.data.objects.remove(obj, do_unlink=True)
assert set(removed) == old_ids, (set(removed) ^ old_ids)
for key in ['boxes', 'beams', 'panels']:
    layout[key] = [r for r in layout[key] if r['id'] not in old_ids]
layer_specs = [
    ('heart-in', 'WestExitHeartIn.blend', 'colliders.json', 'konbini-', 'k025-'),
    ('east', 'east-square.blend', 'collision-proposal.json', 'k027-', None),
    ('plaza', 'PlazaLandmarks.blend', 'collision-proposal.json', 'k028-', None),
    ('exhibits', 'StationExhibits.blend', 'collision-proposal.json', 'k029-', None),
]
receipt = {'baseLayoutSha256': sha(base), 'baseSourceSha256': sha(source), 'removed': sorted(removed), 'layers': [], 'checks': {}}
all_imported = []
new_materials = []
for slug, filename, proposal, prefix, material_prefix in layer_specs:
    folder = inputs / slug
    record = json.loads((folder / proposal).read_text())
    supplied_materials = {m['label']: m for m in record.get('authoredMaterials', [])}
    with bpy.data.libraries.load(str(folder / filename), link=False) as (src, dst):
        names = [n for n in src.objects if n.startswith(prefix)]
        original_material_names = list(src.materials)
        dst.objects = names[:]
        dst.materials = original_material_names[:]
    for original, material in zip(original_material_names, dst.materials):
        if material is None:
            continue
        name = material_prefix + original if material_prefix else original
        material.name = name
        assert material.name == name, ('Material collision', name, material.name)
        node = material.node_tree.nodes.get('Principled BSDF')
        assert node is not None
        mat_record = copy.deepcopy(supplied_materials.get(original, {}))
        rgba = list(node.inputs['Base Color'].default_value)
        mat_record.update(id=mat_record.get('id', name), label=name,
                          physical=mat_record.get('physical', 'stone'),
                          linearColor=dict(zip('rgba', rgba)),
                          metallic=float(node.inputs['Metallic'].default_value),
                          roughness=float(node.inputs['Roughness'].default_value),
                          alpha=float(node.inputs['Alpha'].default_value))
        emission = float(node.inputs['Emission Strength'].default_value)
        if emission:
            mat_record['emission'] = emission
            mat_record['emissionColor'] = dict(zip('rgb', list(node.inputs['Emission Color'].default_value)[:3]))
        new_materials.append(mat_record)
    collection = bpy.data.collections.new('Assembly ' + slug)
    bpy.context.scene.collection.children.link(collection)
    for obj in dst.objects:
        collection.objects.link(obj)
        if obj.type == 'MESH':
            all_imported.append(obj)
    solids = {r['id']: r for key in ['boxes', 'panels'] for r in record.get(key, []) if r.get('collision', True)}
    for obj in dst.objects:
        obj['kyoto_surface'] = obj.name
        obj['kyoto_collision'] = obj.name in solids
        obj['kyoto_physical'] = solids.get(obj.name, {}).get('material', '')
        obj['kyoto_role'] = solids.get(obj.name, {}).get('role', 'station decoration')
    for key in ['boxes', 'panels']:
        layout[key].extend(copy.deepcopy(record.get(key, [])))
    print('IMPORTED_LAYER', slug, len(names), flush=True)
    receipt['layers'].append({'id': slug, 'sourceSha256': sha(folder / filename), 'proposalSha256': sha(folder / proposal),
                              'objects': sorted(names), 'collisionIds': sorted(solids)})
layout['authoredMaterials'].extend(new_materials)
for depth in [1.2, 3.25]:
    layout['authoredLights'].append(dict(id='konbini-ceiling-light-' + str(depth), position=dict(x=-54 + depth, y=10.30, z=-18),
        direction=dict(x=0,y=-1,z=0), linearColor=dict(r=.93,g=.96,b=1,a=1), intensity=12, range=6, spotAngle=110,
        innerSpotAngle=75, note='K025 authored ceiling fixture; inferred lighting output.'))

# Preserve every old record outside the exact shop replacement, including gallery.
for key in ['boxes', 'beams', 'panels']:
    retained = [r for r in baseline[key] if r['id'] not in old_ids]
    assert layout[key][:len(retained)] == retained, ('Changed baseline sequence', key)
    additions = layout[key][len(retained):]
    ids = [r['id'] for r in additions]
    assert len(ids) == len(set(ids)), ('Duplicate new collision ID', key)
    assert not set(ids).intersection(r['id'] for r in retained), ('New ID overlaps baseline', key)
labels = [m['label'] for m in new_materials]
assert len(labels) == len(set(labels)), 'Duplicate new material labels'
assert not set(labels).intersection(m['label'] for m in baseline['authoredMaterials']), 'New material overlaps baseline'

# Exact world vertices for triangle layers, and visible oriented bounds for boxes.
bpy.context.view_layer.update()
objects = {o.name: o for o in all_imported}
checked = []
for key in ['panels', 'boxes']:
    for r in layout[key]:
        if r['id'] not in objects or not r.get('collision', True):
            continue
        obj = objects[r['id']]
        points = [obj.matrix_world @ v.co for v in obj.data.vertices]
        native = [Vector((v.x, v.z, v.y)) for v in points]
        if key == 'panels':
            expected = [Vector(tuple(v[k] for k in 'xyz')) for v in r['vertices']]
            assert len(native) == len(expected), (r['id'], len(native), len(expected))
            error = max((v - w).length for v, w in zip(native, expected))
            assert error < 0.0002, (r['id'], error)
            obj.data.calc_loop_triangles()
            actual_triangles = [i for t in obj.data.loop_triangles for i in reversed(t.vertices)]
            assert actual_triangles == r['triangles'], ('Triangle topology', r['id'])
        else:
            center = Vector(tuple(r['center'][k] for k in 'xyz'))
            yaw = math.radians(r.get('yaw', 0))
            local = [Vector((math.cos(yaw)*(v.x-center.x)-math.sin(yaw)*(v.z-center.z), v.y-center.y,
                             math.sin(yaw)*(v.x-center.x)+math.cos(yaw)*(v.z-center.z))) for v in native]
            error = max(abs(max(abs(v[i]) for v in local) - r['size'][k]/2) for i,k in enumerate('xyz'))
            assert error < 0.0002, (r['id'], error)
        checked.append({'id': r['id'], 'maxVertexError': error})
layout['assemblyProvenance'] = {'baseLayoutSha256': sha(base), 'sources': receipt['layers'],
    'note': 'Bounded K025/K027/K028/K029 layer assembly; baseline non-shop records unchanged.'}
raw = json.dumps(layout, separators=(',', ':')) + '\n'
(out / 'station-layout.json').write_text(raw)
# Text.write inserts a 175MB single line character by character. Loading the
# completed UTF-8 file avoids that quadratic path and preserves identical bytes.
old_seed = bpy.data.texts.get('Kyoto runtime seed.json')
if old_seed is not None:
    bpy.data.texts.remove(old_seed)
seed = bpy.data.texts.load(str(out / 'station-layout.json'), internal=True)
seed.name = 'Kyoto runtime seed.json'
assert seed.as_string() == raw
shutil.copytree(ROOT / 'runtime/textures', out / 'textures')
for f in (inputs / 'plaza/textures').iterdir():
    target = out / 'textures' / f.name
    assert not target.exists() or sha(target) == sha(f)
    shutil.copyfile(f, target)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'KyotoAtrium.blend'))
receipt.update(layoutSha256=sha(out/'station-layout.json'), sourceSha256=sha(out/'KyotoAtrium.blend'),
               materials=new_materials, checks={'preservedBaseline': True, 'seedExact': True, 'solidMeshes': checked},
               addedTriangles=sum(len(o.data.loop_triangles) for o in all_imported))
for o in all_imported:
    o.data.calc_loop_triangles()
receipt['addedTriangles'] = sum(len(o.data.loop_triangles) for o in all_imported)
(out/'assembly.json').write_text(json.dumps(receipt, indent=2) + '\n')
print('ASSEMBLY_READY', receipt['layoutSha256'], len(checked), 'solid meshes', receipt['addedTriangles'], 'triangles', flush=True)
