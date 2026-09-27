// CPU-only diagnostic in the same Chrome instance, after live control checks.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {hash} from './source-variant.mjs';
export async function measureEscalatorCost(page,ref='14091f0'){
 const baselineSource=execFileSync('git',['show',`${ref}:web/public/escalators.js`],{encoding:'utf8'});
 const candidateSource=await readFile('web/public/escalators.js','utf8');
 assert.equal(hash(execFileSync('git',['show',`${ref}:assets-manifest.json`])),hash(await readFile('assets-manifest.json')),'Same authored assets');
 const stationBytes=await readFile('web/public/assets/station.json'),detailBytes=await readFile('web/public/assets/atrium-detail.json');
 const data=await page.evaluate(async source=>{
  // Drain the already queued frame, then measure with rendering stopped. This
  // page is closed immediately afterwards; no production behavior is changed.
  window.requestAnimationFrame=()=>0;await new Promise(resolve=>setTimeout(resolve,50));
  const THREE=await import('three'),{createEscalators}=await import('/escalators.js');
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  const baselineModule=await import(url);URL.revokeObjectURL(url);
  const specs=(await(await fetch('/assets/station.json')).json()).escalators;
  const supports=(await(await fetch('/assets/atrium-detail.json')).json()).combSupports;
  const scenes={baseline:new THREE.Scene(),candidate:new THREE.Scene()};
  const updates={baseline:baselineModule.createEscalators(scenes.baseline,specs,supports),candidate:createEscalators(scenes.candidate,specs,supports)};
  const views=[{name:'hall',position:[0,2.5,-25],target:[0,13,2]},{name:'escalators',position:[-47,10,14],target:[-90,22,16]},{name:'garden',position:[-156,58,24],target:[-142,57,18]},{name:'concourse',position:[32,2.5,0],target:[26,3,14]}];
  const iterations=1000,results=[];
  const versions=scene=>scene.children.reduce((n,g)=>n+g.children[0].instanceMatrix.version+g.children[0].geometry.attributes.treadSize.version,0);
  const median=xs=>xs.toSorted((a,b)=>a-b)[Math.floor(xs.length/2)];
  try{
   for(const view of views){
    const camera=new THREE.PerspectiveCamera(55,1440/900,.035,450);camera.position.fromArray(view.position);camera.lookAt(...view.target);camera.updateMatrixWorld();
    for(const variant of ['baseline','candidate'])for(let i=0;i<200;i++)updates[variant](123+i/60,camera);
    const batches=[];
    for(let pair=1;pair<=5;pair++)for(const variant of pair%2?['baseline','candidate']:['candidate','baseline']){
     const before=versions(scenes[variant]),started=performance.now();
     for(let i=0;i<iterations;i++)updates[variant](123+i/60,camera);
     const ms=performance.now()-started,dirtyMarks=versions(scenes[variant])-before;
     batches.push({pair,variant,ms,msPerUpdate:ms/iterations,bufferDirtyMarksPerUpdate:dirtyMarks/iterations});
    }
    const baselineMs=median(batches.filter(b=>b.variant==='baseline').map(b=>b.msPerUpdate)),candidateMs=median(batches.filter(b=>b.variant==='candidate').map(b=>b.msPerUpdate));
    results.push({name:view.name,batches,baselineMs,candidateMs,reductionPercent:100*(1-candidateMs/baselineMs),candidateLanes:{...updates.candidate.stats}});
   }
  }finally{
   for(const scene of Object.values(scenes)){const materials=new Set();scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();materials.add(o.material);}});for(const material of materials)material.dispose();}
  }
  return {iterations,lanes:specs.length,results};
 },baselineSource);
 return {date:new Date().toISOString(),browser:page.context().browser().version(),ref,...data,hashes:{baseline:hash(baselineSource),candidate:hash(candidateSource),station:hash(stationBytes),details:hash(detailBytes)},scope:'Chrome CPU pose calculation and buffer dirty marks with rendering stopped; no GPU upload timing'};
}
