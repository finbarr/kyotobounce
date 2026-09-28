// Verify installed component material semantics, texture pixels and vertex attributes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import * as T from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [sourcePath,targetPath,out,materialPrefix='Registered hall | ']=process.argv.slice(2);assert(sourcePath&&targetPath&&out);
const [sb,tb]=await Promise.all([readFile(sourcePath),readFile(targetPath)]),source=readGLB(sb),target=readGLB(tb);
const sha=b=>createHash('sha256').update(b).digest('hex');
function acc(g,i){const a=g.json.accessors[i],v=g.json.bufferViews[a.bufferView],w={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];assert.equal(a.componentType,5126);assert(!a.sparse);return Array.from({length:a.count},(_,n)=>Array.from({length:w},(_,k)=>g.bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+n*(v.byteStride||w*4)+k*4)));}
async function pixels(g,info){const im=g.json.images[g.json.textures[info.index].source],v=g.json.bufferViews[im.bufferView],bytes=g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);return sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
const near=(a,b,t=1e-6)=>assert(Math.abs(a-b)<=t,`${a} differs from ${b}`);
// Several installed components can intentionally share one named material.
// Compare the union of their source faces, while requiring identical semantics.
function materialMeaning(g,m){const q=structuredClone(m);for(const info of [q.pbrMetallicRoughness?.baseColorTexture,q.pbrMetallicRoughness?.metallicRoughnessTexture,q.normalTexture,q.occlusionTexture,q.emissiveTexture])if(info){const texture=g.json.textures[info.index],im=g.json.images[texture.source],v=g.json.bufferViews[im.bufferView];info.imageSha256=sha(g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));info.sampler=g.json.samplers[texture.sampler];delete info.index;}return q;}
const groups=new Map();for(const [i,m]of source.json.materials.entries()){const ids=groups.get(m.name)||[];if(ids.length)assert.deepEqual(materialMeaning(source,m),materialMeaning(source,source.json.materials[ids[0]]),'Shared material definitions differ: '+m.name);ids.push(i);groups.set(m.name,ids);}

