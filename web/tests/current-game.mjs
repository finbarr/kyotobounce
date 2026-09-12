import assert from 'node:assert/strict';
import {Store} from '../store.ts';
import {Competition} from '../competition.ts';
import {THROW_MODEL,SCORING_VERSION,PHYSICS_VERSION} from '../types.ts';
const store=new Store(':memory:');
try{
 const guest=store.guest(),disk={center:{x:0,y:0,z:0},radius:1,surface:'floor'};
 const current={id:'current',revision:2,creator:guest.id,name:'Current course',start:disk,goal:disk,layout:'station',physics:PHYSICS_VERSION,scoring:SCORING_VERSION,throwModel:THROW_MODEL};
 store.saveChallenge(current);
 const old=[{...current,id:'old-layout',layout:'previous-station'},{...current,id:'old-physics',physics:'previous-physics'},{...current,id:'old-scoring',scoring:'retired'},{...current,id:'old-launch',throwModel:'retired'}];
 for(const c of old)store.saveChallenge(c);
 // Existing development databases can have several rows for the same course.
 store.db.prepare('INSERT INTO challenges VALUES (?,?,?,?,?)').run(current.id,1,current.creator,JSON.stringify({...current,revision:1}),0);
 const result=(c,id)=>({attempt:id,id:guest.id,challenge:c,layout:c.layout,physics:c.physics,score:10000,success:true,surfaces:0,duration:4,poses:[{t:0,p:{x:0,y:1,z:0},q:{x:0,y:0,z:0,w:1}}],contacts:[]});
 for(const c of old)store.saveResult(result(c,c.id),'ori-carry-v2');
 store.saveResult(result(current,'current-shot'),'ori-carry-v2');
 store.saveResult(result({...current,revision:1},'old-revision'),'ori-carry-v2');
 store.setSetting(`selected:${guest.id}`,{id:current.id,revision:1});
 const requests=[],worker={ready:false,send:m=>requests.push(m),request:async m=>{requests.push(m);return {ok:true};}};
 const game=new Competition(store,worker,()=>{}),member=await game.add(guest,'session');worker.ready=true;
 await game.ready({layout:current.layout,physics:current.physics});
 assert.deepEqual(store.list().map(c=>c.id),[current.id]);
 assert.equal(store.db.prepare('SELECT count(*) n FROM challenges').get().n,1);
 assert.equal(store.db.prepare('SELECT count(*) n FROM attempts').get().n,1);
 assert.equal(member.selected.revision,2,'An old selected preference resolves to the current course');
 assert.equal(store.replay('old-revision'),null);assert.equal(store.replay('old-layout'),null);
 assert.equal((await game.command(member,{type:'replay',attempt:'current-shot'})).replay.score,10000);
 assert.equal('archived' in game.catalog(),false);
 const stable=JSON.stringify(store.replay('current-shot'));await game.ready({layout:current.layout,physics:current.physics});assert.equal(JSON.stringify(store.replay('current-shot')),stable,'Restart retains current scores');
 assert.equal(store.guest(guest.token).id,guest.id,'Cleanup does not discard player identity');
 await assert.rejects(game.command(member,{type:'select-challenge',challengeId:current.id,revision:1}),/not found/);
 assert.throws(()=>store.discardRetired('station','unknown-worker'),/Unsupported/);
 assert.equal(store.replay('current-shot').score,10000,'An invalid worker cannot clear the current game');
 // Replacing the campaign removes old station courses even on the same layout.
 const station={...current,id:'retained-stage',creator:'station',revision:1};
 const removed={...station,id:'removed-stage'},changed={...station,id:'changed-stage'};
 for(const c of [station,removed,changed]){store.saveChallenge(c);store.saveResult(result(c,c.id),'ori-carry-v2');}
 const replacement={...changed,revision:2,name:'New route'},added={...station,id:'added-stage'};
 store.syncCampaign([station,replacement,added]);
 assert.equal(store.challenge(removed.id),null);assert.equal(store.replay(removed.id),null);
 assert.equal(store.replay(changed.id),null);assert.equal(store.challenge(changed.id).revision,2);
 assert.equal(store.replay(station.id).score,10000);
 assert.equal(store.replay('current-shot').score,10000,'Player-created courses survive campaign replacement');
 store.syncCampaign([station,replacement,added]);
 assert.equal(store.replay(station.id).score,10000,'Restart preserves unchanged campaign scores');
 assert.throws(()=>store.syncCampaign([]),/Invalid/);
 assert.equal(store.challenge(station.id).name,station.name,'Invalid campaign fails without deleting data');
 const collision={...added,id:current.id,revision:current.revision};
 assert.throws(()=>store.syncCampaign([collision]),/belongs to a player/);
 assert.equal(store.challenge(station.id).name,station.name,'A failed replacement rolls back removals');
 console.log('PASS retired layout/rules/revision cleanup, current score retention, replay, guest selection and restart');
}finally{store.close();}
