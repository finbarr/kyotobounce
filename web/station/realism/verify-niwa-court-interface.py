"""Verify actual component footprints and common paving/terrace interfaces.

Uses rounded analysis coordinates only (maximum rounding error is recorded).
Does not alter source vertices or establish the inferred architecture as surveyed.
"""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import MultiPoint,Polygon
old_dir,court_dir,niwa_dir,seats_dir,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
def load(root):
 report=read(root/'report.json');assert sha(root/'native-panels.json')==report['outputs']['nativePanelsSha256'];assert sha(root/report['outputs']['glbFile'])==report['outputs']['glbSha256'];return report,read(root/'native-panels.json')['panels']
old,old_panels=load(old_dir);court,cp=load(court_dir);niwa,np=load(niwa_dir);seats,sp=load(seats_dir)
g=court['geometry'];O=g['originRenderer'];D=g['forwardRenderer'];A=g['southRenderer'];max_round=0

def local(v):return[(v['x']-O[0])*D[0]+(-v['z']-O[2])*D[2],v['y'],(v['x']-O[0])*A[0]+(-v['z']-O[2])*A[2]]
def top(panel):
 global max_round
 vs=[local(v) for v in panel['vertices']];y=max(p[1] for p in vs);points=[]
 for p in vs:
  if abs(p[1]-y)<1e-8:
   q=[round(p[k],9) for k in [0,2]];max_round=max(max_round,*[abs(q[i]-p[k]) for i,k in enumerate([0,2])]);points.append(q)
 return MultiPoint(points).convex_hull,y

def panel(rows,id):return next(p for p in rows if p['id']==id)
a,ay=top(panel(cp,'east-court-raised-garden'));b,by=top(panel(np,'niwa-lower-walkway'));previous,py=top(panel(old_panels,'east-court-raised-garden'))
assert abs(ay-by)<1e-9 and a.intersection(b).area<1e-9
shared=a.boundary.intersection(b.boundary);assert abs(shared.length-18.5)<1e-8
assert court['geometry']['sourceOuterRenderer']==old['geometry']['sourceOuterRenderer'];assert court['geometry']['sourceHolesRenderer']==old['geometry']['sourceHolesRenderer']
foreground=[p for p in sp if p['id'].startswith('east-court-seat-foreground-')];assert len(foreground)==5
seat_vertices=[local(v) for p in foreground for v in p['vertices']];assert abs(min(p[1] for p in seat_vertices)-ay)<1e-5
assert all(a.buffer(1e-6).covers(MultiPoint([[p[0],p[2]]])) for p in seat_vertices)
terrace=seats['geometry']['terraceCore'];assert terrace
step_rows=[]
for i in range(terrace['risers']):
 footprint,y=top(panel(sp,'east-court-niwa-terrace-core-'+str(i)));expected=terrace['lowerY']+(i+1)*terrace['riseM'];assert abs(y-expected)<1e-5;step_rows.append({'id':i,'topY':y,'footprintBoundsUV':list(footprint.bounds)})
landing,ly=top(panel(sp,'east-court-niwa-terrace-landing'));cafe,cy=top(panel(np,'niwa-glazed-landing'));assert abs(ly-cy)<1e-5
# BoxGeometry emits float32 positions; tolerate only its measured sub-mm envelope.
assert abs(landing.bounds[2]-cafe.bounds[0])<1e-5
assert terrace['u'][0]-b.bounds[0]>=1.4
report={'oldCourtGlbSha256':old['outputs']['glbSha256'],'courtGlbSha256':court['outputs']['glbSha256'],'niwaGlbSha256':niwa['outputs']['glbSha256'],'seatGlbSha256':seats['outputs']['glbSha256'],'oldOverlapAreaM2':previous.intersection(b).area,'oldPavingHeightDifferenceM':py-by,'newOverlapAreaM2':a.intersection(b).area,'newPavingHeightDifferenceM':ay-by,'sharedBoundaryLengthM':shared.length,'maximumAnalysisRoundingErrorM':max_round,'sourceOuterAndHoleUnchanged':True,'allForegroundSeatVerticesOverCourt':True,'seatBaseY':min(p[1] for p in seat_vertices),'terrace':terrace,'terraceStepChecks':step_rows,'terraceLandingHeightDifferenceM':ly-cy,'terraceLandingHorizontalSeamM':landing.bounds[2]-cafe.bounds[0],'remainingLowerWalkwayWidthM':terrace['u'][0]-b.bounds[0],'pass':True,'meaning':'Verifies constructed common interfaces and seat support. The continuous court datum and terrace profile remain photographic construction hypotheses; this is not a survey or full-station acceptance.'}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['terrace','terraceStepChecks']}))
