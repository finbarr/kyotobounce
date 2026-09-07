import { Client } from './api-client.mjs';
import { Store } from '../store.ts';
import { readFile,writeFile } from 'node:fs/promises';
const probes=JSON.parse(await readFile('artifacts/phase3/challenge-probes/moving-return-controlled.json','utf8')).results;
const a=probes[0],b=probes[1],offPhase=probes[2];
if(Math.abs(a.final.x-b.final.x)>.1||a.final.y<5||offPhase.final.x>0)throw new Error('Expected repeatable lift and distinct off-phase outcome');
const client=new Client();try{
 await client.join();await client.request('select-challenge',{challengeId:null},'selected');const challenges=JSON.parse(await readFile('web/starter-challenges.json','utf8')),c=challenges.find(c=>c.id==='atrium-moving-return');
 const center={...a.final,x:a.final.x+.3};c.goal=await client.place(center,.5,'goal');c.name='Catch the Lift';c.revision=3;c.hint={...a.settings,holdMs:a.holdMs,period:c.hint.period,releasePhase:a.phase,note:'Pitch down with backspin to catch an ascending tread. Hold near 35% power and release at the green mark; the ball rides to the first landing.'};
 await writeFile('web/starter-challenges.json',JSON.stringify(challenges,null,2)+'\n');await writeFile('artifacts/phase3/challenge-probes/moving-return-candidate.json',JSON.stringify({source:'controlled native phase comparison',challenge:c,examples:probes.map(p=>({phase:p.actualPhase,final:p.final,holdMs:p.holdMs,settings:p.settings}))},null,2)+'\n');
 const store=new Store('web/data/kyoto.sqlite');try{if(!store.challenge(c.id,c.revision))store.saveChallenge(c);}finally{store.close();}
 console.log('Prepared',c.name,'revision',c.revision,'goal',c.goal);
}finally{client.close();}
