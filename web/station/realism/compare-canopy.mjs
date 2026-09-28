// Actual-game canopy diagnostics; deliberately separate from milestone acceptance.
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
assert.deepEqual(changedSources.sort(),['web/public/station-lighting.js','web/public/station-look.js','web/public/station-materials.js']);
assert.equal(before.source.candidateAssets.layoutSha256,after.source.candidateAssets.layoutSha256);
const receipt={kind:'One diagnostic pair; fixed views do not establish gameplay/soak acceptance',before:beforePath,after:afterPath,changedSources,reflections:{before:before.reflections,after:after.reflections},errors:{before:before.errors,after:after.errors},warnings:{before:before.warnings,after:after.warnings},views:[]};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');let sections='';
for(const a of after.views){const b=before.views.find(v=>v.id===a.id);assert.ok(b);assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.buffer,b.buffer);
 for(const v of [a,b]){assert.equal(v.timing.hiddenFrames,0);assert.equal(v.timing.disjoints,0);}
 const row={id:a.id,inspectionNote:a.inspectionNote,frameP95:{before:b.timing.frameMs.p95,after:a.timing.frameMs.p95},frameP99:{before:b.timing.frameMs.p99,after:a.timing.frameMs.p99},gpuP95:{before:b.timing.gpuMs.p95,after:a.timing.gpuMs.p95},drawCalls:{before:b.timing.drawCalls.p95,after:a.timing.drawCalls.p95}};receipt.views.push(row);
 for(const [label,dir,v] of [['before',beforePath,b],['after',afterPath,a]]){const bytes=await readFile(`${dir}/${a.id}.png`);assert.equal(hash(bytes),v.imageSha256);await copyFile(`${dir}/${a.id}.png`,`${outPath}/${a.id}-${label}.png`);}
 sections+=`<section><h2>${esc(a.id)}</h2>${a.inspectionNote?`<p class="warning">${esc(a.inspectionNote)}</p>`:''}<p>Frame p95 ${row.frameP95.before.toFixed(2)} → ${row.frameP95.after.toFixed(2)} ms · GPU p95 ${row.gpuP95.before.toFixed(2)} → ${row.gpuP95.after.toFixed(2)} ms · calls ${row.drawCalls.before} → ${row.drawCalls.after}</p><div class="pair">${['before','after'].map(label=>`<figure><img src="${a.id}-${label}.png" alt="${label}: ${esc(a.id)}"><figcaption>${label==='before'?'Shared clear glass and interior probes':'Separate canopy glass and exterior reflection'}</figcaption></figure>`).join('')}</div></section>`;
}
assert.equal(before.errors.length,0);assert.equal(after.errors.length,0);
await writeFile(outPath+'/comparison.json',JSON.stringify(receipt,null,2)+'\n');
await writeFile(outPath+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kyoto canopy glass comparison</title><style>body{margin:0;background:#111d23;color:#e8efed;font:16px/1.5 system-ui}main{max-width:1500px;margin:auto;padding:28px}h1{font-size:36px}p{max-width:1000px;color:#bacccf}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{margin:0}img{width:100%;display:block}figcaption{font-size:14px;padding:8px 0}section{border-top:1px solid #3d555d;padding:20px 0}.warning{color:#eed39a}a{color:#a8dff3}@media(max-width:800px){.pair{grid-template-columns:1fr}main{padding:16px}}</style><main><h1>Canopy glass: material and reflection study</h1><p>The canopy now has its own material and a north-exterior reflection capture. Its inner face uses the existing interior captures. Tint, coverage and reflectance are provisional; geometry is unchanged and remains visibly inaccurate against the registered photograph.</p><p>Actual game in Chrome ${esc(before.browser)} at 1280×720. Five seconds warmup and twenty seconds per fixed view. One pair is diagnostic, not a performance milestone or a live gameplay soak.</p><p>The manufacturer's historical photographs support strong exterior reflections but do not establish optical coefficients. Single-probe reflection parallax, canopy geometry and evening lighting remain open.</p>${sections}<p><a href="comparison.json">Exact comparison receipt</a></p></main></html>`);console.log(JSON.stringify(receipt.views));
