// Fit the central outer envelope and audit the independently identifiable west bridge.
// This writes a measured construction input, not an integrated playable layout.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const [sectionsPath,attachmentsPath,layoutPath,out]=process.argv.slice(2);
assert(sectionsPath&&attachmentsPath&&layoutPath&&out);
assert(resolve(out).startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:true});
const read=async p=>{const b=await readFile(p);return {data:JSON.parse(b),file:p,sha256:createHash('sha256').update(b).digest('hex')}};
const sections=await read(sectionsPath),attachments=await read(attachmentsPath),layout=await read(layoutPath);
assert.equal(sections.data.source.sha256,attachments.data.source.sha256);
assert.equal(sections.data.layout.sha256,layout.sha256);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const mean=pts=>pts[0].map((_,k)=>pts.reduce((sum,p)=>sum+p[k],0)/pts.length);
const lengths=ps=>ps.reduce((a,p,i)=>[...a,i?a.at(-1)+distance(p,ps[i-1]):0],[]);
function interpolate(ps,t){const cumulative=lengths(ps),at=t*cumulative.at(-1);let i=1;while(i<cumulative.length-1&&cumulative[i]<at)i++;const f=(at-cumulative[i-1])/(cumulative[i]-cumulative[i-1]);return ps[i].map((v,k)=>ps[i-1][k]+f*(v-ps[i-1][k]));}
function nearest(point,line){let d=Infinity;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],ab=b.map((v,k)=>v-a[k]);const t=Math.max(0,Math.min(1,point.reduce((s,v,k)=>s+(v-a[k])*ab[k],0)/ab.reduce((s,v)=>s+v*v,0)));d=Math.min(d,distance(point,a.map((v,k)=>v+t*ab[k])))}return d;}
function sample(line,steps=500){return Array.from({length:steps+1},(_,i)=>interpolate(line,i/steps));}
function deviation(a,b){const ds=[...sample(a).map(p=>nearest(p,b)),...sample(b).map(p=>nearest(p,a))];return {sampledSymmetricMaxM:Math.max(...ds),sampledSymmetricRmsM:Math.sqrt(ds.reduce((s,v)=>s+v*v,0)/ds.length),samples:ds.length};}
function sourceProfile(s){
 const segments=s.segments.filter(r=>r.object==='Untitled.203'&&r.points.every(p=>p[0]<8&&p[0]>-30&&p[1]>20&&p[1]<53)&&Math.abs(r.points[0][0]-r.points[1][0])>1e-6);
 const unique=new Map();for(const r of segments)for(const p of r.points)unique.set(p.map(v=>v.toFixed(5)).join(','),p);
 const points=[...unique.values()].sort((a,b)=>a[0]-b[0]);
 assert(points.length>25&&points[0][1]<23&&points.at(-1)[1]<30);
 // End at the flat rear roof. The adjacent vertical rear wall is not canopy.
 const crown=points.reduce((best,p,i)=>p[1]>points[best][1]?i:best,0);
 const knee=points.findIndex((p,i)=>i>crown&&p[1]<29);
 assert(crown>5&&knee>crown&&knee<points.length-1);
 return {points,crown,knee};
}
const central=sections.data.sections.find(s=>s.x===0);assert(central);
const source=sourceProfile(central),old=layout.data.architecture.westRootXYZ.map(p=>[-p[2],p[1]]);
assert.equal(old.length,54);
const oldCrown=old.reduce((best,p,i)=>p[1]>old[best][1]?i:best,0);
assert.equal(oldCrown,27);
// The authored rear descent ends at index 47; 48..53 are the shallow tail.
assert(old[47][0]>10&&old[48][1]>old[47][1]&&old[53][0]>20);
const oldAnchors=[0,27,47,53],newAnchors=[0,source.crown,source.knee,source.points.length-1];
const fit=[];
for(let part=0;part<3;part++){
 const a=old.slice(oldAnchors[part],oldAnchors[part+1]+1),b=source.points.slice(newAnchors[part],newAnchors[part+1]+1),ls=lengths(a);
 for(let i=part?1:0;i<a.length;i++)fit.push(interpolate(b,ls[i]/ls.at(-1)));
}
assert.equal(fit.length,old.length);
assert(fit.every((p,i)=>i===0||p[0]>fit[i-1][0]));
const delta=source.points[source.crown].map((v,i)=>v-old[27][i]);
const translated=old.map(p=>p.map((v,i)=>v+delta[i]));
const crownRows=sections.data.sections.filter(s=>[-40,0,30].includes(s.x)).map(s=>({x:s.x,p:sourceProfile(s).points[sourceProfile(s).crown]}));
assert.equal(crownRows.length,3);
const mx=crownRows.reduce((s,r)=>s+r.x,0)/crownRows.length,mp=mean(crownRows.map(r=>r.p));
const slopes=mp.map((_,k)=>crownRows.reduce((sum,r)=>sum+(r.x-mx)*(r.p[k]-mp[k]),0)/crownRows.reduce((sum,r)=>sum+(r.x-mx)**2,0));
const checks=sections.data.sections.map(s=>{
 const reference=sourceProfile(s).points,predicted=fit.map(p=>p.map((v,k)=>v+slopes[k]*s.x));
 // Rear clipping differs along the station; compare only the curved front and back.
 const curvedRef=sourceProfile(s);const curvedFit=predicted.slice(0,48);
 return {x:s.x,use:[-40,0,30].includes(s.x)?'crown trend input':'held-out transverse section',curvedEnvelope:deviation(curvedFit,curvedRef.points.slice(0,curvedRef.knee+1)),rearTailCompared:s.x===0,...(s.x===0?{fullProfile:deviation(predicted,reference)}:{})};
});
const floor=attachments.data.faces.filter(r=>r.object==='Untitled.203'&&[9,10].includes(r.face));assert.equal(floor.length,2);
const unique=new Map();for(const r of floor)for(const p of r.points)unique.set(p.map(v=>v.toFixed(5)).join(','),p);
const corners=[...unique.values()].sort((a,b)=>a[0]-b[0]);assert.equal(corners.length,4);
assert(corners.every(p=>p[1]>44.9&&p[1]<45));
const ends=[mean(corners.slice(0,2)),mean(corners.slice(2))];
const widths=[distance(...corners.slice(0,2)),distance(...corners.slice(2))];
const axis=ends[1].map((v,k)=>v-ends[0][k]),length=distance(...ends);
assert(widths.every(v=>v>3&&v<3.2)&&length>29&&length<30);
const oldBridge=layout.data.architecture.skywayAccess;
const authoredEnds=[oldBridge.portalXZ,oldBridge.turnXZ].map(p=>[p[0],45.2,-p[1]]);
const roofFaces=attachments.data.faces.filter(r=>r.object==='Untitled.203'&&r.center[1]>47.8&&r.center[1]<48&&r.points.every(p=>p[0]>-98&&p[0]<-73));
assert.equal(roofFaces.length,2);
const roofHeight=roofFaces.reduce((s,r)=>s+r.center[1],0)/roofFaces.length;
const bridge={sourceObject:'Untitled.203',floorFaceIndices:floor.map(r=>r.face),roofFaceIndices:roofFaces.map(r=>r.face),cornersRenderer:corners,centerEndpointsRenderer:ends,centerEndpointsNative:ends.map(p=>[p[0],p[1],-p[2]]),sourceOuterWidthsM:widths,sourceLengthM:length,sourceRoofHeightM:roofHeight,sourceFloorToRoofM:roofHeight-mean(ends)[1],authoredEndpointsRenderer:authoredEnds,authoredLengthM:oldBridge.bridgeLengthM,endpointChangesNative:ends.map((p,i)=>[p[0]-authoredEnds[i][0],p[1]-authoredEnds[i][1],authoredEnds[i][2]-p[2]]),limits:['Outer mesh width is not measured clear walking width.','The floor plane is not a surveyed finished-floor datum.','This audit did not identify a continuous interior Skyway floor; central and eastern route alignment cannot be inferred from downward rays or the crown alone.','The western restaurant approach and both bridge junctions require separate registration.']};
const crownZ=source.points[source.crown][0];
const innerHits=central.segments.filter(r=>r.object==='Untitled.200').flatMap(r=>{const [a,b]=r.points;if((a[0]<crownZ)===(b[0]<crownZ))return [];const t=(crownZ-a[0])/(b[0]-a[0]);const height=a[1]+t*(b[1]-a[1]);return height>46&&height<source.points[source.crown][1]?[height]:[]});
assert(innerHits.length);
const innerCrownHeight=Math.max(...innerHits);
const report={schema:1,innerShellAtCrown:{object:'Untitled.200',heightM:innerCrownHeight,outerMinusInnerM:source.points[source.crown][1]-innerCrownHeight,meaning:'Difference between coarse shell surfaces; not a measured structural truss depth.'},status:'Measured central-envelope construction input; not integrated into the playable candidate.',source:sections.data.source,inputs:[sections,attachments,layout].map(({file,sha256})=>({file,sha256})),coordinates:'Section points [renderer Z south, height Y], metres. Native points [X east,Y up,Z north].',method:'Piecewise arc-length correspondence, separately from front toe to crown, crown to rear knee, and rear knee to tail. Preserve the 54 authored stations. Crown trend fitted across X=-40,0,30 for central plan orientation only.',domainX:[-40,30],oldAnchorIndices:oldAnchors,sourceAnchorIndices:newAnchors,oldProfileZY:old,sourceProfileZY:source.points,correctedProfileZY:fit,correctedRootNative:fit.map(p=>[0,p[1],-p[0]]),crownOnlyTranslationZY:delta,comparisonAtX0:{crownOnlyTranslation:deviation(translated,source.points),fittedProfile:deviation(fit,source.points)},centralSectionSlopeZYPerX:slopes,sectionChecks:checks,anchors:['front toe','crown','rear knee','rear tail'].map((name,i)=>({name,oldZY:old[oldAnchors[i]],sourceZY:source.points[newAnchors[i]],changeNorthHeight:[old[oldAnchors[i]][0]-source.points[newAnchors[i]][0],source.points[newAnchors[i]][1]-old[oldAnchors[i]][1]]})),westBridge:bridge,limits:['Municipal shell accuracy and construction-detail fidelity are unverified; numerical fit errors are not survey accuracy.','The map specifies the central outer envelope only. End flares, inner truss, bearing seats, facade walls, bridge supports and east escalator are not solved by this section fit.','Never deform browser vertices alone: regenerate the corresponding native surfaces and validate routes and courses before promotion.','A repeated central section must not be extrapolated through the flared western/eastern mouths.']};
await writeFile(out+'/fit.json',JSON.stringify(report,null,2)+'\n');
const W=1060,H=700,scale=13,px=z=>650+z*scale,py=y=>H-50-(y-15)*scale;
const line=(ps,color,width=2,dash='')=>`<polyline points="${ps.map(p=>[px(p[0]),py(p[1])].join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const grid=[20,25,30,35,40,45,50].map(y=>`<line x1="150" y1="${py(y)}" x2="990" y2="${py(y)}" stroke="#293b49"/><text x="105" y="${py(y)+4}">${y} m</text>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#101d26"/><g font-family="system-ui,sans-serif" fill="#dce7ed" font-size="15"><text x="35" y="35" font-size="23">Central canopy: full section correction</text><text x="35" y="62">X = 0 · municipal outer envelope · metres · north is left</text>${grid}${line(old,'#ee807d',2)}${line(translated,'#e0b66c',2,'7 6')}${line(source.points,'#59cbe5',5)}${line(fit,'#a5e083',2)}<text x="690" y="110" fill="#ee807d">Current authored profile</text><text x="690" y="136" fill="#e0b66c">Crown-only translation</text><text x="690" y="162" fill="#59cbe5">Municipal mesh section</text><text x="690" y="188" fill="#a5e083">54-point fitted section</text><text x="35" y="675">Construction input only; bridge, supports and inner truss still need coordinated correction.</text></g></svg>`;
await writeFile(out+'/section-fit.svg',svg);
console.log(JSON.stringify({fit:report.comparisonAtX0,sections:checks,anchors:report.anchors,bridge},null,2));
