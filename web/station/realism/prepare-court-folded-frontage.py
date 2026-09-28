"""Register the folded and rounded courtyard facade from municipal geometry.

The dated close photograph establishes reflective lower faces and pale cladding.
Fine panel dimensions and the hidden interior remain construction hypotheses.
"""
import json,struct,hashlib,sys
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
root=Path('.local/station-realism');out=Path(sys.argv[1]);assert root.resolve() in out.resolve().parents;out.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest();path=root/'station-shell/municipal-station.glb';data=path.read_bytes();assert sha(data)=='0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1';n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);binary=data[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];w={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=struct.calcsize(fmt);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.array([struct.unpack_from('<'+fmt*w,binary,offset+k*v.get('byteStride',w*size)) for k in range(a['count'])])
node=next(q for q in j['nodes'] if q.get('name')=='Untitled.203');pr=j['meshes'][node['mesh']]['primitives'][0];vs=acc(pr['attributes']['POSITION']);tri=vs[acc(pr['indices']).astype(int).ravel()].reshape((-1,3,3))
patches=[];profile=[]
for f in range(8251,8287,2):
 ts=tri[f:f+2];a=ts[0,2].copy();b=ts[0,0].copy();a[1]=b[1]=0
 if profile:assert np.linalg.norm(a-np.array(profile[-1]))<1e-4,(f,a,profile[-1])
 else:profile.append(a.tolist())
 profile.append(b.tolist());normal=np.cross(ts[0,1]-ts[0,0],ts[0,2]-ts[0,0]);normal[1]=0;normal/=np.linalg.norm(normal);u=np.cross([0,1,0],normal);origin=a.copy();uv=np.stack([(ts-origin)@u,ts[:,:,1]],axis=-1);area=sum(abs(np.cross(t[1]-t[0],t[2]-t[0]))/2 for t in uv)
 patches.append({'id':f'source-{f}','faces':[f,f+1],'origin':origin.tolist(),'u':u.tolist(),'normal':normal.tolist(),'bounds':[float(uv[:,:,0].min()),float(uv[:,:,1].min()),float(uv[:,:,0].max()),float(uv[:,:,1].max())],'areaM2':float(area),'sourceMaximumPlaneDepartureM':float(np.abs((ts-origin)@normal).max()),'sourceTriangles':ts.tolist()})
# Test a circular interpretation instead of assuming the municipal polyline is exact.
ps=np.array(profile[1:10])[:,[0,2]];x=np.linalg.lstsq(np.c_[2*ps,np.ones(len(ps))],(ps**2).sum(1),rcond=None)[0];r=np.sqrt(x[2]+sum(x[:2]**2));circle=least_squares(lambda q:np.linalg.norm(ps-q[:2],axis=1)-q[2],np.r_[x[:2],r]);assert circle.success
references={};research=Path('/Users/finbarr/code/games/kyoto/research/kyoto-station')
for name in ['court-south-facade-2019','court-overview-2019','court-northward-2019','niwa-jr-02a','niwa-rurubu-frontage']:
 p=research/'photos'/f'{name}.jpg';references[name]={'file':str(p),'sha256':sha(p.read_bytes())}
report={'schema':1,'status':'Uninstalled exterior construction hypothesis; not current tenant, private access or survey acceptance.','source':{'file':str(path),'sha256':sha(data),'object':'Untitled.203'},'patches':patches,'profile':profile,'curveNodeRange':[1,9],'circularHypothesis':{'centerXZ':circle.x[:2].tolist(),'radiusM':float(circle.x[2]),'residualsM':circle.fun.tolist(),'maximumResidualM':float(abs(circle.fun).max()),'decision':'Do not force a circle. Interpolate the nine source anchors with a centripetal curve; record departure from the coarse chords.'},'construction':{'bottomY':float(min(p['bounds'][1] for p in patches)),'topY':float(max(p['bounds'][3] for p in patches)),'claddingSplitY':34.15,'plinthHeightM':.18,'upperPanelWidthM':1.1,'glassPanelWidthM':1.2,'panelGapM':.005,'mirrorSeamM':.014,'bodyDepthM':.08,'curveSubdivisionsPerSourceSpan':8},'references':references,'assumptions':['Original 36 municipal wall triangles locate the exterior; source planarity is not survey accuracy.','2019 close and overview photographs establish the folded reflective lower facade and rounded dark return. Furniture, gazebo, planting and former business use in those photographs are not current-state evidence.','2025 JR reference shows the same upper folded envelope, but umbrellas obscure most lower glass. Rurubu camera mainly sees the already installed adjoining dark wall.','Cladding/glass division at Y34.15, panel spacing, seam width, backing and plinth are estimates; no private interior or operable doors are invented.','The rounded exterior follows the original source anchors with centripetal interpolation. No exact circular survey is claimed.','Mirror optical parameters are provisional. A nearby scene reflection must be checked in the actual game before appearance acceptance.'],'toolSha256':sha(Path(__file__).read_bytes())}
(out/'spec.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'sourcePatches':len(patches),'sourceFaces':sum(len(p['faces']) for p in patches),'sourceAreaM2':sum(p['areaM2'] for p in patches),'circleMaximumResidualM':report['circularHypothesis']['maximumResidualM'],'construction':report['construction']}))
