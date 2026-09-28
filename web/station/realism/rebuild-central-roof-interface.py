"""Replace registered central roof faces in both imported frontage meshes.

Reconstruct from original triangles before clipping; retain the prior eastern
roof exclusion, original UVs/normals, and all declared vertical side faces.
"""
import argparse, hashlib, json, shutil, struct, sys
from pathlib import Path
import bpy, bmesh, numpy as np
from mathutils import Matrix, Vector
from mathutils.geometry import barycentric_transform

parser = argparse.ArgumentParser(description=__doc__)
for key in ('candidate', 'source', 'registration', 'component', 'output'):
    parser.add_argument('--' + key, type=Path, required=True)
a = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
assert not a.output.exists(), 'Choose a fresh construction directory'
sha = lambda b: hashlib.sha256(b).hexdigest()
source = a.source.read_bytes()
assert struct.unpack_from('<I', source)[0] == 0x46546c67
size, kind = struct.unpack_from('<II', source, 12)
assert kind == 0x4e4f534a
source_doc = json.loads(source[20:20 + size])
binary_size, kind = struct.unpack_from('<II', source, 20 + size)
assert kind == 0x004e4942
binary = source[28 + size:28 + size + binary_size]
registration_bytes = a.registration.read_bytes()
registration = json.loads(registration_bytes)
construction = json.loads((a.component / 'report.json').read_text())
native_bytes = (a.component / 'native-panels.json').read_bytes()
native = json.loads(native_bytes)
layout_bytes = (a.candidate / 'station-layout.json').read_bytes()
layout = json.loads(layout_bytes)
assert sha(source) == registration['source']['sha256'] == construction['source']['sha256']
assert sha(registration_bytes) == construction['registrationSha256']
assert sha(native_bytes) == construction['outputs']['nativePanelsSha256']
assert sha(layout_bytes) == construction['inputLayoutSha256']
assert construction['geometry']['sourceFaces'] == 113
removed_central = set(registration['faceIds'])
preserved_vertical = set(registration['preservedVerticalFaceIds'])
assert len(removed_central) == 113 and len(preserved_vertical) == 12
assert not removed_central & preserved_vertical
previous = layout['architecture']['eastRoofSourceInterface']
assert previous['sourceGlbSha256'] == sha(source)
removed_east = set(previous['excludedSourceFaces'])
assert len(removed_east) == 248 and not removed_central & removed_east
node = next(n for n in source_doc['nodes'] if n.get('name') == registration['source']['object'])
assert not any(k in node for k in ('matrix', 'translation', 'rotation', 'scale'))
primitives = source_doc['meshes'][node['mesh']]['primitives']
assert len(primitives) == 1
primitive = primitives[0]
assert primitive.get('mode', 4) == 4

