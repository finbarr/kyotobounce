// Open the inherited shell closure at the existing eastern Skyway landing.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=await read(manifest),raw=await readFile(m.layout);assert.equal(sha(raw),m.layoutSha256);const layout=JSON.parse(raw);
const id='municipal-station-court-east-Untitled.203',panel=layout.panels.find(p=>p.id===id);assert(panel&&panel.collision&&panel.role==='municipal-courtyard-context');
const lanes=layout.escalators.filter(e=>e.id.startsWith('east-skyway-escalator-'));assert.equal(lanes.length,2);
const F=lanes[0].lowerCenter.y+lanes[0].height;assert(Math.abs(F-45.083488088977774)<.00001);
const spec={componentPrefix:'east-skyway-mouth-',parentLayoutSha256:m.layoutSha256,floor:F,cuts:{[id]:[[[74.65,75.35],[F-.02,F+3.2],[15,18.36]]]},retiredIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],retiredRouteIds:[],retiredLabelIds:[],retiredLights:[],modifiedFlightIds:[],preservedOverlapArea:{}};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(m,null,2)+'\n');
const routes=lanes.flatMap(e=>{
 const a=e.run+e.flatLength+1.15,end={x:e.lowerCenter.x+e.uphill.x*a,y:F,z:e.lowerCenter.z+e.uphill.z*a};
 const points=[{x:72,y:F,z:16.62},{x:73.6,y:F,z:end.z},end];
 return [{label:e.id+' upper approach',points},{label:e.id+' upper approach return',points:points.toReversed()}];
});
// This is a subtraction only. An empty component records the edit without
// adding invented architecture to the existing landing and escalator frame.
await construction([]).save(out,'east-skyway-mouth.glb',{componentPrefix:spec.componentPrefix,sourceCollection:'Eastern Skyway mouth repair',sourceLayoutSha256:m.layoutSha256,builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),scope:'Remove the municipal shell closure across the eastern Skyway mouth, preserving the existing landing and paired escalators.',geometry:{routes,chromeRoutes:routes.map(r=>r.label),headroomStairs:[],generatedStairs:[],blocked:[],spawn:m.spawn,retiredIds:[],retiredLights:[],modifiedPanelIds:[id],modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[]},references:['https://www.kyoto-station-building.co.jp/floorguide/10f/','https://www.zekkeikana.com/kyoto/shimogyoku/skyway/skyway4.html'],limits:['The cut fits the retained landing and frame; its dimensions are not surveyed. The paired escalators and courtyard geometry are unchanged.']});
await writeFile(out+'/motion.json',JSON.stringify({escalators:lanes},null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([
 ['mouth-from-skyway',[70,F+1.65,16.5],[92,44,17]],
 ['mouth-from-landing',[76,F+1.65,16.6],[70,F+1.65,16.5]],
 ['escalator-descent',[77.1,F+1.65,17.5],[105,31.5,17.2]],
 ['court-arrival',[109,31.62,16.3],[80,44,16.3]],
],null,2)+'\n');
console.log({floor:F,modified:id,routes:routes.length});
