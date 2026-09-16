import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {createEscalators} from '../public/escalators.js';
const {escalators}=JSON.parse(await readFile('web/public/assets/station.json','utf8'));
const {combSupports}=JSON.parse(await readFile('web/public/assets/atrium-detail.json','utf8'));
const tracks=escalators.map(s=>{
 const distance=[0];for(let i=1;i<s.path.length;i++){const a=s.path[i-1],b=s.path[i];distance.push(distance.at(-1)+Math.fround(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)));}
 const length=distance.at(-1),pitch=length/s.stepCount;
 return {s,distance,length,pitch};
});
// Independent ray-height oracle for the unchanged native horizontal boxes.
function nativeBoxes({s,distance,length,pitch},time){return Array.from({length:s.stepCount},(_,i)=>{
 const at=((i*pitch+s.phase*pitch+s.speed*time)%length+length)%length;let n=0;while(n+2<distance.length&&distance[n+1]<=at)n++;
 const a=s.path[n],b=s.path[n+1],t=(at-distance[n])/(distance[n+1]-distance[n]),z=a.z+(b.z-a.z)*t;
 return {start:z-pitch/2,end:z+pitch/2,top:a.y+(b.y-a.y)*t,public:at<=distance[s.publicPointCount-1]};
});}
const scene=new T.Scene(),update=createEscalators(scene,escalators,combSupports),m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();
let samples=0,maxHeightError=0,maxJoinError=0,oldNearFlatOverlap=0,oldRaisedNosingConflicts=0;
const rows=[];
for(let phase=0;phase<80;phase++){
 const time=phase/79*2;update(time);
 for(const [index,track]of tracks.entries()){
  const {s}=track,lower=combSupports.find(p=>p.support===s.id+'-lower-comb-transfer'),upper=combSupports.find(p=>p.support===s.id+'-upper-comb-transfer');
  const from=lower.along+lower.length/2,to=upper.along-upper.length/2;
  const original=nativeBoxes(track,time),visible=[];
  const mesh=scene.children[index].children[0];
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);m.decompose(p,q,scale);visible.push({start:-p.z-scale.z/2,end:-p.z+scale.z/2,top:p.y+scale.y/2});}
  visible.sort((a,b)=>a.start-b.start);
  assert.ok(visible.length>0&&visible.every(b=>b.end>b.start));
  assert.ok(Math.abs(visible[0].start-from)<1e-5&&Math.abs(visible.at(-1).end-to)<1e-5,`${s.id}: treads meet both comb plates and remain inside their opening`);
  for(let i=1;i<visible.length;i++){const error=Math.abs(visible[i].start-visible[i-1].end);maxJoinError=Math.max(maxJoinError,error);assert.ok(error<1e-5,`${s.id}: no overlap or gap between adjacent treads`);}
  for(let i=0;i<400;i++){
   const at=from+(to-from)*(i+.371)/400,expected=Math.max(...original.filter(b=>b.start<=at&&b.end>=at).map(b=>b.top)),actual=visible.filter(b=>b.start<=at&&b.end>=at);
   assert.equal(actual.length,1,`${s.id}: only one tread covers each point`);
   const error=Math.abs(actual[0].top-expected);maxHeightError=Math.max(maxHeightError,error);assert.ok(error<1e-5,`${s.id}: exposed top remains on the native solid`);samples++;
  }
  for(let i=0;i<original.length;i++){
   const a=original[i],b=original[(i+1)%original.length],overlap=a.end-b.start,rise=b.top-a.top;
   if(a.public&&b.public&&rise>=0&&rise<.009&&overlap>1e-8){oldNearFlatOverlap=Math.max(oldNearFlatOverlap,overlap);oldRaisedNosingConflicts++;}
  }
  if(phase===79)rows.push({lane:s.id,direction:s.speed>0?'up':'down',visibleSteps:visible.length,from,to});
 }
}
await mkdir('.local',{recursive:true});const report={lanes:rows.length,phases:80,samples,maxHeightError,maxJoinError,oldNearFlatOverlap,oldRaisedNosingConflicts,rows};await writeFile('.local/escalator-landings.json',JSON.stringify(report,null,2));
assert.ok(oldRaisedNosingConflicts>0,'The original flattened steps reproduce raised-edge conflicts');
console.log(JSON.stringify({...report,rows:undefined},null,2));console.log('PASS all 20 lanes in both directions: no overlapping tread surfaces, continuous comb transfer, unchanged native step heights throughout the cycle');
