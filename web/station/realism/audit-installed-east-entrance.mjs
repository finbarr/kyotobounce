// Check source-reference closure observations against installed municipal panels.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
const [layoutPath,buildPath,sourceCheckPath,out]=process.argv.slice(2);
assert(layoutPath&&buildPath&&sourceCheckPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const bytes=await Promise.all([layoutPath,buildPath,sourceCheckPath].map(p=>readFile(p))),sha=b=>createHash('sha256').update(b).digest('hex');
const [layout,build,sourceCheck]=bytes.map(b=>JSON.parse(b));
const O=new T.Vector3(...build.geometry.upperRenderer),F=new T.Vector3(...build.geometry.forwardRenderer),S=new T.Vector3(-F.z,0,F.x);
const local=v=>{const r=new T.Vector3(v.x,v.y,-v.z).sub(O);return new T.Vector3(r.dot(F),v.y,r.dot(S));};
const samples=sourceCheck.samples.filter(s=>s.intersections.length),panels=layout.panels.filter(p=>p.id.startsWith('municipal-station-'));
assert.equal(samples.length,2);assert.equal(panels.length,740);
const rows=samples.map(s=>({lane:s.lane,s:s.s,w:s.w,y:s.y,box:new T.Box3(new T.Vector3(s.s-.3,s.y+.1,s.w-.3),new T.Vector3(s.s+.3,s.y+2.1,s.w+.3)),hits:[]}));
for(const p of panels){const vs=p.vertices.map(local),bounds=new T.Box3().setFromPoints(vs);for(const row of rows){if(!row.box.intersectsBox(bounds))continue;for(let i=0;i<p.triangles.length;i+=3){const t=new T.Triangle(...p.triangles.slice(i,i+3).map(j=>vs[j]));if(row.box.intersectsTriangle(t))row.hits.push({panel:p.id,face:i/3,collision:p.collision!==false});}}}
const report={layoutSha256:sha(bytes[0]),componentReportSha256:sha(bytes[1]),sourceCheckSha256:sha(bytes[2]),meaning:'Only the two previously obstructed upper-entrance volumes, against all 740 installed municipal station panels. This does not establish complete game route clearance.',sourceClosureFaces:sourceCheck.intersectingFaces.map(f=>({object:f.object,face:f.face})),frontageClip:layout.architecture.municipalStationFrontage.clipZones,panelsChecked:panels.length,samples:rows.map(({box,...r})=>r),intersections:rows.reduce((n,r)=>n+r.hits.length,0)};
await writeFile(out,JSON.stringify(report,null,2)+'\n');assert.equal(report.intersections,0,'Installed municipal panels obstruct this entrance');console.log(JSON.stringify({panels:panels.length,samples:rows.length,intersections:report.intersections}));
