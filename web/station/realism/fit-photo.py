"""Fit a centered pinhole camera to explicit 3D/2D architectural landmarks.

Photographs remain references, not texture assets. No geometry is moved here.
The independently marked check points are excluded from optimization.
"""
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');args=p.parse_args()
source=Path(args.input);out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
config=json.loads(source.read_text());anchors=config['anchors'];fit=[a for a in anchors if a['use']=='fit'];assert len(fit)>=6
lines=config.get('lineConstraints',[])
tolerance_fraction=config.get('toleranceWidthFraction',.02);assert 0<tolerance_fraction<1
tolerance_pixels=config['viewport']['width']*tolerance_fraction
def image_line(endpoints):
 a,b=np.asarray(endpoints,float);delta=b-a;assert np.linalg.norm(delta)>0
 normal=np.array([-delta[1],delta[0]])/np.linalg.norm(delta)
 return normal,-normal@a
for line in lines:
 assert line['use'] in ['fit','check'] and len(line['worldPoints'])>=2
 image_line(line['imageEndpoints'])
assert len([a for a in anchors if a['use']=='check'])>=2
reference=config['reference'];width,height=reference['size'];scale=config['viewport']['width']/width
assert config['viewport']['height']<=height*scale
crop_y=(height*scale-config['viewport']['height'])/2
points=np.array([a['worldPoint'] for a in fit]);observed=np.array([a['imagePixel'] for a in fit]);center=np.array([width/2,height/2])
initial=config['initialCamera'];C=np.array(initial['position'],float);forward=np.array(initial['target'])-C;forward/=np.linalg.norm(forward);right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward);R=np.stack([right,-up,forward]);rvec=Rotation.from_matrix(R).as_rotvec()
f=config['viewport']['height']/(2*np.tan(np.deg2rad(initial['fov']/2)))/scale
fixed_focal=config.get('fixedFocalPixels')
base=np.r_[C,rvec] if fixed_focal else np.r_[C,rvec,np.log(f)]
def project(x,world):
 camera=Rotation.from_rotvec(x[3:6]).apply(world-x[:3]);return (fixed_focal or np.exp(x[6]))*camera[:,:2]/camera[:,2:]+center,camera[:,2]
def residual(x,observed=observed,line_endpoints=None):
 uv,depth=project(x,points);parts=[(uv-observed).ravel(),np.minimum(depth-1,0)*100]
 for i,line in enumerate(lines):
  if line['use']!='fit':continue
  normal,offset=image_line(line_endpoints[i] if line_endpoints is not None else line['imageEndpoints'])
  projected,line_depth=project(x,np.asarray(line['worldPoints'],float))
  parts.extend([projected@normal+offset,np.minimum(line_depth-1,0)*100])
 return np.concatenate(parts)
position_bounds=config['cameraBounds']
focal_bounds=config.get('focalBoundsPixels',[150,2000])
assert len(focal_bounds)==2 and 0<focal_bounds[0]<focal_bounds[1]
bounds=(np.r_[position_bounds['min'],[-np.inf]*3,np.log(focal_bounds[0])],np.r_[position_bounds['max'],[np.inf]*3,np.log(focal_bounds[1])])
if fixed_focal:bounds=(bounds[0][:6],bounds[1][:6])
solutions=[]
for factor in [.65,1,1.5,2.2]:
 start=base.copy();start[2]*=factor
 if not fixed_focal:start[6]+=np.log(factor)
 start=np.maximum(bounds[0]+1e-6,np.minimum(bounds[1]-1e-6,start))
 solve=least_squares(residual,start,bounds=bounds,loss='linear',x_scale='jac',max_nfev=5000,ftol=1e-12,xtol=1e-12,gtol=1e-12)
 solutions.append(solve)
best=min(solutions,key=lambda r:r.cost);x=best.x;R=Rotation.from_rotvec(x[3:6]).as_matrix();forward=R[2];actual_up=-R[1];base_right=np.cross(forward,[0,1,0]);base_right/=np.linalg.norm(base_right);base_up=np.cross(base_right,forward);roll=np.rad2deg(np.arctan2(-actual_up@base_right,actual_up@base_up))
camera={'position':x[:3].tolist(),'target':(x[:3]+forward*100).tolist(),'fov':float(np.rad2deg(2*np.arctan(config['viewport']['height']/(2*(fixed_focal or np.exp(x[6]))*scale)))),'rollDegrees':float(roll),'viewport':config['viewport']}
rows=[]
for a in anchors:
 uv,depth=project(x,np.array([a['worldPoint']]));uv=uv[0];error=float(np.linalg.norm(uv-a['imagePixel']));rows.append({**a,'projectedImagePixel':uv.tolist(),'referenceViewportPixel':[a['imagePixel'][0]*scale,a['imagePixel'][1]*scale-crop_y],'projectedViewportPixel':[uv[0]*scale,uv[1]*scale-crop_y],'residualPixels':error*scale,'depthMeters':float(depth[0])})
