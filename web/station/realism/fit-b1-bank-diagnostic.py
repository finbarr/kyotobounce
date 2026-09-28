import json,hashlib
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation
root=Path('.local/station-realism/hall-b1-registration-03');root.mkdir(exist_ok=False)
src=Path('.local/station-realism/hall-bank-profiles-spec-08/spec.json');spec=json.loads(src.read_bytes());bank=next(x for x in spec['meshes'] if x['id']=='hall-basement-west-source-bank-body');v=np.array(bank['vertices']);indices=[4,12,9,1];points=v[indices];obs=np.array([[228,18],[379,29],[285,256],[222,249]],float)
ref=Path('research/kyoto-station/photos/porta-b2-route-05.jpg')
center=np.array([336,224]);C=np.array([-14,-3.3,-7.1]);F=np.array([0,-2.7,-4.7])-C;F/=np.linalg.norm(F);R=np.cross(F,[0,1,0]);R/=np.linalg.norm(R);U=np.cross(R,F);rv=Rotation.from_matrix(np.array([R,-U,F])).as_rotvec();base=np.r_[C,rv,np.log(500)]
lo=np.r_[[-25,-3.6,-12],[-np.inf]*3,np.log(200)];hi=np.r_[[-10,-2.9,-3], [np.inf]*3,np.log(1000)]
def project(x):
 q=Rotation.from_rotvec(x[3:6]).apply(points-x[:3]);return np.exp(x[6])*q[:,:2]/q[:,2:]+center,q[:,2]
def residual(x):
 uv,d=project(x);return np.r_[(uv-obs).ravel(),np.minimum(d-.1,0)*1000]
sols=[]
for focal in [250,400,650,900]:
 x=base.copy();x[6]=np.log(focal);sols.append(least_squares(residual,x,bounds=(lo,hi),x_scale='jac',max_nfev=4000))
s=min(sols,key=lambda s:s.cost);x=s.x;M=Rotation.from_rotvec(x[3:6]).as_matrix();forward=M[2];up=-M[1];right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);baseup=np.cross(right,forward);roll=np.rad2deg(np.arctan2(-up@right,up@baseup));cam=dict(position=x[:3].tolist(),target=(x[:3]+forward*30).tolist(),fov=float(np.rad2deg(2*np.arctan(448/(2*np.exp(x[6]))))),rollDegrees=float(roll),viewport=dict(width=1008,height=672),motion=dict(nativeFile='.local/station-realism/hall-descents-assembly-20/native-panels.json',time=1))
uv,depth=project(x);report=dict(status='Four coplanar corners only; diagnostic pose, not accepted registration. Lower edge partly occluded. No independent check landmarks.',reference=dict(file=str(ref),sha256=hashlib.sha256(ref.read_bytes()).hexdigest(),size=[672,448]),source=dict(file=str(src),sha256=hashlib.sha256(src.read_bytes()).hexdigest(),body=bank['id']),anchors=[dict(index=int(i),worldPoint=p.tolist(),imagePixel=o.tolist(),projectedPixel=u.tolist(),errorPixels=float(np.linalg.norm(o-u)))for i,p,o,u in zip(indices,points,obs,uv)],camera=cam,focalPixels=float(np.exp(x[6])),activeBounds=s.active_mask.tolist(),rank=int(np.linalg.matrix_rank(s.jac)),condition=float(np.linalg.cond(s.jac)),limits=['Four coplanar landmarks are below the six-anchor acceptance requirement.','Two lower corners partly obscured by second-flight balustrade.','Center pinhole camera; original lens/crop unknown.','Camera eye height constrained to 1.31-2.01m above modeled B1 floor.','This is correspondence hypothesis, not proof of bank identity.'])
(root/'study.json').write_text(json.dumps(report,indent=2)+'\n');(root/'view.json').write_text(json.dumps(cam,indent=2)+'\n');print(json.dumps(report,indent=2))
