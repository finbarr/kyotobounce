// Preserve the coarse courtyard footprint and quantify what the official schematic cannot measure.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const [auditPath,eastDirectory,mapPath,out]=process.argv.slice(2);
assert(auditPath&&eastDirectory&&mapPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const [ab,eb,mb]=await Promise.all([readFile(auditPath),readFile(eastDirectory+'/report.json'),readFile(mapPath)]);
const a=JSON.parse(ab),e=JSON.parse(eb),plane=e.geometry.sourceFloor.plane;
assert.equal(a.source.sha256,'0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1');
assert.equal(sha(mb),'e09edf2af4f46f97cfd65e5bc74f62679f7cf1a1b96a603451dc24f51d909fdd');
const selected=a.faces.filter(f=>f.object==='Untitled.203'&&f.normal[1]>.999&&f.points.every(p=>Math.abs(p.reduce((s,v,k)=>s+v*plane[k],plane[3]))<.002));
assert.equal(selected.length,53);
assert.deepEqual(selected.map(f=>f.face),a.globalFloorCandidates,'Regional scan omitted matching floor triangles from the complete source object');
const vertices=[],vertexMap=new Map(),edges=new Map(),triangles=[];let maximumWeldM=0;
for(const f of selected){
 const ids=f.points.map(p=>{const key=p.map(v=>v.toFixed(4)).join(',');if(!vertexMap.has(key)){vertexMap.set(key,vertices.length);vertices.push(p);}const i=vertexMap.get(key);maximumWeldM=Math.max(maximumWeldM,Math.hypot(...p.map((v,k)=>v-vertices[i][k])));return i;});
 triangles.push({face:f.face,indices:ids});
 for(let k=0;k<3;k++){const from=ids[k],to=ids[(k+1)%3],key=[from,to].sort((a,b)=>a-b).join(',');const list=edges.get(key)||[];list.push({from,to,face:f.face});edges.set(key,list);}
}
assert(maximumWeldM<1e-5);
assert([...edges.values()].every(es=>es.length===1||es.length===2&&es[0].from===es[1].to&&es[0].to===es[1].from));
const connected=new Set([selected[0].face]);let changed=true;
while(changed){changed=false;for(const es of edges.values())if(es.some(x=>connected.has(x.face)))for(const x of es)if(!connected.has(x.face)){connected.add(x.face);changed=true;}}
assert.equal(connected.size,53);
const boundary=[...edges.values()].filter(es=>es.length===1).map(es=>es[0]),remaining=boundary.slice(),loops=[];
while(remaining.length){let edge=remaining.shift();const start=edge.from,indices=[start];let at=edge.to;while(at!==start){indices.push(at);const matches=remaining.map((v,i)=>({v,i})).filter(x=>x.v.from===at);assert.equal(matches.length,1);edge=remaining.splice(matches[0].i,1)[0];at=edge.to;assert(indices.length<=boundary.length);}const points=indices.map(i=>vertices[i]),signedAreaM2=points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+(p[0]*q[2]-q[0]*p[2])/2;},0);loops.push({kind:signedAreaM2<0?'outer':'hole',indices,pointsRenderer:points,signedAreaM2});}
assert.equal(loops.length,2);assert.equal(loops.filter(l=>l.kind==='hole').length,1);
const area=selected.reduce((s,f)=>s+f.areaM2*f.normal[1],0),boundaryArea=-loops.reduce((s,l)=>s+l.signedAreaM2,0);assert(Math.abs(area-boundaryArea)<1e-7);
function barycentric(p,f){const [a,b,c]=f.points,det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);const u=((b[2]-c[2])*(p[0]-c[0])+(c[0]-b[0])*(p[2]-c[2]))/det,v=((c[2]-a[2])*(p[0]-c[0])+(a[0]-c[0])*(p[2]-c[2]))/det;return [u,v,1-u-v];}
const g=e.geometry,U=g.upperRenderer,D=g.forwardRenderer,L=[-D[2],0,D[0]],apron=[];
for(let i=0;i<=10;i++)for(let j=0;j<=8;j++){
 const s=g.lowerDeckStart+g.arrivalApronLengthM*i/10,w=-1.6+3.2*j/8,p=[U[0]+D[0]*s+L[0]*w,g.lowerY,U[2]+D[2]*s+L[2]*w];
 const hits=selected.map(f=>({f,b:barycentric(p,f)})).filter(x=>x.b.every(v=>v>=-1e-8));assert(hits.length);
 const y=hits[0].b.reduce((sum,v,k)=>sum+v*hits[0].f.points[k][1],0);apron.push({pointRenderer:p,sourceFaces:hits.map(h=>h.f.face),sourceY:y,differenceM:p[1]-y});
}
const northWest=[77.83226013183594,29.97290802001953,-24.59440040588379],northEast=[126.58114624023438,29.973817825317383,-25.3995418548584];
assert(vertices.some(p=>p.every((v,k)=>v===northWest[k]))&&vertices.some(p=>p.every((v,k)=>v===northEast[k])));
const mapWest=[153.38,168.72],mapEast=[462.35,168.72],width=mapEast[0]-mapWest[0],basis=[(northEast[0]-northWest[0])/width,(northEast[2]-northWest[2])/width];
const project=([x,y])=>[northWest[0]+basis[0]*(x-mapWest[0])-basis[1]*(y-mapWest[1]),northWest[2]+basis[1]*(x-mapWest[0])+basis[0]*(y-mapWest[1])];
const control={name:'Southern west-wing junction; tentative correspondence',map:[192.4,524.2],sourceRenderer:[78.64100646972656,29.972957611083984,18.360933303833008]};control.predictedXZ=project(control.map);control.residualM=Math.hypot(control.predictedXZ[0]-control.sourceRenderer[0],control.predictedXZ[1]-control.sourceRenderer[2]);
const report={status:'Reference footprint and topology audit; not a finished public floor or an installed component.',inputs:{source:a.source,auditSha256:sha(ab),eastReportSha256:sha(eb),mapSha256:sha(mb)},coordinates:a.coordinates,selection:{object:'Untitled.203',normalYMin:.999,maximumPlaneResidualM:.002,plane,faces:selected.map(f=>f.face)},geometry:{vertices,triangles,loops,connectedFaces:connected.size,boundaryEdges:boundary.length,maximumWeldM,horizontalAreaM2:area,sourceSurfaceAreaM2:selected.reduce((s,f)=>s+f.areaM2,0),boundaryAreaM2:boundaryArea},apron:{samples:apron,maximumHeightDifferenceM:Math.max(...apron.map(p=>Math.abs(p.differenceM)))},schematicCheck:{method:'Two tentative corresponding north corners set one uniform scale and rotation; an independent southern junction tests this hypothesis.',mapAnchors:[mapWest,mapEast],sourceAnchors:[northWest,northEast],scaleMPerSvgUnit:Math.hypot(...basis),controls:[control],metricRegistrationAccepted:false},limits:['The 53 source triangles extend into the southern hotel frontage. Connected geometry does not establish public access.','The six-vertex hole and rounded southern recess are preserved; their exact architectural use needs photograph registration.','The official schematic confirms a Skyway bank, 4F descent, adjacent ramp, eastern lift/toilet corridor and southern circulation, but lacks metric dimensions.','Photographs show raised garden and steps absent from the coarse floor. The plane is not a claim that all walking surfaces are level.','The aperture and surveyed apron samples are geometric correspondence checks, not native walking or integrated station acceptance.']};
await writeFile(out+'/registration.json',JSON.stringify(report,null,2)+'\n');
const x=p=>70+(p[0]-74)*10,y=p=>80+(p[2]+26)*10,points=ps=>ps.map(p=>`${x(p)},${y(p)}`).join(' ');
let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 670"><rect width="1100" height="670" fill="#f6f4ee"/><style>text{font-family:Arial,sans-serif;fill:#233b36} .small{font-size:14px}</style><text x="40" y="35" font-size="25">East Square: source footprint and Skyway arrival</text><text x="40" y="59" class="small">North up · municipal geometry, not a finished public-floor plan</text>';
for(const f of selected)svg+=`<polygon points="${points(f.points)}" fill="#d6e3d9" stroke="#90aa9c" stroke-width=".65"/>`;
for(const loop of loops)svg+=`<polygon points="${points(loop.pointsRenderer)}" fill="none" stroke="#274c43" stroke-width="2"/>`;
for(const p of apron)svg+=`<circle cx="${x(p.pointRenderer)}" cy="${y(p.pointRenderer)}" r="1.7" fill="#c1502a"/>`;
svg+='<text x="435" y="165" class="small">99 apron samples</text><text x="160" y="375" class="small">Preserved source hole</text><text x="685" y="560" class="small">Southern appendage: access unverified</text><text x="40" y="610" class="small">53 connected triangles · 1 outer boundary · 1 hole · 2,043.46 m² coarse surface</text><text x="40" y="636" class="small">Raised garden, stairs, ramp and eastern public corridor require separate reconstruction.</text></svg>';
await writeFile(out+'/footprint.svg',svg+'\n');
console.log(JSON.stringify({faces:selected.length,vertices:vertices.length,loops:loops.map(l=>({kind:l.kind,vertices:l.indices.length,areaM2:l.signedAreaM2})),areaM2:area,maximumWeldM,apronSamples:apron.length,maximumApronHeightDifferenceM:report.apron.maximumHeightDifferenceM,schematicControlResidualM:control.residualM},null,2));
