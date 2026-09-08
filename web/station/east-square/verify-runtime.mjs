import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Client} from '../../tests/api-client.mjs';
const layout=createHash('sha256').update(await readFile('.local/station-detail/candidate/station-layout.json')).digest('hex');
async function identity(){const c=new Client('ws://127.0.0.1:4283');try{await c.join();assert.equal(c.state.layout,layout);return c.state.physics;}finally{c.close();}}
const physics=await identity(),out='artifacts/station-detail/east-square/scoring.json';
for(const [cmd,args] of [['node',['web/tests/east-square-native.mjs']],['npm',['run','test:runtime']]]){
 const r=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,KYOTO_TEST_ORIGIN:'http://127.0.0.1:4283',KYOTO_TEST_OUTPUT:out}});if(r.status!==0)process.exit(r.status??1);
}
assert.equal(await identity(),physics);const scoring=JSON.parse(await readFile(out));scoring.layout=layout;scoring.physics=physics;await writeFile(out,JSON.stringify(scoring,null,2));
console.log('PASS K027 native/scoring checks bound to',layout);