def accessor(index):
    row = source_doc['accessors'][index]
    assert not row.get('sparse')
    view = source_doc['bufferViews'][row['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[row['type']]
    kind = {5123: 'H', 5125: 'I', 5126: 'f'}[row['componentType']]
    stride = view.get('byteStride', width * struct.calcsize(kind))
    offset = view.get('byteOffset', 0) + row.get('byteOffset', 0)
    return [struct.unpack_from('<' + kind * width, binary, offset + i * stride) for i in range(row['count'])]

positions = accessor(primitive['attributes']['POSITION'])
normals = accessor(primitive['attributes']['NORMAL'])
uvs = accessor(primitive['attributes']['TEXCOORD_0'])
indices = [x[0] for x in accessor(primitive['indices'])]
assert len(positions) == len(normals) == len(uvs)
source_verts = [(x, -z, y) for x, y, z in positions]
source_normals = [(x, -z, y) for x, y, z in normals]
source_uv = {}
for point, tex in zip(source_verts, uvs):
    source_uv.setdefault(tuple(round(v, 4) for v in point), []).append((tex[0], 1 - tex[1]))

bpy.ops.wm.open_mainfile(filepath=str((a.candidate / 'KyotoAtrium.blend').resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string() == layout_bytes.decode()
zone = layout['architecture']['municipalStationFrontage']['clipZones']
assert zone == {'westX': [-169.477757, -52.4], 'eastX': [39.0, 125.0], 'northYMin': 18, 'heightMin': 0}

def signature(obj):
    mesh = obj.data
    vertices = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get('co', vertices)
    loops = np.empty(len(mesh.loops), dtype=np.int32)
    mesh.loops.foreach_get('vertex_index', loops)
    return sha(vertices.tobytes() + loops.tobytes() + np.array(obj.matrix_world, dtype=np.float32).tobytes())

replaced = []
for side in ('west', 'east'):
    key = 'municipal-station-frontage-' + side + '-' + registration['source']['object']
    obj = bpy.data.objects[key]
    old_index = next(i for i, r in enumerate(layout['panels']) if r['id'] == key)
    old_record = layout['panels'][old_index]
    assert obj.matrix_world == Matrix.Identity(4) and not obj.modifiers
    assert len(obj.data.materials) == 1
    material = obj.data.materials[0]
    assert material.name == 'Municipal | North frontage | ' + source_doc['materials'][primitive['material']]['name']
    uv_errors = []
    for poly in obj.data.polygons:
        for li in poly.loop_indices:
            point = obj.data.vertices[obj.data.loops[li].vertex_index].co
            matches = source_uv.get(tuple(round(v, 4) for v in point), [])
            if matches:
                actual = obj.data.uv_layers.active.data[li].uv
                uv_errors.append(min((Vector(actual) - Vector(t)).length for t in matches))
    assert len(uv_errors) > 100 and max(uv_errors) < 1e-4
    removed = removed_central | (removed_east if side == 'east' else set())
    source_ids = [i for i in range(len(indices) // 3) if i not in removed]
    faces = [indices[i * 3:i * 3 + 3] for i in source_ids]
    mesh = bpy.data.meshes.new(key + ' central roof interface')
    mesh.from_pydata(source_verts, [], faces)
    mesh.materials.append(material)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    tex_layer = bm.loops.layers.uv.new('UVMap')
    source_face = bm.faces.layers.int.new('_source_face')
    for face in bm.faces:
        face[source_face] = source_ids[face.index]
        for loop in face.loops:
            tex = uvs[loop.vert.index]
            loop[tex_layer].uv = (tex[0], 1 - tex[1])
    xmin, xmax = zone[side + 'X']
    for axis, limit, greater in [(0, xmin, True), (0, xmax, False), (1, zone['northYMin'], True), (2, zone['heightMin'], True)]:
        co = [0., 0., 0.]
        co[axis] = limit
        normal = [0., 0., 0.]
        normal[axis] = 1
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-6,
                              plane_co=co, plane_no=normal, clear_outer=not greater, clear_inner=greater)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    custom = [None] * len(mesh.loops)
    normal_lengths = []
    retained_vertical = {}
    for poly in mesh.polygons:
        original = mesh.attributes['_source_face'].data[poly.index].value
        assert original not in removed
        if original in preserved_vertical:
            retained_vertical[original] = retained_vertical.get(original, 0) + poly.area
        ids = indices[original * 3:original * 3 + 3]
        abc = [Vector(source_verts[i]) for i in ids]
        ns = [Vector(source_normals[i]) for i in ids]
        for li in poly.loop_indices:
            point = mesh.vertices[mesh.loops[li].vertex_index].co
            normal = barycentric_transform(point, *abc, *ns)
            assert 1e-6 < normal.length < 1.1
            normal_lengths.append(normal.length)
            normal.normalize()
            custom[li] = normal
    mesh.normals_split_custom_set(custom)
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj.data = mesh
    mesh.calc_loop_triangles()
    triangles = []
    for t in mesh.loop_triangles:
        points = [mesh.vertices[i].co for i in t.vertices]
        if (points[1] - points[0]).cross(points[2] - points[0]).length < 2e-12:
            continue
        triangles.extend(reversed(t.vertices))
    layout['panels'][old_index] = {**old_record,
        'vertices': [{'x': float(v.co.x), 'y': float(v.co.z), 'z': float(v.co.y)} for v in mesh.vertices],
        'triangles': triangles, 'finishes': [{'appearance': old_record['appearance'], 'triangles': triangles}]}
    obj['kyoto_seed'] = 'panels/' + str(old_index)
    obj['kyoto_geometry_signature'] = signature(obj)
    replaced.append({'id': key, 'side': side, 'excludedSourceFaces': sorted(removed),
        'oldTriangles': len(old_record['triangles']) // 3, 'newTriangles': len(triangles) // 3,
        'uvSamples': len(uv_errors), 'maximumUvDifference': max(uv_errors),
        'interpolatedNormalLengthRange': [min(normal_lengths), max(normal_lengths)],
        'retainedVerticalSourceFacesAreaM2': retained_vertical})

# Reuse the material records already established by the eastern roof integration.
glass = bpy.data.materials['Glass - placeholder']
steel_record = next(m for m in layout['authoredMaterials'] if m['id'] == 'registered-roof-outer-steel')
steel = bpy.data.materials[steel_record['label']]
glass_record = next(m for m in layout['authoredMaterials'] if m['label'] == glass.name)
collection = bpy.data.collections.new('Registered central roof construction')
bpy.context.scene.collection.children.link(collection)
existing = {p['id'] for p in layout['panels']}
added = []
for panel in native['panels']:
    assert panel['id'] not in existing
    is_glass = panel['material'] == 'glass'
    name = 'canopy-glazing-registered-' + panel['id'] if is_glass else panel['id']
    assert bpy.data.objects.get(name) is None
    points = [(v['x'], v['z'], v['y']) for v in panel['vertices']]
    tris = [list(reversed(panel['triangles'][i:i + 3])) for i in range(0, len(panel['triangles']), 3)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], tris)
    mesh.materials.append(glass if is_glass else steel)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    record = glass_record if is_glass else steel_record
    obj['kyoto_surface'] = panel['id']
    obj['kyoto_physical'] = panel['material']
    obj['kyoto_role'] = panel['role']
    obj['kyoto_collision'] = True
    obj['kyoto_seed'] = 'panels/' + str(len(layout['panels']))
    obj['kyoto_geometry_signature'] = signature(obj)
    layout['panels'].append({**panel, 'appearance': record['id']})
    added.append(panel['id'])
    existing.add(panel['id'])
provenance = {
    'status': 'Construction integration: both source interfaces rebuilt, central outer roof inserted; old canopy and corridor remain pending coordinated replacement.',
    'inputLayoutSha256': sha(layout_bytes), 'sourceGlbSha256': sha(source),
    'registrationSha256': sha(registration_bytes), 'nativePanelsSha256': sha(native_bytes),
    'componentGlbSha256': construction['outputs']['glbSha256'], 'replacedPanels': replaced,
    'centralSourceFaces': sorted(removed_central), 'preservedVerticalSourceFaces': sorted(preserved_vertical),
    'retainedEasternRoofFacesExcluded': sorted(removed_east), 'clipZones': zone, 'addedPanels': added,
    'limits': ['Only the two named imported frontage meshes change; other existing layout records remain unchanged.',
               'Old canopy and central corridor remain. This is not final visual, route, gameplay or performance acceptance.',
               'The inner truss and small construction details remain unfinished.'],
}
layout['architecture']['centralRoofSourceInterface'] = provenance
a.output.mkdir(parents=True)
shutil.copytree(a.candidate / 'textures', a.output / 'textures')
text = json.dumps(layout, separators=(',', ':')) + '\n'
(a.output / 'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json'])
seed = bpy.data.texts.load(str((a.output / 'station-layout.json').resolve()), internal=True)
seed.name = 'Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str((a.output / 'KyotoAtrium.blend').resolve()))
report = {**provenance, 'layoutSha256': sha((a.output / 'station-layout.json').read_bytes()),
          'blenderSha256': sha((a.output / 'KyotoAtrium.blend').read_bytes())}
(a.output / 'interface-rebuild.json').write_text(json.dumps(report, indent=2) + '\n')
print('CENTRAL_INTERFACE_READY', json.dumps({k: report[k] for k in ['layoutSha256', 'blenderSha256', 'replacedPanels']}), flush=True)
