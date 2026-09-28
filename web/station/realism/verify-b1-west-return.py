"""Independent parent and floor coverage checks for the B1 western return."""
from pathlib import Path
import json,hashlib,sys
from shapely.geometry import Polygon,MultiPoint,LineString
from shapely.ops import unary_union
sp,parent,new,out=map(Path,sys.argv[1:]);s=json.loads(sp.read_bytes());a=json.loads((parent/'native-panels.json').read_bytes());b=json.loads((new/'native-panels.json').read_bytes());by={p['id']:p for p in b['panels']};removed='hall-b1-'+s['westReturn']['removedSourceId'];unchanged=[]
for p in a['panels']:
 if p['id']==removed:continue
 assert p==by[p['id']],p['id'];unchanged.append(p['id'])
assert removed not in by
assert a['escalators']==b['escalators'] and a['combSupports']==b['combSupports']
def footprint(p,height=None):
 if height is None:height=s['floorY']
 faces=[]
 for i in range(0,len(p['triangles']),3):
  v=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(q['y']-height)<1e-10 for q in v):faces.append(Polygon([(q['x'],-q['z'])for q in v]))
 return unary_union(faces)
west=footprint(by['hall-b1-west-return-floor']);expected=Polygon(s['westReturn']['floorRing']);assert west.symmetric_difference(expected).area<1e-8
old=json.loads(Path(s['floorParent']['path']).read_bytes())['lowerFloor']['coordinates'];core=Polygon(old[0],old[1:]);existing=[core,*[footprint(p)for p in a['panels']if p['role']=='hall-b1-floor']]
maxOverlap=max(west.intersection(f).area for f in existing);assert maxOverlap<1e-8
N=min(s['frontEdges']['north']);S=min(s['frontEdges']['south']);W=s['corridorWidthM']
joins=[('core',core,LineString([N,S])),('north',footprint(by['hall-b1-north-aisle-floor']),LineString([[N[0],N[1]-W],N])),('south',footprint(by['hall-b1-south-aisle-floor']),LineString([S,[S[0],S[1]+W]]))]
rows=[]
for name,p,line in joins:
 assert line.difference(west.boundary.buffer(1e-9)).length<1e-8
 assert line.difference(p.boundary.buffer(1e-9)).length<1e-8
 rows.append(dict(id=name,lengthM=line.length,distanceM=p.distance(west)))
vol=s['westReturn']['volume'];assert vol['partitionError']<1e-7 and vol['removed']>0
ceilingProof=None
if s['westReturn'].get('ceilingRing'):
 upper=next(p for p in s['parts']if p['id']=='upper-source-well');faces=[]
 for i in range(0,len(upper['indices']),3):
  t=Polygon([(upper['vertices'][k][0],upper['vertices'][k][2])for k in upper['indices'][i:i+3]])
  if t.area>1e-12:faces.append(t)
 sourceProjection=unary_union(faces);actual=footprint(by['hall-b1-west-return-ceiling'],s['headY']+.18);wanted=west.difference(sourceProjection)
 difference=actual.symmetric_difference(wanted).area;overlap=actual.intersection(sourceProjection).area
 assert difference<1e-8 and overlap<1e-8
 ceilingProof=dict(areaM2=actual.area,symmetricDifferenceM2=difference,sourceOverlapM2=overlap,removedAreaM2=west.area-actual.area)
report={'pass':True,'specSha256':hashlib.sha256(sp.read_bytes()).hexdigest(),'nativeSha256':hashlib.sha256((new/'native-panels.json').read_bytes()).hexdigest(),'unchangedRecords':len(unchanged),'unchangedMechanisms':len(b['escalators']),'removedRecord':removed,'addedFloorAreaM2':west.area,'maximumOverlapM2':maxOverlap,'joins':rows,'sourceCut':vol,'ceiling':ceilingProof,'limits':['Opening width and return depth remain provisional.','Floor continuity does not prove route alignment to photographs or full station integration.']};out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
