import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/competition.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf(' let nextRequested=false;'),source.indexOf(" $('next-challenge').onclick=advanceCompleted;"));
function fixture(success,order=0,mode='play',phase='Result'){const sent=[],state={mode,lastResult:{success},selected:{order},challenges:[{order:0,id:'first',revision:1},{order:1,id:'last',revision:1}]};const advance=new Function('state','send','getPhase',`${body};return advanceCompleted;`)(state,(...x)=>sent.push(x),()=>phase);return {advance,sent};}
const success=fixture(true);assert.equal(success.advance(),true);assert.equal(success.advance(),true);assert.equal(success.sent.length,1);
for(const f of [fixture(false),fixture(true,1),fixture(true,0,'replay'),fixture(true,0,'play','Charging')]){assert.equal(f.advance(),false);assert.equal(f.sent.length,0);}
console.log('PASS completed-result next action, in-flight/replay/failed/final-level guards and one-shot request');
