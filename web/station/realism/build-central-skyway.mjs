// Construction hypothesis anchored to the municipal west bridge and roof axes.
// The continuous interior floor and eastern landing are not surveyed source faces.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [sourcePath,fitPath,layoutPath,out,bridgeDir]=process.argv.slice(2);
assert(sourcePath&&fitPath&&layoutPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const [sourceBytes,fitBytes,layoutBytes,specBytes,roofBytes]=await Promise.all([readFile(sourcePath),readFile(fitPath),readFile(layoutPath),readFile('web/station/realism/registrations/central-skyway.json'),readFile('web/station/realism/registrations/central-roof-envelope.json')]);
const spec=JSON.parse(specBytes),roof=JSON.parse(roofBytes),fit=JSON.parse(fitBytes);
assert.equal(hash(sourceBytes),roof.source.sha256);assert.equal(hash(fitBytes),roof.parameterization.fitSha256);
const bridgeBytes=bridgeDir?await readFile(bridgeDir+'/report.json'):null,bridge=bridgeBytes?JSON.parse(bridgeBytes):null;
let floorOffset=0;if(bridge){assert.equal(bridge.fitSha256,hash(fitBytes));assert.equal(hash(await readFile(bridgeDir+'/native-panels.json')),bridge.outputs.nativePanelsSha256);assert.equal(hash(await readFile(bridgeDir+'/'+bridge.outputs.glbFile)),bridge.outputs.glbSha256);assert.deepEqual(bridge.geometry.sourceEndpointsRenderer,fit.westBridge.centerEndpointsRenderer);floorOffset=bridge.geometry.finishedFloorOffsetM;assert(floorOffset>0&&floorOffset<.3);spec.screenHeightM-=floorOffset;assert(spec.screenHeightM>2.1);}
const {json:j,bin}=readGLB(sourceBytes);
function accessor(id){const a=j.accessors[id],v=j.bufferViews[a.bufferView],n=a.type==='VEC3'?3:1,b=a.componentType===5123?2:4;assert(!a.sparse&&[5123,5125,5126].includes(a.componentType));return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>{const p=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*b)+k*b;return a.componentType===5126?bin.readFloatLE(p):b===2?bin.readUInt16LE(p):bin.readUInt32LE(p);}));}
const sourceNode=j.nodes.find(n=>n.name===roof.source.object);assert(sourceNode&&!sourceNode.matrix&&!sourceNode.translation&&!sourceNode.rotation&&!sourceNode.scale);
const pr=j.meshes[sourceNode.mesh].primitives[0],positions=accessor(pr.attributes.POSITION),indices=accessor(pr.indices).flat();
const mainPoints=roof.regions.main.flatMap(id=>indices.slice(id*3,id*3+3).map(i=>positions[i]));
const d=new T.Vector3(1,0,fit.centralSectionSlopeZYPerX[0]).normalize(),south=new T.Vector3(-d.z,0,d.x);
const along=p=>new T.Vector3().fromArray(p).dot(d);
const westPlane=Math.min(...mainPoints.map(along)),eastPlane=Math.max(...mainPoints.map(along));
const [westStart,bridgeEnd]=(bridge?.geometry.floorEndpointsRenderer||fit.westBridge.centerEndpointsRenderer).map(p=>new T.Vector3().fromArray(p));
const bridgeDirection=bridgeEnd.clone().sub(westStart).normalize();
const approachLength=(westPlane-bridgeEnd.dot(d))/bridgeDirection.dot(d);assert(approachLength>0&&approachLength<10);
const turn=bridgeEnd.clone().addScaledVector(bridgeDirection,approachLength),length=eastPlane-westPlane;
const end=turn.clone().addScaledVector(d,length);end.y=turn.y+fit.centralSectionSlopeZYPerX[1]*(end.x-turn.x);
const forward=end.clone().sub(turn).normalize(),floorAt=s=>turn.clone().addScaledVector(forward,s),at=(s,w,h=0)=>floorAt(s).addScaledVector(south,w).add(new T.Vector3(0,h,0)).toArray();
const half=spec.outerWidthM/2,bridgeHalf=fit.westBridge.sourceOuterWidthsM.reduce((a,b)=>a+b)/4;
const bridgeSouth=new T.Vector3(-bridgeDirection.z,0,bridgeDirection.x).normalize();
// Miter both side edges at the turn instead of overlapping independent decks.
function intersection(a,u,b,v){const determinant=u.x*v.z-u.z*v.x;assert(Math.abs(determinant)>.01);const dx=b.x-a.x,dz=b.z-a.z,t=(dx*v.z-dz*v.x)/determinant;return a.clone().addScaledVector(u,t);}
const leftStart=bridgeEnd.clone().addScaledVector(bridgeSouth,-bridgeHalf),rightStart=bridgeEnd.clone().addScaledVector(bridgeSouth,bridgeHalf);
const leftTurn=intersection(leftStart,bridgeDirection,turn.clone().addScaledVector(south,-half),d),rightTurn=intersection(rightStart,bridgeDirection,turn.clone().addScaledVector(south,half),d);
for(const p of [leftTurn,rightTurn,leftStart,rightStart])p.y=turn.y;
const materials=[
 {name:'Central Skyway | clear glazing',pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.19],roughnessFactor:.12,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},
 {name:'Central Skyway | grey metal framing',pbrMetallicRoughness:{baseColorFactor:[.45,.48,.48,1],roughnessFactor:.36,metallicFactor:.5}},
 {name:'Central Skyway | dark walking surface',pbrMetallicRoughness:{baseColorFactor:[.12,.135,.14,1],roughnessFactor:.78,metallicFactor:0}},
 {name:'Central Skyway | pale opaque south panels',pbrMetallicRoughness:{baseColorFactor:[.69,.71,.70,1],roughnessFactor:.46,metallicFactor:.18}}
];
const batches=materials.map(()=>({positions:[],indices:[]})),panels=[];
function add(id,verts,tris,m,role){const native=[];for(let i=0;i<tris.length;i+=3)native.push(tris[i+2],tris[i+1],tris[i]);panels.push({id,vertices:verts.map(([x,y,z])=>({x,y,z:-z})),triangles:native,material:m===0?'glass':m===2?'floor':'roof',browserMaterial:m,role,collision:true});const batch=batches[m],start=batch.positions.length/3;batch.positions.push(...verts.flat());batch.indices.push(...tris.map(i=>i+start));}
function beam(id,a,b,width,height,m=1,role='corridor-frame'){
 const av=new T.Vector3().fromArray(a),bv=new T.Vector3().fromArray(b),len=av.distanceTo(bv);assert(len>.0001);
 const g=new T.BoxGeometry(width,height,len),mesh=new T.Mesh(g);mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),bv.sub(av).normalize());mesh.updateMatrix();g.applyMatrix4(mesh.matrix);const p=g.attributes.position;
 add(id,Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),Array.from(g.index.array),m,role);g.dispose();
}
function slab(id,polygon,depth,m,role){
 const contour=polygon.map(p=>new T.Vector2(p[0],p[2]));if(T.ShapeUtils.isClockWise(contour)){polygon=polygon.slice().reverse();contour.reverse();}
 const n=polygon.length,verts=[...polygon,...polygon.map(([x,y,z])=>[x,y-depth,z])],triangles=[];
 for(const [a,b,c] of T.ShapeUtils.triangulateShape(contour,[]))triangles.push(c,b,a,a+n,b+n,c+n);
 for(let a=0;a<n;a++){const b=(a+1)%n;triangles.push(a,b,b+n,a,b+n,a+n);}
 add(id,verts,triangles,m,role);
}
// Three viewing bays are known topology. Their precise size/phase is provisional.
const bays=spec.viewingBays.map((b,i)=>({id:i+1,s0:b.fraction*length-spec.bayWidthM/2,s1:b.fraction*length+spec.bayWidthM/2,outerW:-half-spec.bayProjectionM}));
const northOutline=[leftStart.toArray(),leftTurn.toArray()];
for(const bay of bays)northOutline.push(at(bay.s0,-half),at(bay.s0,bay.outerW),at(bay.s1,bay.outerW),at(bay.s1,-half));
northOutline.push(at(length,-half));
slab('central-skyway-deck',[...northOutline,at(length,half),rightTurn.toArray(),rightStart.toArray()],spec.deckThicknessM,2,'corridor-floor');
const toPoint=(p,h)=>[p[0],p[1]+h,p[2]];
let index=0;
function enclosure(a,b,sign,{glass=true}={}){
 const screenHeight=glass?spec.screenHeightM:spec.railHeightM;
 const len=Math.hypot(b[0]-a[0],b[2]-a[2]),count=Math.ceil(len/spec.targetBayM),lo=sign>0?spec.opaqueHeightM:spec.baseHeightM;
 const dir=new T.Vector3(b[0]-a[0],0,b[2]-a[2]).normalize(),inward=new T.Vector3(-dir.z,0,dir.x).multiplyScalar(-sign);
 for(let i=0;i<count;i++){
  const p=a.map((v,k)=>v+(b[k]-v)*i/count),q=a.map((v,k)=>v+(b[k]-v)*(i+1)/count),id=index++;
  beam(`central-skyway-post-${id}`,p,toPoint(p,screenHeight),spec.frameSideM,spec.frameSideM);
  beam(`central-skyway-base-${id}`,toPoint(p,lo/2),toPoint(q,lo/2),spec.baseThicknessM,lo,sign>0?3:1,'corridor-base');
  if(glass)beam(`central-skyway-glass-${id}`,toPoint(p,(lo+screenHeight)/2),toPoint(q,(lo+screenHeight)/2),spec.glassThicknessM,screenHeight-lo,0,'corridor-glazing');
  beam(`central-skyway-top-${id}`,toPoint(p,screenHeight),toPoint(q,screenHeight),spec.frameSideM,spec.frameSideM);
  const rail=p=>new T.Vector3().fromArray(toPoint(p,spec.railHeightM)).addScaledVector(inward,spec.railInsetM).toArray();
  beam(`central-skyway-handrail-${id}`,rail(p),rail(q),spec.railSideM,spec.railSideM);
  beam(`central-skyway-bracket-${id}`,toPoint(p,spec.railHeightM),rail(p),spec.bracketSideM,spec.bracketSideM);
  if(sign<0)for(const h of [.55,.78])beam(`central-skyway-low-rail-${id}-${h}`,toPoint(p,h),toPoint(q,h),spec.bracketSideM,spec.bracketSideM);
  if(sign>0){
   // Repeated vents in the low south wall, corroborated by the corridor photo.
   const ventA=p.map((v,k)=>v+(q[k]-v)*.16),ventB=p.map((v,k)=>v+(q[k]-v)*.84);
   for(let k=0;k<6;k++){const h=lo-.18+k*.022;const inset=p=>new T.Vector3().fromArray(toPoint(p,h)).addScaledVector(inward,spec.baseThicknessM*.56).toArray();beam(`central-skyway-vent-${id}-${k}`,inset(ventA),inset(ventB),.009,.009,1,'corridor-vent');}
  }
 }
 beam(`central-skyway-post-end-${index++}`,b,toPoint(b,screenHeight),spec.frameSideM,spec.frameSideM);
}
enclosure(leftStart.toArray(),leftTurn.toArray(),-1);enclosure(rightStart.toArray(),rightTurn.toArray(),1);
let cursor=leftTurn.toArray();
for(const bay of bays){const start=at(bay.s0,-half),frontStart=at(bay.s0,bay.outerW),frontEnd=at(bay.s1,bay.outerW),end=at(bay.s1,-half);enclosure(cursor,start,-1);enclosure(start,frontStart,-1);enclosure(frontStart,frontEnd,-1,{glass:false});enclosure(frontEnd,end,-1);cursor=end;}
enclosure(cursor,at(length,-half),-1);enclosure(rightTurn.toArray(),at(length,half),1);
// Provisional bay guard; the external canopy supplies the inclined outer glass.
// The component deliberately does not alter roof members to make a clearance test pass.
// Continue the measured bridge enclosure to the mitered main-corridor turn.
// This closes the exposed approach without extending an unrelated canopy slab.
const archRise=spec.approachArchRiseM,archSegments=spec.approachArchSegments,archStations=Math.ceil(approachLength/spec.targetBayM);
function archPoint(u,theta,offset){
 const left=leftStart.clone().lerp(leftTurn,u),right=rightStart.clone().lerp(rightTurn,u),k=(1-Math.cos(theta))/2;
 const p=left.clone().lerp(right,k);p.y=turn.y+spec.screenHeightM+archRise*Math.sin(theta);
 const tangentU=leftTurn.clone().sub(leftStart).lerp(rightTurn.clone().sub(rightStart),k);tangentU.y=0;
 const tangentTheta=right.clone().sub(left).multiplyScalar(Math.sin(theta)/2);tangentTheta.y=archRise*Math.cos(theta);
 const normal=tangentTheta.cross(tangentU).normalize();assert(normal.y>=-1e-6);
 return p.addScaledVector(normal,offset).toArray();
}
function archSweep(id,u0,u1,thickness,material,role,centered=false){
 const vertices=[],triangles=[],low=centered?-thickness/2:-thickness,high=centered?thickness/2:0;
 for(let k=0;k<=archSegments;k++){const theta=Math.PI*k/archSegments;for(const[u,d]of[[u0,low],[u1,low],[u1,high],[u0,high]])vertices.push(archPoint(u,theta,d));}
 for(let k=0;k<archSegments;k++)for(let e=0;e<4;e++){const a=k*4+e,b=k*4+(e+1)%4,c=b+4,d=a+4;triangles.push(a,b,c,a,c,d);}
 triangles.push(2,1,0,3,2,0);const last=archSegments*4;triangles.push(last+1,last+2,last,last+2,last+3,last);
 add(id,vertices,triangles,material,role);
}
for(let i=0;i<archStations;i++)archSweep(`central-skyway-approach-roof-${i}`,i/archStations,(i+1)/archStations,spec.glassThicknessM,0,'corridor-approach-roof');
for(let i=1;i<=archStations;i++){const u=i/archStations,du=spec.frameSideM/approachLength/2;archSweep(`central-skyway-approach-arch-${i}`,u-du,u+du,spec.frameSideM,1,'corridor-approach-frame',true);}
beam('central-skyway-approach-crown',archPoint(0,Math.PI/2,0),archPoint(1,Math.PI/2,0),spec.frameSideM,spec.frameSideM);
let minimumVolume=Infinity;
for(const panel of panels){const ps=panel.vertices.map(v=>new T.Vector3(v.x,v.y,-v.z)),edges=new Map();let volume=0;const key=p=>p.toArray().map(v=>v.toFixed(6)).join(',');
 for(let i=0;i<panel.triangles.length;i+=3){const tri=panel.triangles.slice(i,i+3).reverse();volume+=ps[tri[0]].dot(ps[tri[1]].clone().cross(ps[tri[2]]))/6;for(let k=0;k<3;k++){const a=key(ps[tri[k]]),b=key(ps[tri[(k+1)%3]]);assert.notEqual(a,b);const e=[a,b].sort().join('|'),row=edges.get(e)||{n:0,balance:0};row.n++;row.balance+=a<b?1:-1;edges.set(e,row);}}
 assert([...edges.values()].every(e=>e.n===2&&e.balance===0),`Open ${panel.id}`);assert(volume>1e-8,`Inverted ${panel.id}: ${volume}`);minimumVolume=Math.min(minimumVolume,volume);
}
const gltf={asset:{version:'2.0',generator:'Kyoto central Skyway construction hypothesis'},scene:0,scenes:[{nodes:materials.map((_,i)=>i)}],nodes:materials.map((m,i)=>({name:m.name,mesh:i})),meshes:[],materials,buffers:[],bufferViews:[],accessors:[]},parts=[];let offset=0;
function append(typed,type,componentType,count,target,min,max){const bytes=Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength),view=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});parts.push(bytes);offset+=bytes.length;const id=gltf.accessors.length;gltf.accessors.push({bufferView:view,componentType,count,type,...(min?{min,max}:{})});return id;}
for(let m=0;m<batches.length;m++){const batch=batches[m],p=new Float32Array(batch.positions),ix=new Uint32Array(batch.indices),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){const k=i%3;min[k]=Math.min(min[k],p[i]);max[k]=Math.max(max[k],p[i]);}const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(p,3)).setIndex(new T.BufferAttribute(ix,1));geometry.computeVertexNormals();const position=append(p,'VEC3',5126,p.length/3,34962,min,max),normal=append(geometry.attributes.normal.array,'VEC3',5126,p.length/3,34962),indices=append(ix,'SCALAR',5125,ix.length,34963);gltf.meshes.push({primitives:[{attributes:{POSITION:position,NORMAL:normal},indices,material:m,mode:4}]});geometry.dispose();}gltf.buffers.push({byteLength:offset});
const glb=writeGLB(gltf,Buffer.concat(parts)),nativeBytes=Buffer.from(JSON.stringify({schemaVersion:1,coordinates:'Native X east,Y up,Z north',panels})+'\n');
await writeFile(out+'/central-skyway.glb',glb);await writeFile(out+'/native-panels.json',nativeBytes);
const report={status:'Uninstalled corridor hypothesis. Bay/roof interference must be measured before integration.',source:roof.source,fitSha256:hash(fitBytes),registrationSha256:hash(specBytes),inputLayoutSha256:hash(layoutBytes),geometry:{sourceBridgeEndRenderer:fit.westBridge.centerEndpointsRenderer[1],...(bridge?{floorBridgeEndRenderer:bridgeEnd.toArray(),floorEndpointsRenderer:[turn.toArray(),end.toArray()],finishedFloorOffsetM:floorOffset,screenHeightM:spec.screenHeightM,bridgeReportSha256:hash(bridgeBytes),bridgeNativeSha256:bridge.outputs.nativePanelsSha256,datumSha256:bridge.geometry.datumSha256}:{}),sourceBoundaryPlanes:[westPlane,eastPlane],turnRenderer:turn.toArray(),endRenderer:end.toArray(),approachLengthM:approachLength,lengthM:length,sourceEndpointsRenderer:[turn.toArray(),end.toArray()].map(p=>p.map((v,k)=>k===1?v-floorOffset:v)),outerWidthM:spec.outerWidthM,viewingBays:bays,panels:panels.length,triangles:batches.reduce((n,b)=>n+b.indices.length/3,0),minimumClosedVolumeM3:minimumVolume},additionalProbeTriangles:panels.filter(p=>p.role==='corridor-approach-roof').flatMap(p=>[8,16,24,31].map(k=>({id:p.id,triangleOffset:k*24+12}))),outputs:{glbFile:'central-skyway.glb',glbSha256:hash(glb),nativePanelsSha256:hash(nativeBytes)},limits:bridge?[...spec.limits,'Finished floor follows the provisional western landing datum. Screen tops and approach roof retain their prior world elevations; handrails follow the raised floor.']:spec.limits};
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({geometry:report.geometry,outputs:report.outputs},null,2));
