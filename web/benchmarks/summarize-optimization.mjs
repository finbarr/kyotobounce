// Rebuild the compact, reviewable receipt from ignored local measurements.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {hash,browserVariant} from './source-variant.mjs';
const dir='.local/stability';
const read=async label=>JSON.parse(await readFile(`${dir}/${label}.json`,'utf8'));
const median=values=>{const sorted=values.toSorted((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
const spread=values=>({median:median(values),min:Math.min(...values),max:Math.max(...values)});
const stages=['aim','walk','orbit','flight','fast-forward','hall','escalators','garden','concourse'];
const compact=r=>({label:r.label,date:r.date,pageTimeOrigin:r.pageTimeOrigin,sourceRef:r.sourceRef,browser:r.browser,machine:r.machine,gpu:r.gpu,viewport:r.viewport,display:r.display,power:r.power,workload:r.workload,cold:r.cold,fixtureHash:r.fixtureHash,harnessHashes:r.harnessHashes,sourceHash:hash(JSON.stringify(r.sourceHashes)),cpuThrottle:r.cpuThrottle,profile:r.profile,errors:r.errors,consoleMessages:r.consoleMessages,failedRequests:r.failedRequests,socketErrors:r.socketErrors,memoryStart:r.memoryStart,memoryEnd:r.memoryEnd,traceLag:r.traceLag,stages:r.stages.map(s=>({name:s.name,window:r.pageTimeOrigin?{start:new Date(r.pageTimeOrigin+s.samples[0].at-s.samples[0].dt).toISOString(),end:new Date(r.pageTimeOrigin+s.samples.at(-1).at).toISOString()}:undefined,measuredMs:s.samples.reduce((n,x)=>n+x.dt,0),visibility:s.visibility,summary:s.summary,mutations:s.mutations,dom:s.dom,memory:s.memory,audio:s.audio,shot:s.shot,diagnostics:s.diagnostics,contextLosses:s.contextLosses,longTasks:s.longTasks,loaf:s.loaf})),transport:{reports:r.reports.length,maxUnderrunMs:Math.max(0,...r.reports.map(x=>x.shotUnderrunMs||0)),reconnects:r.reports.reduce((n,x)=>n+(x.reconnects||0),0)}});
const pairs=[];for(let pair=1;pair<=5;pair++)pairs.push({pair,baseline:await read(`pair-${pair}-baseline`),candidate:await read(`pair-${pair}-candidate`)});
for(const variant of ['baseline','candidate'])assert.equal(new Set(pairs.map(p=>hash(JSON.stringify(p[variant].sourceHashes)))).size,1,variant+' sources are identical in all five runs');
assert.equal(new Set(pairs.flatMap(p=>[p.baseline,p.candidate]).map(r=>JSON.stringify(r.harnessHashes))).size,1,'One measurement harness');
assert.equal(new Set(pairs.flatMap(p=>[p.baseline,p.candidate]).map(r=>r.fixtureHash)).size,1,'One native trajectory and camera path');
for(const p of pairs)for(const v of ['baseline','candidate'])for(const s of p[v].stages){
 assert.equal(s.summary.hidden,0,'All primary comparison samples visible');
 assert.ok(s.samples.reduce((n,x)=>n+x.dt,0)>=29900,'Each primary scenario records at least 29.9 seconds of frame intervals');
 const start=s.samples[0].at-s.samples[0].dt,end=s.samples.at(-1).at;
 assert.equal((s.visibility||[]).some(e=>e.hidden&&e.at>=start&&e.at<=end),false,'No tab-hidden interval during primary samples');
}
const compare=selectedPairs=>stages.map(name=>{
 const values={};for(const variant of ['baseline','candidate']){const ss=selectedPairs.map(p=>p[variant].stages.find(s=>s.name===name).summary);values[variant]={cpuP95:spread(ss.map(s=>s.full.p95)),frameP95:spread(ss.map(s=>s.dt.p95)),frameP99:spread(ss.map(s=>s.dt.p99)),maxFrame:Math.max(...ss.map(s=>s.dt.max)),over50:ss.reduce((n,s)=>n+s.over50,0)};}
 const a=values.baseline,b=values.candidate,reduction=100*(1-b.cpuP95.median/a.cpuP95.median);
 const paired=selectedPairs.map(p=>{const a=p.baseline.stages.find(s=>s.name===name).summary,b=p.candidate.stages.find(s=>s.name===name).summary;return {pair:p.pair,cpuDeltaMs:b.full.p95-a.full.p95,frameDeltaMs:b.dt.p95-a.dt.p95,cpuRegression:b.full.p95-a.full.p95>Math.max(a.full.p95*.05,.5)+1e-6,frameRegression:b.dt.p95-a.dt.p95>Math.max(a.dt.p95*.05,.5)+1e-6};});
 return {name,...values,paired,cpuReductionPercent:reduction,pacingPass:b.frameP95.median<=18.5+1e-6&&b.frameP99.median<=33.4+1e-6,cpuTargetPass:reduction>=20-1e-6,regressionPass:b.cpuP95.median-a.cpuP95.median<=Math.max(a.cpuP95.median*.05,.5)+1e-6&&b.frameP95.median-a.frameP95.median<=Math.max(a.frameP95.median*.05,.5)+1e-6};
});
const comparison=compare(pairs);
const currentVariant=await browserVariant();
// Committing the measured files changes HEAD metadata, not their content.
for(const key of ['hashes','pinned'])assert.deepEqual(currentVariant.receipt[key],pairs[0].candidate.sourceHashes[key],'Current '+key+' still match the measured candidate');
const soak={};for(const variant of ['baseline','candidate']){const r=await read(`soak-${variant}`),s=r.stages.map(s=>s.summary),samples=r.stages.flatMap(s=>s.samples);soak[variant]={receipt:compact(r),visibleMinutes:samples.filter(s=>!s.hidden).reduce((n,s)=>n+s.dt,0)/60000,over50:s.reduce((n,s)=>n+s.over50,0),over100:s.reduce((n,s)=>n+s.over100,0),over200:s.reduce((n,s)=>n+s.over200,0),maxFrame:Math.max(...s.map(s=>s.dt.max)),maxCallback:Math.max(...s.map(s=>s.full.max)),hidden:s.reduce((n,s)=>n+s.hidden,0)};}
// Separate the first measured gameplay cycle from the rest of each live soak.
// Startup/readiness timing remains a separate receipt; both use a warm local service.
const quantiles=xs=>{const a=xs.toSorted((a,b)=>a-b);return {p50:a[Math.floor((a.length-1)*.5)],p95:a[Math.floor((a.length-1)*.95)],p99:a[Math.floor((a.length-1)*.99)],max:a.at(-1)};};
for(const variant of ['baseline','candidate']){
 const r=await read(`soak-${variant}`),all=r.stages.flatMap(s=>s.samples),start=all[0].at-all[0].dt;
 const summarize=samples=>({frames:samples.length,seconds:samples.reduce((n,s)=>n+s.dt,0)/1000,frameMs:quantiles(samples.map(s=>s.dt)),callbackMs:quantiles(samples.map(s=>s.full)),over50:samples.filter(s=>s.dt>50).length,over200:samples.filter(s=>s.dt>200).length});
 soak[variant].firstUse={firstTwoMinutes:summarize(all.filter(s=>s.at-start<=120000)),remaining:summarize(all.filter(s=>s.at-start>120000))};
}
const extra={};for(const label of ['stress-baseline','stress-candidate','dom-baseline','dom-candidate','stall-baseline','stall-candidate'])extra[label]=compact(await read(label));
const powerSamples=(await readFile('.local/optimization/power.jsonl','utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
const output={date:new Date().toISOString(),powerSamples,baseline:pairs[0].baseline.sourceHashes,candidate:pairs[0].candidate.sourceHashes,comparison,pairs:pairs.map(p=>({pair:p.pair,baseline:compact(p.baseline),candidate:compact(p.candidate)})),soak,extra,checks:JSON.parse(await readFile('.local/optimization/checks/result.json','utf8')),escalatorChecks:JSON.parse(await readFile('.local/optimization/escalator-check/result.json','utf8')),audio:JSON.parse(await readFile(`${dir}/audio-stability.json`,'utf8'))};
// Preserve all five pairs. Separately identify power changes from the independent
// minute journal, without selecting samples based on whether they were fast.
const powerState=text=>text?.match(/Now drawing from '([^']+)'/)?.[1]||'unknown';
const powerWindow=r=>{
 const start=r.pageTimeOrigin+r.stages[0].samples[0].at-r.stages[0].samples[0].dt;
 const end=r.pageTimeOrigin+r.stages.at(-1).samples.at(-1).at;
 const preceding=powerSamples.findLast(p=>Date.parse(p.at)<=start);
 const samples=[...(preceding?[preceding]:[]),...powerSamples.filter(p=>Date.parse(p.at)>start&&Date.parse(p.at)<=end)];
 const states=[...new Set([powerState(r.power),...samples.map(p=>powerState(p.power))])];
 return {start:new Date(start).toISOString(),end:new Date(end).toISOString(),states};
};
const conditions=pairs.map(p=>{const baseline=powerWindow(p.baseline),candidate=powerWindow(p.candidate);return {pair:p.pair,baseline,candidate,matchingStablePower:baseline.states.length===1&&candidate.states.length===1&&baseline.states[0]===candidate.states[0]&&baseline.states[0]!=='unknown'};});
output.comparisonConditions={pairs:conditions,matchingStablePairs:conditions.filter(c=>c.matchingStablePower).map(c=>c.pair),note:'Minute power samples bound transition time to about one minute. Matching power does not establish identical background workload. All five original pairs remain in the primary table.'};
output.powerGroupComparisons={};
for(const state of ['AC Power','Battery Power']){const ids=conditions.filter(c=>c.matchingStablePower&&c.baseline.states[0]===state).map(c=>c.pair),selected=pairs.filter(p=>ids.includes(p.pair));if(selected.length)output.powerGroupComparisons[state]={pairs:ids,comparison:compare(selected),note:'Descriptive subgroup; does not replace the planned five-pair comparison'};}
const allReceipts=[...output.pairs.flatMap(p=>[p.baseline,p.candidate]),...Object.values(soak).map(s=>s.receipt),...Object.values(extra)];
const gameplay=comparison.slice(0,5),candidateSoak=soak.candidate;
assert.equal(output.escalatorChecks.updateCost?.results.length,4,'Four isolated escalator CPU views completed');
assert.ok(output.escalatorChecks.updateCost.results.every(r=>r.batches.length===10),'Five alternating update-cost pairs per view');
const zeroErrors=allReceipts.every(r=>!r.errors.length&&!r.consoleMessages.length&&!r.failedRequests.length&&!r.socketErrors.length&&r.stages.every(s=>!s.contextLosses));
const live=[soak.baseline.receipt,soak.candidate.receipt];
const audio=output.audio.results.filter(r=>r.variant==='fixed');
const liveActions=live.map(r=>({label:r.label,...r.stages.at(-1).diagnostics.soak}));
const exercised=liveActions.every(s=>s.walkMetres>0&&s.savedShots>=2&&s.replays>=2&&s.seeks>=2&&s.recallsIssued>=2&&s.recallsReturned>=2&&s.rateChanges>=8);
const playbackPass=exercised&&live.every(r=>r.transport.maxUnderrunMs===0&&r.transport.reconnects===0&&r.stages.every(s=>s.shot.shotUnderrunMs===0&&s.audio.skippedMusicSteps===0));
const audioPass=audio.length===2&&audio.every(r=>r.maxGridDriftMs<.001&&!r.hidden&&(r.stallMs!==250||r.state.skippedMusicSteps===0));
const status=pass=>pass?'passed':'missed';
output.targets={
 normalPacing:{status:status(comparison.every(s=>s.pacingPass)),scenarios:comparison.length},
 cpuHeadroom:{status:status(gameplay.filter(s=>s.cpuTargetPass).length>=3),required:3,passed:gameplay.filter(s=>s.cpuTargetPass).map(s=>s.name),scenarios:5},
 regression:{status:status(comparison.every(s=>s.regressionPass)),method:'Median of five p95 values per variant; per-pair differences also retained'},
 longSession:{status:status(candidateSoak.hidden===0&&candidateSoak.visibleMinutes>=20&&candidateSoak.over50/candidateSoak.visibleMinutes<=1&&candidateSoak.over200===0),over50PerVisibleMinute:candidateSoak.over50/candidateSoak.visibleMinutes,over200:candidateSoak.over200},
 playbackAndAudio:{status:status(playbackPass&&audioPass),livePlaybackPass:playbackPass,repeatedGameplayExercised:exercised,liveActions,recallNote:'Issued and returned recalls verify the live action; the UI clears the forfeit result, so the forfeits counter is not used as a validator. Native runtime checks verify forfeit semantics.',controlledAudioPass:audioPass},
 cpuStress:{status:status(extra['stress-baseline'].stages.length===5&&extra['stress-candidate'].stages.length===5),note:'Required secondary diagnostic completed; numerical changes and any regressions are in extra, not a physical-device claim'},
 presentationAndCorrectness:{status:status(zeroErrors&&output.checks.status==='pass'&&output.escalatorChecks.status==='pass'),zeroBrowserErrors:zeroErrors,browserChecks:output.checks.status,escalatorChecks:output.escalatorChecks.status,note:'See Markdown report and validation logs for native invariants and unit coverage'}
};
if(conditions.some(c=>!c.matchingStablePower))for(const target of ['cpuHeadroom','regression']){output.targets[target].observedStatus=output.targets[target].status;output.targets[target].status='unmeasurable';output.targets[target].limitation='The controlled five-pair estimate is incomplete because power changed within a pair; all observed values and matching-power subgroups are retained.';}
output.environmentObservations=[JSON.parse(await readFile('.local/optimization/environment-hall-shift.json','utf8'))];
output.traces={};for(const variant of ['baseline','candidate'])output.traces[variant]=JSON.parse(await readFile(`.local/optimization/stall-${variant}-trace-summary.json`,'utf8'));
output.rejectedExperiments={};for(const label of ['prototype-baseline','prototype-candidate','prototype-no-groups','prototype-frozen-root'])output.rejectedExperiments[label]=compact(await read(label));
output.validationLogs={};for(const file of ['final-checks.log','runtime.log','runtime-continued.log','runtime-final.log']){const bytes=await readFile('.local/optimization/'+file);output.validationLogs[file]={sha256:hash(bytes),passedChecks:bytes.toString().split('\n').filter(line=>line.startsWith('PASS ')),note:file==='runtime.log'?'Initial invocation stops at missing explicit worker path; continued and final logs contain successful remaining checks':undefined};}
await writeFile('web/benchmarks/optimization-results.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({comparison,soak:Object.fromEntries(Object.entries(soak).map(([k,{receipt,...s}])=>[k,s]))},null,2));
