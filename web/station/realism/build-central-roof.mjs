// Registered central canopy and transverse branches. No playable scene mutation.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { readGLB, writeGLB } from '../../../tools/optimize-browser-assets.mjs';

const [sourcePath, fitPath, layoutPath, out, variant] = process.argv.slice(2);
assert(variant === undefined || variant === "--truss", "Unknown construction variant");
const trussBytes = variant ? await readFile("web/station/realism/registrations/central-roof-truss.json") : null;
const truss = trussBytes ? JSON.parse(trussBytes) : null;
assert(sourcePath && fitPath && layoutPath && out);
assert(resolve(out).startsWith(resolve('.local') + '/'));
await mkdir(out, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const [sourceBytes, fitBytes, layoutBytes, registrationBytes] = await Promise.all([
  readFile(sourcePath), readFile(fitPath), readFile(layoutPath),
  readFile('web/station/realism/registrations/central-roof-envelope.json'),
]);
const spec = JSON.parse(registrationBytes), fit = JSON.parse(fitBytes);
assert.equal(hash(sourceBytes), spec.source.sha256);
assert.equal(hash(fitBytes), spec.parameterization.fitSha256);
const { json: j, bin } = readGLB(sourceBytes);
function accessor(i) {
  const a = j.accessors[i], v = j.bufferViews[a.bufferView];
  assert(!a.sparse && ['VEC3', 'SCALAR'].includes(a.type));
  assert([5126, 5125, 5123].includes(a.componentType));
  const n = a.type === 'VEC3' ? 3 : 1, b = a.componentType === 5123 ? 2 : 4;
  return Array.from({ length: a.count }, (_, k) => Array.from({ length: n }, (_, c) => {
    const p = (v.byteOffset || 0) + (a.byteOffset || 0) + k * (v.byteStride || n * b) + c * b;
    return a.componentType === 5126 ? bin.readFloatLE(p) : b === 2 ? bin.readUInt16LE(p) : bin.readUInt32LE(p);
  }));
}
const node = j.nodes.find(n => n.name === spec.source.object);
assert(node && !node.matrix && !node.translation && !node.rotation && !node.scale);
assert.equal(j.meshes[node.mesh].primitives.length, 1);
const primitive = j.meshes[node.mesh].primitives[0];
const sourceVertices = accessor(primitive.attributes.POSITION), sourceIndices = accessor(primitive.indices).flat();
const dist = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]));
const pointKey = p => p.map(v => v.toFixed(6)).join(',');
const faces = spec.faceIds.map(id => {
  const points = sourceIndices.slice(id * 3, id * 3 + 3).map(i => sourceVertices[i]);
  assert.equal(points.length, 3);
  const cross = new T.Vector3().fromArray(points[1]).sub(new T.Vector3().fromArray(points[0]))
    .cross(new T.Vector3().fromArray(points[2]).sub(new T.Vector3().fromArray(points[0])));
  assert(cross.y > 0, 'Selected canopy face must face outward and upward');
  return { id, points, normal: cross.clone().normalize().toArray(), area: cross.length() / 2 };
});
assert.equal(faces.length, 113);
const groups = Object.entries(spec.regions).map(([name, ids]) => ({ name, faces: faces.filter(f => ids.includes(f.id)) }));
assert.deepEqual(groups.flatMap(g => g.faces.map(f => f.id)).sort((a, b) => a - b), spec.faceIds);
assert.deepEqual(groups.map(g => g.faces.length), [65, 24, 24]);

