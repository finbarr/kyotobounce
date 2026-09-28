// Reframe the three evidenced Skyway viewing spaces; preserve the outer envelope.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [parent,skyway,out,specPath='web/station/realism/registrations/skyway-bay-framing.json']=process.argv.slice(2);assert(parent&&skyway&&out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const [parentBytes,parentReportBytes,parentGlb,routeBytes,specBytes]=await Promise.all([readFile(parent+'/native-panels.json'),readFile(parent+'/report.json'),readFile(parent+'/central-roof.glb'),readFile(skyway+'/report.json'),readFile(specPath)]);
const original=JSON.parse(parentBytes).panels,previous=JSON.parse(parentReportBytes),route=JSON.parse(routeBytes),spec=JSON.parse(specBytes),{json:sourceGltf}=readGLB(parentGlb);
assert.equal(sha(parentBytes),previous.outputs.nativePanelsSha256);assert.equal(sha(parentGlb),previous.outputs.glbSha256);assert.equal(sha(parentBytes),spec.parentNativeSha256);assert.equal(route.outputs.nativePanelsSha256,spec.skywayNativeSha256);
const g=route.geometry,[start,end]=g.floorEndpointsRenderer||g.sourceEndpointsRenderer,origin=new T.Vector3().fromArray(start),forward=new T.Vector3().fromArray(end).sub(origin);forward.y=0;forward.normalize();const south=new T.Vector3(-forward.z,0,forward.x),rise=(end[1]-start[1])/g.lengthM;
const local=p=>{const q=new T.Vector3().fromArray(p).sub(origin),s=q.dot(forward);return [s,q.dot(south),q.y-rise*s];};
const world=p=>origin.clone().addScaledVector(forward,p[0]).addScaledVector(south,p[1]).add(new T.Vector3(0,p[2]+rise*p[0],0)).toArray();
const renderer=v=>[v.x,v.y,-v.z],native=p=>({x:p[0],y:p[1],z:-p[2]}),distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k])),lerp=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t),key=p=>p.map(v=>v.toFixed(6)).join(',');
const glass=original.find(p=>p.id==='central-roof-glazing'),glassPoints=glass.vertices.map(v=>new T.Vector3(...renderer(v)));
function glassHeight(s,w){const base=world([s,w,0]),ray=new T.Ray(new T.Vector3(base[0],base[1]+.01,base[2]),new T.Vector3(0,1,0));let height=Infinity;for(let i=0;i<glass.triangles.length;i+=3){const hit=ray.intersectTriangle(...glass.triangles.slice(i,i+3).reverse().map(k=>glassPoints[k]),false,new T.Vector3());if(hit)height=Math.min(height,hit.y-base[1]);}assert(Number.isFinite(height));return height;}
const openings=g.viewingBays.map(bay=>{
 const s0=bay.s0-spec.sideFrameOutsetM,s1=bay.s1+spec.sideFrameOutsetM,w0=bay.outerW+spec.frontFrameInsetM,w1=-g.outerWidthM/2+spec.backFrameInsetM;
 const radius=spec.frameSideM/Math.sqrt(2);
 let lowest=Infinity;for(let s=s0-radius;s<=s1+radius+.00001;s+=.05)for(const w of [w0-radius,w0,w0+radius])lowest=Math.min(lowest,glassHeight(s,w));
 for(const w of [w0-radius,w0,w0+radius])lowest=Math.min(lowest,glassHeight(s1+radius,w));
 const frontHeight=lowest-radius-spec.glassGapM,backHeight=spec.backHeaderHeightM,k=(backHeight-frontHeight)/(w1-w0),intercept=frontHeight-k*w0;
 assert(frontHeight>(spec.openToOuterRoof?1.8:2.1)&&backHeight>frontHeight); // Low front frame is outside the guard's occupied envelope; exact volumes are checked separately.
 return {id:bay.id,s0,s1,w0,w1,bottom:spec.bottomFrameHeightM,frontHeight,backHeight,roofMinimumAtFrontM:lowest,slope:k,intercept,
  planes:[{n:[-1,0,0],c:-s0,name:'west'},{n:[1,0,0],c:s1,name:'east'},{n:[0,-1,0],c:-w0,name:'north'},{n:[0,1,0],c:w1,name:'south'},{n:[0,0,-1],c:-spec.bottomFrameHeightM,name:'bottom'},...(!spec.openToOuterRoof?[{n:[0,-k,1],c:intercept,name:'top'}]:[])]};
});
const dot=(a,b)=>a.reduce((n,v,k)=>n+v*b[k],0);
function interval(a,b,opening){let lo=0,hi=1;for(const {n,c} of opening.planes){const da=dot(n,a)-c,db=dot(n,b)-c,delta=db-da;if(Math.abs(delta)<1e-12){if(da>1e-9)return null;continue;}const t=-da/delta;if(delta>0)hi=Math.min(hi,t);else lo=Math.max(lo,t);if(hi-lo<1e-9)return null;}return [Math.max(0,lo),Math.min(1,hi)];}
function line(panel){assert(panel.vertices.length===24&&panel.triangles.length===36);const ps=panel.vertices.map(renderer),average=from=>[0,1,2].map(k=>ps.slice(from,from+4).reduce((n,p)=>n+p[k],0)/4);const a=average(20),b=average(16);assert(distance(a,b)>1e-5);return {a,b};}
const panels=[],changes=[],attachments=[],newMembers=[],frameEdges=[],protectedRoles=new Set(['canopy-glazing','canopy-frame']);
const cutRoles=new Set(['canopy-inner-chord','canopy-diagonal-web','canopy-depth-strut']);
function fragment(panel,a,b,t0,t1,id){const d=b.map((v,k)=>v-a[k]),lengthSquared=dot(d,d);return {...panel,id,vertices:panel.vertices.map(v=>{const p=renderer(v),t=dot(p.map((v,k)=>v-a[k]),d)/lengthSquared;assert(Math.abs(t)<1e-5||Math.abs(t-1)<1e-5);const oldCenter=lerp(a,b,t),newCenter=lerp(a,b,t0+(t1-t0)*t);return native(p.map((v,k)=>v+newCenter[k]-oldCenter[k]));})};}
for(const p of original){if(!cutRoles.has(p.role)){assert(protectedRoles.has(p.role));panels.push(p);continue;}const {a,b}=line(p),la=local(a),lb=local(b),cuts=openings.map(opening=>({opening,range:interval(la,lb,opening)})).filter(c=>c.range&&c.range[1]-c.range[0]>1e-8).sort((x,y)=>x.range[0]-y.range[0]);if(!cuts.length){panels.push(p);continue;}
 let cursor=0,index=0;const fragments=[];
 for(const cut of cuts){const [lo,hi]=cut.range;assert(lo>=cursor-1e-8,'Overlapping openings');if(lo-cursor>1e-7){const id=p.id+'-bay-fragment-'+index++;panels.push(fragment(p,a,b,cursor,lo,id));fragments.push({id,range:[cursor,lo]});attachments.push({parent:p.id,fragment:id,bay:cut.opening.id,point:lerp(la,lb,lo)});}cursor=hi;if(hi<1-1e-7)attachments.push({parent:p.id,bay:cut.opening.id,point:lerp(la,lb,hi)});}
 if(1-cursor>1e-7){const id=p.id+'-bay-fragment-'+index++;panels.push(fragment(p,a,b,cursor,1,id));fragments.push({id,range:[cursor,1]});}
 changes.push({id:p.id,role:p.role,cutIntervals:cuts.map(c=>({bay:c.opening.id,range:c.range})),fragments});
}
let sequence=0;
function beam(id,a,b,role){if(distance(a,b)<1e-5)return null;const av=new T.Vector3(...world(a)),bv=new T.Vector3(...world(b)),geometry=new T.BoxGeometry(spec.frameSideM,spec.frameSideM,av.distanceTo(bv)),mesh=new T.Mesh(geometry);mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),bv.sub(av).normalize());mesh.updateMatrix();geometry.applyMatrix4(mesh.matrix);const p=geometry.attributes.position,triangles=[];for(let i=0;i<geometry.index.count;i+=3)triangles.push(geometry.index.array[i+2],geometry.index.array[i+1],geometry.index.array[i]);panels.push({id,vertices:Array.from({length:p.count},(_,i)=>native([p.getX(i),p.getY(i),p.getZ(i)])),triangles,material:'roof',browserMaterial:1,role,collision:true});newMembers.push({id,a,b,role});geometry.dispose();return id;}
for(const o of openings){const h=w=>o.slope*w+o.intercept,corners=[[o.s0,o.w0,o.bottom],[o.s1,o.w0,o.bottom],[o.s1,o.w1,o.bottom],[o.s0,o.w1,o.bottom],[o.s0,o.w0,h(o.w0)],[o.s1,o.w0,h(o.w0)],[o.s1,o.w1,h(o.w1)],[o.s0,o.w1,h(o.w1)]];
 for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]){const id=`central-roof-bay-${o.id}-frame-${sequence++}`;beam(id,corners[a],corners[b],'canopy-bay-frame');frameEdges.push({bay:o.id,id,a:corners[a],b:corners[b]});}
}
// Each interrupted member meets a tie on its clipping face. Ties terminate on
// a perimeter frame, keeping the modeled load path connected around the opening.
const tiePlans=[],ties=[];let maximumConnectionError=0,reusedTieRequests=0;
for(const attachment of attachments){const o=openings.find(o=>o.id===attachment.bay),p=attachment.point,faces=o.planes.filter(({n,c})=>Math.abs(dot(n,p)-c)/Math.hypot(...n)<1e-6);assert(faces.length);
 let best=null;
 for(const face of faces)for(const edge of frameEdges.filter(e=>e.bay===o.id)){if(Math.abs(dot(face.n,edge.a)-face.c)>1e-6||Math.abs(dot(face.n,edge.b)-face.c)>1e-6)continue;const target=new T.Line3(new T.Vector3(...edge.a),new T.Vector3(...edge.b)).closestPointToPoint(new T.Vector3(...p),true,new T.Vector3()).toArray(),d=distance(p,target);if(!best||d<best.distance)best={target,distance:d,frame:edge.id,face:face.name};}
 assert(best);tiePlans.push({attachment,best});
}
// Several source-triangle cuts can request almost the same tie. Reuse the
// longest member when both connection centers fit inside its section; verify
// those joints against the emitted meshes independently afterward.
function fits(point,tie){const d=tie.b.map((v,k)=>v-tie.a[k]),lengthSquared=dot(d,d),t=dot(point.map((v,k)=>v-tie.a[k]),d)/lengthSquared;if(t<0||t>1)return false;return distance(point,lerp(tie.a,tie.b,t))<spec.frameSideM*.42;}
for(const {attachment,best} of tiePlans.sort((a,b)=>b.best.distance-a.best.distance)){
 const p=attachment.point,d=new T.Vector3(...best.target).sub(new T.Vector3(...p)).normalize();
 let tie=best.distance<1e-5?null:ties.find(t=>t.frame===best.frame&&new T.Vector3(...t.b).sub(new T.Vector3(...t.a)).normalize().cross(d).length()<1e-5&&fits(p,t)&&fits(best.target,t));
 if(tie)reusedTieRequests++;
 else if(best.distance>=1e-5){tie={id:beam(`central-roof-bay-${attachment.bay}-tie-${sequence++}`,p,best.target,'canopy-bay-tie'),a:p,b:best.target,frame:best.frame};ties.push(tie);}
 attachment.tie=tie?.id||null;attachment.frame=best.frame;attachment.face=best.face;attachment.target=best.target;
 const frame=frameEdges.find(e=>e.id===best.frame),error=new T.Line3(new T.Vector3(...frame.a),new T.Vector3(...frame.b)).closestPointToPoint(new T.Vector3(...best.target),true,new T.Vector3()).distanceTo(new T.Vector3(...best.target));maximumConnectionError=Math.max(maximumConnectionError,error);assert(error<1e-6);
}
assert(new Set(panels.map(p=>p.id)).size===panels.length);
for(const p of original.filter(p=>protectedRoles.has(p.role)))assert.deepEqual(panels.find(q=>q.id===p.id),p,'Registered outer geometry changed');
// Closed-shell checks cover every retained fragment and every new support.
let minimumVolumeM3=Infinity;
for(const p of panels){const points=p.vertices.map(v=>new T.Vector3(...renderer(v))),edges=new Map();let volume=0;for(let i=0;i<p.triangles.length;i+=3){const tri=p.triangles.slice(i,i+3).reverse();volume+=points[tri[0]].dot(points[tri[1]].clone().cross(points[tri[2]]))/6;for(let k=0;k<3;k++){const a=key(points[tri[k]].toArray()),b=key(points[tri[(k+1)%3]].toArray());assert.notEqual(a,b);const id=[a,b].sort().join('|'),e=edges.get(id)||{n:0,balance:0};e.n++;e.balance+=a<b?1:-1;edges.set(id,e);}}assert([...edges.values()].every(e=>e.n===2&&e.balance===0),`Open ${p.id}`);assert(volume>1e-8,`Inverted ${p.id}`);minimumVolumeM3=Math.min(minimumVolumeM3,volume);}
const materials=sourceGltf.materials,batches=materials.map(()=>({positions:[],indices:[]}));for(const p of panels){const batch=batches[p.browserMaterial],at=batch.positions.length/3;batch.positions.push(...p.vertices.flatMap(renderer));for(let i=0;i<p.triangles.length;i+=3)batch.indices.push(at+p.triangles[i+2],at+p.triangles[i+1],at+p.triangles[i]);}
const j={asset:{version:'2.0',generator:'Kyoto canopy with framed Skyway viewing bays'},scene:0,scenes:[{nodes:[0,1]}],nodes:materials.map((m,i)=>({name:m.name,mesh:i})),meshes:[],materials,buffers:[],bufferViews:[],accessors:[]},parts=[];let offset=0;
function append(typed,type,componentType,count,target,min,max){const bytes=Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});parts.push(bytes);offset+=bytes.length;const id=j.accessors.length;j.accessors.push({bufferView:view,componentType,count,type,...(min?{min,max}:{})});return id;}
for(let m=0;m<batches.length;m++){const batch=batches[m],p=new Float32Array(batch.positions),ids=new Uint32Array(batch.indices),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){const k=i%3;min[k]=Math.min(min[k],p[i]);max[k]=Math.max(max[k],p[i]);}const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(p,3)).setIndex(new T.BufferAttribute(ids,1));geometry.computeVertexNormals();const position=append(p,'VEC3',5126,p.length/3,34962,min,max),normal=append(geometry.attributes.normal.array,'VEC3',5126,p.length/3,34962),index=append(ids,'SCALAR',5125,ids.length,34963);j.meshes.push({primitives:[{attributes:{POSITION:position,NORMAL:normal},indices:index,material:m,mode:4}]});geometry.dispose();}j.buffers.push({byteLength:offset});
const glb=writeGLB(j,Buffer.concat(parts)),nativeBytes=Buffer.from(JSON.stringify({schemaVersion:1,coordinates:'Native X east,Y up,Z north',panels})+'\n');await writeFile(out+'/central-roof.glb',glb);await writeFile(out+'/native-panels.json',nativeBytes);
const probes=previous.additionalProbeTriangles.filter(p=>p.id==='central-roof-glazing');for(const role of [...cutRoles,'canopy-bay-frame','canopy-bay-tie']){const members=panels.filter(p=>p.role===role),n=Math.min(32,members.length);for(let i=0;i<n;i++){const p=members[Math.round(i*(members.length-1)/Math.max(1,n-1))];for(const triangleOffset of [0,6,12,18,24,30])probes.push({id:p.id,triangleOffset});}}
const report={status:'Canopy viewing-bay framing construction hypothesis; not installed or a structural engineering validation.',source:previous.source,inputLayoutSha256:previous.inputLayoutSha256,registrationSha256:previous.registrationSha256,parentComponentGlbSha256:sha(parentGlb),parentNativeSha256:sha(parentBytes),bayFramingRegistrationSha256:sha(specBytes),skywayReportSha256:sha(routeBytes),geometry:{...previous.geometry,totalPanels:panels.length,triangles:batches.reduce((n,b)=>n+b.indices.length/3,0),frameMembers:panels.length-1,memberCounts:panels.reduce((r,p)=>(r[p.role]=(r[p.role]||0)+1,r),{})},closedManifoldPanels:panels.length,minimumClosedVolumeM3:minimumVolumeM3,openings,changedMembers:changes,attachments,newMembers,maximumAttachmentToFrameErrorM:maximumConnectionError,reusedTieRequests,protectedOuterPanels:original.filter(p=>protectedRoles.has(p.role)).length,additionalProbeTriangles:probes,outputs:{glbFile:'central-roof.glb',glbSha256:sha(glb),nativePanelsSha256:sha(nativeBytes)},limits:[...previous.limits,...spec.limits]};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({panels:panels.length,triangles:report.geometry.triangles,changedMembers:changes.length,newMembers:newMembers.length,attachments:attachments.length,maximumConnectionError,openings:openings.map(({planes,...o})=>o),outputs:report.outputs},null,2));