const materials=[],attributeFailures=[];let checkedVertices=0,maxUVError=0,maxNormalError=0,maxAngleDegrees=0,maxPositionErrorM=0,interpolatedVertices=0,uvRoundingAllowanceVertices=0;
for(const [mi,m]of source.json.materials.entries()){
 const sourceMaterialIds=groups.get(m.name);if(sourceMaterialIds[0]!==mi)continue;
 const ti=target.json.materials.findIndex(x=>x.name===materialPrefix+m.name+' | Browser'),n=target.json.materials[ti];if(!n)continue;
 for(let channel=0;channel<3;channel++)near((m.emissiveFactor||[0,0,0])[channel],(n.emissiveFactor||[0,0,0])[channel]);
 const p=m.pbrMetallicRoughness,q=n.pbrMetallicRoughness,row={name:m.name,maps:[],vertices:0};
 assert.equal(n.alphaMode||'OPAQUE',m.alphaMode||'OPAQUE');assert.equal(n.doubleSided||false,m.doubleSided||false);near(n.alphaCutoff??.5,m.alphaCutoff??.5);
 for(let i=0;i<4;i++)near((p.baseColorFactor||[1,1,1,1])[i],(q.baseColorFactor||[1,1,1,1])[i]);
 for(const [key,si,di]of [['color',p.baseColorTexture,q.baseColorTexture],['normal',m.normalTexture,n.normalTexture],['metalRoughness',p.metallicRoughnessTexture,q.metallicRoughnessTexture]]){
  assert.equal(!!di,!!si,key);if(!si)continue;assert.equal(si.texCoord||0,di.texCoord||0);assert(!si.extensions&&!di.extensions);
  const [a,b]=await Promise.all([pixels(source,si),pixels(target,di)]);assert.equal(a.info.width,b.info.width);assert.equal(a.info.height,b.info.height);assert.equal(a.data.length,b.data.length);
  let maxError=0;const channels=key==='metalRoughness'?[1,2]:[0,1,2,3];
  for(let offset=0;offset<a.data.length;offset+=4)for(const c of channels){let av=a.data[offset+c]/255,bv=b.data[offset+c]/255;
   if(key==='metalRoughness'){av*=c===1?p.roughnessFactor??1:p.metallicFactor??1;bv*=c===1?q.roughnessFactor??1:q.metallicFactor??1;}
   maxError=Math.max(maxError,Math.abs(av-bv));
  }assert(maxError<1e-6,key+' changed');if(key==='normal')near(si.scale??1,di.scale??1);row.maps.push({kind:key,width:a.info.width,height:a.info.height,maximumEffectiveChannelError:maxError});
 }
 if(!p.metallicRoughnessTexture){near(p.metallicFactor??1,q.metallicFactor??1);near(p.roughnessFactor??1,q.roughnessFactor??1);}
 const attrs=new Map(),positions=[],normals=[],uvs=[];
 for(const mesh of source.json.meshes)for(const pr of mesh.primitives)if(sourceMaterialIds.includes(pr.material)){
  const pos=acc(source,pr.attributes.POSITION),norm=acc(source,pr.attributes.NORMAL),uv=pr.attributes.TEXCOORD_0===undefined?null:acc(source,pr.attributes.TEXCOORD_0);
  const ia=source.json.accessors[pr.indices],iv=source.json.bufferViews[ia.bufferView],size=ia.componentType===5123?2:4;assert([5123,5125].includes(ia.componentType));
  for(let i=0;i<ia.count;i++){const offset=(iv.byteOffset||0)+(ia.byteOffset||0)+i*size,k=size===2?source.bin.readUInt16LE(offset):source.bin.readUInt32LE(offset);positions.push(...pos[k]);normals.push(...new T.Vector3(...norm[k]).normalize().toArray());uvs.push(...(uv?.[k]||[0,0]));}
  for(let i=0;i<pos.length;i++){const key=pos[i].join(','),rows=attrs.get(key)||[];rows.push({normal:norm[i],uv:uv?.[i]||[0,0]});attrs.set(key,rows);}
 }
 const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));const bvh=new MeshBVH(g,{indirect:true});
 function compare(r,n,u,tolerance){const angle=new T.Vector3(...r.normal).angleTo(new T.Vector3(...n))*180/Math.PI,normalError=Math.max(...r.normal.map((v,k)=>Math.abs(v-n[k]))),uvError=Math.max(...r.uv.map((v,k)=>Math.abs(v-u[k])));if(angle<=.05&&uvError<=tolerance){maxUVError=Math.max(maxUVError,uvError);maxNormalError=Math.max(maxNormalError,normalError);maxAngleDegrees=Math.max(maxAngleDegrees,angle);return true;}return false;}
 for(const mesh of target.json.meshes)for(const pr of mesh.primitives)if(pr.material===ti){
  const pos=acc(target,pr.attributes.POSITION),norm=acc(target,pr.attributes.NORMAL),uv=pr.attributes.TEXCOORD_0===undefined?null:acc(target,pr.attributes.TEXCOORD_0);
  for(let i=0;i<pos.length;i++){
   const rows=attrs.get(pos[i].join(','))||[],u=uv?.[i]||[0,0];let matched=rows.some(r=>compare(r,norm[i],u,2e-7)),distanceM=null;
   if(!matched){const point=new T.Vector3(...pos[i]);bvh.shapecast({intersectsBounds:b=>b.distanceToPoint(point)<1e-5,intersectsTriangle:(tri,index)=>{const closest=tri.closestPointToPoint(point,new T.Vector3()),distance=closest.distanceTo(point);if(distance>=1e-5)return false;const bary=tri.getBarycoord(closest,new T.Vector3()).toArray(),ids=[0,1,2].map(k=>g.index?g.index.getX(index*3+k):index*3+k);const n=[0,1,2].map(k=>ids.reduce((v,id,c)=>v+bary[c]*normals[id*3+k],0)),t=[0,1].map(k=>ids.reduce((v,id,c)=>v+bary[c]*uvs[id*2+k],0));const ulp=x=>Math.abs(x)<2**-126?2**-149:2**(Math.floor(Math.log2(Math.abs(x)))-23),uvTolerance=Math.max(1e-5,...u.map(x=>2*ulp(x)));if(compare({normal:n,uv:t},norm[i],u,uvTolerance)){if(Math.max(...t.map((v,k)=>Math.abs(v-u[k])))>1e-5)uvRoundingAllowanceVertices++;matched=true;distanceM=distance;return true;}return false;}});if(matched){interpolatedVertices++;maxPositionErrorM=Math.max(maxPositionErrorM,distanceM);}}
   if(!matched)attributeFailures.push({material:m.name,position:pos[i],normal:norm[i],uv:u,source:rows,reason:'attribute-or-surface'});
   row.vertices++;checkedVertices++;
  }
 }
 materials.push(row);
}
assert(materials.length>0&&checkedVertices>0,'No installed component materials matched');
const report={materialPrefix,sourceGlbSha256:sha(sb),targetGlbSha256:sha(tb),materials,attributeFailures,checkedVertices,maximumUVError:maxUVError,maximumNormalError:maxNormalError,maximumNormalAngleDegrees:maxAngleDegrees,maximumInterpolatedPositionErrorM:maxPositionErrorM,interpolatedVertices,uvRoundingAllowanceVertices,pass:attributeFailures.length===0,meaning:'All retained component vertices and effective material channels match. Blender normals are quantized: maximum angular error allowed is 0.05 degrees. New coplanar-cut vertices must lie within 0.00001 m of a source triangle and match interpolated UVs within max(0.00001, two float32 ULPs at the stored UV magnitude). Original-vertex UV tolerance is 0.0000002. Hidden faces may be removed by the exporter; full-station material and lighting acceptance remains open.'};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({materials:materials.length,checkedVertices,maxUVError,maxNormalError,attributeFailures:attributeFailures.length,pass:report.pass}));

assert(report.pass,'Component attribute comparison failed; see saved report');