// The glass is one continuous closed shell: source triangulation does not create
// opaque diagonal caps. Front coordinates remain exact; only the back is offset.
const verts = [], indices = [], vertexMap = new Map(), normals = [], edgeMap = new Map();
for (const face of faces) {
  const tri = face.points.map(p => {
    const key = pointKey(p);
    if (!vertexMap.has(key)) { vertexMap.set(key, verts.length); verts.push(p); normals.push(new T.Vector3()); }
    const i = vertexMap.get(key);
    assert(dist(verts[i], p) < 1e-7, 'No geometric movement is allowed during vertex welding');
    normals[i].add(new T.Vector3().fromArray(face.normal));
    return i;
  });
  indices.push(...tri);
  for (let e = 0; e < 3; e++) {
    const a = tri[e], b = tri[(e + 1) % 3], key = [a, b].sort((x, y) => x - y).join(',');
    const row = edgeMap.get(key) || [];
    row.push([a, b]); edgeMap.set(key, row);
  }
}
assert.equal(verts.length, 97);
const boundary = [];
for (const edges of edgeMap.values()) {
  assert(edges.length === 1 || edges.length === 2);
  if (edges.length === 1) boundary.push(edges[0]);
  else assert(edges[0][0] === edges[1][1] && edges[0][1] === edges[1][0]);
}
assert.equal(boundary.length, 79);
const vertexCount = verts.length, thickness = spec.parameterization.glazingOffsetM;
for (let i = 0; i < vertexCount; i++) {
  normals[i].normalize();
  verts.push(verts[i].map((v, k) => v - thickness * normals[i].getComponent(k)));
}
const frontTriangleCount = indices.length / 3;
for (let i = 0; i < frontTriangleCount * 3; i += 3) indices.push(indices[i + 2] + vertexCount, indices[i + 1] + vertexCount, indices[i] + vertexCount);
for (const [a, b] of boundary) indices.push(b, a, a + vertexCount, b, a + vertexCount, b + vertexCount);

const materials = [
  { name: 'Central canopy | continuous glazing', pbrMetallicRoughness: { baseColorFactor: [.55, .77, .84, .22], roughnessFactor: .13, metallicFactor: .05 }, alphaMode: 'BLEND', doubleSided: true },
  { name: 'Central canopy | outer grid steel', pbrMetallicRoughness: { baseColorFactor: [.79, .81, .8, 1], roughnessFactor: .38, metallicFactor: .3 } },
];
const batches = materials.map(() => ({ positions: [], indices: [] })), panels = [];
function add(id, positions, triangles, material, role) {
  const nativeTriangles = [];
  for (let i = 0; i < triangles.length; i += 3) nativeTriangles.push(triangles[i + 2], triangles[i + 1], triangles[i]);
  panels.push({ id, vertices: positions.map(([x, y, z]) => ({ x, y, z: -z })), triangles: nativeTriangles,
    material: material === 0 ? 'glass' : 'roof', browserMaterial: material, role, collision: true });
  const g = batches[material], at = g.positions.length / 3;
  g.positions.push(...positions.flat()); g.indices.push(...triangles.map(i => i + at));
}
add('central-roof-glazing', verts, indices, 0, 'canopy-glazing');

