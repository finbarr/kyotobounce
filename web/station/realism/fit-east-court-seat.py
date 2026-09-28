"""Infer the foreground seat from a fixed registered camera; no photo pixels become textures.

The ground plane and seat elevation are assumptions inherited from the court study.
Top-outline reprojection is construction input, not independent validation.
"""
import json, hashlib, sys
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation
from shapely.geometry import Polygon
from shapely.ops import unary_union
camera_dir,court_dir,output=map(Path,sys.argv[1:]);assert Path('.local').resolve() in output.resolve().parents
output.mkdir(parents=True,exist_ok=True)
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
cam=read(camera_dir/'camera.json');projection=read(camera_dir/'render/projection.json');fit=read(camera_dir/'fit.json');court=read(court_dir/'report.json');g=court['geometry']
assert fit['withinTolerance']
assert sha(court_dir/'native-panels.json')==court['outputs']['nativePanelsSha256']
assert sha(Path(fit['reference']['localFile']))==fit['reference']['sha256']
assert np.allclose(cam['position'],projection['camera']['position'],rtol=0,atol=1e-10)
assert abs(cam['fov']-projection['camera']['fov'])<1e-10
O=np.array(g['originRenderer']);D=np.array(g['forwardRenderer']);A=np.array(g['southRenderer']);C=np.array(cam['position']);q=Rotation.from_quat(projection['camera']['quaternion']);width,height=fit['reference']['size'];f=height/(2*np.tan(np.deg2rad(cam['fov']/2)));center=np.array([width/2,height/2]);assert fit['imageTransform']['cropTopPixels']==0
images=np.array([[217,334],[375.5,350],[423,340],[264.5,324],[217,369.5],[375.5,393.5],[423,374.5]])
labels=['back front left top','back front right top','back rear right top','back rear left top','back front left bottom','back front right bottom','back rear right bottom']
unit=np.array([[-.5,.5,1],[.5,.5,1],[.5,-.5,1],[-.5,-.5,1],[-.5,.5,0],[.5,.5,0],[.5,-.5,0]])
seat_height=.44;base_height=.17;plinth_height=.08

def world(x):
 u,v,angle,length,depth,top=x;th=np.deg2rad(angle);xx=unit[:,0]*length;zz=unit[:,1]*depth
 return O+np.outer(u+xx*np.cos(th)-zz*np.sin(th),D)+np.outer(v+xx*np.sin(th)+zz*np.cos(th),A)+np.outer(g['gardenY']-O[1]+seat_height+(top-seat_height)*unit[:,2],[0,1,0])
def project(points):
 a=q.inv().apply(points-C);return center+f*a[:,:2]*np.array([1,-1])/-a[:,2:]
r=least_squares(lambda x:(project(world(x))-images).ravel(),[36.6,16.3,168,2.3,.8,.82],bounds=([30,13,140,.5,.2,.6],[43,24,200,4,2,1.1]),max_nfev=2000,x_scale='jac');assert r.success
u,v,angle,length,depth,top=r.x
back_world=world(r.x)[:4];back_uv=np.array([[np.dot(p-O,D),np.dot(p-O,A)] for p in back_world]);back=Polygon(back_uv)
def backproject(p,h):
 direction=q.apply([(p[0]-center[0])/f,-(p[1]-center[1])/f,-1]);t=(g['gardenY']+h-C[1])/direction[1];assert t>0
 w=C+t*direction;return [float(np.dot(w-O,D)),float(np.dot(w-O,A))]
seat_pixels=[[177,378.5],[516,442.5],[555,389],[507,383.5],[517.5,374.5],[155,359]]
base_pixels=[[117,380],[154,374],[616,422],[601,540],[351,477],[390,454]]
seat_observed=Polygon([backproject(p,seat_height) for p in seat_pixels]);base_observed=Polygon([backproject(p,base_height) for p in base_pixels]);assert seat_observed.is_valid and base_observed.is_valid
# Minimum inferred backing needed to support upper layers. These hidden extensions
# are explicitly measured below; they are not claimed as observed photo outlines.
step_height=.62
step_front=np.array([backproject(p,step_height) for p in [[173,346],[217,352]]]);th=np.deg2rad(angle);axis=np.array([np.cos(th),np.sin(th)]);across=np.array([-np.sin(th),np.cos(th)]);mid=step_front.mean(axis=0);half=abs(np.dot(step_front[1]-step_front[0],axis))/2
a,b=mid-axis*half,mid+axis*half
step=Polygon([a,b,b-across*.60,a-across*.60]).difference(back)
seat=unary_union([seat_observed,back,step]);base=unary_union([base_observed,seat]);plinth=base.buffer(-.055,join_style=2)
for p in [back,step,seat,base,plinth]:assert p.is_valid and p.geom_type=='Polygon' and not p.interiors
spec={'schema':1,'status':'Foreground seat reconstructed from fixed-camera visible outlines; levels and hidden extents remain provisional.','cameraFitSha256':sha(camera_dir/'fit.json'),'sourcePhoto':fit['reference'],'courtNativeSha256':court['outputs']['nativePanelsSha256'],'placements':[{'id':'foreground','u':float(u),'v':float(v),'rotation':0}],'bevelM':.006,'tiers':[],'method':'Fixed station camera; fit an orthogonal backrest against seven image corners, then back-project visible horizontal tier outlines at assumed elevations. Unions add minimum concealed support.','assumptions':['Garden elevation is inherited and provisional.','Main seat top 0.44 m, base top 0.17 m, recessed plinth top 0.08 m are assumed, not measured.','Visible outline fits are construction input; another registered view is needed for independent shape validation.','Left raised step top is inferred at 0.62 m; hidden rear extent 0.60 m. The unseen reverse side needs another registered view.','Only the foreground seat is supported here; the old two arbitrary placements are superseded.'],'outlinePixels':{'seat':seat_pixels,'base':base_pixels,'leftStepFront':[[173,346],[217,352]]},'hiddenSupportAddedM2':{'seat':seat.area-seat_observed.area,'base':base.area-base_observed.area},'backFit':{'rotationDegrees':float(angle),'lengthM':float(length),'depthM':float(depth),'topM':float(top),'rmsOriginalPixels':float(np.sqrt(np.mean(np.sum((project(world(r.x))-images)**2,axis=1)))),'corners':[{'name':name,'imagePixel':p.tolist(),'projectedPixel':s.tolist()} for name,p,s in zip(labels,images,project(world(r.x)))]}}
for name,poly,bottom,upper in [('plinth',plinth,0,plinth_height),('base',base,plinth_height,base_height),('seat',seat,base_height,seat_height),('left-step',step,seat_height,step_height),('back',back,seat_height,top)]:
 spec['tiers'].append({'id':name,'polygon':[[float(x-u),float(y-v)] for x,y in list(poly.exterior.coords)[:-1]],'bottom':float(bottom),'height':float(upper-bottom)})
(output/'seat-spec.json').write_text(json.dumps(spec,indent=2)+'\n');print(json.dumps({'backFit':{k:spec['backFit'][k] for k in ['rotationDegrees','lengthM','depthM','topM','rmsOriginalPixels']},'hiddenSupportAddedM2':spec['hiddenSupportAddedM2'],'outlineVertices':{t['id']:len(t['polygon']) for t in spec['tiers']}}))
