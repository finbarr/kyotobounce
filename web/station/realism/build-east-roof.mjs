// Rebuild the municipal eastern flared roof as an independently reviewable assembly.
// The source is coarse: grid dimensions retain the current authored hypothesis.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const[sourcePath,layoutPath,out]=process.argv.slice(2);assert(sourcePath&&layoutPath&&out);assert(resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const sourceBytes=await readFile(sourcePath),layoutBytes=await readFile(layoutPath),sha=b=>createHash('sha256').update(b).digest('hex'),{json:j,bin}=readGLB(sourceBytes),layout=JSON.parse(layoutBytes);
assert.equal(sha(sourceBytes),'0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1');
function acc(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],n=a.type==='VEC3'?3:1,b=a.componentType===5123?2:4;assert(!a.sparse);return Array.from({length:a.count},(_,k)=>Array.from({length:n},(_,c)=>{const p=(v.byteOffset||0)+(a.byteOffset||0)+k*(v.byteStride||n*b)+c*b;return a.componentType===5126?bin.readFloatLE(p):b===2?bin.readUInt16LE(p):bin.readUInt32LE(p)}));}
const node=j.nodes.find(n=>n.name==='Untitled.203');assert(node&&!node.matrix&&!node.translation&&!node.rotation&&!node.scale);assert.equal(j.meshes[node.mesh].primitives.length,1);const primitive=j.meshes[node.mesh].primitives[0],positions=acc(primitive.attributes.POSITION),indices=acc(primitive.indices).flat();
// Source face identities come from visible picks and a bounded connectivity audit.
const registrationBytes=await readFile('web/station/realism/registrations/east-roof-envelope.json'),registration=JSON.parse(registrationBytes);
assert.equal(sha(sourceBytes),registration.source.sha256);
const faceIds=registration.faceIds;
const faces=faceIds.map(id=>({id,points:indices.slice(id*3,id*3+3).map(i=>positions[i])}));
const unique=new Map();for(const f of faces)for(const p of f.points)unique.set(p.join(','),p);const points=[...unique.values()];
const dist=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const frame=registration.parameterFrame;
for(const p of Object.values(frame))assert(points.some(q=>dist(p,q)<1e-7),'Parameter corner must be an actual source vertex');
const mouth=[frame.mouthSouthRenderer,frame.mouthNorthRenderer],root=[frame.rootSouthRenderer,frame.rootNorthRenderer];
const crossAxis=new T.Vector2(mouth[1][0]-mouth[0][0],mouth[1][2]-mouth[0][2]).normalize();
const longAxis=new T.Vector2(-crossAxis.y,crossAxis.x),dot=(p,axis)=>p[0]*axis.x+p[2]*axis.y;
const rootL=(dot(root[0],longAxis)+dot(root[1],longAxis))/2,mouthL=(dot(mouth[0],longAxis)+dot(mouth[1],longAxis))/2;
assert(mouthL-rootL>20);
const toUV=p=>{const v=(dot(p,longAxis)-rootL)/(mouthL-rootL),lo=T.MathUtils.lerp(dot(root[0],crossAxis),dot(mouth[0],crossAxis),v),hi=T.MathUtils.lerp(dot(root[1],crossAxis),dot(mouth[1],crossAxis),v);assert(hi>lo);return [(dot(p,crossAxis)-lo)/(hi-lo),v];};
const uvFaces=faces.map(f=>({...f,uv:f.points.map(toUV)}));
const grid=Number(layout.architecture.nominalGridM||layout.architecture.nominalGrid||1.44);assert(Math.abs(grid-1.44)<1e-6);const side=Number(layout.architecture.squareTubeSideM||.1);assert(side>.04&&side<.2);
// Radial grid coordinates follow the flared plan boundary. Every line is clipped
// to individual source triangles, so it cannot bridge a source opening or facet.
// Subdivision limits piece length, not a claimed surveyed module or member phase.
const nu=24,nv=20,us=Array.from({length:nu+1},(_,i)=>i/nu),vs=Array.from({length:nv+1},(_,i)=>i/nv);
const materials=[{name:'East roof | glazing',pbrMetallicRoughness:{baseColorFactor:[.55,.77,.84,.22],roughnessFactor:.13,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},{name:'East roof | light structural steel',pbrMetallicRoughness:{baseColorFactor:[.79,.81,.8,1],roughnessFactor:.38,metallicFactor:.3},doubleSided:false}];
const panels=[],batches=[{positions:[],indices:[]},{positions:[],indices:[]}],beamLengths=[];
function addGeometry(id,verts,tris,material,role){const native=verts.map(p=>({x:p[0],y:p[1],z:-p[2]}));const nativeTriangles=[];for(let i=0;i<tris.length;i+=3)nativeTriangles.push(tris[i+2],tris[i+1],tris[i]);panels.push({id,vertices:native,triangles:nativeTriangles,material:material===0?'glass':'roof',role,collision:true});const g=batches[material],at=g.positions.length/3;g.positions.push(...verts.flat());g.indices.push(...tris.map(i=>i+at));}
// Preserve every source triangle exactly: later panes may subdivide these planes.
const originalPane=layout.panels.find(p=>p.id.startsWith('canopy-glazing-')&&p.vertices.length===8);assert(originalPane);
const originalThickness=dist(['x','y','z'].map(k=>originalPane.vertices[0][k]),['x','y','z'].map(k=>originalPane.vertices[4][k]));assert(Math.abs(originalThickness-.024)<2e-6);const glazingThickness=.024;
for(const f of faces){const n=new T.Vector3().fromArray(f.points[1]).sub(new T.Vector3().fromArray(f.points[0])).cross(new T.Vector3().fromArray(f.points[2]).sub(new T.Vector3().fromArray(f.points[0]))).normalize();const back=f.points.map(p=>p.map((v,k)=>v-glazingThickness*n.getComponent(k))),verts=[...f.points,...back],triangles=[0,1,2,5,4,3];for(let a=0;a<3;a++){const b=(a+1)%3;triangles.push(b,a,a+3,b,a+3,b+3);}addGeometry('east-roof-glazing-source-'+f.id,verts,triangles,0,'canopy-glazing');}
function beam(a,b,id){const length=dist(a,b);assert(length>1e-5);beamLengths.push(length);const geometry=new T.BoxGeometry(side,side,length);const mesh=new T.Mesh(geometry);mesh.position.fromArray(a).add(new T.Vector3().fromArray(b)).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3().fromArray(b).sub(new T.Vector3().fromArray(a)).normalize());mesh.updateMatrix();geometry.applyMatrix4(mesh.matrix);const pos=geometry.attributes.position;const verts=Array.from({length:pos.count},(_,i)=>[pos.getX(i),pos.getY(i),pos.getZ(i)]);addGeometry(id,verts,Array.from(geometry.index.array),1,'canopy-frame');geometry.dispose();}
const gridSegments=new Map();
function clipLine(face,axis,value){
 const hits=[];
 for(let i=0;i<3;i++){
  const j=(i+1)%3,a=face.uv[i][axis]-value,b=face.uv[j][axis]-value;
  if(Math.abs(a)<1e-9)hits.push(face.points[i]);
  if(a*b<0){const t=a/(a-b);hits.push(face.points[i].map((v,k)=>v+(face.points[j][k]-v)*t));}
 }
 const unique=[];for(const p of hits)if(!unique.some(q=>dist(p,q)<1e-7))unique.push(p);
 if(unique.length<2)return;
 let best=[unique[0],unique[1]];for(const a of unique)for(const b of unique)if(dist(a,b)>dist(...best))best=[a,b];
 if(dist(...best)<1e-5)return;
 const key=best.map(p=>p.map(v=>v.toFixed(6)).join(',')).sort().join('|');if(!gridSegments.has(key))gridSegments.set(key,best);
}
for(const f of uvFaces){for(const u of us)clipLine(f,0,u);for(const v of vs)clipLine(f,1,v);}
let beamIndex=0;
for(const[a,b]of gridSegments.values()){
 const count=Math.ceil(dist(a,b)/grid);
 for(let i=0;i<count;i++)beam(a.map((v,k)=>v+(b[k]-v)*i/count),a.map((v,k)=>v+(b[k]-v)*(i+1)/count),`east-roof-grid-${beamIndex++}`);
}
const gltf={asset:{version:'2.0',generator:'Kyoto measured east-roof construction assembly'},scene:0,scenes:[{nodes:[0,1]}],nodes:[{name:'Measured eastern roof glazing',mesh:0},{name:'Provisional outer structural grid',mesh:1}],meshes:[],materials,buffers:[],bufferViews:[],accessors:[]},parts=[];let offset=0;
function append(typed,type,componentType,count,target,min,max){const bytes=Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength);const view=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});parts.push(bytes);offset+=bytes.length;const index=gltf.accessors.length;gltf.accessors.push({bufferView:view,componentType,count,type,...(min?{min,max}:{})});return index;}
for(let material=0;material<batches.length;material++){const g=batches[material],a=new Float32Array(g.positions),ids=new Uint32Array(g.indices),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i++){const k=i%3;min[k]=Math.min(min[k],a[i]);max[k]=Math.max(max[k],a[i]);}const position=append(a,'VEC3',5126,a.length/3,34962,min,max),index=append(ids,'SCALAR',5125,ids.length,34963);gltf.meshes.push({primitives:[{attributes:{POSITION:position},indices:index,material,mode:4}]});}
gltf.buffers.push({byteLength:offset});const glb=writeGLB(gltf,Buffer.concat(parts));await writeFile(out+'/east-roof.glb',glb);const nativeBytes=Buffer.from(JSON.stringify({schemaVersion:1,coordinates:'Native X east,Y up,Z north',panels})+'\n');await writeFile(out+'/native-panels.json',nativeBytes);
// Compare exported float32 coordinates and winding, not just the authoring arrays.
const decoded=readGLB(await readFile(out+'/east-roof.glb')),savedNative=JSON.parse(await readFile(out+'/native-panels.json'));
let cursor=[0,0],indexCursor=[0,0],maxError=0;
for(const p of savedNative.panels){const material=p.material==='glass'?0:1,primitive=decoded.json.meshes[material].primitives[0],pos=decoded.json.accessors[primitive.attributes.POSITION],idx=decoded.json.accessors[primitive.indices],pv=decoded.json.bufferViews[pos.bufferView],iv=decoded.json.bufferViews[idx.bufferView],at=cursor[material];
 for(const[i,v]of p.vertices.entries()){const actual=[0,1,2].map(k=>decoded.bin.readFloatLE(pv.byteOffset+(at+i)*12+k*4));maxError=Math.max(maxError,dist(actual,[v.x,v.y,-v.z]));}
 for(let i=0;i<p.triangles.length;i+=3)for(let k=0;k<3;k++)assert.equal(decoded.bin.readUInt32LE(iv.byteOffset+(indexCursor[material]+i+k)*4),at+p.triangles[i+2-k],'Native winding must reflect the renderer Z axis');
 cursor[material]+=p.vertices.length;indexCursor[material]+=p.triangles.length;
}
assert(maxError<1e-5);const bounds=[0,1,2].map(k=>[Math.min(...points.map(p=>p[k])),Math.max(...points.map(p=>p[k]))]);
const report={status:'Independent construction assembly; not yet integrated or a completed structural model.',source:{file:sourcePath,sha256:sha(sourceBytes),object:'Untitled.203',faceIds},inputLayoutSha256:sha(layoutBytes),geometry:{boundsRenderer:bounds,rootRenderer:root,mouthRenderer:mouth,sourceGlazingTriangles:faces.length,parameterRegistrationSha256:sha(registrationBytes),gridDivisions:{cross:nu,long:nv},glazingThicknessM:glazingThickness,outerGridBeams:beamIndex,triangles:batches.reduce((s,g)=>s+g.indices.length/3,0),gridTargetM:grid,squareTubeSideM:side,maximumGridPieceM:Math.max(...beamLengths)},visualNativeCoordinateMaxErrorM:maxError,outputs:{glbFile:'east-roof.glb',glbSha256:sha(glb),nativePanelsSha256:sha(nativeBytes)},limits:['The 248 municipal triangles retain the coarse eastern envelope and its small attachment openings; local curvature and openings require photographic refinement.','The 24 mm closed glass thickness retains the existing model hypothesis; it is not a manufacturer specification.',
'Only the outer grid is constructed. Inner chords, bracing, hangers, bearing seats, sealant and pane assemblies remain to add.','The 1.44 m grid and tube width retain the existing authoring hypothesis; member phase and fabrication dimensions are not surveyed.','The scene is an isolated roof component. It does not demonstrate station route continuity or runtime acceptance.']};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