function profileWithArc(points) {
  let length = 0;
  return points.map((p, i) => { if (i) length += dist(p, points[i - 1]); return { point: p, arc: length }; });
}
function projectProfile(point, profile) {
  let best = { distance: Infinity };
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1].point, b = profile[i].point, d = b.map((v, k) => v - a[k]);
    const t = T.MathUtils.clamp(point.reduce((s, v, k) => s + (v - a[k]) * d[k], 0) / d.reduce((s, v) => s + v * v, 0), 0, 1);
    const distance = dist(point, a.map((v, k) => v + d[k] * t));
    if (distance < best.distance) best = { distance, arc: T.MathUtils.lerp(profile[i - 1].arc, profile[i].arc, t) };
  }
  return best;
}
const mainProfile = profileWithArc(fit.sourceProfileZY), [slopeZ, slopeY] = fit.centralSectionSlopeZYPerX;
const mappedGroups = [], parameterReceipts = [], gridSegments = new Map(), grid = spec.parameterization.gridM, side = spec.parameterization.tubeSideM;
function segment(a, b, label, face) {
  if (dist(a, b) < .001) return;
  const key = [a, b].map(pointKey).sort().join('|');
  if (!gridSegments.has(key)) gridSegments.set(key, { a, b, label, face });
}
function clipLine(face, axis, value, label) {
  const hits = [];
  for (let i = 0; i < 3; i++) {
    const k = (i + 1) % 3, a = face.uv[i][axis] - value, b = face.uv[k][axis] - value;
    if (Math.abs(a) < 1e-9) hits.push(face.points[i]);
    if (a * b < 0) { const t = a / (a - b); hits.push(face.points[i].map((v, c) => v + (face.points[k][c] - v) * t)); }
  }
  const unique = [];
  for (const p of hits) if (!unique.some(q => dist(p, q) < 1e-7)) unique.push(p);
  if (unique.length < 2) return;
  let best = [unique[0], unique[1]];
  for (const a of unique) for (const b of unique) if (dist(a, b) > dist(...best)) best = [a, b];
  segment(...best, label, face);
}
for (const group of groups) {
  let profile = mainProfile;
  if (group.name !== 'main') {
    const hits = new Map();
    for (const face of group.faces) for (let i = 0; i < 3; i++) {
      const a = face.points[i], b = face.points[(i + 1) % 3];
      if (a[2] * b[2] < 0) {
        const t = -a[2] / (b[2] - a[2]), p = a.map((v, k) => v + (b[k] - v) * t);
        hits.set(pointKey([p[0], p[1], 0]), [p[0], p[1]]);
      }
    }
    assert.equal(hits.size, 13);
    profile = profileWithArc([...hits.values()].sort((a, b) => a[0] - b[0]));
  }
  let maxDistance = 0;
  const mapped = group.faces.map(face => ({ ...face, uv: face.points.map(p => {
    const cross = group.name === 'main' ? [p[2] - slopeZ * p[0], p[1] - slopeY * p[0]] : [p[0] + slopeZ * p[2], p[1]];
    const projected = projectProfile(cross, profile);
    maxDistance = Math.max(maxDistance, projected.distance);
    return [group.name === 'main' ? p[0] : p[2], projected.arc];
  }) }));
  for (const face of mapped) for (const axis of [0, 1]) {
    const values = face.uv.map(p => p[axis]);
    for (let k = Math.ceil(Math.min(...values) / grid); k <= Math.floor(Math.max(...values) / grid); k++) clipLine(face, axis, k * grid, group.name + '-' + axis);
  }
  mappedGroups.push({ name: group.name, faces: mapped });
  parameterReceipts.push({ region: group.name, sourceFaces: group.faces.length, maximumProfileProjectionDistanceM: maxDistance, profile });
}
// Preserve the registered outer edge, including branch and attachment boundaries.
for (const [a, b] of boundary) segment(verts[a], verts[b], 'boundary');
const lengths = [], memberCounts = {}, trussProbes = [];
let beamIndex = 0;
function beam(a, b, label, role = 'canopy-frame') {
  const length = dist(a, b); assert(length > 1e-5, `Collapsed ${label}: ${length}`); lengths.push(length);
  const geometry = new T.BoxGeometry(side, side, length), mesh = new T.Mesh(geometry);
  mesh.position.fromArray(a).add(new T.Vector3().fromArray(b)).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3().fromArray(b).sub(new T.Vector3().fromArray(a)).normalize());
  mesh.updateMatrix(); geometry.applyMatrix4(mesh.matrix);
  const p = geometry.attributes.position, id = `central-roof-${label}-${beamIndex++}`;
  add(id, Array.from({ length: p.count }, (_, k) => [p.getX(k), p.getY(k), p.getZ(k)]), Array.from(geometry.index.array), 1, role);
  memberCounts[role] = (memberCounts[role] || 0) + 1;
  geometry.dispose();
  return id;
}
for (const { a, b, label } of gridSegments.values()) beam(a, b, label);

