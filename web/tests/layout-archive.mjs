import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../store.ts';import {migrateLayouts} from '../layout-migration.ts';import {LayoutAssets} from '../layout-assets.ts';import {Competition} from '../competition.ts';
const tmp=await mkdtemp(join(tmpdir(),'kyoto-layout-archive-')),path=join(tmp,'db.sqlite'),old=createHash('sha256').update('collision').digest('hex'),next='b'.repeat(64),physics='kyoto-p3-2';
let store=new Store(path);const disk={center:{x:0,y:0,z:0},radius:.75,surface:'floor'};const course={id:'course',revision:1,creator:'guest',name:'Old course',layout:old,physics,throwModel:'robot-v4',scoring:'waypoint-v1',start:disk,goal:null,waypoints:[{...disk,id:'w',normal:{x:0,y:1,z:0}}]};
try{
 // Deliberately unnormalized historical JSON must survive restart and migration.
 const raw=JSON.stringify({...course,allowedInputs:undefined});store.db.prepare('INSERT INTO challenges VALUES (?,?,?,?,?)').run(course.id,1,course.creator,raw,1);store.close();store=new Store(path);assert.equal(store.db.prepare('SELECT body FROM challenges WHERE id=?').get(course.id).body,raw);
 const blocked={...course,id:'blocked',requiredSurface:'removed-lane'};store.saveChallenge(blocked);store.saveChallenge({...course,id:'starter',creator:'station'});store.saveChallenge({...course,id:'invalid',start:{...disk,center:{x:99,y:0,z:0}}});
 const sent=[],worker={ready:true,capabilities:['waypoint-v1'],send:m=>sent.push(m),request:async m=>{sent.push(m);if(m.start?.center.x===99)throw new Error('The waypoint face is blocked');return {ok:true};}};
 const report=await migrateLayouts(store,worker,next,physics,new Set(['floor']));assert.equal(report.find(x=>x.id==='course').status,'migrated');assert.equal(store.challenge('course').revision,2);assert.equal(store.challenge('course').layout,next);assert.equal(store.challenge('blocked').revision,1);assert.equal(store.challenge('invalid').revision,1);assert.equal(store.challenge('starter').revision,1);
 const count=store.revisions().length;await migrateLayouts(store,worker,next,physics,new Set(['floor']));assert.equal(store.revisions().length,count,'repeat migration never duplicates successful revisions');assert.equal(store.db.prepare('SELECT body FROM challenges WHERE id=? AND revision=1').get(course.id).body,raw);
 const proof={id:'starter',revision:1,fromLayout:old,toLayout:next,physics,status:'pass',nativeRest:true,destinationReached:true,receipt:'isolated-test-fixture'};await migrateLayouts(store,worker,next,physics,new Set(['floor']),[{...proof,toLayout:'c'.repeat(64)}]);assert.equal(store.challenge('starter').revision,1,'proof from another target cannot migrate starter');await migrateLayouts(store,worker,next,physics,new Set(['floor']),[proof]);assert.equal(store.challenge('starter').revision,2);
 const competition=new Competition(store,worker,()=>{});competition.layout=next;competition.physics=physics;const catalog=competition.catalog();assert.ok(catalog.challenges.every(c=>c.layout===next));assert.ok(catalog.archived.some(c=>c.id==='course'&&c.revision===1));
 await assert.rejects(competition.command({id:'member',restoring:false},{type:'select-challenge',challengeId:'course',revision:1}),/archived/);
 const root=join(tmp,'public'),base=`/assets/layouts/${old}/`;await mkdir(join(root,base),{recursive:true});const assets={};
 for(const [key,name]of Object.entries({atrium:'atrium.glb',station:'station.json',detail:'detail.glb',detailMeta:'detail.json',robot:'robot.glb',collision:'station-layout.json'})){
  const bytes=Buffer.from(key==='station'?JSON.stringify({layoutSha256:old}):key==='detailMeta'?JSON.stringify({sourceLayoutSha256:old}):key);await writeFile(join(root,base,name),bytes);assets[key]={url:base+name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 }
 const registry=new LayoutAssets({[old]:{layout:old,assets}},root);await registry.bundle(old);await assert.rejects(registry.bundle(next),/not registered/);await writeFile(join(root,base,'atrium.glb'),'BROKEN');await assert.rejects(registry.bundle(old),/corrupt|checksum/);
 console.log('PASS immutable historical JSON, append-only/idempotent native-validation migration, starter proof binding, archived catalog and corrupt/missing bundle refusal');
}finally{store.close();await rm(tmp,{recursive:true,force:true});}
