"""Two-view NIWA feature study and provisional rigid planter fit.

Uses fixed independently registered cameras. Does not change either camera,
source image, court geometry or collision. Image-pick uncertainty excludes
camera/model/lens errors, so these dimensions are not survey measurements.
"""
import json,hashlib,sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from scipy.optimize import least_squares
camera_dirs=list(map(Path,sys.argv[1:3]));court_dir=Path(sys.argv[3]);out=Path(sys.argv[4])
assert Path('.local').resolve() in out.resolve().parents;out.mkdir(parents=True,exist_ok=True)
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
cams=[];receipts=[]
for root in camera_dirs:
 f=read(root/'fit.json');p=read(root/'render/projection.json');assert f['withinTolerance'];cam=f['camera'];w,h=f['reference']['size'];assert f['imageTransform']['cropTopPixels']==0
 assert sha(Path(f['reference']['localFile']))==f['reference']['sha256']
 assert np.allclose(cam['position'],p['camera']['position'],rtol=0,atol=1e-10)
 assert abs(cam['fov']-p['camera']['fov'])<1e-10
 cams.append((np.array(cam['position']),Rotation.from_quat(p['camera']['quaternion']),h/(2*np.tan(np.deg2rad(cam['fov']/2))),np.array([w/2,h/2])))
 receipts.append(dict(cameraDir=str(root),fitSha256=sha(root/'fit.json'),projectionSha256=sha(root/'render/projection.json'),reference=f['reference']))
marks=[('planter-front-left-top',[133.5,299],[550,545],'fit planter'),('planter-front-right-top',[199.5,298],[658.5,530.5],'fit planter'),('planter-back-left-top',[119,295.5],[445.5,530.5],'fit planter'),('planter-front-left-foot',[134,349.5],[550,681.5],'fit planter'),('planter-front-right-foot',[199.5,340],[659,644],'withheld planter check; JR foot partially occluded'),('near-post-foot',[24,313],[238,579],'tentative identity'),('glass-corner-top',[271,230],[711,341],'tentative identity'),('glass-corner-foot',[270,307],[703,519],'tentative identity')]
g=read(court_dir/'report.json')['geometry'];O=np.array(g['originRenderer']);D=np.array(g['forwardRenderer']);A=np.array(g['southRenderer'])
def ray(cam,px):
 C,R,f,center=cam;d=R.apply([*(np.subtract(px,center)/f*[1,-1]),-1]);return C,d/np.linalg.norm(d)
def project(points,cam):
 C,R,f,center=cam;q=R.inv().apply(np.asarray(points)-C);return center+f*q[...,:2]*[1,-1]/-q[...,2:]
def triangulate(a,b):
 C,da=ray(cams[0],a);E,db=ray(cams[1],b);t=np.linalg.lstsq(np.stack([da,-db],axis=1),E-C,rcond=None)[0];assert min(t)>0
 pa=C+da*t[0];pb=E+db*t[1];p=(pa+pb)/2
 return p,dict(world=p.tolist(),local=[float((p-O)@D),float(p[1]),float((p-O)@A)],rayGapM=float(np.linalg.norm(pa-pb)),rayAngleDegrees=float(np.rad2deg(np.arccos(np.clip(da@db,-1,1)))),depthsM=t.tolist(),reprojectionErrorPixels=[float(np.linalg.norm(project([p],c)[0]-px)) for c,px in zip(cams,[a,b])])
rows=[];rng=np.random.default_rng(20260927)
for id,a,b,status in marks:
 p,r=triangulate(a,b);samples=np.array([triangulate(np.array(a)+rng.uniform(-2,2,2),np.array(b)+rng.uniform(-2,2,2))[0] for _ in range(200)])
 rows.append(dict(id=id,pixels=[a,b],use=status,**r,pickOnlySensitivity={'boundsPixels':2,'samples':200,'worldP05':np.percentile(samples,5,axis=0).tolist(),'worldP95':np.percentile(samples,95,axis=0).tolist()}))
# Fit a vertical rectangular planter to four shared corners. The fifth corner is
# excluded and reported as a weak check because it is partly hidden in JR.
unit=np.array([[-.5,-.5,1],[-.5,.5,1],[.5,-.5,1],[-.5,-.5,0],[-.5,.5,0]])
def box(x):
 u,v,angle,du,dv,top,bottom=x;t=np.deg2rad(angle);uu=unit[:,0]*du;vv=unit[:,1]*dv
 return O+np.outer(u+uu*np.cos(t)-vv*np.sin(t),D)+np.outer(v+uu*np.sin(t)+vv*np.cos(t),A)+np.outer(bottom-O[1]+unit[:,2]*(top-bottom),[0,1,0])
observed=[np.array([m[k] for m in marks[:4]]) for k in [1,2]]
def residual(x):return np.concatenate([(project(box(x)[:4],c)-o).ravel() for c,o in zip(cams,observed)])
s=least_squares(residual,[45.3,17.6,0,1.6,1.5,32.14,30.93],bounds=([40,10,-20,.5,.5,31.8,30.2],[50,25,20,3,3,32.5,31.4]),x_scale='jac',max_nfev=2000);assert s.success
u,v,angle,du,dv,top,bottom=map(float,s.x);assert top>bottom
pred=box(s.x);corners=[]
for i,m in enumerate(marks[:5]):corners.append(dict(id=m[0],use='fit' if i<4 else 'check-partly-occluded',worldPoint=pred[i].tolist(),projectedPixels=[project([pred[i]],c)[0].tolist() for c in cams],residualPixels=[float(np.linalg.norm(project([pred[i]],c)[0]-px)) for c,px in zip(cams,m[1:3])]))
report=dict(schema=1,status='Dimensional study; candidate dimensions remain provisional. No geometry or collision changed.',toolSha256=sha(Path(__file__)),cameras=receipts,courtReportSha256=sha(court_dir/'report.json'),coordinates=dict(origin=O.tolist(),u=D.tolist(),v=A.tolist(),units='metres'),features=rows,planter=dict(method='Fixed cameras; vertical rectangular cuboid, four shared corners fitted in both photos; partly occluded fifth corner withheld.',u=u,v=v,rotationDegrees=angle,depthU=du,widthV=dv,topY=top,bottomY=bottom,height=top-bottom,corners=corners,fitRmsPixels=float(np.sqrt(np.mean([e*e for r in corners[:4] for e in r['residualPixels']])))),limitations=['Photo features are manual correspondences; mismatches and occlusion remain possible.','Camera fit passes source alignment but is not survey calibration.','Ray gaps and shape residuals are retained; a midpoint is not proof of a true shared corner.','Pixel perturbations exclude camera, source-model, crop and lens uncertainty.','Current garden level is an input to the court and was not changed by these results.','The partly occluded foot is only a weak check; no independent planter dimension is measured.'])
(out/'study.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'features':len(rows),'maxRayGapM':max(r['rayGapM'] for r in rows),'planter':report['planter']},indent=2))
