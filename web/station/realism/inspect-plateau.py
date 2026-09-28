# /// script
# dependencies = ["pyproj"]
# ///
"""Register official CityGML footprints for architectural context inspection."""
import argparse,xml.etree.ElementTree as E,json,hashlib,math,html
from pathlib import Path
from pyproj import Transformer
p=argparse.ArgumentParser();p.add_argument('--gml',type=Path,required=True);p.add_argument('--frame',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--scope',type=Path);a=p.parse_args()
frame=json.loads(a.frame.read_text());root=E.parse(a.gml).getroot()
ns={'g':'http://www.opengis.net/gml','b':'http://www.opengis.net/citygml/building/2.0','c':'http://www.opengis.net/citygml/2.0','u':'https://www.geospatial.jp/iur/uro/3.0'}
envelope=root.find('g:boundedBy/g:Envelope',ns)
if envelope.get('srsName')!='http://www.opengis.net/def/crs/EPSG/0/6697':raise ValueError('Review changed source CRS')
project=Transformer.from_crs(6668,6674,always_xy=True)
m=frame['localXYFromProjectedXY'];origin=frame['projectedOriginXY'];records=[]
def local(lat,lon,h):
 x,y=project.transform(lon,lat);x-=origin[0];y-=origin[1]
 return [m[0][0]*x+m[0][1]*y,m[1][0]*x+m[1][1]*y,h-frame['referenceElevationM']]
for building in root.findall('.//b:Building',ns):
 rings=[]
 for pos in building.findall('b:lod0RoofEdge//g:exterior/g:LinearRing/g:posList',ns):
  n=list(map(float,pos.text.split()));ring=[local(*n[i:i+3])[:2] for i in range(0,len(n),3)]
  rings.append(ring)
 if not rings:continue
 pts=[v for r in rings for v in r];bounds=[[min(v[i] for v in pts),max(v[i] for v in pts)]for i in range(2)]
 area=sum(abs(sum(r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1]for i in range(len(r)-1)))/2 for r in rings)
 def value(key):
  node=building.find(key,ns);return node.text if node is not None else None
 solid=[]
 for pos in building.findall('b:boundedBy//g:exterior/g:LinearRing/g:posList',ns):
  values=list(map(float,pos.text.split()));solid.extend(local(*values[i:i+3]) for i in range(0,len(values),3))
 solid_bounds=[[min(v[i] for v in solid),max(v[i] for v in solid)]for i in range(3)] if solid else None
 records.append({'sourceBuildingId':value('u:buildingIDAttribute/u:BuildingIDAttribute/u:buildingID'),'creationDate':value('c:creationDate'),'sourceSurveyYear':value('u:buildingDetailAttribute/u:BuildingDetailAttribute/u:surveyYear'),'lod2SurfaceBoundsXYZ':solid_bounds,'lod2ExteriorVertexCount':len(solid),'id':building.get('{'+ns['g']+'}id'),'name':value('g:name'),'measuredHeight':value('b:measuredHeight'),'areaM2':area,'boundsXY':bounds,'roofEdgesXY':rings})
a.output.mkdir(parents=True,exist_ok=True)
report={'sourceSha256':hashlib.sha256(a.gml.read_bytes()).hexdigest(),'frameSha256':hashlib.sha256(a.frame.read_bytes()).hexdigest(),'sourceCRS':'EPSG:6697 (JGD2011 geographic coordinates and height)','horizontalTransform':'EPSG:6668 longitude/latitude to EPSG:6674; then retained municipal local frame. Source height is retained with the construction datum subtracted.','limits':['LOD0 roof edges are not surveyed ground footprints.','Roof projection does not establish public access or doors.','Source measuredHeight and storey metadata require independent validation.'],'buildings':records}
(a.output/'registered-footprints.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
# A metric source map, not an invented satellite image. North is up.
x0,x1,y0,y1=-360,280,-355,250;scale=1.5;w=(x1-x0)*scale;h=(y1-y0)*scale
xy=lambda x,y:((x-x0)*scale,(y1-y)*scale)
shapes=[]
for b in records:
 bx,by=b['boundsXY']
 if bx[1]<x0 or bx[0]>x1 or by[1]<y0 or by[0]>y1:continue
 for ring in b['roofEdgesXY']:
  points=' '.join(f'{x:.2f},{y:.2f}'for x,y in [xy(*q) for q in ring])
  shapes.append(f'<polygon points="{points}" fill="#d9ddd8" stroke="#69736a" stroke-width=".8"><title>{html.escape(b["id"])}</title></polygon>')
if a.scope:
 scope=json.loads(a.scope.read_text());assert scope['frameSha256']==report['frameSha256']
 colors=['#bd4823','#136f8b','#7d438c']
 for zone,color in zip(scope['zones'],colors):
  xb,yb=zone['boundsXY']['x'],zone['boundsXY']['y'];x,y=xy(xb[0],yb[1]);rw=(xb[1]-xb[0])*scale;rh=(yb[1]-yb[0])*scale
  shapes.append(f'<rect x="{x}" y="{y}" width="{rw}" height="{rh}" fill="{color}0c" stroke="{color}" stroke-width="2" stroke-dasharray="8 4"/><text x="{x+6}" y="{y+18}" fill="{color}" font-size="14">{html.escape(zone["label"])}</text>')
for x in range(-350,281,50):
 a1=xy(x,y0);b1=xy(x,y1);shapes.append(f'<path d="M{a1[0]},{a1[1]} L{b1[0]},{b1[1]}" stroke="#bbc8cc" stroke-width=".5"/>')
for y in range(-350,251,50):
 a1=xy(x0,y);b1=xy(x1,y);shapes.append(f'<path d="M{a1[0]},{a1[1]} L{b1[0]},{b1[1]}" stroke="#bbc8cc" stroke-width=".5"/>')
points=' '.join(f'{x},{y}'for x,y in [xy(-85,-41),xy(125,-41),xy(125,29),xy(-85,29)])
shapes.append(f'<polygon points="{points}" fill="#e8502530" stroke="#d34320" stroke-width="2"/>')
cx,cy=xy(0,0);shapes.append(f'<circle cx="{cx}" cy="{cy}" r="4" fill="#c23b1c"/><text x="{cx+7}" y="{cy-7}" font-size="13">Current concourse footprint</text>')
(a.output/'station-context-map.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h+70}" viewBox="0 0 {w} {h+70}"><rect width="100%" height="100%" fill="#f5f3eb"/>{"".join(shapes)}<text x="18" y="{h+25}" font-size="14">Kyoto Station · official 2024 roof edges in the retained local frame · grid 50 m</text><text x="18" y="{h+48}" font-size="12">North ↑ · overlapping dashed areas are authoring zones, not surveyed public-access boundaries.</text></svg>')
large=sorted(records,key=lambda b:b['areaM2'],reverse=True)[:6]
print(json.dumps({'buildingCount':len(records),'largest':[ {k:v for k,v in b.items() if k!='roofEdgesXY'}for b in large]},ensure_ascii=False,indent=2))
