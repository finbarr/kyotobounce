// Correct the provisional upper stair placement against the municipal 10F
// landing. Keep the fitted lower plaza fixed; the interpolation is a modeling
// assumption between the two source anchors, not a surveyed deformation.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
const [input,registrationPath,output]=process.argv.slice(2);
assert(input&&registrationPath&&output?.startsWith('.local/'));
const bytes=await readFile(input),l=JSON.parse(bytes),rb=await readFile(registrationPath),r=JSON.parse(rb),sha=b=>createHash('sha256').update(b).digest('hex');
assert(!l.architecture.westUpperRegistration,'Do not apply the correction twice');
const a=l.boxes.find(p=>p.id==='west-south-10f-landing-door-jamb-1-5-0').center,b=l.boxes.find(p=>p.id==='west-south-10f-landing-door-jamb--1-5-0').center;
const target=r.sourceLandingEdgeRenderer.map(p=>({x:p[0],y:r.floor.finishedFloorY,z:-p[2]}));
const oldCenter={x:(a.x+b.x)/2,z:(a.z+b.z)/2},newCenter={x:r.entryRenderer[0],z:-r.entryRenderer[2]};
const angle=Math.atan2(target[1].z-target[0].z,target[1].x-target[0].x)-Math.atan2(b.z-a.z,b.x-a.x),c=Math.cos(angle),s=Math.sin(angle);
const rotate=p=>({x:c*(p.x-oldCenter.x)-s*(p.z-oldCenter.z)+newCenter.x,z:s*(p.x-oldCenter.x)+c*(p.z-oldCenter.z)+newCenter.z});
const lowerX=-84,upperX=-130,base=15.61465835571289,oldTop=49.58596491228072,sourceTop=49.1937;
const anchors=[[0,0],[base,base],[45.2,r.floor.finishedFloorY],[oldTop,sourceTop],[59.55,59.55]];
function height(y){let i=1;while(i<anchors.length-1&&y>anchors[i][0])i++;const[a,b]=[anchors[i-1],anchors[i]];return a[1]+(y-a[0])*(b[1]-a[1])/(b[0]-a[0]);}
function mapped(p){const t=Math.max(0,Math.min(1,(p.x-lowerX)/(upperX-lowerX))),w=t*t*(3-2*t),q=rotate(p);return{x:p.x+w*(q.x-p.x),y:height(p.y),z:p.z+w*(q.z-p.z)};}
const oldLanes=structuredClone(l.escalators),laneMaps=new Map();
for(const e of l.escalators.filter(e=>l.architecture.westPlazaRegistration.changed.escalators.includes(e.id))){
 const old=oldLanes.find(p=>p.id===e.id),origin=mapped(old.lowerCenter),end=mapped({x:old.lowerCenter.x+old.uphill.x*old.run,y:old.lowerCenter.y+old.height,z:old.lowerCenter.z+old.uphill.z*old.run});
 const run=Math.hypot(end.x-origin.x,end.z-origin.z),u={x:(end.x-origin.x)/run,z:(end.z-origin.z)/run},sx=run/old.run,sy=(end.y-origin.y)/old.height;
 // Escalator lanes remain straight in plan. Fit each bank between its mapped
 // endpoints, then use that same affine frame for all its stationary hardware.
 const lanePoint=p=>{const dx=p.x-old.lowerCenter.x,dz=p.z-old.lowerCenter.z,along=(dx*old.uphill.x+dz*old.uphill.z)*sx,across=dx*old.uphill.z-dz*old.uphill.x;return{x:origin.x+u.x*along+u.z*across,y:origin.y+(p.y-old.lowerCenter.y)*sy,z:origin.z+u.z*along-u.x*across};};
 laneMaps.set(e.id,lanePoint);e.lowerCenter=origin;e.uphill={...u,y:0};e.run=run;e.height=end.y-origin.y;e.flatLength*=sx;e.path=e.path.map(p=>({x:p.x,y:p.y*sy,z:p.z*sx}));e.chainLengthM=e.path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-e.path[i].x,p.y-e.path[i].y,p.z-e.path[i].z),0);e.stepCount=Math.ceil(e.chainLengthM/.4);e.pitchM=e.chainLengthM/e.stepCount;
}
const changed=l.architecture.westPlazaRegistration.changed,selected=new Set(Object.values(changed).flat().filter(id=>!id.startsWith('k028-shukobu-')));
function transform(id){return [...laneMaps].find(([lane])=>id.includes(lane))?.[1]||mapped;}
function jacobian(p,fn){const h=.001,cols=['x','y','z'].map(k=>{const a=fn({...p,[k]:p[k]-h}),b=fn({...p,[k]:p[k]+h});return['x','y','z'].map(c=>(b[c]-a[c])/(2*h));});return new T.Matrix3().set(cols[0][0],cols[1][0],cols[2][0],cols[0][1],cols[1][1],cols[2][1],cols[0][2],cols[1][2],cols[2][2]);}
function normal(n,p,fn){const v=new T.Vector3(n.x,n.y,n.z).applyMatrix3(jacobian(p,fn).invert().transpose()).normalize();return{x:v.x,y:v.y,z:v.z};}
let minDet=Infinity;for(let x=-170;x<=-70;x+=1)for(let z=-40;z<=25;z+=2)minDet=Math.min(minDet,jacobian({x,y:30,z},mapped).determinant());assert(minDet>.5,'Registration must not fold the station');
for(const p of l.panels){if(!selected.has(p.id))continue;const fn=transform(p.id);if(p.normals)p.normals=p.normals.map((n,i)=>normal(n,p.vertices[i],fn));if(p.hasContactProbe){p.contactProbeNormal=normal(p.contactProbeNormal,p.contactProbePoint,fn);p.contactProbePoint=fn(p.contactProbePoint);}p.vertices=p.vertices.map(fn);if(p.topElevation!==undefined)p.topElevation=height(p.topElevation);}
const converted=[];
l.boxes=l.boxes.filter(p=>{
 if(!selected.has(p.id)||p.id.startsWith('k028-shukobu-'))return true;
 const fn=transform(p.id),g=new T.BoxGeometry(p.size.x,p.size.y,p.size.z);g.rotateY((p.yaw||0)*Math.PI/180);g.translate(p.center.x,p.center.y,p.center.z);const vs=g.attributes.position,ns=g.attributes.normal,vertices=[],normals=[];
 for(let i=0;i<vs.count;i++){const v={x:vs.getX(i),y:vs.getY(i),z:vs.getZ(i)};normals.push(normal({x:ns.getX(i),y:ns.getY(i),z:ns.getZ(i)},v,fn));vertices.push(fn(v));}
 l.panels.push({id:p.id,vertices,triangles:Array.from(g.index.array),normals,material:p.material,role:p.role,appearance:p.appearance,collision:p.collision??true});converted.push(p.id);g.dispose();return false;
});
for(const p of l.beams){if(!selected.has(p.id))continue;const fn=transform(p.id);p.a=fn(p.a);p.b=fn(p.b);}
for(const p of l.flights){if(!selected.has(p.id))continue;const fn=transform(p.id),base=p.baseElevation,top=base+(p.contours.length-1)*p.rise;p.contours=p.contours.map((row,i)=>({points:row.points.map(v=>{const q=fn({x:v.x,y:base+i*p.rise,z:v.y});return{x:q.x,y:q.z};})}));p.baseElevation=fn({x:0,y:base,z:0}).y;p.rise=(fn({x:0,y:top,z:0}).y-p.baseElevation)/(p.contours.length-1);if(p.foundationDepth)p.foundationDepth=Math.max(0,p.baseElevation-.31);}
changed.panels.push(...converted);changed.boxes=changed.boxes.filter(id=>!converted.includes(id));
// These diagnostic routes still use the original draft coordinates. Apply the
// lower registration first, then the upper correction used by their geometry.
const prior=l.architecture.westPlazaRegistration,pr=prior.registration.registration,pa=pr.angleDegrees*Math.PI/180;
function priorPoint(p){const q={x:Math.cos(pa)*p.x-Math.sin(pa)*p.z+pr.translationNativeXZ[0],z:Math.sin(pa)*p.x+Math.cos(pa)*p.z+pr.translationNativeXZ[1]};let i=1;while(i<prior.verticalAnchors.length-1&&p.y>prior.verticalAnchors[i][0])i++;const[a,b]=prior.verticalAnchors.slice(i-1,i+1);q.y=a[1]+(p.y-a[0])*(b[1]-a[1])/(b[0]-a[0]);return q;}
for(const route of l.routes.filter(p=>/^(north-side-|north-escalator-)/.test(p.id))){
 const combined=/^north-escalator-complete-([12])-/.exec(route.id);
 route.points=route.points.map(p=>{
  const q=priorPoint(p);if(!combined)return transform(route.id)(q);
  // The combined route uses each straight bank's frame, including its flats.
  const candidates=oldLanes.filter(e=>e.id.startsWith('north-')&&e.id.endsWith('-'+combined[1]));
  const distance=e=>{const dx=q.x-e.lowerCenter.x,dz=q.z-e.lowerCenter.z,t=Math.max(0,Math.min(1,(dx*e.uphill.x+dz*e.uphill.z)/e.run));return Math.hypot(dx-e.uphill.x*e.run*t,dz-e.uphill.z*e.run*t,q.y-e.lowerCenter.y-e.height*t);};
  candidates.sort((a,b)=>distance(a)-distance(b));return laneMaps.get(candidates[0].id)(q);
 });
}
for(const datum of l.levelDatums.filter(p=>/^(west-|muromachi-)/.test(p.id))){
 const floor=/^west-(\d+)f$/.exec(datum.id);
 if(floor){const f=l.flights.find(p=>p.id==='daikaidan-flight-'+String((Number(floor[1])-4)*2).padStart(2,'0'));assert(f,'Missing floor flight '+datum.id);datum.elevation=f.baseElevation+(f.contours.length-1)*f.rise;datum.status='Current stair landing; intermediate floor allocation remains provisional';}
 else if(datum.id==='muromachi-4f'){datum.elevation=base;datum.status='Common finished floor at the source interior landing';}
}
l.architecture.westUpperRegistration={inputLayoutSha256:sha(bytes),sourceRegistrationSha256:sha(rb),source:r.source,oldDoorCenterNativeXZ:oldCenter,sourceDoorCenterNativeXZ:newCenter,upperRotationDegrees:angle*180/Math.PI,interpolationNativeX:[lowerX,upperX],verticalAnchors:anchors,minimumSampledJacobianDeterminant:minDet,convertedBoxes:converted.length,limits:['The 10F doorway center and orientation follow the source landing edge.','Smooth interpolation between the fixed lower plan and the upper source anchor is provisional; intermediate floor boundaries still need direct source comparison.','Escalators remain straight in plan between mapped endpoints. Their clearances and transfer floors require native checks.']};
await writeFile(output,JSON.stringify(l)+'\n');await writeFile(output.replace(/station-layout\.json$/,'upper-registration.json'),JSON.stringify(l.architecture.westUpperRegistration,null,2)+'\n');console.log(JSON.stringify(l.architecture.westUpperRegistration));
