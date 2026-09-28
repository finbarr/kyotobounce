"""Derive a floor footprint from actual municipal floor faces, with a provisional gate passage."""
import json,sys,hashlib,math
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
from shapely import set_precision
specpath,auditpath,layoutpath,out=map(Path,sys.argv[1:]);assert out.resolve().is_relative_to(Path('.local').resolve());out.mkdir()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
s=json.loads(specpath.read_text());a=json.loads(auditpath.read_text());layout=json.loads(layoutpath.read_text());assert sha(Path(s['source']['file']))==s['source']['sha256']==a['source']['sha256']
f=s['frame'];faces=[t for t in a['triangles']if t['object']=='Untitled.200'and .0365<t['y']<.0367 and t['normalY']>.99];assert len(faces)>100
polys=[set_precision(Polygon([(v[0],v[2]-f['frontZ']-f['slope']*v[0])for v in t['vertices']]),.00001)for t in faces]
forward=box(s['context']['westX'],-s['context']['floorApproachM'],s['context']['eastX'],0)
approach=unary_union(polys).intersection(forward)
passage=box(s['gate']['westX'],0,s['gate']['eastX'],s['bay']['depthM']);footprint=approach.union(passage)
assert footprint.is_valid and footprint.geom_type=='Polygon'
# Preserve the snapped source boundary, then clip tiles without a second snap that
# could push their boundary vertices several micrometres outside the footprint.
footprint=set_precision(footprint,0)
floor=next(p for p in layout['panels']if p['id']=='concourse');retainedY=max(v['y']for v in floor['vertices']);assert retainedY==0
# Snap roundoff only; no closing of the basement openings or filling of absent source floor.
def rings(p):return {'outer':[list(p)for p in list(p.exterior.coords)[:-1]],'holes':[[list(p)for p in list(h.coords)[:-1]]for h in p.interiors]}
tiles=[];lo=footprint.bounds;nx=math.ceil((lo[2]-lo[0])/1.2);nd=math.ceil((lo[3]-lo[1])/1.2)
for i in range(nx):
 for j in range(nd):
  cell=box(lo[0]+i*1.2+.005,lo[1]+j*1.2+.005,min(lo[0]+(i+1)*1.2,lo[2])-.005,min(lo[1]+(j+1)*1.2,lo[3])-.005)
  q=footprint.intersection(cell)
  for p in ([q]if q.geom_type=='Polygon'else list(q.geoms)if q.geom_type=='MultiPolygon'else[]):
   if p.area>1e-8:tiles.append({'id':f'{i}-{j}-{len(tiles)}',**rings(p),'areaM2':p.area})
s['parentSpec']={'path':str(specpath),'sha256':sha(specpath)}
s['context']['floorY']=retainedY
s['floor']={'sourceAudit':{'path':str(auditpath),'sha256':sha(auditpath)},'retainedLayout':{'path':str(layoutpath),'sha256':sha(layoutpath)},'sourceFloorYRangeM':[min(t['y']for t in faces),max(t['y']for t in faces)],'sourceTriangles':[t['triangle']for t in faces],'sourceObject':'Untitled.200','sourceApproachAreaM2':approach.area,'excludedApproachAreaM2':forward.area-approach.area,'passageAreaM2':passage.area,'totalAreaM2':footprint.area,'coordinateGridM':.00001,'footprint':rings(footprint),'tiles':tiles,'datumDecision':'Retain current playable concourse Y=0 as the construction datum. Actual source floor faces are about 0.0366m above it; coarse-source height and camera uncertainty do not establish a real step. This is an explicit local datum assumption, not a global translation or survey claim.','passageDecision':'Extend a flat floor only through the source gate opening to the provisional 5.6m return depth. Hidden floor beyond the source frontage is inferred; equipment line and onward connection remain unresolved.'}
s['gate']['returns']=True
s['assumptions'][0]='Lower glazing datum23.11m is a municipal mesh level. Floor uses retained concourse Y=0; source horizontal approach is near0.0366m, not the earlier unsupported0.2366m choice.'
s['assumptions'][4]='This component excludes full canopy bearing, gate equipment, adjacent bays, shop threshold and completed forecourt. The approach retains source basement cutouts but lacks their finished guards and descending stairs; do not install before connected route/course proof.'
s['status']='Uninstalled bay and gate-passage candidate. Corrected floor footprint preserves source cutouts; floor datum and hidden passage depth remain explicit construction assumptions.'
s['toolSha256']=sha(Path(__file__))
(out/'spec.json').write_text(json.dumps(s,indent=2)+'\n')
(out/'footprint.geojson').write_text(json.dumps(mapping(footprint))+'\n')
print(json.dumps({'sourceFaces':len(faces),'sourceFloorYRangeM':s['floor']['sourceFloorYRangeM'],'retainedFloorY':retainedY,'approachAreaM2':approach.area,'excludedApproachAreaM2':forward.area-approach.area,'passageAreaM2':passage.area,'outerVertices':len(s['floor']['footprint']['outer']),'tiles':len(tiles)}))