// Offset a shared surface point with its interpolated welded vertex normal.
// Both sides of every source triangle edge therefore produce the same joint.
function inset(face, point) {
  const bary = new T.Triangle(...face.points.map(p => new T.Vector3().fromArray(p))).getBarycoord(new T.Vector3().fromArray(point), new T.Vector3());
  assert(bary && Math.min(...bary.toArray()) > -1e-5);
  const normal = new T.Vector3();
  for (let i = 0; i < 3; i++) normal.addScaledVector(normals[vertexMap.get(pointKey(face.points[i]))], bary.getComponent(i));
  normal.normalize();
  return point.map((v, k) => v - normal.getComponent(k) * truss.depthM);
}
function faceAtPoint(point) {
  for (const face of faces) {
    const triangle = new T.Triangle(...face.points.map(p => new T.Vector3().fromArray(p)));
    const closest = triangle.closestPointToPoint(new T.Vector3().fromArray(point), new T.Vector3());
    if (dist(closest.toArray(), point) < 1e-6) return face;
  }
  throw Error('Grid endpoint outside registered source faces');
}
let depthMin = Infinity, depthMax = 0, seamErrorMax = 0, innerNodeGapMax = 0;
if (truss) {
  assert.equal(truss.depthM, 2); assert.equal(truss.tubeSideM, side);
  assert.equal(truss.envelopeRegistrationSha256, hash(registrationBytes));
  const innerPoints = new Map(), depthNodes = new Map();
  function inner(point, face = faceAtPoint(point)) {
    const key = pointKey(point), result = inset(face, point), previous = innerPoints.get(key);
    if (previous) { seamErrorMax = Math.max(seamErrorMax, dist(previous, result)); assert(dist(previous, result) < 1e-5); return previous; }
    innerPoints.set(key, result);
    const depth = dist(point, result); depthMin = Math.min(depthMin, depth); depthMax = Math.max(depthMax, depth);
    return result;
  }
  const innerSegments = [], boundaryNodes = [];
  for (const { a, b, label, face: mappedFace } of gridSegments.values()) {
    const face = mappedFace || mappedGroups.flatMap(g => g.faces).find(f => {
      const triangle = new T.Triangle(...f.points.map(p => new T.Vector3().fromArray(p)));
      const midpoint = new T.Vector3().fromArray(a).add(new T.Vector3().fromArray(b)).multiplyScalar(.5);
      return triangle.closestPointToPoint(midpoint, new T.Vector3()).distanceTo(midpoint) < 1e-6;
    });
    assert(face);
    const uvAt = point => {
      const bary = new T.Triangle(...face.points.map(p => new T.Vector3().fromArray(p))).getBarycoord(new T.Vector3().fromArray(point), new T.Vector3());
      return [0, 1].map(k => face.uv.reduce((n, v, i) => n + v[k] * bary.getComponent(i), 0));
    };
    const ua = uvAt(a), ub = uvAt(b), cuts = [0, 1];
    for (const axis of [0, 1]) {
      const delta = ub[axis] - ua[axis]; if (Math.abs(delta) < 1e-7) continue;
      for (let k = Math.ceil(Math.min(ua[axis], ub[axis]) / grid); k <= Math.floor(Math.max(ua[axis], ub[axis]) / grid); k++) {
        const t = (k * grid - ua[axis]) / delta;
        if (t > 1e-7 && t < 1 - 1e-7) cuts.push(t);
      }
    }
    const times = cuts.sort((a, b) => a - b).filter((t, i, list) => !i || t - list[i - 1] > 1e-7);
    const path = times.map(t => {
      const point = a.map((v, k) => v + (b[k] - v) * t), result = inner(point, face);
      if (label === 'boundary') boundaryNodes.push({ outer: point, inner: result });
      return result;
    });
    // Remove only geometrically collinear joints; every retained bend connects
    // at the exact same centerline coordinate as its diagonal and depth strut.
    const simplified = [];
    for (const point of path) {
      while (simplified.length >= 2) {
        const start = new T.Vector3().fromArray(simplified.at(-2)), end = new T.Vector3().fromArray(point);
        const middle = new T.Vector3().fromArray(simplified.at(-1));
        if (new T.Line3(start, end).closestPointToPoint(middle, true, new T.Vector3()).distanceTo(middle) > 1e-7) break;
        simplified.pop();
      }
      simplified.push(point);
    }
    for (let i = 1; i < simplified.length; i++) {
      const start = simplified[i - 1], end = simplified[i]; innerSegments.push([start, end]);
      beam(start, end, 'inner-' + label, 'canopy-inner-chord');
    }
  }
  function sample(group, uv) {
    const point = new T.Vector3(...uv, 0);
    const candidates = [];
    for (const face of group.faces) {
      const triangle = new T.Triangle(...face.uv.map(p => new T.Vector3(...p, 0)));
      const bary = triangle.getBarycoord(point, new T.Vector3());
      if (!bary || Math.min(...bary.toArray()) < -1e-8) continue;
      const p = [0, 1, 2].map(k => face.points.reduce((n, v, i) => n + v[k] * bary.getComponent(i), 0));
      candidates.push({ outer: p, inner: inner(p, face) });
    }
    if (!candidates.length) return null;
    for (const other of candidates.slice(1)) assert(dist(other.outer, candidates[0].outer) < 1e-5, 'Parameterization folds over itself');
    return candidates[0];
  }
  const webKeys = new Set();
  for (const group of mappedGroups) {
    const coords = group.faces.flatMap(f => f.uv), nodes = new Map();
    const lo = [0, 1].map(k => Math.ceil(Math.min(...coords.map(p => p[k])) / grid));
    const hi = [0, 1].map(k => Math.floor(Math.max(...coords.map(p => p[k])) / grid));
    for (let u = lo[0]; u <= hi[0]; u++) for (let v = lo[1]; v <= hi[1]; v++) {
      const node = sample(group, [u * grid, v * grid]);
      if (!node) continue;
      nodes.set(u + ',' + v, node); depthNodes.set(pointKey(node.outer), node);
    }
    for (const [key, a] of nodes) {
      const [u, v] = key.split(',').map(Number);
      for (const axis of [0, 1]) {
        const uv = [u, v]; uv[axis]++;
        const b = nodes.get(uv.join(',')); if (!b) continue;
        // Do not bridge holes or branch boundaries between sampled nodes.
        const midpoint = [u, v]; midpoint[axis] += .5;
        if (!sample(group, midpoint.map(x => x * grid))) continue;
        const endpoints = (u + v + axis) % 2 === 0 ? [a.inner, b.outer] : [a.outer, b.inner];
        const webKey = endpoints.map(pointKey).sort().join('|');
        if (!webKeys.has(webKey)) { webKeys.add(webKey); beam(...endpoints, 'web-' + group.name, 'canopy-diagonal-web'); }
      }
    }
  }
  // Close the depth at perimeter chord endpoints, including source curvature breaks.
  for (const node of boundaryNodes) depthNodes.set(pointKey(node.outer), node);
  for (const node of depthNodes.values()) {
    let nearest = Infinity;
    for (const [a, b] of innerSegments) {
      const d = b.map((v, k) => v - a[k]);
      const t = T.MathUtils.clamp(node.inner.reduce((n, v, k) => n + (v - a[k]) * d[k], 0) / d.reduce((n, v) => n + v * v, 0), 0, 1);
      nearest = Math.min(nearest, dist(node.inner, a.map((v, k) => v + d[k] * t)));
    }
    innerNodeGapMax = Math.max(innerNodeGapMax, nearest);
    beam(node.outer, node.inner, 'depth', 'canopy-depth-strut');
  }
  assert(innerNodeGapMax < 1e-5, `Disconnected inner lattice node: ${innerNodeGapMax}`);
  for (const role of ['canopy-inner-chord', 'canopy-diagonal-web', 'canopy-depth-strut']) {
    const members = panels.filter(p => p.role === role);
    for (let i = 0; i < 32; i++) {
      const member = members[Math.round(i * (members.length - 1) / 31)];
      for (const triangleOffset of [0, 6, 12, 18, 24, 30]) trussProbes.push({ id: member.id, triangleOffset });
    }
  }
}

