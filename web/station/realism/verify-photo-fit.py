"""Recover an independently defined synthetic pinhole camera and check held-out behavior."""
import copy, json, math, subprocess, sys
from pathlib import Path
out=Path(sys.argv[1]).resolve();assert Path('.local').resolve() in out.parents
out.mkdir(parents=True,exist_ok=True)
center=[3,2,4];focal=500
# Known camera points along -Z, with world +X to image right and world +Y upward.
def image_point(p):
 depth=center[2]-p[2]
 return [400+focal*(p[0]-center[0])/depth,300-focal*(p[1]-center[1])/depth]
points=[[-2,-1,-10],[6,5,-16],[1,8,-24],[9,-3,-30],[-5,4,-20],[8,7,-9],[4,-2,-15],[-4,6,-32]]
line_points=[[7,-3,-12],[7,8,-12]]
config={'reference':{'size':[800,600]},'sourceGeometry':{'status':'Synthetic independent camera fixture'},'viewport':{'width':800,'height':600},'initialCamera':{'position':[3.2,2.1,4.1],'target':[3,2,-10],'fov':62},'cameraBounds':{'min':[-10,-10,-1],'max':[15,15,12]},'anchors':[{'id':str(i),'name':str(i),'use':'fit' if i<6 else 'check','worldPoint':p,'imagePixel':image_point(p)} for i,p in enumerate(points)],'lineConstraints':[{'id':'vertical','use':'fit','worldPoints':line_points,'imageEndpoints':list(map(image_point,line_points))}]}
def run(label,c):
 source=out/(label+'.json');source.write_text(json.dumps(c))
 result=subprocess.run([sys.executable,'web/station/realism/fit-photo.py',str(source),str(out/label)],capture_output=True,text=True)
 assert result.returncode==0,result.stderr
 return json.loads((out/label/'fit.json').read_text())
base=run('base',config);assert base['withinTolerance'] and base['optimizerSuccess']
assert max(abs(a-b) for a,b in zip(base['camera']['position'],center))<1e-7
assert abs(base['camera']['fov']-math.degrees(2*math.atan(300/focal)))<1e-7
assert max(base['lineConstraints'][0]['perpendicularResidualPixels'])<1e-7
scaled=copy.deepcopy(config);scaled['viewport']={'width':1200,'height':900};s=run('scaled',scaled)
assert s['tolerancePixels']==24 and base['tolerancePixels']==16
assert max(abs(a-b) for a,b in zip(s['camera']['position'],center))<1e-7
bad=copy.deepcopy(config);bad['anchors'][6]['imagePixel'][0]+=40;b=run('bad-check',bad)
assert not b['withinTolerance'] and abs(b['checkMaxPixels']-40)<1e-7
assert b['camera']==base['camera'],'Withheld point changed the camera'
held=copy.deepcopy(config);held['lineConstraints'][0]['use']='check';held['lineConstraints'][0]['imageEndpoints']=[[p[0]+40,p[1]] for p in held['lineConstraints'][0]['imageEndpoints']];h=run('bad-check-line',held)
assert not h['withinTolerance'] and max(abs(a-b) for a,b in zip(h['camera']['position'],center))<1e-7
inconsistent=copy.deepcopy(config);inconsistent['lineConstraints'][0]['imageEndpoints']=[[p[0]+40,p[1]] for p in inconsistent['lineConstraints'][0]['imageEndpoints']];i=run('moved-fit-line',inconsistent)
assert max(abs(a-b) for a,b in zip(i['camera']['position'],center))>.01,'Fitted line was ignored'
report={'pass':True,'checks':['Known independent camera recovered','Line reprojection accurate','Tolerance scales with viewport width','Withheld point outlier rejects alignment without moving camera','Withheld line outlier rejects alignment without moving camera','Fitted line affects optimization'],'maximumCameraErrorM':max(abs(a-b) for a,b in zip(base['camera']['position'],center))}
(out/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
