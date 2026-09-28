// Matched actual-game views after removing two source-contradicted eastern boxes.
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
const native=JSON.parse(await readFile('.local/station-realism/east-clearance-native-openings-01/report.json'));
const campaign=JSON.parse(await readFile('.local/station-realism/east-clearance-campaign-01/summary.json'));
assert.equal(native.layoutSha256,after.source.candidateAssets.layoutSha256);
assert.equal(campaign.layout,native.layoutSha256);assert.equal(native.samples.length,278);assert.equal(native.failures.length,0);
assert.equal(campaign.receipts.length,31);assert(campaign.receipts.every(r=>r.pass&&r.rest));
const receipt={kind:'One diagnostic pair; fixed views do not establish gameplay/soak acceptance',before:beforePath,after:afterPath,layoutSha256:native.layoutSha256,nativeSamples:native.samples.length,nativeMaxErrorM:Math.max(...native.samples.map(r=>r.error)),fullRestCoursePasses:campaign.receipts.length,changedSources,reflections:{before:before.reflections,after:after.reflections},errors:{before:before.errors,after:after.errors},warnings:{before:before.warnings,after:after.warnings},views:[]};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');let sections='';
for(const a of after.views){const b=before.views.find(v=>v.id===a.id);assert.ok(b);assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.buffer,b.buffer);
 for(const v of [a,b]){assert.equal(v.timing.hiddenFrames,0);assert.equal(v.timing.disjoints,0);}
 const obstruction=null;
 const row={id:a.id,obstruction,inspectionNote:a.inspectionNote,frameP95:{before:b.timing.frameMs.p95,after:a.timing.frameMs.p95},frameP99:{before:b.timing.frameMs.p99,after:a.timing.frameMs.p99},gpuP95:{before:b.timing.gpuMs.p95,after:a.timing.gpuMs.p95},drawCalls:{before:b.timing.drawCalls.p95,after:a.timing.drawCalls.p95}};receipt.views.push(row);
 for(const [label,dir,v] of [['before',beforePath,b],['after',afterPath,a]]){const bytes=await readFile(`${dir}/${a.id}.png`);assert.equal(hash(bytes),v.imageSha256);await copyFile(`${dir}/${a.id}.png`,`${outPath}/${a.id}-${label}.png`);}
 sections+=`<section><h2>${esc(a.id)}</h2>${a.inspectionNote?`<p class="warning">${esc(a.inspectionNote)}</p>`:''}${obstruction?`<p class="warning">${esc(obstruction)}</p>`:''}<p>Frame p95 ${row.frameP95.before.toFixed(2)} → ${row.frameP95.after.toFixed(2)} ms · GPU p95 ${row.gpuP95.before.toFixed(2)} → ${row.gpuP95.after.toFixed(2)} ms · calls ${row.drawCalls.before} → ${row.drawCalls.after}</p><div class="pair">${['before','after'].map(label=>`<figure><img src="${a.id}-${label}.png" alt="${label}: ${esc(a.id)}"><figcaption>${label==='before'?'Before: eastern roof interface candidate':'After: obsolete slab and backing removed'}</figcaption></figure>`).join('')}</div></section>`;
}
assert.equal(before.errors.length,0);assert.equal(after.errors.length,0);
await writeFile(outPath+'/comparison.json',JSON.stringify(receipt,null,2)+'\n');
await writeFile(outPath+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kyoto eastern roof opening</title><style>body{margin:0;background:#111d23;color:#e8efed;font:16px/1.5 system-ui}main{max-width:1500px;margin:auto;padding:28px}h1{font-size:36px}p{max-width:1000px;color:#bacccf}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{margin:0}img{width:100%;display:block}figcaption{font-size:14px;padding:8px 0}section{border-top:1px solid #3d555d;padding:20px 0}.warning{color:#eed39a}a{color:#a8dff3}@media(max-width:800px){.pair{grid-template-columns:1fr}main{padding:16px}}</style><main><h1>Restoring the open space above the eastern roof</h1><p>Two old draft pieces obscured the source-derived curved roof: a flat slab at 59.55 m and a long vertical backing wall. Exact municipal source sections, triangle/box intersections and the published station axonometric contradict those pieces. They are now removed from both the Blender scene and native collision layout. The curved roof, source facade and retained attachments are unchanged.</p><p>All 278 declared visual/native rays pass, including three that previously hit the obsolete slab or backing and three controls through retained geometry. All 31 authored shots retain their exact previous durations, waypoint hits, final positions and destination results, and finish at full rest.</p><p class="warning">The remaining old canopy, inner framing and Skyway still need coordinated replacement. Surface quality, joints, member placement and lighting remain unfinished. These are architectural inspection views, not registered photographic comparisons or a completed visual milestone.</p><p>Actual game in Chrome ${esc(before.browser)} at 1280×720. Five seconds warmup and twenty seconds per fixed view. The matched captures diagnose local rendering cost; repeated gameplay trials and the required long soak remain separate acceptance gates.</p>${sections}<p><a href="comparison.json">Exact comparison receipt</a></p></main></html>`);console.log(JSON.stringify(receipt.views));
