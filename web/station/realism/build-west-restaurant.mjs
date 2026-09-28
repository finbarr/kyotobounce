// Operator-map corridor with source-anchored western bridge and stair connections.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {construction} from './component-mesh.mjs';
const [registrationPath,bridgeDir,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const bytes=await readFile(registrationPath),r=JSON.parse(bytes),bridge=JSON.parse(await readFile(bridgeDir+'/report.json')),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(bridge.geometry.datumSha256,sha(bytes));
const Y=r.floor.finishedFloorY,{a,b,entryPixel,entryRenderer}=r.mapTransform;
const at=(p,h=0)=>[entryRenderer[0]+a*(p[0]-entryPixel[0])-b*(p[1]-entryPixel[1]),Y+h,entryRenderer[2]+b*(p[0]-entryPixel[0])+a*(p[1]-entryPixel[1])];
const mats=[{name:'West restaurant | clear door glass',pbrMetallicRoughness:{baseColorFactor:[.63,.76,.79,.2],metallicFactor:.04,roughnessFactor:.15},alphaMode:'BLEND',doubleSided:true},{name:'West restaurant | black metal',pbrMetallicRoughness:{baseColorFactor:[.025,.03,.032,1],metallicFactor:.5,roughnessFactor:.3}},{name:'West restaurant | dark stone floor',pbrMetallicRoughness:{baseColorFactor:[.095,.10,.10,1],metallicFactor:.03,roughnessFactor:.28}},{name:'West restaurant | dark facade and ceiling',pbrMetallicRoughness:{baseColorFactor:[.11,.095,.08,1],metallicFactor:0,roughnessFactor:.68}},{name:'West restaurant | illuminated entrance panels',pbrMetallicRoughness:{baseColorFactor:[.86,.7,.4,1],metallicFactor:0,roughnessFactor:.5},emissiveFactor:[.32,.21,.09]},{name:'West restaurant | stone perimeter',pbrMetallicRoughness:{baseColorFactor:[.4,.42,.4,1],metallicFactor:.08,roughnessFactor:.55}}];
const c=construction(mats),[A,B]=bridge.geometry.floorEndpointsRenderer,F=[B[0]-A[0],0,B[2]-A[2]],L=Math.hypot(...F);F.forEach((v,i)=>F[i]=v/L);const R=[-F[2],0,F[0]],W=bridge.geometry.outerWidthM/2;
const point=(s,w,h=0)=>[A[0]+s*F[0]+w*R[0],Y+h,A[2]+s*F[2]+w*R[2]];
const E=r.entryRenderer,J=r.junctionRenderer,D=[J[0]-E[0],0,J[2]-E[2]],DL=Math.hypot(...D);D.forEach((v,i)=>D[i]=v/DL);
const project=p=>{const t=(p[0]-E[0])*D[0]+(p[2]-E[2])*D[2];return[E[0]+t*D[0],Y,E[2]+t*D[2]]};
const stairAcross=r.sourceLandingEdgeRenderer[1].map((v,k)=>k===1?0:v-r.sourceLandingEdgeRenderer[0][k]),acrossLength=Math.hypot(...stairAcross);stairAcross.forEach((v,k)=>stairAcross[k]=v/acrossLength);
const stairOut=r.sourceLandingSideRenderer[1].map((v,k)=>k===1?0:v-r.sourceLandingSideRenderer[0][k]),outLength=Math.hypot(...stairOut);stairOut.forEach((v,k)=>stairOut[k]=v/outLength);
const stairPoint=(w,s)=>[E[0]+stairAcross[0]*w+stairOut[0]*s,Y,E[2]+stairAcross[2]*w+stairOut[2]*s];
const rear=r.sourceRecessRearEdgeRenderer.map(project),floorOutline=[at([1,235]),stairPoint(-1.16,0),stairPoint(-1.16,1.1),stairPoint(1.16,1.1),stairPoint(1.16,0),rear[0],point(0,-W),point(0,W),rear[1],at([973,0]),at([1061,0]),at([1061,366]),at([1,366])],well=[[610,194],[716,194],[716,245],[610,245]].map(p=>at(p));
c.slab('west-restaurant-floor',floorOutline,[well],.22,2,'restaurant-floor');
c.slab('west-restaurant-ceiling',floorOutline.map(p=>[p[0],Y+3.12,p[2]]),[well.map(p=>[p[0],Y+3.12,p[2]])],.17,3,'restaurant-ceiling');
// Ten tenant footprints from the current operator schematic. Service interiors remain closed.
const shops=[[[79,219],[193,191],[207,260],[79,260]],[[228,184],[432,135],[451,202],[337,207],[238,224]],[[435,134],[585,97],[600,150],[552,181],[451,203]],[[661,119],[719,59],[762,49],[762,160],[661,160]],[[766,48],[847,28],[847,124],[818,124],[818,160],[766,160]],[[273,242],[407,242],[407,350],[273,314]],[[412,242],[483,242],[587,295],[587,365],[412,353]],[[591,298],[775,298],[775,365],[591,365]],[[780,261],[931,261],[931,365],[780,365]],[[819,143],[946,143],[946,198],[993,198],[993,258],[819,258]]];
const shopEdges=[2,2,3,3,3,0,0,0,0,0];
for(let i=0;i<shops.length;i++){
 const poly=shops[i].map(p=>at(p,2.78));c.slab(`west-restaurant-shop-${i+1}`,poly,[],2.78,3,'shop-boundary');
 const edge=shopEdges[i],p=shops[i][edge],q=shops[i][(edge+1)%shops[i].length],mid=[(p[0]+q[0])/2,(p[1]+q[1])/2],u=at(p),v=at(q),len=Math.hypot(v[0]-u[0],v[2]-u[2]),dir=[(v[0]-u[0])/len,0,(v[2]-u[2])/len],center=at(mid),half=Math.min(1.3,len*.38),post=w=>[center[0]+dir[0]*w,Y,center[2]+dir[2]*w];
 for(const sign of [-1,1]){const p=post(sign*half);c.beam(`west-restaurant-shop-${i+1}-post-${sign}`,[p[0],Y+.05,p[2]],[p[0],Y+2.6,p[2]],.14,.14,1,'shop-front-frame');const inset=[p[0]-dir[0]*sign*.13,Y+.1,p[2]-dir[2]*sign*.13];c.beam(`west-restaurant-shop-${i+1}-light-${sign}`,inset,[inset[0],Y+2.52,inset[2]],.16,.07,4,'shop-front-light');}
 const hp=post(-half),hq=post(half);c.beam(`west-restaurant-shop-${i+1}-header`,[hp[0],Y+2.62,hp[2]],[hq[0],Y+2.62,hq[2]],.16,.24,1,'shop-front-frame');
}
// Perimeter walls leave the measured oblique vestibule and stair entry open.
const along=p=>(p[0]-E[0])*D[0]+(p[2]-E[2])*D[2],wallAt=t=>[E[0]+D[0]*t,Y,E[2]+D[2]*t],start=along(at([1,235])),end=along(at([973,0])),lo=along(rear[0]),hi=along(rear[1]);
for(const [i,[a,b]]of [[start,-1.16],[1.16,lo],[hi,end]].entries())c.beam(`west-restaurant-north-wall-${i}`,[...wallAt(a).map((v,k)=>k===1?Y+1.45:v)],[...wallAt(b).map((v,k)=>k===1?Y+1.45:v)],.18,2.9,5,'restaurant-boundary');
for(const [i,[p,q]]of [[[973,0],[1061,0]],[[1061,0],[1061,366]],[[1061,366],[1,366]],[[1,366],[1,235]]].entries())c.beam(`west-restaurant-perimeter-${i}`,at(p,1.45),at(q,1.45),.18,2.9,5,'restaurant-boundary');
for(const [i,p,q]of [[0,rear[0],point(0,-W)],[1,point(0,W),rear[1]]])c.beam(`west-restaurant-vestibule-wall-${i}`,[p[0],Y+1.47,p[2]],[q[0],Y+1.47,q[2]],.12,2.94,5,'vestibule-wall');
// Reference double doors are modeled held open, with matching visible collision.
for(const side of [-1,1]){
 const w=side*1.09;c.beam(`west-restaurant-door-jamb-${side}`,point(-.15,w,0),point(-.15,w,2.65),.11,.11,1,'door-frame');
 c.beam(`west-restaurant-door-leaf-${side}`,point(-1.21,w,1.2),point(-.2,w,1.2),.026,2.3,0,'door-glass');
 for(const s of [-1.21,-.2])c.beam(`west-restaurant-door-upright-${side}-${s}`,point(s,w,.05),point(s,w,2.35),.06,.06,1,'door-frame');
 for(const h of [.05,1.1,2.35])c.beam(`west-restaurant-door-crossbar-${side}-${h}`,point(-1.21,w,h),point(-.2,w,h),.06,.07,1,'door-frame');
 c.beam(`west-restaurant-door-handle-${side}`,point(-.95,w-side*.07,1),point(-.95,w-side*.07,1.35),.025,.025,1,'door-handle');
}
c.beam('west-restaurant-door-header',point(-.15,-1.17,2.64),point(-.15,1.17,2.64),.15,.18,1,'door-frame');
c.beam('west-restaurant-skyway-sign',point(-.15,-1.17,2.83),point(-.15,1.17,2.83),.13,.18,1,'sign-backing');
// Guard the reserved escalator opening. Its bank and lower floor are not yet constructed.
for(let i=0;i<well.length;i++){const p=well[i],q=well[(i+1)%well.length];c.beam(`west-restaurant-well-rail-${i}`,[p[0],Y+1.1,p[2]],[q[0],Y+1.1,q[2]],.07,.07,1,'well-guard');c.beam(`west-restaurant-well-post-${i}`,p,[p[0],Y+1.1,p[2]],.07,.07,1,'well-guard');}
// Repeated fixtures establish the photographed dark-ceiling rhythm without texture copies.
for(let i=1;i<r.routeRenderer.length-2;i++){const p=r.routeRenderer[i];c.beam(`west-restaurant-ceiling-light-${i}`,[p[0]-.32,Y+2.89,p[2]],[p[0]+.32,Y+2.89,p[2]],.16,.05,4,'ceiling-light');}
const report=await c.save(out,'west-restaurant.glb',{status:'Uninstalled public-corridor construction; schematic dimensions and material finishes remain provisional.',registrationPath,registrationSha256:sha(bytes),bridgeGlbSha256:bridge.outputs.glbSha256,geometry:{finishedFloorY:Y,sourceLandingEdgeRenderer:r.sourceLandingEdgeRenderer,sourcePortalRenderer:r.sourcePortalRenderer,floorEndpointsRenderer:[E,A],routeRenderer:[stairPoint(0,.65),...r.routeRenderer],stairThresholdRenderer:{center:E,across:stairAcross,outward:stairOut,widthM:2.32,depthM:1.1},floorOutlineRenderer:floorOutline,escalatorOpeningRenderer:well,tenantCount:10,doorState:'Double leaves held open; collision follows each visible leaf.'},limits:[...r.limits,'Shop fronts use current operator footprints as a schematic construction; individual interiors, menu graphics, materials and signs remain unfinished.','The escalator opening is guarded but its bank and lower-floor connection remain unbuilt. This is not public-route completion.','New bridge05 and this component share the provisional higher floor. Central Skyway03 and eastern bank01 still use the earlier datum and must be rebuilt before connection.']});console.log(JSON.stringify({geometry:{...report.geometry,routeRenderer:report.geometry.routeRenderer.length,floorOutlineRenderer:report.geometry.floorOutlineRenderer.length,escalatorOpeningRenderer:4},outputs:report.outputs}));
