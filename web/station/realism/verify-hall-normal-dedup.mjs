import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [before,after,out]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex');
async function load(dir){const r=JSON.parse(await readFile(dir+'/report.json')),bytes=await readFile(dir+'/native-panels.json'),glb=await readFile(dir+'/'+r.outputs.glbFile);assert.equal(sha(bytes),r.outputs.nativePanelsSha256);assert.equal(sha(glb),r.outputs.glbSha256);return {r,bytes,n:JSON.parse(bytes),g:readGLB(glb)};}
const a=await load(before),b=await load(after);assert.deepEqual(a.n.escalators,b.n.escalators);assert.deepEqual(a.n.combSupports,b.n.combSupports);assert.equal(a.n.panels.length,b.n.panels.length);
let nativeCorners=0,browserCorners=0,minNormal=Infinity,maxNormal=0;
for(let i=0;i<a.n.panels.length;i++){
 const x=a.n.panels[i],y=b.n.panels[i],{vertices:av,triangles:ai,...am}=x,{vertices:bv,triangles:bi,...bm}=y;assert.deepEqual(am,bm);assert.equal(ai.length,bi.length);
 for(let j=0;j<ai.length;j++){assert.deepEqual(av[ai[j]],bv[bi[j]]);nativeCorners++;}
}
function values(g,index){const ac=g.json.accessors[index],v=g.json.bufferViews[ac.bufferView],n=ac.type==='VEC3'?3:1,at=(v.byteOffset||0)+(ac.byteOffset||0);return Array.from({length:ac.count*n},(_,i)=>ac.componentType===5126?g.bin.readFloatLE(at+i*4):g.bin.readUInt32LE(at+i*4));}
assert.equal(a.g.json.meshes.length,b.g.json.meshes.length);
for(let m=0;m<a.g.json.meshes.length;m++){
 const x=a.g.json.meshes[m].primitives[0],y=b.g.json.meshes[m].primitives[0],ai=values(a.g,x.indices),bi=values(b.g,y.indices);assert.equal(ai.length,bi.length);
 for(const attr of ['POSITION','NORMAL']){const av=values(a.g,x.attributes[attr]),bv=values(b.g,y.attributes[attr]);for(let i=0;i<ai.length;i++){const ac=av.slice(ai[i]*3,ai[i]*3+3),bc=bv.slice(bi[i]*3,bi[i]*3+3);assert.deepEqual(ac,bc);if(attr==='NORMAL'){const length=Math.hypot(...bc);minNormal=Math.min(minNormal,length);maxNormal=Math.max(maxNormal,length);assert(Math.abs(length-1)<1e-5);}}}browserCorners+=ai.length;
}
const report={beforeNativeSha256:sha(a.bytes),afterNativeSha256:sha(b.bytes),beforeGlbSha256:a.r.outputs.glbSha256,afterGlbSha256:b.r.outputs.glbSha256,nativeCorners,browserCorners,collisionTrianglesExactlyEqual:true,renderedPositionAndNormalCornersExactlyEqual:true,mechanismsAndMaterialsExactlyEqual:true,minNormal,maxNormal,pass:true};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
