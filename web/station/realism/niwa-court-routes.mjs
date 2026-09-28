// Keep existing court-route endpoints and add explicit shared-floor/entrance routes.
import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import{resolve}from'node:path';import{createHash}from'node:crypto';
const[courtDir,niwaDir,assemblyDir,oldDetourPath,out,seatsDir]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const read=async p=>JSON.parse(await readFile(p)),court=await read(courtDir+'/report.json'),niwa=await read(niwaDir+'/report.json'),assembly=await read(assemblyDir+'/report.json'),old=await read(oldDetourPath),g=court.geometry,n=niwa.geometry,sha=b=>createHash('sha256').update(b).digest('hex');
assert(assembly.inputs.some(i=>i.glbSha256===court.outputs.glbSha256));assert(assembly.inputs.some(i=>i.glbSha256===niwa.outputs.glbSha256));assert.equal(g.gardenY,n.lowerY);assert.deepEqual(g.originRenderer,n.originRenderer);
const point=(u,v,y=g.gardenY)=>[g.originRenderer[0]+u*g.forwardRenderer[0]+v*g.southRenderer[0],y,g.originRenderer[2]+u*g.forwardRenderer[2]+v*g.southRenderer[2]];
const routes=structuredClone(g.routes),detour=routes.find(r=>r.id==='north-stair-u35'),previous=old.routes.find(r=>r.id===detour.id);assert(previous);
// The old seat detour follows the north and west sides of the foreground seat.
// Keep its x/z waypoints, changing only the explicitly revised garden datum.
const oldGardenY=previous.points.at(-1)[1];detour.points=previous.points.map(p=>[p[0],Math.abs(p[1]-oldGardenY)<1e-8?g.gardenY:p[1],p[2]]);assert.deepEqual(detour.points[0],g.routes.find(r=>r.id===detour.id).points[0]);assert.deepEqual(detour.points.at(-1),g.routes.find(r=>r.id===detour.id).points.at(-1));
const additionalRoutes=structuredClone(n.routes);
for(const [i,entry]of n.routes.entries()){
 const start=entry.points[0],dx=start[0]-g.originRenderer[0],dz=start[2]-g.originRenderer[2],v=dx*g.southRenderer[0]+dz*g.southRenderer[2];
 additionalRoutes.push({id:'garden-to-niwa-'+i,points:[point(30,v),point(40.9,v),...entry.points],kind:'shared-paving-and-entrance'});
}
additionalRoutes.push({id:'niwa-lower-walkway-length',points:[point(42.5,12.3),point(42.5,22),point(42.5,32.6)],kind:'lower-paving'});
if(seatsDir){const seats=await read(seatsDir+'/report.json'),terrace=seats.geometry.terraceCore;assert(terrace&&assembly.inputs.some(i=>i.glbSha256===seats.outputs.glbSha256));for(const v of [25,30])additionalRoutes.push({id:'niwa-stone-terrace-v'+v,points:[point(42.5,v),point(terrace.u[0]-.44,v),point(terrace.u[1]+.05,v,terrace.upperY),point((terrace.landingU[0]+terrace.landingU[1])/2,v,terrace.upperY)],kind:'stone-terrace-access'});}
const result={baseCourtGlbSha256:court.outputs.glbSha256,assemblyGlbSha256:assembly.outputs.glbSha256,niwaGlbSha256:niwa.outputs.glbSha256,oldDetourSha256:sha(await readFile(oldDetourPath)),meaning:'Isolated combined courtyard and NIWA entrance. Covers revised approach stairs/ramp, the shared paving seam, both entrance flights and lower walkway; not the complete station or cafe interior.',reason:'Preserve current court endpoints and the established seat detour. Add explicit routes across the now-coplanar court/NIWA boundary and through both entrance flights.',routes,additionalRoutes};await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({baseRoutes:routes.length,additionalRoutes:additionalRoutes.length,expectedWalks:(routes.length+additionalRoutes.length)*2}));
