"""Clip covered architectural faces; keep one visible finish at each seam.

Works in world space without moving any surface or changing collision. Only
convex, axis-aligned faces within 0.25 mm compete. Sloped/curved geometry is
untouched. Small authored trim wins over backing; floor slabs win over caps.
"""
import math
from collections import defaultdict

EPSILON = .00025

def area(poly):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1]))) * .5 if len(poly) > 2 else 0

def cross(a, b, p):
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])

def bounds(poly):
    return (min(p[0] for p in poly), min(p[1] for p in poly), max(p[0] for p in poly), max(p[1] for p in poly))

def overlaps(a, b):
    return a[0] < b[2] - 1e-7 and b[0] < a[2] - 1e-7 and a[1] < b[3] - 1e-7 and b[1] < a[3] - 1e-7

def intersection(subject, clip):
    for a, b in zip(clip, clip[1:] + clip[:1]):
        if len(subject) < 3:
            return []
        result = []
        for v, w in zip(subject, subject[1:] + subject[:1]):
            dv, dw = cross(a, b, v), cross(a, b, w)
            if dv >= 0:
                result.append(v)
            if (dv >= 0) != (dw >= 0):
                t = dv / (dv - dw)
                result.append(tuple(x + (y - x) * t for x, y in zip(v, w)))
        subject = result
    return subject

def priority(name, material, alpha):
    if alpha < 1 or 'glaz' in material.lower() or 'Glass -' in material:
        return -20
    if 'tactile' in name:
        return 80
    if name.startswith(('west-north-slab-edge-', 'west-south-slab-edge-', 'west-north-substrate-', 'west-south-substrate-')):
        return -5
    if material == 'Granite - plain draft':
        return 0
    return 40

class CoplanarSurfaces:
    def __init__(self, objects, deps, materials):
        groups = defaultdict(list)
        self.blockers = defaultdict(list)
        self.audit = {'facePairs': 0, 'trianglesTrimmed': 0, 'coveredAreaM2': 0, 'objects': {}}
        for obj in objects:
            evaluated = obj.evaluated_get(deps)
            mesh = evaluated.to_mesh()
            matrix = evaluated.matrix_world
            normal_matrix = matrix.to_3x3().inverted_safe().transposed()
            for face in mesh.polygons:
                normal = (normal_matrix @ face.normal).normalized()
                axis = max(range(3), key=lambda i: abs(normal[i]))
                if abs(normal[axis]) < .999999:
                    continue
                points = [matrix @ mesh.vertices[i].co for i in face.vertices]
                plane = sum(v[axis] for v in points) / len(points)
                if max(abs(v[axis] - plane) for v in points) > .00001:
                    continue
                uv = [i for i in range(3) if i != axis]
                poly = [tuple(v[i] for i in uv) for v in points]
                if sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1])) < 0:
                    poly.reverse()
                size = area(poly)
                if size < .0001 or any(cross(poly[i-1], poly[i], poly[(i+1) % len(poly)]) < -1e-8 for i in range(len(poly))):
                    continue
                label = mesh.materials[face.material_index].name if face.material_index < len(mesh.materials) else ''
                key = (obj.name, face.index)
                record = {'key': key, 'axis': axis, 'plane': plane, 'poly': poly, 'box': bounds(poly),
                          'rank': (priority(obj.name, label, materials.get(label, {}).get('alpha', 1)), -size, obj.name, face.index)}
                # Insert into adjacent depth buckets so quantization boundaries
                # cannot miss a pair only a few microns apart.
                bucket = math.floor(plane / EPSILON)
                for offset in (0, 1):
                    groups[(axis, 1 if normal[axis] > 0 else -1, bucket + offset)].append(record)
            evaluated.to_mesh_clear()
        seen = set()
        for records in groups.values():
            records.sort(key=lambda r: r['box'][0])
            for i, a in enumerate(records):
                j = i + 1
                while j < len(records) and records[j]['box'][0] < a['box'][2] - 1e-7:
                    b = records[j]
                    j += 1
                    if a['key'][0] == b['key'][0] or abs(a['plane'] - b['plane']) > EPSILON or not overlaps(a['box'], b['box']):
                        continue
                    pair = tuple(sorted((a['key'], b['key'])))
                    if pair in seen:
                        continue
                    seen.add(pair)
                    if area(intersection(a['poly'], b['poly'])) < 1e-8:
                        continue
                    lower, upper = (a, b) if a['rank'] < b['rank'] else (b, a)
                    self.blockers[lower['key']].append(upper)
                    self.audit['facePairs'] += 1
        print('COPLANAR_FACE_PAIRS', self.audit['facePairs'], 'covered faces', len(self.blockers), flush=True)

    def fragments(self, name, face_index, vertices):
        blockers = self.blockers.get((name, face_index))
        if not blockers:
            return [vertices]
        axis = blockers[0]['axis']
        uv = [i for i in range(3) if i != axis]
        def projected(v):
            return tuple(v[0][i] for i in uv)
        def size(poly):
            return area([projected(v) for v in poly])
        original = size(vertices)
        pieces = [vertices]
        for blocker in blockers:
            remaining = []
            for piece in pieces:
                if not overlaps(bounds([projected(v) for v in piece]), blocker['box']):
                    remaining.append(piece)
                    continue
                inside = piece
                clip = blocker['poly']
                for a, b in zip(clip, clip[1:] + clip[:1]):
                    if len(inside) < 3:
                        break
                    kept, outside = [], []
                    for v, w in zip(inside, inside[1:] + inside[:1]):
                        dv, dw = cross(a, b, projected(v)), cross(a, b, projected(w))
                        (kept if dv >= 0 else outside).append(v)
                        if (dv >= 0) != (dw >= 0):
                            t = dv / (dv - dw)
                            at = (v[0].lerp(w[0], t), v[1].lerp(w[1], t).normalized(), tuple(x + (y-x)*t for x, y in zip(v[2], w[2])))
                            kept.append(at)
                            outside.append(at)
                    if size(outside) > 1e-9:
                        remaining.append(outside)
                    inside = kept
            pieces = remaining
            if not pieces:
                break
        removed = original - sum(size(p) for p in pieces)
        if removed > 1e-8:
            self.audit['trianglesTrimmed'] += 1
            self.audit['coveredAreaM2'] += removed
            self.audit['objects'][name] = self.audit['objects'].get(name, 0) + removed
        return pieces
