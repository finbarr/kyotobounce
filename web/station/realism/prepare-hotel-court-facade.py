"""Partition the registered facade into closed wall panels and recessed openings."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
src,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
b=src.read_bytes();s=json.loads(b);boundary=Polygon(s['boundary']);opaque=boundary.intersection(box(-1000,-1000,1000,s['glassBandBottomY']));glass=boundary.difference(opaque);windows=[]
for key,g in s['windowGroups'].items():
 for c in range(g['columns']):
  for r in range(g['rows']):
   x=g['firstColumnX']-c*g['columnSpacingM'];y=g['topCenterY']-r*g['rowSpacingM'];w=g['widthM'];h=g['heightM'];p=box(x-w/2,y-h/2,x+w/2,y+h/2)
   if not opaque.contains(p):continue
   windows.append({'id':f'{key}-{c}-{r}','center':[x,y],'width':w,'height':h})
holes=unary_union([box(q['center'][0]-q['width']/2,q['center'][1]-q['height']/2,q['center'][0]+q['width']/2,q['center'][1]+q['height']/2) for q in windows]);wall=opaque.difference(holes)
def shapes(g):
 if g.is_empty:return []
 if g.geom_type=='Polygon':return [g] if g.area>1e-8 else []
 return [p for p in g.geoms if p.geom_type=='Polygon' and p.area>1e-8]
def serial(p):
 q=p.simplify(1e-9,preserve_topology=True);assert p.hausdorff_distance(q)<1e-8
 return {'outer':list(map(list,q.exterior.coords[:-1])),'holes':[list(map(list,r.coords[:-1])) for r in q.interiors]}
parts=[]
# Large cladding sections are separated by small joints. Fine ceramic joints are texture detail.
for col in range(36):
 x=112.8+col*1.5
 for row in range(5):
  y=35.35+row*3.3
  cell=box(x+.002,y+.002,x+1.5-.002,min(y+3.3-.002,s['glassBandBottomY']))
  for k,q in enumerate(shapes(wall.intersection(cell))):parts.append({'id':f'cladding-{col}-{row}-{k}','kind':'cladding','material':2 if 124.8<x<134 and row==3 else 0,**serial(q)})
# A darker continuous backing closes large joints but retains the actual window openings.
for col in range(36):
 for row in range(5):
  x=112.8+col*1.5;y=35.35+row*3.3
  for i,q in enumerate(shapes(wall.intersection(box(x,y,x+1.5,min(y+3.3,s['glassBandBottomY']))))):parts.append({'id':f'joint-backing-{col}-{row}-{i}','kind':'backing','material':3,**serial(q)})
for col in range(36):
 x=112.8+col*s['glassPanelWidthM']
 for row in range(6):
  y=s['glassBandBottomY']+row*s['glassPanelHeightM']
  for k,q in enumerate(shapes(glass.intersection(box(x+.025,y+.025,x+s['glassPanelWidthM']-.025,y+s['glassPanelHeightM']-.025)))):parts.append({'id':f'curtain-pane-{col}-{row}-{k}','kind':'curtain-pane','material':4+(col+row)%2,**serial(q)})
for i,q in enumerate(shapes(glass)):parts.append({'id':f'curtain-backing-{i}','kind':'curtain-backing','material':6,**serial(q)})
report={'sourceSpecSha256':hashlib.sha256(b).hexdigest(),'spec':s,'windows':windows,'parts':parts,'area':{'boundaryM2':boundary.area,'opaqueM2':opaque.area,'glassM2':glass.area,'windowOpeningsM2':holes.area,'wallM2':wall.area},'limits':['Large section joints 4 mm, frame width 45 mm and depth remain inferred.','Opaque glass panes represent private rooms; no private hotel interior is in scope.']}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'windows':len(windows),'parts':len(parts),'areas':report['area']}))
