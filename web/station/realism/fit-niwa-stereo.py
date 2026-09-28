"""Joint two-camera registration with an inferred rectangular planter.

Source landmarks and four shared planter corners constrain both camera poses;
all original check points and the fifth planter corner remain withheld.
No photograph, source mesh or game geometry is changed.
"""
import numpy as np,json,sys,hashlib
from pathlib import Path
from scipy.spatial.transform import Rotation
from scipy.optimize import least_squares
spec_paths=list(map(Path,sys.argv[1:3]));roots=list(map(Path,sys.argv[3:5]));study_path=Path(sys.argv[5]);out=Path(sys.argv[6]);assert Path('.local').resolve() in out.resolve().parents;out.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
specs=[json.loads(p.read_text()) for p in spec_paths]
for s in specs:
 assert sha(Path(s['reference']['localFile']))==s['reference']['sha256']
 assert sha(Path(s['sourceGeometry']['file']))==s['sourceGeometry']['sha256']
fits=[json.loads((r/'fit.json').read_text()) for r in roots]
poses=[]
for root,f in zip(roots,fits):
 q=json.loads((root/'render/projection.json').read_text())['camera']['quaternion'];R=np.diag([1,-1,-1])@Rotation.from_quat(q).as_matrix().T;cam=f['camera'];poses.extend([*cam['position'],*Rotation.from_matrix(R).as_rotvec(),np.log(f['reference']['size'][1]/(2*np.tan(np.deg2rad(cam['fov']/2))))])
study=json.loads(study_path.read_text());
for r,receipt in zip(roots,study['cameras']):assert sha(r/'fit.json')==receipt['fitSha256']
b=study['planter'];poses.extend([b['u'],b['v'],b['rotationDegrees'],b['depthU'],b['widthV'],b['topY'],b['bottomY']]);x0=np.array(poses)
g=study['coordinates'];O=np.array(g['origin']);D=np.array(g['u']);A=np.array(g['v']);unit=np.array([[-.5,-.5,1],[-.5,.5,1],[.5,-.5,1],[-.5,-.5,0],[-.5,.5,0]])
def box(x):
 u,v,angle,du,dv,top,bottom=x[14:];t=np.deg2rad(angle);uu=unit[:,0]*du;vv=unit[:,1]*dv
 return O+np.outer(u+uu*np.cos(t)-vv*np.sin(t),D)+np.outer(v+uu*np.sin(t)+vv*np.cos(t),A)+np.outer(bottom-O[1]+unit[:,2]*(top-bottom),[0,1,0])
def project(x,i,world):
 p=x[i*7:i*7+7];q=Rotation.from_rotvec(p[3:6]).apply(np.array(world)-p[:3]);w,h=specs[i]['reference']['size'];return np.exp(p[6])*q[:,:2]/q[:,2:]+[w/2,h/2]
def res(x):
 rs=[]
 for i,s in enumerate(specs):
  anchors=[a for a in s['anchors'] if a['use']=='fit'];rs.extend(((project(x,i,[a['worldPoint'] for a in anchors])-[a['imagePixel'] for a in anchors])/2).ravel())
  for l in s.get('lineConstraints',[]):
   if l['use']!='fit':continue
   p,q=np.array(l['imageEndpoints']);d=q-p;n=np.array([-d[1],d[0]])/np.linalg.norm(d);rs.extend(((project(x,i,l['worldPoints'])-p)@n)/2)
  rs.extend(((project(x,i,box(x)[:4])-[p['pixels'][i] for p in study['features'][:4]])/2).ravel())
 return rs
