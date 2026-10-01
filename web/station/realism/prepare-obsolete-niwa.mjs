// Retire the earlier floating cafe; retain the registered eastern NIWA entirely.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest, out] = process.argv.slice(2);
assert(out?.startsWith('.local/'));
await mkdir(out, {recursive: true});
const read = async p => JSON.parse(await readFile(p));
const sha = b => createHash('sha256').update(b).digest('hex');
const parent = await read(manifest), raw = await readFile(parent.layout);
assert.equal(sha(raw), parent.layoutSha256);
const layout = JSON.parse(raw), obsolete = p => p.id.startsWith('add-niwa-');
const retired = Object.fromEntries(['panels', 'boxes', 'routes', 'authoredLights'].map(k => [k, layout[k].filter(obsolete).map(p => p.id)]));
retired.labels = layout.concourseDetails.labels.filter(obsolete).map(p => p.id);
assert.equal(retired.panels.length, 6);
assert(retired.boxes.length > 30 && retired.boxes.length < 40);
assert.equal(retired.routes.length, 1);
assert.equal(retired.authoredLights.length, 1);
assert.equal(retired.labels.length, 4);
const oldFloor = layout.boxes.find(p => p.id === 'add-niwa-floor');
assert(oldFloor.center.y > 34 && oldFloor.center.z < -18);
assert(layout.panels.some(p => p.id === 'niwa-glazed-landing'));
// Measured omissions in the earlier browser export. The verifier also checks
// that no browser triangle remains inside any of these four source objects.
const browserSourceAreaGaps = {'add-niwa-header':0.023201214615255594,'add-niwa-rear':0.025600561522878706,'add-niwa-window--1':0.06354741100949468,'add-niwa-window-1':0.06354607253160793};
const spec = {componentPrefix: 'obsolete-niwa-', parentLayoutSha256: parent.layoutSha256, parentGeometrySha256: parent.geometrySha256, retired, browserSourceAreaGaps};
const y = 29.973377148875603;
const south = [[100,-8],[101,-12],[103,-16.5],[96,-16.5]].map(([x,z])=>({x,y,z}));
const cafe = (await read('research/kyoto-station/notes/courtyard-life/routes.json')).additionalRoutes.find(r => r.id === 'niwa-entrance-0').points.map(([x,y,z]) => ({x,y,z:-z}));
const routes = [{label:'Southern court approach', points:south}, {label:'Southern court return', points:south.toReversed()}, {label:'Retained NIWA entrance', points:cafe}, {label:'Retained NIWA return', points:cafe.toReversed()}];
const report = {scope:'Remove the obsolete elevated southern NIWA shell, furniture, signs, light and route. Preserve the registered eastern cafe and court.', builder:'web/station/realism/prepare-obsolete-niwa.mjs', builderSha256:sha(await readFile(new URL(import.meta.url))), sourceLayoutSha256:parent.layoutSha256, geometry:{routes, chromeRoutes:[routes[0].label,routes[2].label],blocked:[]}};
for (const [name,value] of Object.entries({'parent-assets':parent,spec,report,views:[['south-approach',[100,31.65,-8],[108,35,-19]],['southern-wall',[100,32,-16.5],[109,35,-19]],['retained-niwa',[118,33,7],[127,33,2]]]})) await writeFile(out+'/'+name+'.json',JSON.stringify(value,null,2)+'\n');
console.log(Object.fromEntries(Object.entries(retired).map(([k,v])=>[k,v.length])));
