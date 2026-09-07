// Preserve the actual timed shot as a candidate witness; keep earlier challenge
// revisions and their boards instead of rewriting accepted challenge geometry.
import { readFile,writeFile } from 'node:fs/promises';
import { Client } from './api-client.mjs';
import { Store } from '../store.ts';
const failed=JSON.parse(await readFile('artifacts/phase3/browser-starters/result.json','utf8'));
const result=failed.events.find(e=>e.type==='result'&&e.challenge?.id==='atrium-moving-return');
if(!result||result.success||result.surfaces<2)throw new Error('Expected the recorded moving-bank candidate');
const client=new Client();
try{
 await client.join();await client.request('select-challenge',{challengeId:null},'selected');
 const challenges=JSON.parse(await readFile('web/starter-challenges.json','utf8')),c=challenges.find(c=>c.id==='atrium-moving-return');
 c.goal=await client.place(failed.latest.ball,1.5,'goal');c.revision=2;c.hint.holdMs=Math.round(result.thrower.power*1200);c.hint.releasePhase=result.releaseTime%c.hint.period;
 c.hint.note=`Bank off the moving tread and return to the far circle. Set the suggested aim, hold near ${Math.round(c.hint.holdMs/12)}% power and release at the green timing mark.`;
 await writeFile('artifacts/phase3/challenge-probes/moving-return-candidate.json',JSON.stringify({source:'browser-starters initial moving miss',result,settled:failed.latest.ball,challenge:c},null,2)+'\n');
 await writeFile('web/starter-challenges.json',JSON.stringify(challenges,null,2)+'\n');
 const store=new Store('web/data/kyoto.sqlite');try{if(!store.challenge(c.id,c.revision))store.saveChallenge(c);}finally{store.close();}
 console.log('Prepared Moving Return revision',c.revision,'hold',c.hint.holdMs,'phase',c.hint.releasePhase,'goal',c.goal.center);
}finally{client.close();}
