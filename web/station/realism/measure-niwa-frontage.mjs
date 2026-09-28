/** Dimensional hypotheses from fixed-camera rays, not a facade fit or survey. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import * as T from 'three';
const [cameraDir,courtDir,out]=process.argv.slice(2);
assert(cameraDir&&courtDir&&out,'usage: node measure-niwa-frontage.mjs CAMERA_DIR COURT_DIR OUTPUT_DIR');
assert(path.resolve(out).startsWith(path.resolve('.local')+path.sep),'Output must be isolated under .local');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const sha=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const fit=await read(path.join(cameraDir,'fit.json')),cam=await read(path.join(cameraDir,'camera.json'));
const court=await read(path.join(courtDir,'report.json')),g=court.geometry;
assert(fit.withinTolerance);assert.equal(await sha(fit.reference.localFile),fit.reference.sha256);
assert.equal(court.outputs.nativePanelsSha256,'77358142c6f6c5b096637ea3300d3d99cf4ae2b53997b0740292392a06b14f6b');
assert.equal(fit.imageTransform.cropTopPixels,0);
const [width,height]=fit.reference.size,c=new T.PerspectiveCamera(cam.fov,width/height,.05,1800);
c.position.fromArray(cam.position);c.lookAt(...cam.target);c.rotateZ(T.MathUtils.degToRad(cam.rollDegrees));c.updateMatrixWorld();
const O=new T.Vector3(...g.originRenderer),D=new T.Vector3(...g.forwardRenderer),A=new T.Vector3(...g.southRenderer),caster=new T.Raycaster();
const marks=[
 ['roof-near',[22,185],'timber upper edge'],['roof-mid',[274,219],'timber upper edge'],['roof-far',[435,242],'timber upper edge'],
 ['fascia-near',[22,212],'dark band lower edge'],['fascia-far',[422,251],'dark band lower edge'],
 ['threshold-near',[27,312],'tentative threshold'],['threshold-mid',[274,299],'tentative threshold'],['threshold-far',[382,285],'occluded; reject as a level constraint'],
 ['stairs-low-near',[22,363],'tentative lowest stair edge; not on facade plane'],['stairs-low-mid',[223,329],'tentative lowest stair edge; not on facade plane']
];
function intersect(pixel,plane){caster.setFromCamera(new T.Vector2(pixel[0]/width*2-1,1-pixel[1]/height*2),c);const p=caster.ray.intersectPlane(plane,new T.Vector3());assert(p&&p.toArray().every(Number.isFinite));const d=p.clone().sub(O);return {world:p.toArray(),u:d.dot(D),v:d.dot(A),y:p.y};}
const planes=[44,45,46,47,48,49,50].map(u=>({u,points:marks.map(([id,pixel,interpretation])=>({id,pixel,interpretation,...intersect(pixel,new T.Plane(D,-D.dot(O.clone().addScaledVector(D,u))))}))}));
const groundStudies=[g.arrivalY,g.gardenY].filter(Number.isFinite).map(y=>({y,points:marks.filter(m=>m[0].startsWith('stairs-low')).map(([id,pixel])=>({id,pixel,...intersect(pixel,new T.Plane(new T.Vector3(0,1,0),-y))}))}));
const report={schema:1,status:'Unresolved dimensional hypotheses; no construction geometry or collision changed.',sourcePhoto:fit.reference,cameraFitSha256:await sha(path.join(cameraDir,'fit.json')),cameraSha256:await sha(path.join(cameraDir,'camera.json')),courtReportSha256:await sha(path.join(courtDir,'report.json')),courtNativeSha256:court.outputs.nativePanelsSha256,coordinates:{origin:O.toArray(),u:D.toArray(),v:A.toArray(),unit:'metres'},method:'Intersect manually picked original-image pixels with hypothetical vertical frontage planes and provisional horizontal ground planes. Plane positions are inputs, not measured outputs.',limitations:['Roof samples do not identify the plane location independently.','Coincidence with a source roof elevation does not establish the timber footprint.','Lowest stair edges lie forward of the facade; assigning them the facade plane gives misleading heights.','Current garden level, threshold picks and source geometry all require independent checks.','No riser count or tread depth is accepted from this study.','The farther threshold sample is occluded and must not constrain construction.'],planes,groundStudies};
await mkdir(out,{recursive:true});await writeFile(path.join(out,'measure.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output:out,planes:planes.map(p=>({u:p.u,roofY:p.points.filter(x=>x.id.startsWith('roof')).map(x=>x.y),thresholdY:p.points.filter(x=>x.id.startsWith('threshold')).map(x=>x.y)})),groundStudies},null,2));
