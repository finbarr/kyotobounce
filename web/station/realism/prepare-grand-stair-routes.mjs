// Follow the passenger lanes, clear of the Grand Stairway's central handrail.
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
const flights = Array.from({length: 14}, (_, i) => {
  const id = `daikaidan-flight-${String(i + 1).padStart(2, '0')}`;
  const flight = layout.flights.find(f => f.id === id);
  assert(flight, id);
  return flight;
});
assert.equal(flights.reduce((sum, f) => sum + f.contours.length - 1, 0), 171);
const routes = [];
for (const [fraction, lane] of [[.25, 'North'], [.75, 'South']]) {
  const points = flights.flatMap(f => f.contours.map((row, i) => {
    const index = (row.points.length - 1) * fraction;
    assert(Number.isInteger(index), 'Route must follow the actual contour vertices');
    const p = row.points[index];
    return {x: p.x, y: f.baseElevation + i * f.rise, z: p.y};
  }));
  const [a, b] = points;
  const end = points.at(-1), previous = points.at(-2);
  const before = Math.hypot(b.x - a.x, b.z - a.z);
  const after = Math.hypot(end.x - previous.x, end.z - previous.z);
  points.unshift({x: a.x - (b.x - a.x) / before * .7, y: a.y, z: a.z - (b.z - a.z) / before * .7});
  points.push({x: end.x + (end.x - previous.x) / after * .7, y: end.y, z: end.z + (end.z - previous.z) / after * .7});
  routes.push({label: lane + ' passenger lane', points}, {label: lane + ' passenger lane return', points: points.toReversed()});
}
const report = {
  sourceLayoutSha256: assets.layoutSha256,
  geometrySha256: assets.geometrySha256,
  scope: 'Both passenger lanes through all 171 Grand Stairway risers and intervening landings.',
  geometry: {
    routes, blocked: [],
    chromeRoutes: ['North passenger lane', 'South passenger lane return'],
    generatedStairs: layout.flights.filter(f => f.id.startsWith('daikaidan-')).map(f => f.id),
  },
};
await mkdir(out, {recursive: true});
await writeFile(out + '/report.json', JSON.stringify(report, null, 2) + '\n');
console.log('Prepared four passenger-lane routes through 14 flights / 171 risers.');