let minimumVolume = Infinity;
for (const panel of panels) {
  const edges = new Map(), p = panel.vertices.map(v => [v.x, v.y, -v.z]);
  let volume = 0;
  for (let i = 0; i < panel.triangles.length; i += 3) {
    const tri = panel.triangles.slice(i, i + 3).reverse();
    for (let k = 0; k < 3; k++) {
      const a = pointKey(p[tri[k]]), b = pointKey(p[tri[(k + 1) % 3]]); assert.notEqual(a, b);
      const key = [a, b].sort().join('|'), e = edges.get(key) || { count: 0, balance: 0 };
      e.count++; e.balance += a < b ? 1 : -1; edges.set(key, e);
    }
    volume += new T.Vector3().fromArray(p[tri[0]]).dot(new T.Vector3().fromArray(p[tri[1]]).cross(new T.Vector3().fromArray(p[tri[2]]))) / 6;
  }
  assert([...edges.values()].every(e => e.count === 2 && e.balance === 0), `Open shell: ${panel.id}`);
  assert(volume > 1e-8, `Inverted shell: ${panel.id}`); minimumVolume = Math.min(minimumVolume, volume);
}
const gltf = { asset: { version: '2.0', generator: 'Kyoto registered central roof' }, scene: 0, scenes: [{ nodes: [0, 1] }],
  nodes: materials.map((m, i) => ({ name: m.name, mesh: i })), meshes: [], materials, buffers: [], bufferViews: [], accessors: [] };
