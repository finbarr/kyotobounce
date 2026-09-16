// Inspect the delivered source geometry itself, independent of depth offsets.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readGLB} from '../../tools/optimize-browser-assets.mjs';
const file=process.argv[2]||'web/public/assets/atrium.glb';
const {json,bin}=readGLB(await readFile(file));
const regions=[
 {name:'Ticket Trick wall return',axis:0,plane:25,sign:-1,box:[.35,21.47,2.3,21.91]},
 {name:'Concourse paid-gate floor',axis:1,plane:0,sign:1,box:[-7.9,29.6,24.9,40.9]},
 {name:'Concourse tactile pad',axis:1,plane:0,sign:1,box:[-14.60,-7.07,-14.32,-5.93]},
 {name:'Upper walkway slab edge',axis:1,plane:19.585965,sign:1,box:[-75.29,17.36,-74.54,17.68]},
 {name:'Skyway skirting end',axis:0,plane:-67.880005,sign:1,box:[45.275,-1.083,45.365,-1.078]},
].map(r=>({...r,triangles:[]}));
function accessor(index){const a=json.accessors[index],view=json.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3}[a.type],size={5123:2,5125:4,5126:4}[a.componentType],stride=view.byteStride||n*size,at=(view.byteOffset||0)+(a.byteOffset||0);return i=>Array.from({length:n},(_,k)=>a.componentType===5126?bin.readFloatLE(at+i*stride+k*size):size===2?bin.readUInt16LE(at+i*stride+k*size):bin.readUInt32LE(at+i*stride+k*size));}
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
for(const mesh of json.meshes)for(const primitive of mesh.primitives){
 const pos=accessor(primitive.attributes.POSITION),indices=primitive.indices===undefined?i=>[i]:accessor(primitive.indices),count=json.accessors[primitive.indices??primitive.attributes.POSITION].count;
 for(let i=0;i<count;i+=3){
  const points=[0,1,2].map(k=>pos(indices(i+k)[0]));
  for(const r of regions){
   if(points.some(p=>Math.abs(p[r.axis]-r.plane)>.00025))continue;
   const uv=[0,1,2].filter(k=>k!==r.axis),tri=points.map(p=>uv.map(k=>p[k]));
   const normal=cross(tri[0],tri[1],tri[2])*(r.axis===1?-1:1);
   if(normal*r.sign<=1e-12)continue;
   const min=[0,1].map(k=>Math.min(...tri.map(p=>p[k]))),max=[0,1].map(k=>Math.max(...tri.map(p=>p[k])));
   if(min[0]>r.box[2]||max[0]<r.box[0]||min[1]>r.box[3]||max[1]<r.box[1])continue;
   r.triangles.push({points:tri,material:json.materials[primitive.material].name});
  }
 }
}
const rows=regions.map(r=>{
 let overlapping=0,empty=0,max=0;const materials=new Set();
 for(let x=0;x<13;x++)for(let y=0;y<13;y++){
  const p=[r.box[0]+(r.box[2]-r.box[0])*(x+.371)/13,r.box[1]+(r.box[3]-r.box[1])*(y+.619)/13];
  const covers=r.triangles.filter(({points:t})=>{const signs=t.map((a,i)=>cross(a,t[(i+1)%3],p));return signs.every(s=>s>=-1e-10)||signs.every(s=>s<=1e-10);});
  if(covers.length>1)overlapping++;if(!covers.length)empty++;max=Math.max(max,covers.length);covers.forEach(c=>materials.add(c.material));
 }
 return {name:r.name,samples:169,overlapping,empty,max,materials:[...materials]};
});
console.log(JSON.stringify({file,rows},null,2));
if(!process.argv.includes('--audit')){
 assert.ok(rows.every(r=>r.overlapping===0),'Each sampled seam has exactly one visible front face, without depth bias');
 assert.ok(rows.slice(0,3).every(r=>r.empty===0),'Wall finishes, supporting floors and raised tactile bases remain continuous');
 console.log('PASS geometric seam coverage: wall, paid gate, tactile pad, upper landing and skyway trim');
}
