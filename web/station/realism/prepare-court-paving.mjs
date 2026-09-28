// Register a visible finish boundary without treating it as a surveyed dimension.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
const [out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const cameraPath='.local/station-realism/niwa-frontage-joint-01/jr/camera.json',courtPath='.local/station-realism/east-court-04/report.json';
const [cb,gb,pb]=await Promise.all([readFile(cameraPath),readFile(courtPath),readFile('/Users/finbarr/code/games/kyoto/research/kyoto-station/photos/niwa-jr-02a.jpg')]);
assert.equal(hash(pb),'6b8c8e3864bfc613bff09b768cb9d4447c9cd5e15093186942987a1f56d541cf');
const cam=JSON.parse(cb),g=JSON.parse(gb).geometry,c=new T.PerspectiveCamera(cam.fov,816/544,.1,2000);c.position.fromArray(cam.position);c.lookAt(new T.Vector3(...cam.target));c.rotateZ(cam.rollDegrees*Math.PI/180);c.updateMatrixWorld();
const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),-g.gardenY);
function backproject(pixel){ray.setFromCamera(new T.Vector2(pixel[0]/816*2-1,1-pixel[1]/544*2),c);const w=ray.ray.intersectPlane(plane,new T.Vector3());assert(w);const rel=w.clone().sub(new T.Vector3(...g.originRenderer));return {world:w.toArray(),uv:[rel.dot(new T.Vector3(...g.forwardRenderer)),rel.dot(new T.Vector3(...g.southRenderer))]};}
const picks=[[619,443],[810,474]],points=picks.map(backproject),a=points[0].uv,b=points[1].uv,slope=(b[1]-a[1])/(b[0]-a[0]),intercept=a[1]-slope*a[0];
const perturbations=[];for(const dx of [-2,2])for(const dy of [-2,2])for(const p of picks){let q=backproject([p[0]+dx,p[1]+dy]).uv;perturbations.push(Math.abs(q[1]-(slope*q[0]+intercept))/Math.hypot(1,slope));}
const spec={schema:1,parentLayoutSha256:'d8919dd015757175069c7243611e37d913f03c2392524c5ebf14fa85cbcc9037',cameraPath,cameraSha256:hash(cb),courtPath,courtReportSha256:hash(gb),photo:{url:'https://souda-kyoto.jp/blog/01367.html',published:'2025-09-08',captureDate:'unknown',sha256:hash(pb),size:[816,544]},frame:{origin:g.originRenderer,forward:g.forwardRenderer,south:g.southRenderer,floorY:g.gardenY},boundary:{picks,points,slope,intercept,darkSide:'v > slope * u + intercept',pickUncertaintyPixels:2,maximumPerpendicularShiftM:Math.max(...perturbations)},targets:['east-court-raised-garden','niwa-lower-walkway'],uvOrigin:[33.8,18.5],textureSpanM:2.4,finishes:[{id:'pale',tileM:1.2,color:[.77,.767,.75],jointM:.004,roughness:.86},{id:'dark',tileM:.6,color:[.36,.38,.385],jointM:.005,roughness:.84}],limits:['Two visible boundary picks fit the fixed camera; they are construction input, not independent validation.','The garden height and camera retain their recorded uncertainty. Hidden boundary continuation to the garden limits is inferred.','The cafe walkway remains pale. The boundary does not extend through the walkway or cafe stairs.','Tile modules (1.2 m pale / 0.6 m dark), joint widths, palette and UV phase are art estimates, not survey dimensions.','No historical gazebo, old planting or old paving motif is introduced. Photographs are reference only; textures are original.']};
// The independent frontage view bounds the pale aisle, whose edge is mostly occluded.
const rcPath='.local/station-realism/niwa-frontage-joint-01/rurubu/camera.json',rcb=await readFile(rcPath),rc=JSON.parse(rcb),rphoto=await readFile('/Users/finbarr/code/games/kyoto/research/kyoto-station/photos/niwa-rurubu-frontage.jpg');
assert.equal(hash(rphoto),'976e0428cd01e882288b27df0d272899882efb8b6120723cd47e76386dd7d5f5');
const camera2=new T.PerspectiveCamera(rc.fov,1.5,.1,2000);camera2.position.fromArray(rc.position);camera2.lookAt(new T.Vector3(...rc.target));camera2.rotateZ(rc.rollDegrees*Math.PI/180);camera2.updateMatrixWorld();
const palePixels=[[1030,760],[1060,683],[1110,677],[1200,650],[1135,690],[1090,797]];
spec.aisle={reference:'https://rurubu.jp/andmore/article/23413',photoSha256:hash(rphoto),cameraPath:rcPath,cameraSha256:hash(rcb),darkMaximumU:40.3,method:'Visible pale-floor samples constrain a minimum aisle extent. u=40.3 is an inferred straight boundary just beyond them, not an observed survey line.',paleSamples:palePixels.map(pixel=>{ray.setFromCamera(new T.Vector2(pixel[0]/600-1,1-pixel[1]/400),camera2);const w=ray.ray.intersectPlane(plane,new T.Vector3()).sub(new T.Vector3(...g.originRenderer));const uv=[w.dot(new T.Vector3(...g.forwardRenderer)),w.dot(new T.Vector3(...g.southRenderer))];assert(uv[0]>40.3);return{pixel,uv};})};
spec.limits.push('The second photo shows a wider pale aisle than the NIWA floor-mesh width. Its hidden edge is provisionally u=40.3; six visible pale samples are retained as constraints.');
await mkdir(out,{recursive:false});await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');console.log(JSON.stringify(spec.boundary,null,2));
