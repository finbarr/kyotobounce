import assert from 'node:assert/strict';
import {StaticWorld} from '../public/physics/static-world.js';
import {compileVerificationWorld,emitVerificationWorld} from '../verification-world-build.mjs';
import {loadVerificationWorld} from '../verification-world.mjs';
import {v,identity} from '../public/physics/math.js';

const floor={kind:'box',id:'floor',material:'granite',position:v(0,-.5,0),half:v(50,.5,50),rotation:identity(),mask:3};
const square={kind:'mesh',id:'square',material:'steel',mask:3,vertices:new Float32Array([-2,1,-2,2,1,-2,2,1,2,-2,1,2,-2,1,-2]),indices:new Uint32Array([0,2,1,4,3,2])};
const angle=Math.PI/4,shapes=[floor,square,{...square,id:'duplicate',material:'rubber'},
 {...floor,id:'rotated',position:v(5,2,-3),half:v(1,1,1),rotation:{x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)}},
 {...floor,id:'capsule',kind:'capsule',radius:.2,half:v(.2,1,.2),position:v(-5,2,0),mask:1},
 {...floor,id:'signed-zero',position:v(0,-10,0),velocity:v(-0,0,0)},
 ...Array.from({length:150},(_,i)=>({...floor,id:'separate-'+i,half:v(.2,1,.2),position:v(i*2,1,20)}))];
const original=new StaticWorld({layoutSha256:'fixture',shapes,fallLimitY:-10,escalators:[]}),compiled=compileVerificationWorld(original),parts=new Map();
const manifest=await emitVerificationWorld(compiled,(name,bytes)=>parts.set(name,bytes.slice()),{partBytes:256,sourceSha256:'fixture'});
const world=await loadVerificationWorld(manifest,async name=>parts.get(name));
try{
 assert.deepEqual(world.stats,original.stats);
 assert.equal(compiled.arrays.vertices.length,12,'Repeated vertices are stored once without removing triangles');
 for(let i=0;i<shapes.length;i++)assert.deepEqual(world.info[i],original.info[i]);
 const cases=[{p:v(0,4,0),d:v(0,-6,0)},{p:v(2.01,4,-2),d:v(0,-6,0)},{p:v(5,2,4),d:v(0,0,-10)},{p:v(-8,2,0),d:v(6,0,0)},{p:v(0,.5,0),d:v(0,0,5)}];
 for(const {p,d}of cases)for(const radius of [0,.023,.24])for(const mask of [1,2,3])assert.deepEqual(world.sweep(p,d,radius,mask),original.sweep(p,d,radius,mask));
 for(const p of [v(0,.02,0),v(0,.99,0),v(5,2,-3),v(-5,2,0)])for(const mask of [1,2,3])assert.deepEqual(world.overlap(p,.023,mask),original.overlap(p,.023,mask));
 for(let repeat=0;repeat<2;repeat++)for(let i=0;i<150;i++){
  const p=v(i*2,.025,19),d=v(0,0,2);
  assert.deepEqual(world.capsuleSweep(p,d,.24,1.8,.025),original.capsuleSweep(p,d,.24,1.8,.025),'Capsule faces still agree after bounded-cache eviction');
 }
 const bad=new Map(parts),first=manifest.metadata.parts[0].name,changed=parts.get(first).slice();changed[0]^=1;bad.set(first,changed);
 await assert.rejects(()=>loadVerificationWorld(manifest,async name=>bad.get(name)),/checksum/);
 await assert.rejects(()=>loadVerificationWorld({...manifest,complete:false},async name=>parts.get(name)),/Incompatible/);
 await assert.rejects(()=>loadVerificationWorld({...manifest,layoutSha256:'wrong'},async name=>parts.get(name)),/layout/);
 const invalid=structuredClone(manifest);invalid.metadata.parts[0].name='../private';
 await assert.rejects(()=>loadVerificationWorld(invalid,async()=>assert.fail('Invalid path must not be read')),/Invalid/);
 console.log('PASS compiled verifier world: exact sweeps, overlaps, masks, primitive rotation, triangle order, capsule cache eviction and corrupted-part rejection');
}finally{world.free();original.free();}
