// Matched central-roof construction review, including unresolved collisions and course failures.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [beforePath,afterPath,outPath]=process.argv.slice(2);
for(const p of [beforePath,afterPath,outPath])assert.ok(p&&resolve(p).startsWith(resolve('.local')+'/'));
await mkdir(outPath,{recursive:true});
const read=async p=>JSON.parse(await readFile(p+'/capture.json'));
const before=await read(beforePath),after=await read(afterPath),hash=b=>createHash('sha256').update(b).digest('hex');
for(const k of ['manifestHash','fixtureHash','browser'])assert.equal(before[k],after[k]);assert.deepEqual(before.viewport,after.viewport);
const changedSources=Object.keys(after.source.hashes).filter(k=>after.source.hashes[k]!==before.source.hashes[k]);
assert.deepEqual(changedSources,[],'Browser source must match for this geometry comparison');
assert.notEqual(before.source.candidateAssets.layoutSha256,after.source.candidateAssets.layoutSha256);
assert(before.views.length>0);assert.equal(before.views.length,after.views.length);assert.deepEqual(before.views.map(v=>v.id),after.views.map(v=>v.id));
const native=JSON.parse(await readFile('.local/station-realism/central-interface-native-01/report.json'));
const campaign=JSON.parse(await readFile('.local/station-realism/central-interface-campaign-01/summary.json'));
assert.equal(native.layoutSha256,after.source.candidateAssets.layoutSha256);
assert.equal(campaign.layout,native.layoutSha256);assert.equal(native.samples.length,528);assert.equal(native.failures.length,0);
assert.equal(campaign.receipts.length,31);assert(campaign.receipts.every(r=>r.rest),'Every authored shot must have reached full rest, even a failed course');
const receipt={kind:'One diagnostic pair; fixed views do not establish gameplay/soak acceptance',before:beforePath,after:afterPath,layoutSha256:native.layoutSha256,nativeSamples:native.samples.length,nativeMaxErrorM:Math.max(...native.samples.map(r=>r.error)),fullRestCoursePasses:campaign.receipts.filter(r=>r.pass).length,failedCourses:campaign.receipts.filter(r=>!r.pass),componentInterferences:native.componentInterferences,readyForPromotion:false,changedSources,reflections:{before:before.reflections,after:after.reflections},errors:{before:before.errors,after:after.errors},warnings:{before:before.warnings,after:after.warnings},views:[]};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');let sections='';
for(const a of after.views){const b=before.views.find(v=>v.id===a.id);assert.ok(b);assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.buffer,b.buffer);
 for(const v of [a,b]){assert.equal(v.timing.hiddenFrames,0);assert.equal(v.timing.disjoints,0);}
 const obstruction=a.id==='canopy-interior'?'The old central canopy and Skyway remain. This interior view does not establish completed roof fidelity.':a.id==='west-transverse-junction'?'The new transverse roof is inserted alongside the old canopy; their structure and corridor connections remain unfinished.':null;
 const row={id:a.id,obstruction,inspectionNote:a.inspectionNote,frameP95:{before:b.timing.frameMs.p95,after:a.timing.frameMs.p95},frameP99:{before:b.timing.frameMs.p99,after:a.timing.frameMs.p99},gpuP95:{before:b.timing.gpuMs.p95,after:a.timing.gpuMs.p95},drawCalls:{before:b.timing.drawCalls.p95,after:a.timing.drawCalls.p95}};receipt.views.push(row);
 for(const [label,dir,v] of [['before',beforePath,b],['after',afterPath,a]]){const bytes=await readFile(`${dir}/${a.id}.png`);assert.equal(hash(bytes),v.imageSha256);await copyFile(`${dir}/${a.id}.png`,`${outPath}/${a.id}-${label}.png`);}
 sections+=`<section><h2>${esc(a.id)}</h2>${a.inspectionNote?`<p class="warning">${esc(a.inspectionNote)}</p>`:''}${obstruction?`<p class="warning">${esc(obstruction)}</p>`:''}<p>Frame p95 ${row.frameP95.before.toFixed(2)} → ${row.frameP95.after.toFixed(2)} ms · GPU p95 ${row.gpuP95.before.toFixed(2)} → ${row.gpuP95.after.toFixed(2)} ms · calls ${row.drawCalls.before} → ${row.drawCalls.after}</p><div class="pair">${['before','after'].map(label=>`<figure><img src="${a.id}-${label}.png" alt="${label}: ${esc(a.id)}"><figcaption>${label==='before'?'Before: eastern opening candidate':'After: central roof interface candidate'}</figcaption></figure>`).join('')}</div></section>`;
}
assert.equal(before.errors.length,0);assert.equal(after.errors.length,0);
await writeFile(outPath+'/comparison.json',JSON.stringify(receipt,null,2)+'\n');
await Promise.all([
 ['.local/station-realism/central-interface-native-01/report.json','native.json'],
 ['.local/station-realism/station-central-interface-01/interface-rebuild.json','interface-rebuild.json'],
 ['.local/station-realism/central-interface-course-impact-01.json','course-impact.json'],
 ['.local/station-realism/central-interface-eastern-controls-01.json','eastern-controls.json'],
 ['.local/station-realism/central-interface-campaign-01/summary.json','campaign.json'],
 ['.local/station-realism/central-interface-runtime-02.log','runtime.log'],
 [beforePath+'/capture.json','before-capture.json'],[afterPath+'/capture.json','after-capture.json']
].map(([source,name])=>copyFile(source,outPath+'/'+name)));

