// Source-backed well openings with explicitly provisional shop recesses.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
const [specPath,out]=process.argv.slice(2),sb=await readFile(specPath),s=JSON.parse(sb),sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of [s.parent,s.floorParent])assert.equal(sha(await readFile(p.path)),p.sha256);
const plain=(name,rgb,roughness,metal=0)=>({name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metal}});
const mats=[plain('B1 blue upper lining',[.032,.14,.26],.39),plain('B1 dark stone portal',[.06,.065,.061],.32),plain('B1 pale shop ceiling',[.63,.62,.57],.75),plain('B1 inset floor',[.095,.103,.099],.45),plain('B1 shop glass',[.14,.20,.19],.17,.08),plain('B1 steel door frames',[.38,.41,.42],.28,.85),plain('B1 warm ceiling lamps',[.94,.86,.65],.55),plain('B1 warm interior backing',[.42,.34,.24],.76)];
mats[4].alphaMode='BLEND';mats[4].pbrMetallicRoughness.baseColorFactor[3]=.25;mats[6].emissiveFactor=[.8,.64,.4];
const c=construction(mats,{flatNormals:true});
for(const p of s.parts){c.add('hall-b1-'+p.id,p.vertices,p.indices,p.material,'hall-b1-enclosure');c.panels.at(-1).material='facade';}
let count=0;
for(const side of ['north','south']){
 const sign=side==='north'?-1:1,[[ax,az],[bx,bz]]=s.frontEdges[side],slope=(bz-az)/(bx-ax),z=x=>az+(x-ax)*slope;
 const world=(x,y,d)=>[x,y,z(x)+sign*d];
 function box(id,x0,x1,y0,y1,d0,d1,m,role,collision=true){assert(x1>x0&&y1>y0&&d1>d0);const g=new T.BoxGeometry(x1-x0,y1-y0,d1-d0),a=g.attributes.position,vertices=Array.from({length:a.count},(_,i)=>world(a.getX(i)>0?x1:x0,a.getY(i)>0?y1:y0,a.getZ(i)>0?d1:d0)),indices=Array.from(g.index.array);if(sign<0)for(let i=0;i<indices.length;i+=3)[indices[i],indices[i+1]]=[indices[i+1],indices[i]];c.add('hall-b1-'+side+'-'+id,vertices,indices,m,role);const p=c.panels.at(-1);p.collision=collision;p.material=role.includes('floor')?'floor':m===4?'glass':'facade';g.dispose();}
 for(const [i,[L,R]]of s.openings.entries()){
  const id='bay-'+i+'-',F=s.floorY,H=s.headY,D=s.recessDepthM;
  // Floors meet the exact retained lower-deck boundary, with no footprint overlap.
  box(id+'floor',L,R,F-.18,F,0,D,3,'hall-b1-floor');
  box(id+'ceiling',L,R,H,H+.18,.12,D,2,'hall-b1-ceiling');
  box(id+'left-return',L-.12,L,F,H,.12,D+.15,1,'hall-b1-return');
  box(id+'right-return',R,R+.12,F,H,.12,D+.15,1,'hall-b1-return');
  box(id+'back',L,R,F,H,D,D+.15,7,'hall-b1-backing');
  // A transparent shop threshold with a clear 1.8m central entrance.
  const middle=(L+R)/2,door=.9,front=.42;
  for(const [k,a,b]of [['left',L,middle-door],['right',middle+door,R]]){
   box(id+k+'-glass',a,b,F+.08,H-.20,front,front+.014,4,'hall-b1-glass');
   for(const [j,x]of [a,b].entries())box(id+k+'-post-'+j,x-.018,x+.018,F,H-.18,front-.022,front+.036,5,'hall-b1-frame');
   box(id+k+'-sill',a,b,F+.04,F+.08,front-.02,front+.034,5,'hall-b1-frame');
  }
  box(id+'transom',L,R,H-.20,H-.15,front-.02,front+.034,5,'hall-b1-frame');
  for(let x=L+.8;x<R-.4;x+=2.0)box(id+'lamp-'+count++,x-.20,x+.20,H-.018,H,.9,1.3,6,'hall-b1-lamp',false);
 }
}
console.log(JSON.stringify(await c.save(out,'hall-b1-frontages.glb',{status:'Uninstalled provisional B1 shop portals and recesses; no claimed current shop fit-out or photographic match.',specSha256:sha(sb),source:s.parent,sourceFloor:s.floorParent,assumptions:s.limits,headerOffset:s.headerOffset,vertexCleanup:s.vertexCleanup,removedLowerWallVolumeM3:s.volumes.removed,evidence:s.evidence,geometry:{frontages:6,sourcePieces:s.parts.length,doorClearWidthM:1.8}})));
