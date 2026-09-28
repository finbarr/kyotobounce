// Compare the inferred playable hall with immutable municipal reference anchors.
// This is an architectural discrepancy report, not a replacement specification.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { readGLB } from '../../../tools/optimize-browser-assets.mjs';
const [sourcePath, layoutPath, out] = process.argv.slice(2);
assert(sourcePath && layoutPath && out && resolve(out).startsWith(resolve('.local') + '/'));
const sha = b => createHash('sha256').update(b).digest('hex');
const [sourceBytes, layoutBytes] = await Promise.all([readFile(sourcePath), readFile(layoutPath)]);
assert.equal(sha(sourceBytes), '0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1');
assert.equal(sha(layoutBytes), '9ed317e3d57fb44d9a4dc7bd4400c8ac77b4c6c1311180e89f9e055982a27c9e');
const { json: j, bin } = readGLB(sourceBytes), layout = JSON.parse(layoutBytes);
const n = j.nodes.find(n => n.name === 'Untitled.200');
assert(n && !n.matrix && !n.translation && !n.rotation && !n.scale);
const ps = j.meshes[n.mesh].primitives; assert.equal(ps.length, 1);
const a = j.accessors[ps[0].attributes.POSITION], v = j.bufferViews[a.bufferView];
assert.equal(a.type, 'VEC3'); assert.equal(a.componentType, 5126); assert(!a.sparse);
function point(index) {
  assert(index < a.count);
  const at = (v.byteOffset || 0) + (a.byteOffset || 0) + index * (v.byteStride || 12);
  return [0, 1, 2].map(k => bin.readFloatLE(at + k * 4));
}
const named = {
  gateEastUpper: 456, gateWestUpper: 459,
  eastPierEastTop: 10960, eastPierWestTop: 543,
  eastPierEastBase: 10982, eastPierWestBase: 533,
  middlePierEastTop: 544, middlePierWestTop: 10985,
  middlePierEastBase: 536, middlePierWestBase: 10990,
  westPierEastTop: 10984, westPierWestTop: 565,
  westPierEastBase: 10991, westPierWestBase: 566,
  middlePierCorbelRoot: 162,
};
const points = Object.fromEntries(Object.entries(named).map(([name, index]) => [name, { sourceVertexIndex: index, pointRenderer: point(index) }]));
const E = points.gateEastUpper.pointRenderer, W = points.gateWestUpper.pointRenderer;
const zPerX = (E[2] - W[2]) / (E[0] - W[0]), zAtX0 = E[2] - zPerX * E[0];
const old = layout.architecture.southConcourseFacade;
assert.equal(old.frontZ, layout.architecture.southFacadeZ);
const comparison = {
  frontPlane: { sourceRendererZAtX0M: zAtX0, sourceZPerX: zPerX,
    currentRendererZAtX0M: -old.frontZ, currentMinusSourceM: -old.frontZ - zAtX0 },
  gateOpening: { sourceXIntervalM: [W[0], E[0]], sourceHorizontalWidthM: E[0] - W[0],
    currentXIntervalM: old.hallOpeningX, currentHorizontalWidthM: old.hallOpeningX[1] - old.hallOpeningX[0],
    sourceHeadYM: (W[1] + E[1]) / 2, currentHeadYM: old.levelsM.hallHead },
  upperFront: { sourceGlazingTopYM: points.middlePierEastTop.pointRenderer[1], currentWindowHeadYM: old.levelsM.windowHead,
    sourceCorbelRootYM: points.middlePierCorbelRoot.pointRenderer[1], currentFrontWallTopYM: old.levelsM.frontWallTop,
    meaning: 'Different model datums; photographed component identity and exact finish boundaries still require registration.' },
};
const currentRecords = Object.fromEntries(['boxes', 'beams', 'panels'].map(kind => [kind, layout[kind].filter(r => r.id.startsWith('south-concourse-')).map(r => r.id)]));
const report = { status: 'Measured discrepancy between two models. Neither the source mesh nor these differences are survey dimensions.',
  source: { file: sourcePath, sha256: sha(sourceBytes), object: n.name, url: 'https://data.city.kyoto.lg.jp/resource/?id=21224', attribution: 'Kyoto City', license: 'CC BY 4.0' },
  current: { layoutFile: layoutPath, layoutSha256: sha(layoutBytes), architecture: old,
    candidateBrowser: { directory: '.local/station-realism/court-life-browser-04', rawSha256: '2fc2b60bff26ce0acfa4fde39b5bbd0ff039fb50e9be2080fa6163e80b14b3dc', runtimeSha256: '590c7e1ce50aa8902ab0beda6e14a0f7fa491400170dcbee7a8955e842d44165' }, recordIds: currentRecords },
  coordinates: 'Renderer X east, Y up, Z south. Current native frontZ is negated exactly once.',
  points, comparison,
  nextChecks: [
    'Resolve the gate opening and pier datum against a second photograph and the published longitudinal section.',
    'Retain uncertain lower pier picks as uncertain; do not move points or geometry simply to pass a residual threshold.',
    'Register the gate wall before replacing its bay, canopy bearing, shop/forecourt interfaces or adjoining circulation.',
    'Inventory affected native surfaces and authored courses before installation. Preserve authoritative scoring and shot-rest invariants.',
  ],
  limits: ['The two model layers have not been assumed equivalent or translated into alignment.', 'No station, collision, course, service, material or light records were changed.', 'The constrained portrait camera is a failed registration diagnostic, not a new accepted view.'],
  toolSha256: sha(await readFile(new URL(import.meta.url))) };
await writeFile(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ comparison, currentRecordCounts: Object.fromEntries(Object.entries(currentRecords).map(([k, v]) => [k, v.length])) }, null, 2));
