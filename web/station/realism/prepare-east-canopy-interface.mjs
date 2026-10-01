// Remove the obsolete opaque envelope beside the existing transparent roof.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),bytes=await readFile(m.layout);assert.equal(sha(bytes),m.layoutSha256);const j=JSON.parse(bytes),vec=p=>new T.Vector3(p.x,p.y,p.z);
const roof=j.panels.filter(p=>p.id.startsWith('east-roof-glazing-source-')).map(p=>new T.Triangle(...p.triangles.slice(0,3).map(i=>vec(p.vertices[i]))));assert.equal(roof.length,248);
const central=j.panels.find(p=>p.id==='central-roof-glazing');for(let i=0;i<central.triangles.length;i+=3){const vs=central.triangles.slice(i,i+3).map(k=>vec(central.vertices[k]));if(Math.max(...vs.map(v=>v.x))>=73&&Math.min(...vs.map(v=>v.x))<=83)roof.push(new T.Triangle(...vs));}
const distance=p=>Math.min(...roof.map(t=>t.closestPointToPoint(p,new T.Vector3()).distanceTo(p)));
const panelCuts=[];
for(const id of ['municipal-station-frontage-east-Untitled.203','municipal-station-court-east-Untitled.203','municipal-station-frontage-east-Untitled.201']){
 const p=j.panels.find(p=>p.id===id),faces=[];
 for(let i=0;i<p.triangles.length;i+=3){const vs=p.triangles.slice(i,i+3).map(k=>vec(p.vertices[k])),tri=new T.Triangle(...vs),c=tri.getMidpoint(new T.Vector3());
  // The registered canopy envelope bounds exclude the north building wall,
  // Skyway deck and courtyard. Keep attachments farther from the glass.
  if(c.x<73||c.x>114||c.y<42||c.y>59||c.z<0||c.z>24)continue;
  const samples=[...vs,c,...vs.map((v,i)=>v.clone().add(vs[(i+1)%3]).multiplyScalar(.5))],separation=Math.max(...samples.map(distance));
  const rootCap=vs.every(v=>v.x>=74.7&&v.x<=82.5&&v.y>=47.5&&v.y<=50.5&&v.z>=11.7&&v.z<=22.4)&&Math.abs(tri.getNormal(new T.Vector3()).y)>.25;
  if(separation<.9||rootCap)faces.push({index:i/3,areaM2:tri.getArea(),maximumSeparationM:separation,selection:rootCap?'obsolete root cap':'duplicate envelope'});
 }
 panelCuts.push({id,faces,areaM2:faces.reduce((s,f)=>s+f.areaM2,0)});
}
assert.deepEqual(panelCuts.map(p=>p.faces.length),[88,145,45]);
const retiredBeams=j.beams.filter(p=>/^east-roof-north-tie-\d+(?:-fastener-[\d-]+)?$/.test(p.id)).map(p=>p.id),retiredBoxes=j.boxes.filter(p=>/^east-roof-north-tie-\d+-plate$/.test(p.id)).map(p=>p.id);
assert.equal(retiredBeams.length,45);assert.equal(retiredBoxes.length,9);
const prior=await read('.local/v2/current/components/east-skyway-mouth/report.json');
const spec={parentLayoutSha256:m.layoutSha256,parentGeometrySha256:m.geometrySha256,panelCuts,retiredBeams,retiredBoxes,reference:'https://www.kyoto-station-building.co.jp/service/square/',limits:['The envelope follows existing registered municipal glazing. Its detailed structural grid is a fitted reconstruction, not a measured survey.']};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(m,null,2)+'\n');
await writeFile(out+'/report.json',JSON.stringify({scope:'Clear the obsolete opaque eastern canopy shell and detached tie assemblies.',geometry:{routes:prior.geometry.routes,chromeRoutes:prior.geometry.chromeRoutes,blocked:[]}},null,2)+'\n');
await writeFile(out+'/motion.json',await readFile('.local/v2/current/components/east-skyway-mouth/motion.json'));
await writeFile(out+'/views.json',JSON.stringify([
 ['descent',[77.1,46.733488,17.5],[105,31.5,17.2]],
 ['arrival',[109,31.62,16.3],[80,44,16.3]],
 ['square-roof',[113,33.5,-7],[92,48,15]],
 ['upper-landing',[76,46.733488,16.6],[70,46.733488,16.5]],
],null,2)+'\n');
console.log(JSON.stringify({cuts:panelCuts.map(({id,faces,areaM2})=>({id,faces:faces.length,areaM2})),retiredBeams:retiredBeams.length,retiredBoxes:retiredBoxes.length}));