await writeFile(outPath+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kyoto central roof interface</title><style>body{margin:0;background:#111d23;color:#e8efed;font:16px/1.5 system-ui}main{max-width:1500px;margin:auto;padding:28px}h1{font-size:36px}p{max-width:1000px;color:#bacccf}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{margin:0}img{width:100%;display:block}figcaption{font-size:14px;padding:8px 0}section{border-top:1px solid #3d555d;padding:20px 0}.warning{color:#eed39a}a{color:#a8dff3}@media(max-width:800px){.pair{grid-template-columns:1fr}main{padding:16px}}</style><main><h1>Central roof and facade integration</h1><p>The central canopy and its two transverse roofs now follow 113 registered municipal roof faces. Both affected frontage meshes are rebuilt from the original source triangles, preserving UVs, normals, the earlier eastern-roof exclusion and the vertical side faces within their clipping boundaries.</p><p class="warning">Construction candidate: 16 duplicate imported-roof overlaps are resolved. Three conflicts with the old canopy remain. Skyway Trapdoor fails its authored solution because the new roof intercepts the ball at 0.561 s; the other 30 authored shots retain their previous paths and results. This candidate is not ready for promotion.</p><p>Actual game in Chrome ${esc(before.browser)} at 1280×720. Five seconds warmup and twenty seconds per fixed view. This single pair is diagnostic; it does not establish repeated gameplay performance or the required long soak.</p><p>All 528 exported-scene/native first-hit comparisons pass, including 278 controls around the existing eastern roof. Component-first hits still expose the three old-canopy conflicts. No final architectural, material, lighting or gameplay milestone is accepted.</p>${sections}<p>Municipal source geometry and textures: Kyoto City, CC BY 4.0; geometry modified for this local construction study. No reference photographs are included in the game asset.</p><p><a href="comparison.json">Comparison receipt</a> · <a href="native.json">528 geometry probes</a> · <a href="eastern-controls.json">Eastern controls</a> · <a href="interface-rebuild.json">Interface construction</a> · <a href="campaign.json">31 authored shots</a> · <a href="course-impact.json">Failed shot analysis</a> · <a href="runtime.log">Runtime suite</a> · <a href="before-capture.json">Before capture</a> · <a href="after-capture.json">After capture</a></p></main></html>`);console.log(JSON.stringify(receipt.views));
