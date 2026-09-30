// Inspect the retained garden approach against the corrected upper stair landing.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const [manifest, out] = process.argv.slice(2);
assert(out && resolve(out).startsWith(resolve('.local') + '/'));
const assets = JSON.parse(await readFile(manifest));
const bytes = await readFile(assets.layout);
assert.equal(createHash('sha256').update(bytes).digest('hex'), assets.layoutSha256);
const layout = JSON.parse(bytes);
const panel = id => {
  const p = layout.panels.find(p => p.id === id);
  assert(p, id);
  return p;
};
const top = p => Math.max(...p.vertices.map(v => v.y));
const flight = layout.flights.find(f => f.id === 'daikaidan-flight-14');
assert(flight);
const floor = flight.baseElevation + (flight.contours.length - 1) * flight.rise;
const index = (flight.contours.at(-1).points.length - 1) * .75;
assert(Number.isInteger(index));
const [a, b] = flight.contours.slice(-2).map(r => r.points[index]);
const dx = b.x - a.x, dz = b.y - a.y, distance = Math.hypot(dx, dz);
const end = {x: b.x + dx / distance * .7, y: floor, z: b.y + dz / distance * .7};
const apron = top(panel('k008-landing14-width-extension'));
const garden = top(panel('k008-garden-deck-arrival'));
const steps = Array.from({length: 28}, (_, i) => panel(`k008-garden-access-tread-${String(i).padStart(2, '0')}`));
const point = (x, y, z) => ({x, y, z});
const routes = [
  {label: 'Upper Grand Stairway to garden stair', points: [
    end, point(-150, floor, -22), point(-152, floor, -26),
    point(-153.5, floor, -32), point(-156, apron, -32),
  ]},
  {label: 'Existing garden stair ascent', points: [
    point(-156, apron, -32),
    ...steps.map(p => point(-156, top(p), (Math.min(...p.vertices.map(v => v.z)) + Math.max(...p.vertices.map(v => v.z))) / 2)),
    point(-156, garden, -21.5),
  ]},
];
const views = [
  ['grand-stair-top', [-148, floor + 1.65, -20], [-156, floor + 1.3, -31]],
  ['garden-stair-foot', [-156, floor + 1.65, -34], [-156, 53, -24]],
  ['garden-stair-head', [-156, garden + 1.65, -20], [-156, 51, -33]],
  ['garden-court', [-149, garden + 1.65, -17], [-181, 55, -26]],
  ['garden-promenade', [-184, garden + 1.65, -16], [-225, 55, -16]],
  ['atrium-stair-approach', [-70, 17.3, 4], [-115, 35, -4]],
];
await mkdir(out, {recursive: true});
await writeFile(out + '/report.json', JSON.stringify({
  sourceLayoutSha256: assets.layoutSha256,
  geometrySha256: assets.geometrySha256,
  scope: 'Diagnostic routes for the existing upper Grand Stairway and garden access. Failing walks record defects; they do not accept this geometry.',
  datums: {upperLanding: floor, gardenApron: apron, gardenFloor: garden, apronOffsetM: apron - floor},
  geometry: {routes, blocked: []},
}, null, 2) + '\n');
await writeFile(out + '/views.json', JSON.stringify(views, null, 2) + '\n');
console.log('Garden approach audit prepared; apron offset:', apron - floor, 'm');
