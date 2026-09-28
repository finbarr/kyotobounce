// A reprojection residual alone cannot prove that a source camera sees its anchors.
// Audit the unchanged source GLB using its declared material sidedness. BLEND
// surfaces are reported conservatively as occluders: transmission is not modeled.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { readGLB } from '../../../tools/optimize-browser-assets.mjs';
const [fitPath, output] = process.argv.slice(2);
assert(fitPath && output && resolve(output).startsWith(resolve('.local') + '/'));
const sha = b => createHash('sha256').update(b).digest('hex');
const fitBytes = await readFile(fitPath), fit = JSON.parse(fitBytes);
const bytes = await readFile(fit.sourceGeometry.file);
assert.equal(sha(bytes), fit.sourceGeometry.sha256);
assert.equal(sha(await readFile(fit.reference.localFile)), fit.reference.sha256);
const { json: j, bin } = readGLB(bytes), cache = new Map();
function accessor(i) {
  if (cache.has(i)) return cache.get(i);
  const a = j.accessors[i], v = j.bufferViews[a.bufferView];
  const width = { SCALAR: 1, VEC3: 3 }[a.type];
  const size = { 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
  assert(width && size && !a.sparse);
  const values = a.componentType === 5126 ? new Float32Array(a.count * width) : new Uint32Array(a.count * width);
  for (let n = 0; n < a.count; n++) for (let k = 0; k < width; k++) {
    const at = (v.byteOffset || 0) + (a.byteOffset || 0) + n * (v.byteStride || width * size) + k * size;
    values[n * width + k] = a.componentType === 5126 ? bin.readFloatLE(at) : size === 2 ? bin.readUInt16LE(at) : bin.readUInt32LE(at);
  }
  cache.set(i, values); return values;
}
const root = new T.Group(); let triangles = 0;
for (const n of j.nodes) {
  if (n.mesh === undefined) continue;
  assert(!n.matrix && !n.translation && !n.rotation && !n.scale, 'This audit requires the declared source coordinates to be world coordinates');
  for (const [primitiveIndex, p] of j.meshes[n.mesh].primitives.entries()) {
    assert(p.mode === undefined || p.mode === 4);
    const g = new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(accessor(p.attributes.POSITION), 3));
    if (p.indices !== undefined) g.setIndex(new T.BufferAttribute(accessor(p.indices), 1));
    const m = j.materials[p.material] || {};
    const mesh = new T.Mesh(g, new T.MeshBasicMaterial({ side: m.doubleSided ? T.DoubleSide : T.FrontSide }));
    mesh.name = n.name; mesh.userData = { primitiveIndex, material: p.material, alphaMode: m.alphaMode || 'OPAQUE' };
    // Preserve source face numbering. BVH reordering would invalidate evidence IDs.
    g.boundsTree = new MeshBVH(g, { indirect: true }); mesh.raycast = acceleratedRaycast;
    root.add(mesh); triangles += (g.index?.count || g.attributes.position.count) / 3;
  }
}
root.updateMatrixWorld(true);
const { width, height } = fit.camera.viewport;
const camera = new T.PerspectiveCamera(fit.camera.fov, width / height, .05, 1800);
camera.position.fromArray(fit.camera.position);
camera.lookAt(new T.Vector3().fromArray(fit.camera.target));
camera.rotateZ(T.MathUtils.degToRad(fit.camera.rollDegrees || 0)); camera.updateMatrixWorld(true);
const ray = new T.Raycaster(), toleranceM = .03, rows = [];
ray.firstHitOnly = true;
for (const a of fit.anchors) {
  const point = new T.Vector3().fromArray(a.worldPoint), distance = point.distanceTo(camera.position);
  const projected = point.clone().project(camera), pixel = [(projected.x + 1) * width / 2, (1 - projected.y) * height / 2];
  const projectionErrorPixels = Math.hypot(...pixel.map((v, i) => v - a.projectedViewportPixel[i]));
  assert(projectionErrorPixels < 1e-6, 'Python / Three camera disagreement: ' + a.id);
  ray.set(camera.position, point.clone().sub(camera.position).normalize()); ray.near = .05; ray.far = distance + toleranceM;
  const hit = ray.intersectObject(root, true)[0];
  const occluded = Boolean(hit && hit.distance < distance - toleranceM);
  rows.push({ id: a.id, use: a.use, worldPoint: a.worldPoint, projectedPixel: pixel, projectionErrorPixels,
    distanceM: distance, occluded, inFrame: Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && Math.abs(projected.z) <= 1,
    firstHit: hit ? { object: hit.object.name, ...hit.object.userData, face: hit.faceIndex,
      distanceM: hit.distance, point: hit.point.toArray(), beforeAnchorM: distance - hit.distance } : null });
}
const report = { fitSha256: sha(fitBytes), sourceSha256: sha(bytes), referenceSha256: fit.reference.sha256,
  toolSha256: sha(await readFile(new URL(import.meta.url))), camera: fit.camera, meshes: root.children.length, triangles,
  toleranceM, conservativeTreatment: 'All rendered material faces, including BLEND, can occlude; no transparency or alpha texture simulation.',
  status: 'Visibility audit only. Does not prove correspondence identity, survey accuracy or overall registration acceptance.',
  residualPass: fit.withinTolerance, anchors: rows, occluded: rows.filter(r => r.occluded).length,
  outsideFrame: rows.filter(r => !r.inFrame).length,
  pass: fit.withinTolerance && rows.every(r => !r.occluded && r.inFrame) };
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ pass: report.pass, residualPass: report.residualPass, anchors: rows.length,
  occluded: report.occluded, outsideFrame: report.outsideFrame,
  maximumProjectionErrorPixels: Math.max(...rows.map(r => r.projectionErrorPixels)) }));
for (const mesh of root.children) { mesh.geometry.dispose(); mesh.material.dispose(); }