lo=[];hi=[]
for s in specs:lo.extend([*s['cameraBounds']['min'],*([-np.inf]*3),np.log(150)]);hi.extend([*s['cameraBounds']['max'],*([np.inf]*3),np.log(2000)])
lo.extend([40,10,-20,.5,.5,31.8,30.2]);hi.extend([50,25,20,3,3,32.5,31.4]);sol=least_squares(res,x0,bounds=(lo,hi),x_scale='jac',max_nfev=5000,ftol=1e-12,gtol=1e-12,xtol=1e-12);x=sol.x
report={'schema':1,'toolSha256':sha(Path(__file__)),'inputSpecs':[{'path':str(p),'sha256':sha(p)} for p in spec_paths],'inputStudy':{'path':str(study_path),'sha256':sha(study_path)},'status':'Joint camera and rectangular-planter candidate; independent source checks and rendered review are required. No game geometry changed.','optimizerSuccess':bool(sol.success),'initialCost':float(np.sum(np.square(res(x0)))),'finalCost':float(np.sum(np.square(res(x)))),'box':x[14:].tolist(),'cameras':[],'parameters':x.tolist()}
for i,s in enumerate(specs):
 p=x[i*7:i*7+7];R=Rotation.from_rotvec(p[3:6]).as_matrix();F=R[2];U=-R[1];right=np.cross(F,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,F);roll=np.rad2deg(np.arctan2(-U@right,U@up));cam=dict(position=p[:3].tolist(),target=(p[:3]+F*100).tolist(),fov=float(np.rad2deg(2*np.arctan(s['reference']['size'][1]/(2*np.exp(p[6]))))),rollDegrees=float(roll),viewport=s['viewport']);rs=[]
 for a in s['anchors']:rs.append(dict(id=a['id'],use=a['use'],error=float(np.linalg.norm(project(x,i,[a['worldPoint']])[0]-a['imagePixel']))))
 shared=[dict(id=f['id'],use='fit' if k<4 else 'check',error=float(np.linalg.norm(project(x,i,[box(x)[k]])[0]-f['pixels'][i]))) for k,f in enumerate(study['features'][:5])]
 scale=s['viewport']['width']/s['reference']['size'][0]
 assert all(np.isfinite(p))
 line_rows=[]
 for l in s.get('lineConstraints',[]):
  a,b=np.array(l['imageEndpoints']);d=b-a;n=np.array([-d[1],d[0]])/np.linalg.norm(d);uv=project(x,i,l['worldPoints']);dep=Rotation.from_rotvec(p[3:6]).apply(np.array(l['worldPoints'])-p[:3])[:,2];assert min(dep)>0
  line_rows.append(dict(l,projectedImagePixels=uv.tolist(),projectedViewportPixels=(uv*scale).tolist(),imageEndpointViewportPixels=(np.array(l['imageEndpoints'])*scale).tolist(),perpendicularResidualPixels=(np.abs((uv-a)@n)*scale).tolist(),depthMeters=dep.tolist()))
 anchors=[]
 for a in s['anchors']:
  uv=project(x,i,[a['worldPoint']])[0];dep=Rotation.from_rotvec(p[3:6]).apply(np.array(a['worldPoint'])-p[:3])[2];assert dep>0
  anchors.append(dict(a,projectedImagePixel=uv.tolist(),referenceViewportPixel=(np.array(a['imagePixel'])*scale).tolist(),projectedViewportPixel=(uv*scale).tolist(),residualPixels=float(np.linalg.norm(uv-a['imagePixel'])*scale),depthMeters=float(dep)))
 errors=[a['residualPixels'] for a in anchors if a['use']=='fit'];checks=[a['residualPixels'] for a in anchors if a['use']=='check'];limit=s['viewport']['width']*s.get('toleranceWidthFraction',.02)
 fit=dict(fits[i]);fit['jacobianRank']=int(np.linalg.matrix_rank(sol.jac));fit['jacobianCondition']=float(np.linalg.cond(sol.jac));fit['optimizerSuccess']=bool(sol.success);fit.pop('measurementSensitivity',None);fit.pop('starts',None);fit.update(camera=cam,anchors=anchors,lineConstraints=line_rows,fitRmsPixels=float(np.sqrt(np.mean(np.square(errors)))),fitMaxPixels=max(errors),checkMaxPixels=max(checks),withinTolerance=max(errors+checks+[e for l in line_rows for e in l['perpendicularResidualPixels']])<=limit,toolSha256=sha(Path(__file__)),inputSha256=sha(spec_paths[i]),methodNote='Joint refinement with four shared corners of an inferred vertical rectangular planter; all original source checks and a partly occluded fifth planter corner withheld. Source-only predecessor retained. No material image pixels or geometry changed.',status='Joint measured camera candidate; source overlay and shared geometry need review.',jointRefinement={'inputStudySha256':sha(study_path),'planterAssumption':'Vertical rectangular cuboid, unknown dimensions','sharedResiduals':shared})
 folder=out/['jr','rurubu'][i];folder.mkdir(exist_ok=True);(folder/'camera.json').write_text(json.dumps(cam,indent=2)+'\n');(folder/'fit.json').write_text(json.dumps(fit,indent=2)+'\n')
 report['cameras'].append(dict(camera=cam,sourceResiduals=rs,sharedResiduals=shared,withinSourceTolerance=fit['withinTolerance']))

# Independent ray intersections for every shared feature after refinement.
features=[]
for feature in study['features']:
 rays=[]
 for i,px in enumerate(feature['pixels']):
  p=x[i*7:i*7+7];w,h=specs[i]['reference']['size'];d=Rotation.from_rotvec(p[3:6]).inv().apply([*(np.subtract(px,[w/2,h/2])/np.exp(p[6])),1]);rays.append((p[:3],d/np.linalg.norm(d)))
 (C,da),(E,db)=rays;t=np.linalg.lstsq(np.stack([da,-db],axis=1),E-C,rcond=None)[0];assert min(t)>0;pa=C+t[0]*da;pb=E+t[1]*db;P=(pa+pb)/2
 features.append(dict(id=feature['id'],pixels=feature['pixels'],worldPoint=P.tolist(),local=[float((P-O)@D),float(P[1]),float((P-O)@A)],rayGapM=float(np.linalg.norm(pa-pb)),previousRayGapM=feature['rayGapM']))
report['features']=features
report['planter']={k:float(v) for k,v in zip(['u','v','rotationDegrees','depthU','widthV','topY','bottomY'],x[14:])};report['planter']['height']=float(x[-2]-x[-1]);report['planter']['corners']=box(x).tolist()
report['limitations']=['Rectangular vertical planter is a geometric assumption, not a surveyed dimension.','Source model, lens distortion and image crop errors remain.','The fifth planter corner is partly occluded and is only a weak check.','Source-only cameras and previous geometry remain unchanged; this candidate does not silently replace them.']
report['jacobianCondition']=float(np.linalg.cond(sol.jac));report['jacobianRank']=int(np.linalg.matrix_rank(sol.jac))
assert all(c['withinSourceTolerance'] for c in report['cameras'])
(out/'study.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'initialCost':report['initialCost'],'finalCost':report['finalCost'],'planter':report['planter'],'sourceChecks':[[r['error'] for r in c['sourceResiduals'] if r['use']=='check'] for c in report['cameras']],'rayGaps':[{k:f[k] for k in ['id','rayGapM','previousRayGapM']} for f in features]},indent=2))
