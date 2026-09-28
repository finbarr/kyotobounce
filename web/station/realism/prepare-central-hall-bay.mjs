// Prepare a reversible representative bay from source coordinates and a diagnostic photo pose.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
const [fitPath,visibilityPath,auditPath,out]=process.argv.slice(2);
assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const [fb,vb,ab]=await Promise.all([readFile(fitPath),readFile(visibilityPath),readFile(auditPath)]);
const fit=JSON.parse(fb),visibility=JSON.parse(vb),audit=JSON.parse(ab);
assert(fit.withinTolerance&&visibility.pass);
assert.equal(sha(await readFile(fit.sourceGeometry.file)),fit.sourceGeometry.sha256);
assert.equal(sha(await readFile(fit.reference.localFile)),fit.reference.sha256);
assert.equal(fit.sourceGeometry.sha256,audit.source.sha256);
const v=fit.camera,camera=new T.PerspectiveCamera(v.fov,v.viewport.width/v.viewport.height,.05,1800);
camera.position.fromArray(v.position);camera.lookAt(new T.Vector3().fromArray(v.target));camera.rotateZ(T.MathUtils.degToRad(v.rollDegrees));camera.updateMatrixWorld(true);
const west=audit.points.eastPierWestTop.pointRenderer[0],frontZ=audit.comparison.frontPlane.sourceRendererZAtX0M,slope=audit.comparison.frontPlane.sourceZPerX;
// Independent observations along the back vertical edge of the visible side face.
// The side plane X is inherited from the source; camera/source error is not a survey interval.
const sideObservations=[{name:'side-glazing-back-top',pixel:[893,72]},{name:'side-glazing-back-bottom',pixel:[896,143]},{name:'side-stone-back-bottom',pixel:[897,218]}];
for(const row of sideObservations){const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(row.pixel[0]/v.viewport.width*2-1,1-row.pixel[1]/v.viewport.height*2),camera);const p=ray.ray.intersectPlane(new T.Plane(new T.Vector3(1,0,0),-west),new T.Vector3());assert(p);row.inferredRendererPoint=p.toArray();row.depthFromFrontM=p.z-frontZ-slope*west;}
const depths=sideObservations.map(q=>q.depthFromFrontM),mean=depths.reduce((a,b)=>a+b,0)/depths.length;
assert(mean>3&&mean<9);
const spec={status:'Uninstalled representative-bay construction study. Source coordinates and single-view depth are provisional; not a surveyed or accepted finished hall.',
 source:audit.source,reference:fit.reference,fit:{file:fitPath,sha256:sha(fb),visibilityFile:visibilityPath,visibilitySha256:sha(vb),camera:v,fitRmsPixels:fit.fitRmsPixels,checkMaxPixels:fit.checkMaxPixels,tolerancePixels:fit.tolerancePixels},
 frame:{frontZ,slope,description:'Renderer X east,Y up,Z south; local depth measured south from the sloping gate-wall plane.'},
 gate:{westX:audit.points.gateWestUpper.pointRenderer[0],eastX:audit.points.gateEastUpper.pointRenderer[0],headY:audit.comparison.gateOpening.sourceHeadYM},
 bay:{westX:west,eastX:audit.points.eastPierEastTop.pointRenderer[0],baseY:audit.points.eastPierWestBase.pointRenderer[1],glazingBaseY:23.11,glazingTopY:audit.points.eastPierWestTop.pointRenderer[1],headY:audit.points.middlePierCorbelRoot.pointRenderer[1],depthM:Math.round(mean*10)/10},
 context:{westX:-11.996377944946289,eastX:14.708,floorY:.2366,lowerBandTopY:15.6147,frontWallTopY:19.11659812927246,floorApproachM:8},
 sideDepth:{method:'Back-project three observed edge pixels onto source bay west-side plane X=6.502736568m. No observations were included in camera fitting. Estimated depth rounds to0.1m for construction; apparent consistency does not include camera/lens/source uncertainty.',observations:sideObservations,meanM:mean,rangeM:[Math.min(...depths),Math.max(...depths)]},
 assumptions:['Lower glazing datum23.11m and floor datum0.2366m are municipal mesh levels, not survey heights.','Hidden rear/east closures, wall thicknesses, interior shelf, door clearances and joint phase are inferred construction.','Original procedural stone colors/roughness/grain are first material samples, not measured optical properties.','Grilles, soffit modules and light locations are approximate photo-derived rhythms; current equipment still needs verification.','This component excludes full canopy bearing, gate equipment, adjacent bays, shop threshold and completed forecourt. It cannot pass the representative-area milestone alone.','All solid component surfaces share browser/native coordinates; small grille blades and mullions are decorative and excluded from collision.'],
 toolSha256:sha(await readFile(new URL(import.meta.url)))};
await mkdir(out,{recursive:true});await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');console.log(JSON.stringify({bay:spec.bay,depth:spec.sideDepth}));
