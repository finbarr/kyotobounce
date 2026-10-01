// Fit the canopy connection to both retained roof profiles, without moving them.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const base=await read(manifest),raw=await readFile(base.layout);assert.equal(sha(raw),base.layoutSha256);const j=JSON.parse(raw);
const key=p=>p.toArray().map(v=>v.toFixed(5)).join(','),vec=p=>new T.Vector3(p.x,p.y,-p.z);
const central=j.panels.find(p=>p.id==='central-roof-glazing');
// The retained shell has 97 outer vertices followed by their inner partners.
assert.equal(central.vertices.length,194);
const west=central.vertices.slice(0,97).filter(v=>v.x>74).map(vec).sort((a,b)=>b.z-a.z);assert.equal(west.length,9);
const edges=new Map();for(const p of j.panels.filter(p=>p.id.startsWith('east-roof-glazing-source-'))){const vs=p.triangles.slice(0,3).map(i=>vec(p.vertices[i]));for(let i=0;i<3;i++){const a=vs[i],b=vs[(i+1)%3],k=[key(a),key(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}}
const root=[...edges.values()].filter(vs=>vs.every(v=>v.x<83));assert.equal(root.length,24);
const east=[root.flat().reduce((a,b)=>a.x<b.x?a:b)],remaining=root.slice();while(remaining.length){const i=remaining.findIndex(e=>e.some(v=>key(v)===key(east.at(-1))));assert(i>=0);const [a,b]=remaining.splice(i,1)[0];east.push(key(a)===key(east.at(-1))?b:a);}assert.equal(east.length,25);
function parameterize(points){const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+points[i].distanceTo(points[i-1]));const total=lengths.at(-1),ts=lengths.map(x=>x/total);return{total,ts,at(t){let i=ts.findIndex(v=>v>=t-1e-10);if(i<=0)return points[0].clone();const u=(t-ts[i-1])/(ts[i]-ts[i-1]);return points[i-1].clone().lerp(points[i],u);}};}
const W=parameterize(west),E=parameterize(east),steps=Math.ceil(Math.max(W.total,E.total)/1.25),ribTs=Array.from({length:steps+1},(_,i)=>i/steps);
const ts=[...new Set([...W.ts,...E.ts,...ribTs])].sort((a,b)=>a-b),us=[0,1/3,2/3,1],at=(u,t)=>W.at(t).lerp(E.at(t),u);
const parentGlb=readGLB(await readFile(base.geometry)),materials=['Canopy envelope glazing | Browser','Canopy steel - registered outer frame | Browser'].map(name=>{const m=parentGlb.json.materials.find(m=>m.name===name);assert(m);return structuredClone(m);});
const build=construction(materials),prefix='east-canopy-junction-',vertices=us.flatMap(u=>ts.map(t=>at(u,t))),n=vertices.length,triangles=[];
const index=(u,t)=>u*ts.length+t;
for(let u=0;u<us.length-1;u++)for(let t=0;t<ts.length-1;t++){const a=index(u,t),b=index(u+1,t),c=index(u+1,t+1),d=index(u,t+1);for(const f of [[a,b,c],[a,c,d]])triangles.push(...f);}
const normals=vertices.map(()=>new T.Vector3());for(let i=0;i<triangles.length;i+=3){const f=triangles.slice(i,i+3),[a,b,c]=f.map(k=>vertices[k]),normal=b.clone().sub(a).cross(c.clone().sub(a));for(const k of f)normals[k].add(normal);}normals.forEach(v=>v.normalize());
const outer=triangles.slice();for(let i=0;i<outer.length;i+=3)triangles.push(outer[i+2]+n,outer[i+1]+n,outer[i]+n);
const boundary=new Map();for(let i=0;i<outer.length;i+=3)for(let k=0;k<3;k++){const a=outer[i+k],b=outer[i+(k+1)%3],id=[a,b].sort((a,b)=>a-b).join(',');if(boundary.has(id))boundary.delete(id);else boundary.set(id,[a,b]);}
for(const [a,b]of boundary.values())triangles.push(a,a+n,b+n,a,b+n,b);
build.add(prefix+'roof-glazing',[...vertices,...vertices.map((v,i)=>v.clone().addScaledVector(normals[i],-.024))].map(v=>v.toArray()),triangles,0,'roof-glazing');
let rail=0;function beam(a,b,width=.085,height=.1){if(a.distanceTo(b)>.00001)build.beam(prefix+'frame-'+rail++,a.toArray(),b.toArray(),width,height,1,'roof-frame');}
// Two intermediate arches and longitudinal rails land on both existing frames.
for(const u of [1/3,2/3])for(let i=1;i<ts.length;i++)beam(at(u,ts[i-1]),at(u,ts[i]));
for(const t of ribTs)beam(at(0,t),at(1,t));
for(const edge of [west,east])for(let i=1;i<edge.length;i++)beam(edge[i-1],edge[i],.10,.12);
// A glazed end screen follows the original central arch, with a clear opening
// over the public landing. The two side panes stop at the existing floor edge.
const floor=45.083488088977774,doorSouth=15,doorNorth=18,head=48.30;
function westAtZ(z){let i=west.findIndex(v=>-v.z>=z-1e-8);if(i<=0)return west[0].clone();return west[i-1].clone().lerp(west[i],(z+west[i-1].z)/(west[i-1].z-west[i].z));}
function pane(id,lo,hi,bottom){const roof=[westAtZ(lo),...west.filter(v=>-v.z>lo+1e-7&&-v.z<hi-1e-7),westAtZ(hi)],points=[roof[0].clone().setY(bottom),...roof,roof.at(-1).clone().setY(bottom)],shape=points.map(v=>new T.Vector2(-v.z,v.y)),ix=[];
 for(const face of T.ShapeUtils.triangulateShape(shape,[])){const [a,b,c]=face,A=points[a],B=points[b],C=points[c];if(B.clone().sub(A).cross(C.clone().sub(A)).x<0)face.reverse();ix.push(...face);}
 const count=points.length,front=ix.slice();for(let i=0;i<front.length;i+=3)ix.push(front[i+2]+count,front[i+1]+count,front[i]+count);
 const es=new Map();for(let i=0;i<front.length;i+=3)for(let k=0;k<3;k++){const a=front[i+k],b=front[i+(k+1)%3],id=[a,b].sort((a,b)=>a-b).join(',');if(es.has(id))es.delete(id);else es.set(id,[a,b]);}for(const [a,b]of es.values())ix.push(a,a+count,b+count,a,b+count,b);
 build.add(prefix+id,[...points,...points.map(v=>v.clone().add(new T.Vector3(-.024,0,0)))].map(v=>v.toArray()),ix,0,'landing-glazing');}
pane('south-screen',-west[0].z,doorSouth,44.80);pane('head-screen',doorSouth,doorNorth,head);pane('north-screen',doorNorth,-west.at(-1).z,floor);
for(const z of [doorSouth,doorNorth]){const p=westAtZ(z);beam(p.clone().setY(floor),p,.09,.09);}beam(westAtZ(doorSouth).setY(head),westAtZ(doorNorth).setY(head),.09,.10);
const panelCuts=[];for(const id of ['municipal-station-frontage-east-Untitled.201','municipal-station-frontage-east-Untitled.203','municipal-station-court-east-Untitled.203']){const p=j.panels.find(p=>p.id===id),faces=[];for(let i=0;i<p.triangles.length;i+=3){const vs=p.triangles.slice(i,i+3).map(k=>p.vertices[k]);if(vs.every(v=>v.x>=73&&v.x<=84&&v.y>=44.94&&v.y<=51&&v.z>8&&v.z<25))faces.push({index:i/3});}panelCuts.push({id,faces});}
assert.deepEqual(panelCuts.map(p=>p.faces.length),[9,5,21]);
const prior=await read('.local/v2/current/components/east-canopy-interface/report.json'),spec={parentLayoutSha256:base.layoutSha256,parentGeometrySha256:base.geometrySha256,panelCuts,retiredBeams:[],retiredBoxes:[],westProfile:west.map(v=>v.toArray()),eastProfile:east.map(v=>v.toArray()),thicknessM:.024,opening:{south:doorSouth,north:doorNorth,floor,head},reference:'https://www.kyoto-station-building.co.jp/service/square/',limits:['The roof boundaries retain municipal source coordinates. The connecting glass, member spacing and portal framing are fitted reconstructions, not measured construction details.']};
const report=await build.save(out,'east-canopy-junction.glb',{scope:'Join the eastern canopy to the atrium roof and replace the coarse landing screen.',componentPrefix:prefix,inputLayoutSha256:base.layoutSha256,geometry:{...prior.geometry,roofBoundaryVertices:west.length+east.length,frameMembers:rail},limits:spec.limits});
const native=await read(out+'/native-panels.json'),componentGlb=readGLB(await readFile(out+'/east-canopy-junction.glb')),normalOffsets=[0,0],appearances=[central.appearance,'registered-roof-outer-steel'];for(const p of native.panels){const m=p.browserMaterial,a=componentGlb.json.accessors[componentGlb.json.meshes[m].primitives[0].attributes.NORMAL],v=componentGlb.json.bufferViews[a.bufferView];p.normals=p.vertices.map((_,i)=>{const at=v.byteOffset+(normalOffsets[m]+i)*12;return{x:componentGlb.bin.readFloatLE(at),y:componentGlb.bin.readFloatLE(at+4),z:-componentGlb.bin.readFloatLE(at+8)};});normalOffsets[m]+=p.vertices.length;p.appearance=appearances[p.browserMaterial];p.vertices=p.vertices.map(v=>Object.fromEntries(Object.entries(v).map(([k,n])=>[k,Math.fround(n)])));}const nativeRaw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',nativeRaw);report.outputs.nativePanelsSha256=sha(nativeRaw);spec.addedPanelsSha256=sha(nativeRaw);spec.componentGlbSha256=report.outputs.glbSha256;
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(base,null,2)+'\n');await writeFile(out+'/motion.json',await readFile('.local/v2/current/components/east-canopy-interface/motion.json'));
await writeFile(out+'/views.json',JSON.stringify([['junction',[88,47,10],[76,48,18]],['roof-connection',[85,58,12],[76,48,17]],['square-roof',[113,33.5,-7],[92,48,15]],['arrival',[109,31.62,16.3],[80,44,16.3]],['descent',[77.1,46.733488,17.5],[105,31.5,17.2]]],null,2)+'\n');console.log(JSON.stringify({panels:report.geometry.panels,triangles:report.geometry.triangles,removedFaces:panelCuts.map(p=>p.faces.length),frameMembers:rail}));