const parts = []; let offset = 0;
function append(typed, type, componentType, count, target, min, max) {
  const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength), view = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target }); parts.push(bytes); offset += bytes.length;
  const i = gltf.accessors.length;
  gltf.accessors.push({ bufferView: view, componentType, count, type, ...(min ? { min, max } : {}) }); return i;
}
for (let material = 0; material < batches.length; material++) {
  const g = batches[material], p = new Float32Array(g.positions), ids = new Uint32Array(g.indices);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i++) { const k = i % 3; min[k] = Math.min(min[k], p[i]); max[k] = Math.max(max[k], p[i]); }
  const geometry = new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(p, 3)).setIndex(new T.BufferAttribute(ids, 1));
  geometry.computeVertexNormals(); const normals = geometry.attributes.normal.array;
  const position = append(p, 'VEC3', 5126, p.length / 3, 34962, min, max);
  const normal = append(normals, 'VEC3', 5126, normals.length / 3, 34962), index = append(ids, 'SCALAR', 5125, ids.length, 34963);
  gltf.meshes.push({ primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices: index, material, mode: 4 }] }); geometry.dispose();
}
gltf.buffers.push({ byteLength: offset });
const glb = writeGLB(gltf, Buffer.concat(parts)), nativeBytes = Buffer.from(JSON.stringify({ schemaVersion: 1, coordinates: 'Native X east,Y up,Z north', panels }) + '\n');
await writeFile(out + '/central-roof.glb', glb); await writeFile(out + '/native-panels.json', nativeBytes);
const decoded = readGLB(await readFile(out + '/central-roof.glb')), saved = JSON.parse(await readFile(out + '/native-panels.json'));
const cursors = [0, 0], indexCursors = [0, 0]; let maximumError = 0;
for (const panel of saved.panels) {
  const m = panel.browserMaterial, pr = decoded.json.meshes[m].primitives[0];
  const pa = decoded.json.accessors[pr.attributes.POSITION], ia = decoded.json.accessors[pr.indices];
  const pv = decoded.json.bufferViews[pa.bufferView], iv = decoded.json.bufferViews[ia.bufferView], at = cursors[m];
  for (const [i, v] of panel.vertices.entries()) {
    const q = [0, 1, 2].map(k => decoded.bin.readFloatLE(pv.byteOffset + (at + i) * 12 + k * 4));
    maximumError = Math.max(maximumError, dist(q, [v.x, v.y, -v.z]));
  }
  for (let i = 0; i < panel.triangles.length; i += 3) for (let k = 0; k < 3; k++)
    assert.equal(decoded.bin.readUInt32LE(iv.byteOffset + (indexCursors[m] + i + k) * 4), at + panel.triangles[i + 2 - k]);
  cursors[m] += panel.vertices.length; indexCursors[m] += panel.triangles.length;
}
assert(maximumError < 1e-5);
const report = {
  status: truss ? 'Registered envelope with nominal-depth inner truss; construction candidate, joints and supports unfinished.' : 'Registered outer canopy component; not installed or a completed structural assembly.', source: spec.source,
  registrationSha256: hash(registrationBytes), fitSha256: hash(fitBytes), inputLayoutSha256: hash(layoutBytes),
  geometry: { sourceFaces: faces.length, regions: parameterReceipts, continuousGlassPanels: 1, glassBoundaryEdges: boundary.length,
    glassTriangles: indices.length / 3, frameMembers: beamIndex, memberCounts, totalPanels: panels.length,
    triangles: batches.reduce((n, g) => n + g.indices.length / 3, 0), gridM: grid, squareTubeSideM: side,
    maximumFramePieceM: Math.max(...lengths), glazingNormalOffsetM: thickness, sourceAreaM2: faces.reduce((n, f) => n + f.area, 0) },
  visualNativeCoordinateMaxErrorM: maximumError, closedManifoldPanels: panels.length, minimumClosedVolumeM3: minimumVolume,
  additionalProbeTriangles: [...Array.from({ length: frontTriangleCount * 2 - 1 }, (_, i) => ({ id: 'central-roof-glazing', triangleOffset: (i + 1) * 3 })), ...trussProbes],
  ...(truss ? { truss: { registrationSha256: hash(trussBytes), depthM: truss.depthM, sampledOffsetRangeM: [depthMin, depthMax], sharedJointMaximumErrorM: seamErrorMax, maximumInnerNodeToChordGapM: innerNodeGapMax, limitations: truss.limitations } } : {}),
  outputs: { glbFile: 'central-roof.glb', glbSha256: hash(glb), nativePanelsSha256: hash(nativeBytes) }, limits: truss ? [...spec.limits.filter(text => !text.startsWith('Only the exterior envelope')), ...truss.limitations] : spec.limits,
};
await writeFile(out + '/report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ geometry: { ...report.geometry, regions: parameterReceipts.map(({ profile, ...r }) => r) }, outputs: report.outputs, maximumError, closedManifoldPanels: panels.length }, null, 2));
