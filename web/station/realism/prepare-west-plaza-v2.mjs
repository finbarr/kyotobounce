// Fit the dimensioned lower-stair outline to municipal geometry and build a
// provisional plaza floor. This does not install or relevel the adjoining station.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import {construction} from './component-mesh.mjs';
const [sourcePath,layoutPath,out]=process.argv.slice(2);
assert(sourcePath&&layoutPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourceBytes=await readFile(sourcePath),layoutBytes=await readFile(layoutPath),layout=JSON.parse(layoutBytes);
assert.equal(sha(sourceBytes),'0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1');
const {json:j,bin}=readGLB(sourceBytes),node=j.nodes.find(n=>n.name==='Untitled.203');
assert(node&&!node.matrix&&!node.translation&&!node.rotation&&!node.scale);
const sourceVertices=[];
for(const [primitive,p]of j.meshes[node.mesh].primitives.entries()){
 const a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView];assert(a.type==='VEC3'&&a.componentType===5126&&!a.sparse);
 for(let i=0;i<a.count;i++){const at=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||12);sourceVertices.push({primitive,index:i,x:bin.readFloatLE(at),y:bin.readFloatLE(at+4),z:-bin.readFloatLE(at+8)});}
}
// Ordered outer boundary of the coarse 14.597 m landing. The first interval
// bridges the side-route notch; correspondence and endpoints remain inferred.
const selected=[[-76.3177,15.7921],[-75.519,11.8405],[-75.4558,11.536],[-75.7851,9.5897],[-75.9124,8.894],[-75.7482,5.6206],[-75.0338,1.7939],[-73.5964,-1.3671],[-72.4001,-3.3175]].map(([x,z])=>{
 const vs=sourceVertices.filter(v=>Math.abs(v.y-14.5974)<.001);let best=null,distance=Infinity;
 for(const v of vs){const d=Math.hypot(v.x-x,v.z-z);if(d<distance){distance=d;best=v;}}
 assert(distance<.0001,'Source boundary vertex changed');return best;
});
const flight=layout.flights.find(f=>f.id==='daikaidan-flight-01'),plaza=layout.panels.find(p=>p.id==='muromachi-square'),upper=layout.panels.find(p=>p.id==='west-v2-upper-0');assert(flight&&plaza&&upper);
function resample(points,count=100){
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
 const total=lengths.at(-1),result=[];let edge=1;
 for(let i=0;i<count;i++){const t=total*i/(count-1);while(edge<lengths.length-1&&lengths[edge]<t)edge++;const w=(t-lengths[edge-1])/(lengths[edge]-lengths[edge-1]);result.push(points[edge-1].map((v,k)=>v+(points[edge][k]-v)*w));}return {points:result,length:total};
}
const a=resample(flight.contours[0].points.map(p=>[p.x,p.y])),b=resample(selected.map(v=>[v.x,v.z]));
const mean=rows=>[0,1].map(k=>rows.reduce((s,p)=>s+p[k]/rows.length,0)),ac=mean(a.points),bc=mean(b.points);
let dot=0,cross=0;
for(let i=0;i<a.points.length;i++){const x=a.points[i][0]-ac[0],z=a.points[i][1]-ac[1],u=b.points[i][0]-bc[0],v=b.points[i][1]-bc[1];dot+=x*u+z*v;cross+=x*v-z*u;}
const angle=Math.atan2(cross,dot),cos=Math.cos(angle),sin=Math.sin(angle),rotate=([x,z])=>[cos*x-sin*z,sin*x+cos*z],rac=rotate(ac),translation=bc.map((v,k)=>v-rac[k]);
const transform=p=>rotate(p).map((v,k)=>v+translation[k]);
const errors=a.points.map((p,i)=>Math.hypot(...transform(p).map((v,k)=>v-b.points[i][k])));
const upperY=Math.max(...upper.vertices.map(v=>v.y)),back=upper.vertices.filter(v=>Math.abs(v.y-upperY)<.0001&&v.x< -52),north=back.reduce((a,b)=>a.z>b.z?a:b),south=back.reduce((a,b)=>a.z<b.z?a:b);
const eastX=Math.max(...plaza.vertices.map(v=>v.x)),oldNorth=plaza.vertices.filter(v=>Math.abs(v.x-eastX)<.0001).reduce((a,b)=>a.z>b.z?a:b),predictedNorth=transform([oldNorth.x,oldNorth.z]);
const backX=z=>south.x+(north.x-south.x)*(z-south.z)/(north.z-south.z);
let movedEdgeVertices=0,maxEdgeExtensionM=0;
const vertices=plaza.vertices.map(v=>{
 let [x,z]=transform([v.x,v.z]);
 if(Math.abs(v.x-eastX)<.0001){const sharedX=backX(z);maxEdgeExtensionM=Math.max(maxEdgeExtensionM,Math.abs(sharedX-x));x=sharedX;movedEdgeVertices++;}
 return [x,upperY+(v.y-plaza.topElevation),-z];
});
const material={name:'Western plaza candidate | stone',pbrMetallicRoughness:{baseColorFactor:[.32,.30,.27,1],roughnessFactor:.78,metallicFactor:0}};
const c=construction([material],{flatNormals:true});
c.add('west-v2-plaza-candidate',vertices,plaza.triangles.flatMap((_,i)=>i%3?[]:[plaza.triangles[i+2],plaza.triangles[i+1],plaza.triangles[i]]),0,'west-floor');
const metadata={status:'Uninstalled registration/floor study. Adjoining stairs, facades, guards and approaches still require coordinated replacement and runtime checks.',source:{path:sourcePath,sha256:sha(sourceBytes),object:node.name,boundaryVertices:selected},parentLayoutSha256:sha(layoutBytes),builderSha256:sha(await readFile(new URL(import.meta.url))),registration:{angleDegrees:angle*180/Math.PI,translationNativeXZ:translation,scale:1,planCurveLengthM:a.length,sourceCurveLengthM:b.length,rmsM:Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/errors.length),maximumM:Math.max(...errors),independentNorthCorner:{predictedNativeXZ:predictedNorth,sourceNativeXZ:[north.x,north.z],errorM:Math.hypot(predictedNorth[0]-north.x,predictedNorth[1]-north.z)}},floor:{topY:upperY,thicknessM:plaza.thicknessM,sourceCoarseFloorY:selected[0].y,heightDifferenceM:upperY-selected[0].y,sharedBackEdgeNative:[south,north],movedEdgeVertices,maxEdgeExtensionM},assumptions:['Boundary correspondence and its side-route notch interpolation are provisional; fit residuals are not survey accuracy.','Keep the dimensioned plan scale; use a rigid horizontal fit only.','Use the interior upper-landing height as the common finished floor, rather than copying the coarse exterior floor datum.','Extend the plan floor to the interior mesh cut edge; the hidden join and original slab thickness are construction assumptions.','Stone finish is temporary. This candidate does not establish the stage, sculpture or northern bank alignment.']};
await mkdir(out,{recursive:true});const report=await c.save(out,'west-plaza.glb',metadata);await writeFile(out+'/registration.json',JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({registration:metadata.registration,floor:metadata.floor,geometry:report.geometry}));
