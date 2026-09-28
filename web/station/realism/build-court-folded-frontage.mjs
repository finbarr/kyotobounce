// Pale upper panels, reflective folded lower faces and a smooth rounded return.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import * as T from 'three';
import {construction} from './component-mesh.mjs';import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const[specPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});const sb=await readFile(specPath),spec=JSON.parse(sb),sha=b=>createHash('sha256').update(b).digest('hex'),g=spec.construction;
assert(spec.profile.length===19&&spec.patches.length===18);const material=(name,color,roughness,metalness)=>({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],metallicFactor:metalness,roughnessFactor:roughness}});
const mats=[material('court-fold-upper-metal',[.57,.60,.61],.38,.35),material('court-fold-mirror',[.72,.76,.78],.055,1),material('court-fold-dark-return',[.065,.077,.09],.23,.45),material('court-fold-joints',[.032,.039,.044],.85,.05),material('court-fold-trim',[.48,.53,.56],.30,1),material('court-fold-plinth',[.105,.12,.13],.6,.1)];
const c=construction(mats,{flatNormals:true}),smooth=new Map(),segments=[],P=spec.profile.map(p=>new T.Vector3(...p)),curve=new T.CatmullRomCurve3(P.slice(1,10),false,'centripetal'),N=8*g.curveSubdivisionsPerSourceSpan;
const normal=d=>new T.Vector3(d.z,0,-d.x).normalize();
function segment(id,a,b,na,nb,isCurve=false){segments.push({id,a,b,na,nb,isCurve});}
segment('return',P[0],P[1],normal(P[1].clone().sub(P[0])),normal(P[1].clone().sub(P[0])));
for(let i=0;i<N;i++)segment('curve-'+i,curve.getPoint(i/N),curve.getPoint((i+1)/N),normal(curve.getTangent(i/N)),normal(curve.getTangent((i+1)/N)),true);
for(let i=9;i<P.length-1;i++){const d=P[i+1].clone().sub(P[i]),n=normal(d);segment('fold-'+(i-9),P[i],P[i+1],n,n);}
// Intersect offset lines at each joined edge so folded slabs share one miter.
for(const s of segments){s.da=s.na.clone();s.db=s.nb.clone();}
for(let i=0;i<segments.length-1;i++){
 const a=segments[i],b=segments[i+1];assert(a.b.distanceTo(b.a)<1e-6);
 const denominator=1+a.nb.dot(b.na);assert(denominator>.1,'Unsupported acute miter');
 const offset=a.nb.clone().add(b.na).divideScalar(denominator);a.db=offset.clone();b.da=offset.clone();
}
function panel(seg,id,l,r,bottom,top,front,back,m,role,collision=true){
 assert(top>bottom&&r>l&&front>back);const a=seg.a.clone().lerp(seg.b,l),b=seg.a.clone().lerp(seg.b,r),na=seg.na.clone().lerp(seg.nb,l).normalize(),nb=seg.na.clone().lerp(seg.nb,r).normalize();
 // Interior sheet cuts are square to the flat facade; only outer corners use miters.
 const da=seg.isCurve?seg.da.clone().lerp(seg.db,l):(l===0?seg.da:seg.na),db=seg.isCurve?seg.da.clone().lerp(seg.db,r):(r===1?seg.db:seg.nb);
 const point=(p,n,y,d)=>p.clone().addScaledVector(n,d).setY(y).toArray();
 // Outer clockwise path as seen from behind; front triangle winding faces the courtyard.
 const vs=[point(a,da,bottom,front),point(b,db,bottom,front),point(b,db,top,front),point(a,da,top,front),point(a,da,bottom,back),point(b,db,bottom,back),point(b,db,top,back),point(a,da,top,back)];
 const ix=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
 c.add('court-fold-'+id,vs,ix,m,role);const row=c.panels.at(-1);row.collision=collision;row.material=m===1?'glass':'facade';
 if(seg.isCurve)smooth.set(row.id,ix.slice(0,12).map((v,i)=>([1,2,5,6].includes(v)?nb:na).clone().multiplyScalar(i<6?1:-1).toArray()));
}
let pathDistance=0;
for(const s of segments){const length=s.a.distanceTo(s.b),i=s.id;
 // Continuous closed backing at the original face for native coverage.
 panel(s,i+'-back',0,1,g.bottomY,g.topY-.015,-.021,-g.bodyDepthM,3,'backing');
 panel(s,i+'-plinth',0,1,g.bottomY,g.bottomY+g.plinthHeightM,.023,-.021,5,'plinth');
 const divisions=s.isCurve?1:Math.ceil(length/g.upperPanelWidthM);
 for(let k=0;k<divisions;k++){const l=k/divisions,r=(k+1)/divisions,edge=g.panelGapM/(2*length),curveIndex=s.isCurve?Number(i.split('-')[1]):0,leftGap=!s.isCurve||curveIndex%g.curveSubdivisionsPerSourceSpan===0?edge:0,rightGap=!s.isCurve||(curveIndex+1)%g.curveSubdivisionsPerSourceSpan===0?edge:0;panel(s,i+'-upper-'+k,l+leftGap,r-rightGap,g.claddingSplitY+.02,g.topY-.015,.009,-.021,0,'upper-cladding');}
 const mirrors=s.isCurve||i==='return'?1:Math.ceil(length/g.glassPanelWidthM),edge=s.isCurve?0:g.mirrorSeamM/(2*length);
 for(let k=0;k<mirrors;k++)panel(s,i+'-lower-'+k,k/mirrors+edge,(k+1)/mirrors-edge,g.bottomY+g.plinthHeightM+.008,g.claddingSplitY-.012,.004,-.021,s.isCurve||i==='return'?2:1,s.isCurve||i==='return'?'dark-cladding':'reflective-glass');
 panel(s,i+'-head-trim',0,1,g.claddingSplitY-.012,g.claddingSplitY+.02,.024,.009,4,'head-trim',false);
 panel(s,i+'-coping',0,1,g.topY-.015,g.topY+.018,.027,-.08,4,'coping');
 pathDistance+=length;
}
let departure=0;for(let i=0;i<=1000;i++){const q=curve.getPoint(i/1000);let distance=Infinity;for(let k=1;k<9;k++){const line=new T.Line3(P[k],P[k+1]);distance=Math.min(distance,q.distanceTo(line.closestPointToPoint(q,true,new T.Vector3())));}departure=Math.max(departure,distance);}
assert(departure<.16,'Curve leaves the source chord envelope by more than 16 cm');
const report=await c.save(out,'court-folded-frontage.glb',{meaning:'Uninstalled courtyard exterior component. Curved surface interpolation and material choices remain hypotheses until contextual inspection and full native installation.',specSha256:sha(sb),source:spec.source,geometry:{sourceFaces:36,profileNodes:19,segments:segments.length,curveSegments:N,maximumCurveDepartureFromSourceChordsM:departure,pathLengthM:pathDistance},assumptions:spec.assumptions,toolSha256:sha(await readFile(new URL(import.meta.url)))});
// Preserve continuous curved shading across the small collision facets. End caps remain flat.
const bytes=await readFile(out+'/court-folded-frontage.glb'),{json:j,bin}=readGLB(bytes);let modified=0;
for(let m=0;m<mats.length;m++){const pr=j.meshes[m].primitives[0],a=j.accessors[pr.attributes.NORMAL],v=j.bufferViews[a.bufferView];let at=(v.byteOffset||0)+(a.byteOffset||0),cursor=0;
 for(const p of c.panels.filter(p=>p.browserMaterial===m)){const normals=smooth.get(p.id);if(normals)for(let i=0;i<normals.length;i++){for(let k=0;k<3;k++)bin.writeFloatLE(normals[i][k],at+(cursor+i)*12+k*4);modified++;}cursor+=p.vertices.length;}assert.equal(cursor,a.count);
}
const final=writeGLB(j,bin);await writeFile(out+'/court-folded-frontage.glb',final);report.outputs.glbSha256=sha(final);report.outputs.glbBytes=final.length;report.geometry.smoothNormalVertices=modified;report.geometry.decorativePanels=c.panels.filter(p=>!p.collision).length;await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
