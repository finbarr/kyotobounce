import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {wayfindingRegistrations,wayfindingLayout} from '../../public/station-details.js';
const out='.local/station-detail';await mkdir(out,{recursive:true});
const hash=async path=>{const b=await readFile(path);return {bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const json=async path=>JSON.parse(await readFile(`${out}/${path}`));
const checks={};for(const [key,path] of Object.entries({native:'native.json',artwork:'artwork/checks.json',before:'before/runtime.json',after:'after/runtime.json'})){try{checks[key]=await json(path);}catch{checks[key]={status:'unavailable'};}}
// Compact runtime evidence retains honest failure, connection and movement results.
for(const key of ['before','after'])if(checks[key].samples)checks[key]={...checks[key],samples:checks[key].samples.map(({label,state:s})=>({label,ready:s?.ready,feet:s?.feet,camera:s?.camera,frameMs:s?.render?.frameMs}))};
const files=['web/public/station-details.js','web/station/wayfinding/README.md','web/station/wayfinding/receipt.mjs',...(await readdir('web/tests')).filter(f=>f.startsWith('station-wayfinding-')).map(f=>'web/tests/'+f),'runtime/station-layout.json','web/public/assets/atrium-detail.json'];
const sources=Object.fromEntries(await Promise.all(files.map(async f=>[f,await hash(f)])));
const worker='/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll';
const assembly=await hash(worker);if(assembly.sha256!=='9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef')throw Error('Wrong immutable worker');
const meta=JSON.parse(await readFile('web/public/assets/atrium-detail.json'));
const registrations=wayfindingRegistrations.map(r=>({...r,bounds:r.bounds||meta.signs.find(s=>s.id===r.id)?.bounds}));
await writeFile(`${out}/registrations.json`,JSON.stringify(registrations,null,2));
const evidence={};
for(const dir of ['', 'before', 'after', 'artwork']){for(const name of await readdir(`${out}/${dir}`)){if(!/\.(png|webm)$/.test(name)&&!['registration.log','build-web.log','native.json','runtime.json','checks.json'].includes(name))continue;const path=`${out}/${dir?dir+'/':''}${name}`;evidence[path]=await hash(path);}}
const receipt={evidence,task:'K030',date:'2026-09-08',baseline:'4ee2976',branch:'fleet/wayfinding-20260908',layout:wayfindingLayout,port:4286,worker:{path:worker,...assembly},sources,checks,sourceRegister:'web/station/wayfinding/README.md',registrationTable:'registrations.json',cost:{beforeSignMeshes:13,afterSignMeshes:5,retainedPosters:2,meshTriangleDelta:-16,newLights:0,newAnimationLoops:0},limitations:['All game transforms inferred, not surveyed. Unknown tenant identities suppressed.','Shop operator retrieval failed; K025 d250b649 branch registration inherited.','K026 unpublished at audit; combined material/identity integration review pending.','Software GPU normal-game moving/readability acceptance depends on runtime result, not artwork fixture.','Pinned layout fails closed on future geometry revisions; coordinator must review new registrations/hash.'],deployment:false};
await writeFile(`${out}/receipt.json`,JSON.stringify(receipt,null,2));console.log('Wrote compact receipt and explicit registration/source inventory');
