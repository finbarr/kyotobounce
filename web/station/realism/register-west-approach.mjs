// Register the operator's schematic to source entrance/landing anchors; retain uncertainty.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const [auditPath,fitPath,mapPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const bytes=await Promise.all([auditPath,fitPath,mapPath].map(p=>readFile(p))),sha=b=>createHash('sha256').update(b).digest('hex'),audit=JSON.parse(bytes[0]),fit=JSON.parse(bytes[1]);assert.equal(audit.source.sha256,fit.source.sha256);
const floorGroup=audit.horizontalGroups.find(g=>g.object==='Untitled.203'&&g.orientation==='up'&&g.elevationM===45.1);assert(floorGroup);
const faces=audit.faces.filter(f=>f.object===floorGroup.object&&floorGroup.faces.includes(f.face)),area=faces.reduce((n,f)=>n+f.areaM2,0),finishedFloorY=faces.reduce((n,f)=>n+f.center[1]*f.areaM2,0)/area;
const points=[...new Map(faces.flatMap(f=>f.points).map(p=>[p.join(','),p])).values()];
// These are the two source landing vertices on the restaurant's north facade.
const edge=points.filter(p=>p[2]>21);assert.equal(edge.length,2);edge.sort((a,b)=>a[0]-b[0]);
const landingSideFace=faces.find(f=>f.face===11248);assert(landingSideFace);const landingSide=[edge[1],landingSideFace.points.find(p=>p[2]<20)];assert(landingSide[1]);
const entry=edge[0].map((v,k)=>(v+edge[1][k])/2);entry[1]=finishedFloorY;
const sill=audit.faces.filter(f=>f.object==='Untitled.201'&&[134,135].includes(f.face));assert.equal(sill.length,2);
const sillPoints=[...new Map(sill.flatMap(f=>f.points).map(p=>[p.join(','),p])).values()];
const rear=sillPoints.filter(p=>p[2]>11.8).sort((a,b)=>a[0]-b[0]);assert.equal(rear.length,2);
const sourcePortal=fit.westBridge.centerEndpointsRenderer[0],other=fit.westBridge.centerEndpointsRenderer[1],F=[other[0]-sourcePortal[0],other[2]-sourcePortal[2]],FL=Math.hypot(...F);F.forEach((v,i)=>F[i]=v/FL);
const wall=[rear[1][0]-rear[0][0],rear[1][2]-rear[0][2]],WL=Math.hypot(...wall);wall.forEach((v,i)=>wall[i]=v/WL);const N=[-wall[1],wall[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const t=dot([rear[0][0]-sourcePortal[0],rear[0][2]-sourcePortal[2]],N)/dot(F,N),junction=[sourcePortal[0]+F[0]*t,finishedFloorY,sourcePortal[2]+F[1]*t];assert(t<0&&t>-6);
const wallResidual=Math.abs(dot([entry[0]-rear[0][0],entry[2]-rear[0][2]],N)); // The facade is faceted; retain the measured residual rather than snapping the landing.
// Pixel anchors lie on the same north boundary line in the 1073x367 operator plan.
const northY=x=>235-(x-1)*235/972,entryPixel=[211,northY(211)],junctionPixel=[635,northY(635)];
const u=junctionPixel.map((v,k)=>v-entryPixel[k]),v=[junction[0]-entry[0],junction[2]-entry[2]],den=dot(u,u),a=dot(u,v)/den,b=(u[0]*v[1]-u[1]*v[0])/den;
const transform=p=>[entry[0]+a*(p[0]-entryPixel[0])-b*(p[1]-entryPixel[1]),finishedFloorY,entry[2]+b*(p[0]-entryPixel[0])+a*(p[1]-entryPixel[1])];
const routePixels=[entryPixel,[224,225],[300,229],[400,226],[510,220],[565,216],[616,173],[625,128],junctionPixel];
const report={source:audit.source,auditSha256:sha(bytes[0]),fitSha256:sha(bytes[1]),map:{path:mapPath,sha256:sha(bytes[2]),url:'https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/ramen-koji/img/img_floor_guide_pc.png',dimensions:[1073,367],entryPixel,junctionPixel},floor:{sourceObject:floorGroup.object,sourceFaces:floorGroup.faces,sourceAreaM2:area,sourceHeightRangeM:floorGroup.bounds[1],finishedFloorY,status:'Public landing datum used as a provisional continuous tenth-floor finish; map establishes adjacency, not a surveyed door center.'},sourceLandingEdgeRenderer:edge,sourceLandingSideRenderer:landingSide,sourceLandingSideFace:11248,entryRenderer:entry,sourcePortalRenderer:sourcePortal,finishedPortalRenderer:[sourcePortal[0],finishedFloorY,sourcePortal[2]],sourceRecessRearEdgeRenderer:rear,junctionRenderer:junction,recessLengthM:-t,sourceWallResidualM:wallResidual,bridgeHeightOffsetM:finishedFloorY-sourcePortal[1],mapTransform:{a,b,scaleMPerPixel:Math.hypot(a,b),rotationDegrees:Math.atan2(b,a)*180/Math.PI,entryPixel,entryRenderer:entry},routePixels,routeRenderer:[...routePixels.map(transform),[sourcePortal[0],finishedFloorY,sourcePortal[2]]],limits:['The municipal bridge lower face is an exterior underside. It does not establish the finished-floor level.','The landing midpoint is about 21 mm off the extrapolated recess facade plane; both measured anchors are retained.',
'The operator diagram is schematic. This two-anchor similarity fit is a construction hypothesis; corridor widths, shop depths and the chosen door center need photograph registration.','The source landing edge and doorway recess fix local geometry; assuming a common finished floor needs independent photographic confirmation.','Only a component is prepared here. Old station stairs, restaurant, facade and Skyway require a coordinated replacement before integrated gameplay can pass.']};
await writeFile(out+'/registration.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({finishedFloorY,bridgeOffsetM:report.bridgeHeightOffsetM,entry,junction,sourcePortal,recessLengthM:-t,wallResidualM:wallResidual,scale:report.mapTransform.scaleMPerPixel}));
