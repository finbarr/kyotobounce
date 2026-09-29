// Independently check the finish pass against the parent layout and encoded geometry.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [parent,folder]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await read(parent),candidate=await read(folder+'/assets.json'),report=await read(folder+'/report.json');
const a=await read(base.layout),b=await read(candidate.layout),original=new Map(a.panels.map(p=>[p.id,p]));
for(const edit of report.edits){const p=b.panels.find(p=>p.id===edit.id),old=original.get(edit.id);assert(p&&old);if(edit.uv){assert.equal(p.uv.length,p.vertices.length);assert(p.uv.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)));if(old.uv)p.uv=old.uv;else delete p.uv;p.appearance=old.appearance;}if(edit.smooth){assert.equal(p.normals.length,p.vertices.length);assert(p.normals.every(v=>Math.abs(Math.hypot(v.x,v.y,v.z)-1)<1e-6));if(old.normals)p.normals=old.normals;else delete p.normals;}}
for(const s of report.specs){const i=b.authoredMaterials.findIndex(m=>m.id===s.appearance);assert(i>=0);if(s.from)b.authoredMaterials.splice(i,1);else b.authoredMaterials[i]=a.authoredMaterials.find(m=>m.id===s.oldAppearance);}
assert.equal(report.adjustedLights.length,6);for(const id of report.adjustedLights){const next=b.authoredLights.find(l=>l.id===id);assert.equal(next.intensity,3.3);next.intensity=a.authoredLights.find(l=>l.id===id).intensity;}
assert(eq(a,b),'Physical layout or unrelated metadata changed');
const ab=await readFile(base.geometry),bb=await readFile(candidate.geometry);assert.equal(sha(ab),base.geometrySha256);assert.equal(sha(bb),candidate.geometrySha256);const x=readGLB(ab),y=readGLB(bb);assert(y.bin.subarray(0,x.bin.length).equals(x.bin));
for(const key of ['nodes','scenes','scene'])assert(eq(x.json[key],y.json[key]));
for(const key of ['accessors','bufferViews','textures','images','samplers'])assert(eq(x.json[key],y.json[key].slice(0,x.json[key].length)));
assert.equal(x.json.meshes.length,y.json.meshes.length);
function indices(g,p){const acc=g.json.accessors[p.indices],v=g.json.bufferViews[acc.bufferView];assert(!v.extensions&&!acc.sparse);const size=acc.componentType===5125?4:2,values=[];for(let i=0;i<acc.count;i++)values.push(g.bin[size===4?'readUInt32LE':'readUInt16LE']((v.byteOffset||0)+(acc.byteOffset||0)+i*size));return values;}
function triangles(g,primitives){const rows=[];for(const p of primitives){const v=indices(g,p);for(let i=0;i<v.length;i+=3){const t=v.slice(i,i+3),min=t.indexOf(Math.min(...t));rows.push(p.attributes.POSITION+':'+[...t.slice(min),...t.slice(0,min)].join(','));}}return rows.sort();}
const touched=new Set(report.touched.map(t=>t.mesh));let addedCalls=0;
for(let i=0;i<x.json.meshes.length;i++){const old=x.json.meshes[i],next=y.json.meshes[i];if(!touched.has(i)){assert(eq(old,next));continue;}assert(eq(triangles(x,old.primitives),triangles(y,next.primitives)),'Triangle winding/positions changed: '+i);addedCalls+=next.primitives.length-old.primitives.length;for(const p of next.primitives){assert(old.primitives.some(q=>q.attributes.POSITION===p.attributes.POSITION));assert.equal(p.mode??4,4);}}
assert.equal(addedCalls,2);const changed=new Set(report.specs.filter(s=>!s.from).map(s=>s.material));for(let i=0;i<x.json.materials.length;i++)if(!changed.has(i))assert(eq(x.json.materials[i],y.json.materials[i]));
// Compare each edited native corner attribute with the renderer's matching batch.
const current=await read(candidate.layout),byId=new Map(current.panels.map(p=>[p.id,p]));
for(const row of report.touched){
 const oldPrimitive=x.json.meshes[row.mesh].primitives[0],label=x.json.materials[oldPrimitive.material].name;
 const appearance=a.authoredMaterials.find(m=>m.label===label).id,panels=a.panels.filter(p=>p.appearance===appearance);let offset=0;
 for(const old of panels){const p=byId.get(old.id),edit=report.edits.find(e=>e.id===p.id);const primitive=y.json.meshes[row.mesh].primitives.find(q=>q.material===(edit?.material??oldPrimitive.material));assert(primitive);
  for(const [attribute,field,axes,flip]of [['TEXCOORD_0','uv',['x','y'],true],['NORMAL','normals',['x','y','z'],false]]){
   if(!p[field])continue;const acc=y.json.accessors[primitive.attributes[attribute]],view=y.json.bufferViews[acc.bufferView];
   for(let i=0;i<p.vertices.length;i++)for(let k=0;k<axes.length;k++){let expected=p[field][i][axes[k]];if(flip&&k===1)expected=1-expected;if(!flip&&k===2)expected=-expected;const actual=y.bin.readFloatLE((view.byteOffset||0)+(acc.byteOffset||0)+(offset+i)*axes.length*4+k*4);assert(Math.abs(actual-expected)<1e-5,p.id+' '+attribute);}
  }offset+=p.vertices.length;
 }
}
for(const m of Object.values(report.maps))assert.equal(sha(await readFile(folder+'/textures/'+m.file)),m.sha256);
const proof={pass:true,layoutSha256:candidate.layoutSha256,geometrySha256:candidate.geometrySha256,allPhysicalRecordsUnchanged:true,allRenderedPositionsAndOrientedTrianglesUnchanged:true,inheritedEncodedBytesUnchanged:true,nativeAndRenderedCornerAttributesMatch:true,editedPanels:report.edits.length,addedDrawCalls:addedCalls};await writeFile(folder+'/verification.json',JSON.stringify(proof,null,2)+'\n');console.log(proof);
