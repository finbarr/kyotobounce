// Compare the installed soffit candidate with its exact parent; retain unresolved interfaces.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const base='.local/station-realism/',read=async p=>JSON.parse(await readFile(base+p)),sha=b=>createHash('sha256').update(b).digest('hex');
const [before,after,mask]=await Promise.all(['registered-roof-native-02/report.json','inner-roof-native-01/report.json','inner-roof-mask-check-02.json'].map(read));
assert.equal(mask.failures.length,0);assert.equal(mask.summary.samples,10725);
assert.equal(after.parentLayoutSha256,before.layoutSha256);assert.equal(after.failures.length,0);
const boundary=after.componentInterferences.filter(p=>p.target.includes('|source-'));
assert(boundary.every(p=>p.actual?.startsWith('central-roof-')));
const keys=p=>JSON.stringify([p.target,p.origin,p.direction]);
const prior=new Map(before.samples.map(p=>[keys(p),p]));
const changed=after.samples.filter(p=>prior.has(keys(p))&&prior.get(keys(p)).native?.surface!==p.native?.surface).map(p=>({target:p.target,before:prior.get(keys(p)).native?.surface,after:p.native?.surface,position:p.native?.center,browserNativeErrorM:p.error}));
assert.equal(changed.length,2);assert(changed.every(p=>p.before==='municipal-station-frontage-east-Untitled.200'&&p.after.startsWith('central-roof-')));
const remaining=after.componentInterferences.filter(p=>!p.target.includes('|source-')&&!p.actual?.startsWith('central-roof-'));
assert.equal(remaining.length,2);
const interfaces={parentLayoutSha256:before.layoutSha256,layoutSha256:after.layoutSha256,geometryProbes:after.samples.length,maximumBrowserNativeErrorM:Math.max(...after.samples.map(p=>p.error)),resolvedEasternProbes:changed,remainingStationInterfaces:remaining,boundaryProbesOccludedByRoof:boundary,unchangedOuterOnlyProbesWithTrussInFront:after.componentInterferences.filter(p=>!p.target.includes('|source-')&&p.actual?.startsWith('central-roof-')),limits:'A first-hit change is not automatically a defect. Boundary rays hit foreground roof members before the retained source surface in 26 cases; browser and native hits agree. The western source boundary and eastern cladding remain unresolved. Mask is a source correspondence test, not a structural-depth measurement.'};
await writeFile(base+'inner-roof-interface-impact-01.json',JSON.stringify(interfaces,null,2)+'\n');
const [oldCampaign,newCampaign]=await Promise.all(['registered-roof-campaign-01/summary.json','inner-roof-campaign-01/summary.json'].map(read));
assert.equal(oldCampaign.layout,before.layoutSha256);assert.equal(newCampaign.layout,after.layoutSha256);
const rows=[];
for(const r of newCampaign.receipts){const p=oldCampaign.receipts.find(x=>x.id===r.id);assert(p);assert.deepEqual(r.shot,p.shot);if(!r.pass||!p.pass){rows.push({id:r.id,parentPass:p.pass,candidatePass:r.pass,parentError:p.error,candidateError:r.error});continue;}
 const [a,b]=await Promise.all([`registered-roof-campaign-01/${p.index}-${p.id}.json`,`inner-roof-campaign-01/${r.index}-${r.id}.json`].map(read));
 assert.equal(a.poses.length,b.poses.length);
 const max=Math.max(...a.poses.map((v,i)=>Math.hypot(...['x','y','z'].map(k=>v.p[k]-b.poses[i].p[k]))));
 rows.push({id:r.id,poses:a.poses.length,identicalPoses:JSON.stringify(a.poses)===JSON.stringify(b.poses),maxPositionDifferenceM:max,sameDuration:a.duration===b.duration,sameHits:JSON.stringify(a.waypointHits)===JSON.stringify(b.waypointHits),sameDestination:a.destinationReached===b.destinationReached});
}
const campaign={parentLayoutSha256:before.layoutSha256,layoutSha256:after.layoutSha256,passCount:newCampaign.receipts.filter(r=>r.pass).length,executedRestCount:newCampaign.receipts.filter(r=>r.rest).length,failedCourses:newCampaign.receipts.filter(r=>!r.pass),rows};
await writeFile(base+'inner-roof-course-impact-01.json',JSON.stringify(campaign,null,2)+'\n');
const files=['registered-roof-browser-02/atrium.glb','inner-roof-browser-01/atrium.glb'],bytes=await Promise.all(files.map(p=>readFile(base+p))),glbs=bytes.map(readGLB);
assert.deepEqual(glbs[0].json.materials,glbs[1].json.materials);assert.deepEqual(glbs[0].json.textures,glbs[1].json.textures);
const images=glbs.map(({json,bin})=>new Map(json.images.map(im=>{const v=json.bufferViews[im.bufferView];return [im.name,bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)];})));
assert.equal(images[0].size,glbs[0].json.images.length);assert.equal(images[1].size,images[0].size);
const imageRows=[];
for(const [name,a]of images[0]){const b=images[1].get(name);assert(b);assert(a.equals(b),`Encoded image differs: ${name}`);const {data,info}=await sharp(a).raw().toBuffer({resolveWithObject:true});imageRows.push({name,width:info.width,height:info.height,pixelSha256:sha(data),identicalEncodedBytes:true});}
const textures={files:files.map(f=>base+f),glbSha256:bytes.map(sha),images:imageRows.length,identicalPixels:imageRows.length,identicalEncodedImages:imageRows.length,materialsIdentical:true,rows:imageRows};
await writeFile(base+'inner-roof-texture-parity-01.json',JSON.stringify(textures,null,2)+'\n');
console.log(JSON.stringify({geometryProbes:interfaces.geometryProbes,resolved:changed.length,remaining:remaining.length,foregroundBoundaryHits:boundary.length,coursePasses:campaign.passCount,identicalPoses:rows.filter(r=>r.identicalPoses).length,maxPositionDifferenceM:Math.max(...rows.map(r=>r.maxPositionDifferenceM||0)),identicalImages:imageRows.length}));
