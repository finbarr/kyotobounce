import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
// Check saved shading against geometry, including continuity across curved pieces.
const [dir,out]=process.argv.slice(2),bytes=await readFile(dir+'/court-folded-frontage.glb'),{json:j,bin}=readGLB(bytes),panels=JSON.parse(await readFile(dir+'/native-panels.json')).panels;
const v3=(a,offset)=>new T.Vector3(bin.readFloatLE(offset),bin.readFloatLE(offset+4),bin.readFloatLE(offset+8));
let checked=0,smooth=0,maxLengthError=0,maxFlatAngle=0,minSmoothDot=1,maxJointDifference=0,joins=0;const groups=new Map();
for(let m=0;m<j.meshes.length;m++){
 const p=j.meshes[m].primitives[0],pa=j.accessors[p.attributes.POSITION],na=j.accessors[p.attributes.NORMAL],pb=j.bufferViews[pa.bufferView].byteOffset+(pa.byteOffset||0),nb=j.bufferViews[na.bufferView].byteOffset+(na.byteOffset||0);let cursor=0;
 for(const panel of panels.filter(p=>p.browserMaterial===m)){
  const curve=/^court-fold-curve-(\d+)-(.+)$/.exec(panel.id);assert.equal(panel.vertices.length,36);const normals=[];
  for(let t=0;t<36;t+=3){const positions=[0,1,2].map(k=>v3(null,pb+(cursor+t+k)*12)),face=new T.Triangle(...positions).getNormal(new T.Vector3());
   for(let k=0;k<3;k++){const n=v3(null,nb+(cursor+t+k)*12);normals.push(n);maxLengthError=Math.max(maxLengthError,Math.abs(n.length()-1));const dot=n.clone().normalize().dot(face);assert(dot>0,'Inverted shading '+panel.id);
    if(curve&&t<12){smooth++;minSmoothDot=Math.min(minSmoothDot,dot);assert(dot>.995,'Curve shading diverges from local face '+panel.id);assert(Math.abs(n.y)<1e-7);}
    else {const angle=Math.acos(Math.min(1,Math.max(-1,dot)))*180/Math.PI;maxFlatAngle=Math.max(maxFlatAngle,angle);assert(angle<.01,'Non-flat cap or fold '+panel.id);}
    checked++;
   }
  }
  if(curve){const family=curve[2],rows=groups.get(family)||new Map();rows.set(Number(curve[1]),normals);groups.set(family,rows);}
  cursor+=36;
 }
 assert.equal(cursor,pa.count);
}
assert(maxLengthError<1e-6);
// Front vertices: [left,right,right,left,left,right]; back [left,right,right,left,right,left].
for(const [family,rows] of groups)for(let i=0;i<63;i++){
 const a=rows.get(i),b=rows.get(i+1);assert(a&&b,family);
 // Panel gaps at source span boundaries intentionally sample either side of the joint.
 if(family==='upper-0'&&(i+1)%8===0)continue;
 for(const [ai,bi]of [[1,0],[7,6]]){maxJointDifference=Math.max(maxJointDifference,a[ai].distanceTo(b[bi]));assert(a[ai].distanceTo(b[bi])<1e-6,'Curved normal seam '+family);joins++;}
}
const report={glbSha256:createHash('sha256').update(bytes).digest('hex'),checkedVertices:checked,smoothVertices:smooth,flatVertices:checked-smooth,maximumNormalLengthError:maxLengthError,maximumFlatNormalAngleDegrees:maxFlatAngle,minimumSmoothNormalFaceDot:minSmoothDot,continuousNormalJoins:joins,maximumJointNormalDifference:maxJointDifference,meaning:'Saved normal length, outward orientation, flat caps/folds and continuous shading across ungapped curve segments; no photorealism acceptance.'};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
