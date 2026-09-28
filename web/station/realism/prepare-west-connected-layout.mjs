// Build the collision candidate for coordinated western registration. Keep it
// private until matching art, moving hardware and interface checks are complete.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [layoutPath,plazaDirectory,out]=process.argv.slice(2);
assert(layoutPath&&plazaDirectory&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes),registration=JSON.parse(await readFile(plazaDirectory+'/registration.json')),plaza=JSON.parse(await readFile(plazaDirectory+'/native-panels.json')).panels[0];
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(bytes),registration.parentLayoutSha256);
const radians=registration.registration.angleDegrees*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians),[dx,dz]=registration.registration.translationNativeXZ;
const oldPlaza=layout.panels.find(p=>p.id==='muromachi-square'),baseY=oldPlaza.topElevation,topY=registration.floor.topY;
const intermediate=layout.panels.find(p=>p.id==='west-v2-intermediate-0');assert(intermediate);
const secondY=Math.max(...intermediate.vertices.map(v=>v.y));
// Lower floor datums follow the installed source approach. Preserve the existing
// Skyway height; upper flight allocation and the 3F level remain construction choices.
const thirdY=15.5+(topY-baseY),anchors=[[0,0],[7.35,secondY],[15.5,thirdY],[baseY,topY],[45.2,45.2],[59.55,59.55]];
function height(y){let i=1;while(i<anchors.length-1&&y>anchors[i][0])i++;const [a,b]=[anchors[i-1],anchors[i]];return a[1]+(y-a[0])*(b[1]-a[1])/(b[0]-a[0]);}
const horizontal=(x,z)=>({x:c*x-s*z+dx,z:s*x+c*z+dz});
const point=(p,sculpture=false)=>({...horizontal(p.x,p.z),y:sculpture?p.y+topY-baseY:height(p.y)});
const selected=id=>/^(daikaidan-|north-side-|north-circulation-|north-escalator-|tactile-north-escalator-|south-approach-|west-north-|west-south-|k028-shukobu-)/.test(id)||id==='west-3f-landing';
const changed={};
for(const kind of ['panels','boxes','beams','flights','escalators']){
 changed[kind]=[];
 for(const p of layout[kind]){
  if(!selected(p.id))continue;changed[kind].push(p.id);const sculpture=p.id.startsWith('k028-shukobu-');
  if(kind==='panels'){
   if(p.normals)p.normals=p.normals.map((n,i)=>{const y=p.vertices[i].y,scale=sculpture?1:(height(y+.00001)-height(y-.00001))/.00002,x=c*n.x-s*n.z,z=s*n.x+c*n.z,ny=n.y/scale,length=Math.hypot(x,ny,z);assert(length>0);return{x:x/length,y:ny/length,z:z/length};});
   p.vertices=p.vertices.map(v=>point(v,sculpture));
   if(p.hasContactProbe){p.hasContactProbe=false;delete p.contactProbePoint;delete p.contactProbeNormal;}
   if(p.topElevation!==undefined)p.topElevation=height(p.topElevation);
  }else if(kind==='boxes'){
   const bottom=p.center.y-p.size.y/2,top=p.center.y+p.size.y/2;p.center=point(p.center,sculpture);
   if(!sculpture){p.center.y=(height(bottom)+height(top))/2;p.size.y=height(top)-height(bottom);}
   p.yaw=(p.yaw||0)-registration.registration.angleDegrees;
  }else if(kind==='beams') {p.a=point(p.a,sculpture);p.b=point(p.b,sculpture);}
  else if(kind==='flights'){
   const oldBase=p.baseElevation,oldTop=oldBase+(p.contours.length-1)*p.rise;
   p.contours=p.contours.map(row=>({points:row.points.map(v=>{const q=horizontal(v.x,v.y);return{x:q.x,y:q.z};})}));
   p.baseElevation=height(oldBase);p.rise=(height(oldTop)-p.baseElevation)/(p.contours.length-1);
   if(p.foundationDepth)p.foundationDepth=Math.max(0,p.baseElevation-.31);
  }else{
   const lower=p.lowerCenter.y,oldHeight=p.height;p.lowerCenter=point(p.lowerCenter);p.height=height(lower+oldHeight)-p.lowerCenter.y;
   const {x,z}=p.uphill;p.uphill={x:c*x-s*z,y:0,z:s*x+c*z};p.path=p.path.map(v=>({...v,y:v.y*p.height/oldHeight}));
   p.chainLengthM=p.path.slice(1).reduce((n,v,i)=>n+Math.hypot(v.x-p.path[i].x,v.y-p.path[i].y,v.z-p.path[i].z),0);
   p.stepCount=Math.ceil(p.chainLengthM/.4);p.pitchM=p.chainLengthM/p.stepCount;
  }
 }
}
const {browserMaterial,...floor}=plaza;Object.assign(oldPlaza,floor,{id:'muromachi-square',appearance:oldPlaza.appearance,topElevation:topY,planAreaM2:registration.floor?JSON.parse(await readFile(plazaDirectory+'/report.json')).geometry.minimumClosedVolumeM3/oldPlaza.thicknessM:oldPlaza.planAreaM2});
layout.architecture.westPlazaRegistration={status:'Collision candidate only; browser/source installation and external interfaces pending.',parentLayoutSha256:sha(bytes),registration,verticalAnchors:anchors,changed};
await mkdir(out,{recursive:true});const result=JSON.stringify(layout)+'\n';await writeFile(out+'/station-layout.json',result);
await writeFile(out+'/registration.json',JSON.stringify({parentLayoutSha256:sha(bytes),layoutSha256:sha(result),verticalAnchors:anchors,changed,scope:layout.architecture.westPlazaRegistration.status},null,2)+'\n');
console.log(JSON.stringify({layoutSha256:sha(result),changed:Object.fromEntries(Object.entries(changed).map(([k,v])=>[k,v.length])),verticalAnchors:anchors}));
