// Use one collision pack and run engines sequentially. No native worker or
// duplicated station assets are needed; each child closes its own browser.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {browserEngines} from './browser-engine.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';

const receiptPath='.local/browser-physics/browser-engine-matrix.json',results=[];
await rm(receiptPath,{force:true});
async function run(file,args=[],env={}){
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[`web/tests/${file}.mjs`,...args],{stdio:'inherit',env:{...process.env,...env}});
  child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(`${file} exited ${signal||code}`)));
 });
}
// Always refresh the reference using current source before comparing engines.
await run('browser-campaign');
const reference=JSON.parse(await readFile('.local/browser-physics/campaign-proof.json'));
for(const engine of browserEngines){
 const env={KYOTO_TEST_BROWSER:engine};
 await run('browser-physics-worker',['--campaign'],env);
 await run('verification-browser',[],env);
 const campaign=JSON.parse(await readFile(`.local/browser-physics/campaign-worker-${engine}-proof.json`)),controls=JSON.parse(await readFile(`.local/browser-physics/verification-browser-${engine}-proof.json`));
 assert.equal(campaign.engine,engine);assert.equal(controls.engine,engine);assert.equal(campaign.physics,BROWSER_PHYSICS);assert.equal(controls.physics,BROWSER_PHYSICS);
 assert.equal(campaign.ready.layout,reference.layout);assert.equal(campaign.results.length,32);assert.equal(controls.results.length,2);assert.equal(controls.launches,30);
 results.push({engine,browser:campaign.browser,cases:campaign.results.length,launches:controls.launches,controls:controls.results,heartbeat:campaign.heartbeat});
}
await writeFile(receiptPath,JSON.stringify({physics:BROWSER_PHYSICS,layout:reference.layout,catalogSha256:reference.catalogSha256,results},null,2)+'\n');
console.log('PASS all three engines: 30 courses + two regressions repeated exactly offline; real walking/throwing controls independently verified');
