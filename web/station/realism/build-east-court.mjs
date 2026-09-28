// Source-footprint courtyard and explicitly provisional garden level connections.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {construction} from './component-mesh.mjs';
const [registrationPath,eastDir,out,specPath='web/station/realism/registrations/east-court.json']=process.argv.slice(2);
assert(registrationPath&&eastDir&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const [rb,eb,sb,nb]=await Promise.all([readFile(registrationPath),readFile(eastDir+'/report.json'),readFile(specPath),readFile(eastDir+'/native-panels.json')]);
const sha=b=>createHash('sha256').update(b).digest('hex'),r=JSON.parse(rb),e=JSON.parse(eb),s=JSON.parse(sb);
assert.equal(sha(rb),s.footprintSha256);assert.equal(sha(nb),s.eastSkywayNativeSha256);assert.equal(sha(nb),e.outputs.nativePanelsSha256);
const materials=[{name:'east-court-limestone',pbrMetallicRoughness:{baseColorFactor:[.57,.59,.57,1],roughnessFactor:.85,metallicFactor:0}},{name:'east-court-garden-stone',pbrMetallicRoughness:{baseColorFactor:[.66,.63,.59,1],roughnessFactor:.78,metallicFactor:0}},{name:'east-court-steel',pbrMetallicRoughness:{baseColorFactor:[.40,.43,.43,1],roughnessFactor:.35,metallicFactor:.8}}];
const c=construction(materials,{flatNormals:s.flatNormals===true}),O=s.originRenderer,D=s.forwardRenderer,A=[-D[2],0,D[0]],Y=e.geometry.lowerY,H=s.garden.riseM,G=s.garden;
const at=(u,v,h=0)=>[O[0]+D[0]*u+A[0]*v,Y+h,O[2]+D[2]*u+A[2]*v],rect=(u0,u1,v0,v1,h=0)=>[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>at(u,v,h));
const outer=r.geometry.loops.find(l=>l.kind==='outer').pointsRenderer,holes=r.geometry.loops.filter(l=>l.kind==='hole').map(l=>l.pointsRenderer);
c.slab('east-court-source-floor',outer,holes,s.baseThicknessM,0,'court-arrival-floor');
c.slab('east-court-raised-garden',rect(...G.u,...G.v,H),[],H+s.gardenThicknessM,1,'court-garden-floor');
const steps=[];
for(const [name,config]of [['north',s.northStair],['west',s.westStair]]){
 const start=(name==='north'?G.v[0]:G.u[0])-config.steps*config.goingM;
 for(let i=0;i<config.steps;i++){const height=H*(i+1)/config.steps,lo=start+i*config.goingM,hi=start+(i+1)*config.goingM,poly=name==='north'?rect(...config.u,lo,hi,height):rect(lo,hi,...config.v,height),id=`east-court-${name}-stair-${i+1}`;c.slab(id,poly,[],height+s.baseThicknessM,1,'court-stair-floor');steps.push({id,side:name,lo,hi,heightM:height,topRenderer:poly});}
}
const R=s.ramp;const ramp=[at(R.u[0],R.v[0]),at(R.u[1],R.v[0],H),at(R.u[1],R.v[1],H),at(R.u[0],R.v[1])];
c.slab('east-court-garden-ramp',ramp,[],s.baseThicknessM,1,'court-ramp-floor');
c.slab('east-court-ramp-upper-landing',rect(R.u[1],R.upperLandingEndU,...R.v,H),[],H+s.baseThicknessM,1,'court-ramp-landing-floor');
// Rails follow both ramp edges; the upper landing remains open to the garden.
for(const v of R.v){for(const h of [.55,1.05])c.beam(`east-court-ramp-rail-${v}-${h}`,at(R.u[0],v,h),at(R.u[1],v,H+h),.045,.045,2,'ramp-rail');for(let i=0;i<=8;i++){const t=i/8,u=R.u[0]+t*(R.u[1]-R.u[0]);c.beam(`east-court-ramp-post-${v}-${i}`,at(u,v,H*t),at(u,v,H*t+1.05),.045,.045,2,'ramp-post');}}
const paths=[];
for(const u of [29,35,41])paths.push({id:`north-stair-u${u}`,points:[at(u,10),at(u,10.62),at(u,13.65,H),at(u,19,H)],kind:'stairs'});
for(const v of [21,26])paths.push({id:`west-stair-v${v}`,points:[at(20,v),at(20.62,v),at(23.65,v,H),at(29,v,H)],kind:'stairs'});
paths.push({id:'ramp',points:[at(R.u[0]-1,12.5),at(R.u[0],12.5),at(R.u[1],12.5,H),at(24.75,12.5,H),at(24.75,15,H)],kind:'ramp'});
const bank=e.geometry,apronEnd=bank.lowerDeckStart+bank.arrivalApronLengthM;
paths.push({id:'apron-to-garden',points:[[bank.upperRenderer[0]+bank.forwardRenderer[0]*(apronEnd-.8),Y,bank.upperRenderer[2]+bank.forwardRenderer[2]*(apronEnd-.8)],at(31,10),at(31,10.62),at(31,13.65,H),at(31,19,H)],kind:'apron-and-stairs'});
const report=await c.save(out,'east-court.glb',{status:'Isolated courtyard and garden level construction hypothesis; not installed or visually accepted.',registrationPath,registrationSha256:sha(rb),specSha256:sha(sb),eastSkywayNativeSha256:sha(nb),niwaInterface:s.niwaInterface||null,geometry:{originRenderer:O,forwardRenderer:D,southRenderer:A,arrivalY:Y,gardenY:Y+H,gardenRiseM:H,gardenOutlineRenderer:rect(...G.u,...G.v,H),sourceOuterRenderer:outer,sourceHolesRenderer:holes,steps,ramp:{pointsRenderer:ramp,runM:R.u[1]-R.u[0],widthM:R.v[1]-R.v[0],riseM:H,grade:H/(R.u[1]-R.u[0])},routes:paths},limits:s.limits});
console.log(JSON.stringify({geometry:{panels:report.geometry.panels,triangles:report.geometry.triangles,arrivalY:Y,gardenY:Y+H,steps:steps.length,routes:paths.length},outputs:report.outputs},null,2));