line_rows=[]
for line in lines:
 normal,offset=image_line(line['imageEndpoints']);uv,depth=project(x,np.asarray(line['worldPoints'],float));distance=uv@normal+offset
 line_rows.append({**line,'projectedImagePixels':uv.tolist(),'projectedViewportPixels':[[p[0]*scale,p[1]*scale-crop_y] for p in uv],'imageEndpointViewportPixels':[[p[0]*scale,p[1]*scale-crop_y] for p in line['imageEndpoints']],'perpendicularResidualPixels':(np.abs(distance)*scale).tolist(),'depthMeters':depth.tolist()})
sv=np.linalg.svd(best.jac,compute_uv=False);fit_errors=[r['residualPixels'] for r in rows if r['use']=='fit'];check_errors=[r['residualPixels'] for r in rows if r['use']=='check']
report={'inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'methodNote':config.get('methodNote'),'rejectedCorrespondences':config.get('rejectedCorrespondences',[]),'reference':reference,'sourceGeometry':config['sourceGeometry'],'camera':camera,'imageTransform':{'scale':scale,'cropTopPixels':crop_y,'description':'Uniform enlargement, centered vertical crop; no image warp'},'fixedFocalPixels':fixed_focal,'focalLengthPixels':float(fixed_focal or np.exp(x[6])),'focalBoundsPixels':None if fixed_focal else focal_bounds,'optimizerActiveBounds':best.active_mask.tolist(),'model':'Centered pinhole, square pixels, zero lens distortion; unknown source crop/calibration remain uncertainty','fitLandmarks':len(fit),'checkLandmarks':len(check_errors),'fitRmsPixels':float(np.sqrt(np.mean(np.square(fit_errors)))),'fitMaxPixels':max(fit_errors),'checkMaxPixels':max(check_errors),'toleranceWidthFraction':tolerance_fraction,'tolerancePixels':tolerance_pixels,'withinTolerance':all(r['residualPixels']<=tolerance_pixels and r['depthMeters']>0 for r in rows) and all(max(r['perpendicularResidualPixels'])<=tolerance_pixels and min(r['depthMeters'])>0 for r in line_rows),'lineConstraints':line_rows,'jacobianRank':int(np.linalg.matrix_rank(best.jac)),'jacobianCondition':float(sv[0]/sv[-1]),'optimizerSuccess':bool(best.success),'starts':[{'cost':float(s.cost),'position':s.x[:3].tolist(),'focalPixels':float(fixed_focal or np.exp(s.x[6]))} for s in solutions],'anchors':rows,'status':'Measured camera candidate; correspondence identity and rendered overlay require visual review. This does not accept current game geometry.'}
sample_count=config.get('sensitivitySamples',0)
if sample_count:
 rng=np.random.default_rng(20260927);samples=[];uncertainty=np.array([a.get('imagePickUncertaintyPixels',3) for a in fit])[:,None]
 for _ in range(sample_count):
  changed=observed+rng.uniform(-1,1,observed.shape)*uncertainty
  changed_lines=[np.asarray(line['imageEndpoints'])+rng.uniform(-1,1,(2,2))*line.get('imagePickUncertaintyPixels',2) for line in lines]
  perturbed=least_squares(lambda value:residual(value,changed,changed_lines),x,bounds=bounds,x_scale='jac',max_nfev=1000)
  samples.append(np.r_[perturbed.x[:3],np.rad2deg(2*np.arctan(config['viewport']['height']/(2*(fixed_focal or np.exp(perturbed.x[6]))*scale)))])
 samples=np.array(samples)
 report['measurementSensitivity']={'samples':sample_count,'seed':20260927,'method':'Independent uniform perturbations of point landmarks and line endpoints within the manually stated image-pick bounds. Excludes source geometry, lens and crop errors; these are not survey confidence intervals.','columns':['cameraX','cameraY','cameraZ','verticalFovDegrees'],'percentiles':{'p05':np.percentile(samples,5,axis=0).tolist(),'p50':np.percentile(samples,50,axis=0).tolist(),'p95':np.percentile(samples,95,axis=0).tolist()}}
(out/'camera.json').write_text(json.dumps(camera,indent=2)+'\n');(out/'fit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['fitRmsPixels','fitMaxPixels','checkMaxPixels','withinTolerance','jacobianRank','jacobianCondition']}));print(json.dumps(camera))
