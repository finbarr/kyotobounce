// Install the researched western restaurant/bridge and central Skyway into the
// single collision candidate. Retire displaced draft geometry by named family.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [layoutPath,westDirectory,centralDirectory]=process.argv.slice(2);
assert(layoutPath?.startsWith('.local/'));
const bytes=await readFile(layoutPath),l=JSON.parse(bytes),sha=b=>createHash('sha256').update(b).digest('hex');
assert(l.architecture.westUpperRegistration&&!l.architecture.westUpperConnectionIntegration);
const prefixes=['ramen-','west-bridge-','skyway-','east-crossing-','add-ramen','add-skyway'];
const retired=id=>prefixes.some(p=>id.startsWith(p));
const retiredByKind={};
for(const kind of ['panels','boxes','beams','flights','authoredLights']){retiredByKind[kind]=l[kind].filter(p=>retired(p.id)).map(p=>p.id);l[kind]=l[kind].filter(p=>!retired(p.id));}
const inputs=[],added=[];
for(const [component,directory]of [['west',westDirectory],['central',centralDirectory]]){
 const report=JSON.parse(await readFile(directory+'/report.json')),nb=await readFile(directory+'/native-panels.json'),native=JSON.parse(nb),gb=await readFile(directory+'/'+report.outputs.glbFile),{json:j,bin}=readGLB(gb);
 assert.equal(sha(nb),report.outputs.nativePanelsSha256);assert.equal(sha(gb),report.outputs.glbSha256);
 const offsets=j.materials.map(()=>0),matIds=[];
 for(const [i,m]of j.materials.entries()){
  const pbr=m.pbrMetallicRoughness||{},color=pbr.baseColorFactor||[1,1,1,1],id=`west-upper-${component}-material-${i}`;assert(!l.authoredMaterials.some(p=>p.id===id));matIds.push(id);
  l.authoredMaterials.push({id,label:`Registered ${m.name}`,physical:native.panels.find(p=>p.browserMaterial===i).material,linearColor:Object.fromEntries(['r','g','b','a'].map((k,i)=>[k,color[i]])),alpha:color[3],metallic:pbr.metallicFactor??1,roughness:pbr.roughnessFactor??1,doubleSided:m.doubleSided??false,...(m.emissiveFactor?{emission:1,emissionColor:{r:m.emissiveFactor[0],g:m.emissiveFactor[1],b:m.emissiveFactor[2],a:1}}:{})});
 }
 for(const p of native.panels){
  assert(!l.panels.some(q=>q.id===p.id),'Duplicate component surface');const {browserMaterial:mi,...row}=p,primitive=j.meshes[mi].primitives[0],a=j.accessors[primitive.attributes.NORMAL],v=j.bufferViews[a.bufferView],start=(v.byteOffset||0)+(a.byteOffset||0)+offsets[mi]*(v.byteStride||12);assert.equal(a.componentType,5126);assert.equal(a.type,'VEC3');
  row.normals=p.vertices.map((_,i)=>{const at=start+i*(v.byteStride||12);return{x:bin.readFloatLE(at),y:bin.readFloatLE(at+4),z:-bin.readFloatLE(at+8)};});offsets[mi]+=p.vertices.length;row.appearance=matIds[mi];l.panels.push(row);added.push(row.id);
 }
 for(let mi=0;mi<offsets.length;mi++)assert.equal(offsets[mi],j.accessors[j.meshes[mi].primitives[0].attributes.NORMAL].count);
 inputs.push({directory,glbSha256:sha(gb),nativeSha256:sha(nb),panels:native.panels.length});
}
const r=JSON.parse(await readFile('research/kyoto-station/notes/western-approach/registration.json'));
const central=JSON.parse(await readFile(centralDirectory+'/report.json'));
const pts=[...r.routeRenderer,...[central.geometry.floorBridgeEndRenderer,central.geometry.turnRenderer,central.geometry.endRenderer]];
// The central report names its bridge handoff separately from the two straight
// corridor endpoints. Keep only present points and native-coordinate records.
const route=pts.filter(Boolean).map(p=>({x:p[0],y:p[1],z:-p[2]}));
l.routes=l.routes.filter(p=>!retired(p.id)&&!p.id.startsWith('west-skyway-access-'));
l.routes.push({id:'west-source-restaurant-skyway-out',points:route},{id:'west-source-restaurant-skyway-back',points:route.toReversed()});
l.architecture.westPlazaRegistration.changed.panels.push(...added);
for(const kind of ['panels','boxes','beams','flights'])l.architecture.westPlazaRegistration.changed[kind]=l.architecture.westPlazaRegistration.changed[kind].filter(id=>!retired(id));
delete l.architecture.skywayAccess;delete l.architecture.westBridgeSuspension;
l.architecture.westUpperConnectionIntegration={inputLayoutSha256:sha(bytes),inputs,retiredPrefixes:prefixes,retiredByKind,addedPanels:added,status:'Private integrated candidate; full restaurant and Skyway traversal, ceiling clearance and browser checks pending.'};
await writeFile(layoutPath,JSON.stringify(l)+'\n');await writeFile(layoutPath.replace(/station-layout\.json$/,'connection-integration.json'),JSON.stringify(l.architecture.westUpperConnectionIntegration,null,2)+'\n');console.log(JSON.stringify({retired:Object.fromEntries(Object.entries(retiredByKind).map(([k,v])=>[k,v.length])),added:added.length,routePoints:route.length}));
