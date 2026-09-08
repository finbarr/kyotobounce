// Assemble compact review evidence after both real-browser capture runs.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const out='artifacts/station-detail/photorealism',sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(await readFile(`${out}/baseline/receipt.json`,'utf8')),candidate=JSON.parse(await readFile(`${out}/candidate/receipt.json`,'utf8'));
assert.equal(baseline.samples.length>=6,true);assert.equal(candidate.samples.length,7);
const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];
const timings=r=>{const frames=r.samples.flatMap(s=>s.frameIntervals);return {count:frames.length,medianMs:percentile(frames,.5),p99Ms:percentile(frames,.99),minMs:Math.min(...frames),maxMs:Math.max(...frames)};};
const views=baseline.samples.slice(0,6).map(b=>{
 const c=candidate.samples.find(s=>s.label===b.label);assert.deepEqual(b.drawingBuffer,[1280,800]);assert.deepEqual(c.drawingBuffer,[1280,800]);
 const cameraError=Math.hypot(...b.state.camera.position.map((v,i)=>v-c.state.camera.position[i]));assert(cameraError<.05,`${b.label}: matched camera`);
 return {view:b.label,nativeFeet:c.state.feet,cameraErrorMeters:cameraError,draws:{baseline:b.state.render.calls,candidate:c.state.render.calls,delta:c.state.render.calls-b.state.render.calls},renderedTriangles:{baseline:b.state.render.triangles,candidate:c.state.render.triangles},textures:{baseline:b.memory.textures,candidate:c.memory.textures},geometries:{baseline:b.memory.geometries,candidate:c.memory.geometries}};
});
const source={};for(const path of ['web/public/station-look.js','web/public/station-materials.js','web/public/station-lighting.js']){const bytes=await readFile(path);source[path]={bytes:bytes.length,gzipBytes:gzipSync(bytes).length,sha256:sha(bytes)};}
const original=execFileSync('git',['show','4ee2976:web/public/station-look.js']);
const look=candidate.samples[0].look;
const report={task:'K026',status:'candidate checked; coordinator hardware gate pending',source,layout:sha(await readFile('runtime/station-layout.json')),workerAssemblySha256:sha(await readFile('/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll')),
 views,geometryAssetBytesChanged:0,geometryTrianglesAdded:0,geometryDrawBatchesAdded:0,
 download:{additionalImageRequests:0,binaryAssetByteDelta:0,javascriptByteDelta:Object.values(source).reduce((n,s)=>n+s.bytes,0)-original.length,javascriptGzipByteDelta:Object.values(source).reduce((n,s)=>n+s.gzipBytes,0)-gzipSync(original).length},
 memory:{baselineTextures:baseline.samples[0].memory.textures,candidateTextures:candidate.samples[0].memory.textures,generatedMicrotexturesBytes:look.generatedTextureBytes,graniteUploadBytesIncludingMipmaps:Math.round(2*1024*1024*4*4/3),graniteUploadDimensions:look.resampledMaps,pmremBytes:look.reflection.pmremBytes,pmremByteDelta:look.reflection.pmremBytes-6*1024*1024,transientCubeBytes:6*256*256*8,scope:'Calculated texture payloads, not driver allocation; PMREM generator scratch/framebuffers and sky-conversion targets are additional transient/renderer-owned storage.'},
 transitions:{scope:'Texture/probe counts fixed; existing dynamic tread geometry uploads lazily on first visibility and is bounded by the baseline geometry count. Candidate resumed after a transport disconnect.',geometryCounts:candidate.samples.map(s=>s.memory.geometries),shaderPrograms:candidate.samples.map(s=>s.programs),first:candidate.samples[0].memory,last:candidate.samples.at(-1).memory,captures:candidate.samples.map(s=>s.look.reflection.captures)},
 linuxSoftware:{gpu:candidate.samples[0].gpu,fixedDrawingBuffer:[1280,800],baseline:timings(baseline),candidate:timings(candidate),scope:'Sparse rAF diagnostics on SwiftShader, not hardware performance proof. Baseline used direct browser WebSocket and disconnected on optional return; candidate uses a local relay with redundant input coalescing, resumes after a transport disconnect, and records video. These timings are not a controlled cost comparison.'},
 hardwareGate:'Coordinator-owned Mac/Metal: 600 warmed frames, same fixed resolution, median <=18 ms and p99 <=25 ms. Full-rate temporal shimmer review remains part of that gate.'};
assert.equal(report.transitions.first.textures,report.transitions.last.textures);assert(report.transitions.last.geometries<=baseline.samples[0].memory.geometries);assert(report.transitions.captures.every(n=>n===3));
await writeFile(`${out}/cost-report.json`,JSON.stringify(report,null,2));
let html=await readFile('web/station/materials/review.html','utf8');html=html.replace('let receipts;','let receipts='+JSON.stringify([baseline,candidate]).replaceAll('<','\\u003c')+';');
await writeFile(`${out}/review.html`,html);console.log(JSON.stringify({status:'pass',views,download:report.download,memory:report.memory,linux:report.linuxSoftware},null,2));
