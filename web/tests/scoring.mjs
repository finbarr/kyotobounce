import assert from 'node:assert/strict';
import {scoreAttempt} from '../scoring.ts';
import {Store} from '../store.ts';
import {SCORING_VERSION} from '../types.ts';
const p=(x,y=.023,z=0)=>({x,y,z});
const challenge={id:'test',revision:1,name:'Test',creator:'test',throwModel:'robot-v3',scoring:'accuracy-v3',start:{center:p(0,0),radius:.75,surface:'floor'},goal:{center:p(10,0),radius:1,surface:'floor'},layout:'layout',physics:'physics'};
const pose=(x,y=.023,z=0,t=1)=>({t,p:p(x,y,z),q:{x:0,y:0,z:0,w:1}});
const hit=(surface,time,x)=>({surface,label:surface,time,point:p(x,0),qualifying:true,speed:4});
const result=(extra={})=>({type:'result',attempt:'a',id:'guest',challenge,reason:'Ball stopped outside the goal',success:false,score:0,surfaces:1,impacts:1,duration:3,releaseTime:20,chargeTime:19,layout:'layout',physics:'physics',profile:'test',launchPosition:p(0,1),velocity:p(2,0),spin:p(0,0),poses:[pose(0,1,0,0),pose(8,.023,0,3)],contacts:[],...extra});
const dense=Array.from({length:200},(_,i)=>hit(`rail-${i}`,i*.01,i*.02));
const far=scoreAttempt(result({poses:[pose(0,1,0,0),pose(-80)],contacts:dense}));assert.equal(far.total,0,'Dense collisions far from the target score zero');
const clean=scoreAttempt(result());assert.ok(clean.total>0&&clean.total<6000,'A clean nearby finish earns partial credit');
const varied=Array.from({length:20},(_,i)=>hit(`bank-${i}`,i*.3,i));
const spam=scoreAttempt(result({contacts:varied}));assert.equal(spam.styleBanks,5);assert.ok(spam.total<=clean.total*1.25+1);
const repeat=scoreAttempt(result({contacts:varied.map(h=>({...h,surface:'wall'}))}));assert.equal(repeat.styleBanks,1,'Repeated wall collisions do not stack');
const treads=scoreAttempt(result({contacts:varied.map((h,i)=>({...h,surface:`escalator-step-${i}`}))}));assert.equal(treads.styleBanks,1,'Numbered treads are one surface family');
const chatter=scoreAttempt(result({contacts:varied.map(h=>({...h,point:p(1,0)}))}));assert.equal(chatter.styleBanks,1,'Adjacent fixture chatter does not stack');
const perfect=scoreAttempt(result({success:true,reason:'Target settled',poses:[pose(10)]}));assert.equal(perfect.accuracy,10000);
const tagged=scoreAttempt(result({poses:[pose(8,.023,0,0),pose(12,.023,0,1),pose(18,.023,0,2)]}));assert.equal(tagged.accuracy,7500,'Swept detection catches a fast goal crossing between poses');
const over=scoreAttempt(result({poses:[pose(8,3,0,0),pose(12,3,0,1),pose(18,3,0,2)]}));assert.equal(over.goalVisited,false,'Passing above the floor does not hit its goal');
const under=scoreAttempt(result({poses:[pose(8,-.5,0,0),pose(12,-.5,0,1),pose(18,-.5,0,2)]}));assert.equal(under.goalVisited,false,'A lower floor is not the goal');
const diagonal=scoreAttempt(result({poses:[pose(0,-10,0,0),pose(20,1,0,1)]}));assert.equal(diagonal.goalVisited,false,'Height and horizontal intervals must overlap in time');
const afterTag=scoreAttempt(result({poses:[pose(8,.023,0,0),pose(12,.023,0,.1),pose(18,.023,0,2)],contacts:varied.filter(h=>h.time>.1)}));assert.equal(afterTag.styleBanks,0,'No style farming after first goal entry');
for(const distance of [0,.1,.5,1,2,4,10]){
 const near=scoreAttempt(result({poses:[pose(11+distance,.023,0,3)],contacts:varied}));assert.ok(near.total<tagged.total,'Even a max-style miss ranks below a clean tag');
}
const bestTag=scoreAttempt(result({poses:[pose(8,.023,0,6),pose(12,.023,0,7),pose(18,.023,0,8)],contacts:varied}));assert.ok(bestTag.total<perfect.total,'A clean perfect ranks above even a max-style tag');
assert.equal(scoreAttempt(result({reason:'Recalled',poses:[pose(10)],contacts:varied})).total,0,'Recall forfeits points');
assert.equal(scoreAttempt(result({success:true,challenge:{...challenge,requiredSurface:'escalator'}})).total,0,'Special route is mandatory for any score');
assert.equal(scoreAttempt(result({success:true,contacts:varied})).total,12500,'Absolute score ceiling');
const s=new Store(':memory:');try{
 const g=s.guest();const legacy={...challenge,scoring:'distinct-v1'};s.saveChallenge(legacy);
 s.saveResult(result({id:g.id,attempt:'old',challenge:legacy,success:true,score:1100}),'ori-carry-v2');const old=JSON.stringify(s.replay('old'));
 s.upgradeScoring();s.upgradeScoring();const current=s.challenge('test');assert.equal(current.revision,2);assert.equal(current.scoring,SCORING_VERSION);assert.equal(s.challenge('test',1).scoring,'distinct-v1');assert.equal(JSON.stringify(s.replay('old')),old);
 assert.equal(s.leaderboard(current).length,0);assert.equal(s.leaderboard(legacy)[0].score,1100);
 const partial=result({id:g.id,attempt:'partial',challenge:current});partial.breakdown=scoreAttempt(partial);partial.score=partial.breakdown.total;
 assert.equal(s.saveResult(partial,'ori-carry-v2'),true);assert.equal(s.leaderboard(current)[0].score,partial.score);assert.equal(s.replay('partial').success,false);assert.equal(s.replay('partial').scoring,SCORING_VERSION);
 assert.equal(s.saveResult({...partial,score:99999},'ori-carry-v2'),false);assert.equal(s.replay('partial').score,partial.score);
}finally{s.close();}
console.log('PASS archived accuracy-v3 tiers, finite swept goal, distance, capped style, chatter, route gate, recall forfeit, partial replays and immutable legacy revision migration');
