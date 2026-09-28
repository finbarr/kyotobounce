// Restore lower-stair handrails and their supporting parapets from municipal geometry.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import {construction} from './component-mesh.mjs';

const [layoutPath,sourcePath,out]=process.argv.slice(2);
assert(layoutPath&&sourcePath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const layoutBytes=await readFile(layoutPath),sourceBytes=await readFile(sourcePath);
const layout=JSON.parse(layoutBytes),{json:g,bin}=readGLB(sourceBytes);
assert.equal(hash(sourceBytes),'0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1','Review a changed municipal source before selecting its handrails');
assert.equal(layout.panels.filter(p=>p.id.startsWith('west-v2-stair-')).length,31,'Requires the registered western staircase');
assert(!layout.panels.some(p=>p.id.startsWith('west-v2-lower-stair-handrail-')),'Handrails already installed');

function accessor(index){
 const a=g.accessors[index],v=g.bufferViews[a.bufferView];
 const width={SCALAR:1,VEC3:3}[a.type],size={5123:2,5125:4,5126:4}[a.componentType];
 assert(width&&size&&!a.sparse&&v.buffer===0);
 return Array.from({length:a.count},(_,n)=>Array.from({length:width},(_,k)=>{
  const offset=(v.byteOffset||0)+(a.byteOffset||0)+n*(v.byteStride||width*size)+k*size;
  return a.componentType===5126?bin.readFloatLE(offset):size===2?bin.readUInt16LE(offset):bin.readUInt32LE(offset);
 }));
}
const materials=[
 {name:'Registered western staircase | stainless handrails',pbrMetallicRoughness:{baseColorFactor:[.48,.51,.52,1],roughnessFactor:.36,metallicFactor:.8}},
 {name:'Registered western staircase | dark stone parapets',pbrMetallicRoughness:{baseColorFactor:[.16,.165,.16,1],roughnessFactor:.78,metallicFactor:0}}
];
const mesh=construction(materials);
const selection=['BuildingInstallation.1390','BuildingInstallation.1759'];
for(const [i,name] of selection.entries()){
 const node=g.nodes.find(n=>n.name===name);
 assert(node&&!node.matrix&&!node.translation&&!node.rotation&&!node.scale);
 const primitives=g.meshes[node.mesh].primitives;assert.equal(primitives.length,1);
 const primitive=primitives[0];assert(primitive.mode===undefined||primitive.mode===4);
 const vertices=accessor(primitive.attributes.POSITION),indices=accessor(primitive.indices).flat();
 const normals=accessor(primitive.attributes.NORMAL).flat();
 mesh.add('west-v2-lower-stair-handrail-'+(i+1),vertices,indices,0,'stair-handrail',normals);
 mesh.panels.at(-1).material='steel';
}
// Preserve the source cap faces, including the flat intermediate landing and
// different end lengths. Hidden backing extends 1.7 m down to meet the treads.
const stairNode=g.nodes.find(n=>n.name==='Untitled.200');
assert(stairNode&&!stairNode.matrix&&!stairNode.translation&&!stairNode.rotation&&!stairNode.scale);
const stairMesh=g.meshes[stairNode.mesh];assert.equal(stairMesh.primitives.length,1);
const stairPrimitive=stairMesh.primitives[0],positions=accessor(stairPrimitive.attributes.POSITION),indices=accessor(stairPrimitive.indices).flat();
const capFaces=[7574,7575,7576,7577,7578,7579,7580,7581,7652,7653,7732,7733,7734,7735,7736,7737,7738,7739,7740];
for(const face of capFaces){
 const cap=indices.slice(face*3,face*3+3).map(i=>positions[i]);
 assert(cap.length===3&&cap.every(([x,y,z])=>x>-22&&x<-8&&y>1.5&&y<6.8&&z>-17.7&&z<-14.3));
 const stone=construction([materials[1]],{flatNormals:true});
 stone.slab('west-v2-lower-stair-parapet-'+face,cap,[],1.7,0,'stair-parapet');
 const panel=stone.panels[0];
 mesh.add(panel.id,panel.vertices.map(v=>[v.x,v.y,-v.z]),panel.triangles.flatMap((_,i)=>i%3?[]:[panel.triangles[i+2],panel.triangles[i+1],panel.triangles[i]]),1,'stair-parapet');
 mesh.panels.at(-1).material='stone';
}
const report=await mesh.save(out,'west-stair-handrails.glb',{
 builder:'web/station/realism/build-west-stair-handrails.mjs',builderSha256:hash(await readFile(new URL(import.meta.url))),
 sourceLayoutSha256:hash(layoutBytes),sourceSha256:hash(sourceBytes),sourceObjects:selection,parapetCaps:{object:'Untitled.200',faces:capFaces,backingDepthM:1.7},
 source:'Kyoto City municipal station model, https://data.city.kyoto.lg.jp/resource/?id=21224 (CC BY 4.0)',
 scope:'Both lower-stair handrails and supporting parapets. Rail positions, topology, normals and parapet cap faces come from the source. Hidden parapet depth and stainless/stone finishes are authored approximations; no research imagery is used as texture.'
});
console.log(JSON.stringify({panels:report.geometry.panels,triangles:report.geometry.triangles,bytes:(await readFile(out+'/west-stair-handrails.glb')).length}));
