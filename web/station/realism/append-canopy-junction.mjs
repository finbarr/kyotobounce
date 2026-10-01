// Append the small, untextured junction batch to an existing compressed scene.
import assert from 'node:assert/strict';
export function appendJunction(j,part,byteOffset){
 const g=part.json;assert(g.buffers.length===1&&!g.extensionsUsed&&!g.images&&!g.textures);
 const material=j.materials.length,mesh=j.meshes.length,accessor=j.accessors.length,view=j.bufferViews.length,node=j.nodes.length;
 j.materials.push(...g.materials);
 j.bufferViews.push(...g.bufferViews.map(v=>({...v,byteOffset:(v.byteOffset||0)+byteOffset})));
 j.accessors.push(...g.accessors.map(a=>({...a,bufferView:a.bufferView+view})));
 j.meshes.push(...g.meshes.map(m=>({...m,primitives:m.primitives.map(p=>({...p,material:p.material+material,indices:p.indices+accessor,attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,v])=>[k,v+accessor]))}))})));
 for(const n of g.nodes){assert(!n.children&&!n.matrix&&!n.translation&&!n.rotation&&!n.scale);j.nodes.push({...n,name:'east-canopy-junction | '+n.name,mesh:n.mesh+mesh});}
 j.scenes[j.scene||0].nodes.push(...g.scenes[g.scene||0].nodes.map(n=>n+node));
 return part.bin.subarray(0,g.buffers[0].byteLength);
}
