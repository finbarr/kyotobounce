// Original geometry from documented comparable dimensions and Kyoto reference details.
// Local component only. Station registration and exact installed model remain unresolved.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
const [specPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});
const specBytes=await readFile(specPath),s=JSON.parse(specBytes),sha=b=>createHash('sha256').update(b).digest('hex');
for(const r of s.references)assert.equal(sha(await readFile(r.file)),r.sha256);
const mat=(name,rgb,roughness,metalness=0)=>({name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metalness}});
const materials=[mat('gate-brushed-stainless',[.51,.54,.55],.36,.94),mat('gate-cover-black',[.016,.023,.025],.25),mat('gate-reader-blue',[.015,.10,.49],.23,.18),mat('gate-panel-seam',[.023,.029,.030],.75),mat('gate-reader-glass',[.015,.028,.035],.12,.05),mat('gate-indicator-white',[.88,.92,.90],.35),mat('gate-indicator-green',[.10,.65,.22],.32),mat('gate-indicator-red',[.70,.02,.018],.32)];
materials[5].emissiveFactor=[.12,.14,.13];materials[6].emissiveFactor=[.03,.35,.065];materials[7].emissiveFactor=[.30,.005,.004];
const c=construction(materials,{flatNormals:true});
function emit(id,g,m,collision=false,physical='steel'){if(s.stationFrame){const f=s.stationFrame;g.applyMatrix4(new T.Matrix4().set(1,0,0,0,0,1,0,0,f.slope,0,1,f.frontZ+f.depthM,0,0,0,1));}const a=g.attributes.position,indices=g.index?Array.from(g.index.array):Array.from({length:a.count},(_,i)=>i);c.add(id,Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)].map(v=>Math.abs(v)<1e-8?0:v)),indices,m,'gate-hardware');c.panels.at(-1).collision=collision;c.panels.at(-1).material=physical;g.dispose();}
function box(id,center,size,m,collision=false,physical='steel'){const g=new T.BoxGeometry(...size);g.translate(...center);emit(id,g,m,collision,physical);}
function sideShape(points,width,x){const shape=new T.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:false});g.rotateY(-Math.PI/2);g.translate(x+width/2,0,0);return g;}
function roundedProfile(top=1,bottom=.05){const p=[[-.64,bottom],[.64,bottom],[.64,.23],[.67,.29],[.8,.43],[.8,.76]];for(let i=1;i<=24;i++){const t=i/24*Math.PI/2;p.push([.56+.24*Math.cos(t),.76+(top-.76)*Math.sin(t)]);}p.push([-.56,top]);for(let i=1;i<=24;i++){const t=Math.PI/2+i/24*Math.PI/2;p.push([-.56+.24*Math.cos(t),.76+(top-.76)*Math.sin(t)]);}p.push([-.8,.43],[-.67,.29],[-.64,.23]);return p;}
function topArc(top){const p=[[.8,.76]];for(let i=1;i<=24;i++){const t=i/24*Math.PI/2;p.push([.56+.24*Math.cos(t),.76+(top-.76)*Math.sin(t)]);}p.push([-.56,top]);for(let i=1;i<=24;i++){const t=Math.PI/2+i/24*Math.PI/2;p.push([-.56+.24*Math.cos(t),.76+(top-.76)*Math.sin(t)]);}return p;}
const bodyProfile=roundedProfile(.87);
function disk(id,center,r,depth,m,axis='z'){const g=new T.CylinderGeometry(r,r,depth,16);if(axis==='z')g.rotateX(Math.PI/2);if(axis==='x')g.rotateZ(Math.PI/2);g.translate(...center);emit(id,g,m);}
function arrow(id,x,y,z,direction){const pts=[[-.040,0],[-.006,.031],[-.006,.012],[.042,.012],[.042,-.012],[-.006,-.012],[-.006,-.031]].map(([a,b])=>[a*direction,b]);const shape=new T.Shape();shape.moveTo(...pts[0]);for(const p of pts.slice(1))shape.lineTo(...p);shape.closePath();let g=new T.ExtrudeGeometry(shape,{depth:.002,bevelEnabled:false});g.translate(x,y,z);emit(id,g,5);}
for(const [n,x] of s.bodyCentersX.entries()){
 const id=(s.idPrefix||'central-gate-prototype-')+n;
 emit(id+'-shell',sideShape(bodyProfile,s.bodyWidthM,x),0,true);
 box(id+'-plinth',[x,.024,0],[s.bodyWidthM-.012,.048,1.28],3,true);
 // Raised outer spine and shorter passenger-side top cover reproduce the asymmetric section.
 emit(id+'-cover',sideShape(topArc(.89),s.bodyWidthM-.014,x),1,true,'rubber');
 emit(id+'-raised-spine',sideShape(topArc(.985),.024,x+s.bodyWidthM/2-.019),1,true,'rubber');
 // The strip follows the rounded top perimeter; use a closed ribbon extrusion.
 const outer=topArc(1),inner=outer.map(([z,y])=>[z*.99,y-.017]).reverse();
 emit(id+'-blue-spine',sideShape([...outer,...inner],.024,x+s.bodyWidthM/2-.008),2,false);
 for(const side of[-1,1]){
  // Separate access plates and visible recessed seams, without tiny collision shapes.
  const sx=x+side*(s.bodyWidthM/2+.0015);
  for(const [j,z,len]of[[0,-.59,.32],[1,0,.81],[2,.59,.32]]){
   box(id+'-access-seam-'+side+'-'+j,[sx,.58,z],[.002,.29,len],3);
   box(id+'-access-plate-'+side+'-'+j,[sx+side*.0015,.58,z],[.002,.282,len-.008],0);
   for(const zz of[z-len/2+.025,z+len/2-.025])disk(id+'-screw-'+side+'-'+j+'-'+zz,[sx+side*.003,.69,zz],.0035,.002,0,'x');
  }
  box(id+'-lower-door-seam-'+side,[sx,.235,0],[.002,.32,1.18],3);
  box(id+'-lower-door-'+side,[sx+side*.0015,.235,0],[.002,.311,1.17],0);
  box(id+'-service-handle-'+side,[sx+side*.004,.31,-.34],[.004,.022,.074],3);
  box(id+'-handle-inset-'+side,[sx+side*.006,.31,-.34],[.003,.010,.058],0);
 }
 for(const end of[-1,1]){
  const z=end*.797;
  box(id+'-display-surround-'+end,[x,.63,z],[.133,.188,.009],1);
  box(id+'-display-face-'+end,[x,.63,z+end*.005],[.116,.163,.004],4);
  if(end===-1)arrow(id+'-direction-'+end,x,.635,z-.009,-1);
  else{disk(id+'-noentry-'+end,[x,.635,z+.009],.047,.002,7);box(id+'-noentry-bar-'+end,[x,.635,z+.011],[.068,.012,.002],5);}
  // Ticket mouth at each end and a reader on top; all artwork is original geometry.
  box(id+'-slot-surround-'+end,[x,.805,end*.767],[.129,.051,.037],2);
  box(id+'-ticket-mouth-'+end,[x,.81,end*.789],[.092,.010,.009],3);
  box(id+'-slot-lip-'+end,[x,.801,end*.794],[.096,.004,.003],0);
  box(id+'-reader-blue-'+end,[x-.012,.906,end*.48],[.113,.027,.204],2);
  box(id+'-reader-screen-'+end,[x-.012,.922,end*.48],[.097,.005,.151],4);
  // White card outline, without a branded mark or copied display image.
  for(const zz of[-.040,.040])box(id+'-card-long-'+end+'-'+zz,[x-.012,.926,end*.48+zz],[.065,.002,.003],5);
  for(const xx of[-.033,.033])box(id+'-card-short-'+end+'-'+xx,[x-.012+xx,.926,end*.48],[.003,.002,.080],5);
  box(id+'-status-'+end,[x-.012,.926,end*.555],[.087,.006,.014],6);
  box(id+'-number-plaque-'+end,[x,.15,end*.651],[.039,.04,.003],5);
 }
}
// One standard pair closed, one accessible passage open. This is a sample, not station lane count.
function flap(id,x,y,z,w,h,depth){const r=.022,shape=new T.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:5});g.translate(x,y,z-depth/2);emit(id,g,1,true,'rubber');}
if(s.lanes){
 for(const lane of s.lanes){const left=s.bodyCentersX[lane.leftIndex],right=s.bodyCentersX[lane.rightIndex];assert(Math.abs(right-left-s.bodyWidthM-lane.clearM)<1e-8);for(const [i,x,d]of[[0,left,1],[1,right,-1]]){
  const id='central-gate-bank-lane-'+lane.id+'-'+i;
  if(lane.open)box(id+'-retracted',[x+d*(s.bodyWidthM/2+.005),.625,-.27],[.010,.235,.34],1,false,'rubber');
  else{const center=x+d*(s.bodyWidthM/2+lane.clearM/4);flap(id+'-paddle',center,.625,-.39,lane.clearM/2-.012,.235,.035);box(id+'-edge',[center,.740,-.39],[lane.clearM/2-.056,.004,.037],6);}
 }}
}else{
const [x0,x1,x2]=s.bodyCentersX;
for(const [i,x,direction] of [[0,x0,1],[1,x1,-1]]){
 const center=x+direction*(s.bodyWidthM/2+s.standardClearM/4);
 flap('central-gate-prototype-paddle-'+i,center,.625,-.39,s.standardClearM/2-.012,.235,.035);
 box('central-gate-prototype-paddle-edge-'+i,[center,.740,-.39],[s.standardClearM/2-.056,.004,.037],6);
}
// Retracted accessible paddles are flush with the side bodies.
for(const [i,x,direction]of[[0,x1,1],[1,x2,-1]])box('central-gate-prototype-wide-retracted-'+i,[x+direction*(s.bodyWidthM/2+.005),.625,-.27],[.010,.235,.34],1,false,'rubber');
}
const report=await c.save(out,'gate-hardware.glb',{status:s.status||'Uninstalled local standard/wide lane hardware prototype; exact Kyoto model and station placement unresolved',spec:{file:specPath,sha256:sha(specBytes)},references:s.references,assumptions:s.assumptions,geometry:{bodyCount:s.bodyCentersX.length,cabinetAssemblies:s.cabinets?.length??s.bodyCentersX.length,lanes:s.lanes?.length??2,standardClearM:s.standardClearM,accessibleClearM:s.accessibleClearM,bodyWidthM:s.bodyWidthM,bodyLengthM:1.6,maximumNominalBodyHeightM:1,collidingPanels:c.panels.filter(p=>p.collision).length},materials:{count:materials.length,images:0,source:'Original geometry and PBR values; no reference image pixels'},toolSha256:sha(await readFile(new URL(import.meta.url)))});
assert(report.geometry.triangles<(s.maximumTriangles||25000));assert.equal(new Set(c.panels.map(p=>p.id)).size,c.panels.length);console.log(JSON.stringify(report.geometry));
