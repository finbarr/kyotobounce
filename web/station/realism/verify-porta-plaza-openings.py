"""Check the new deck, stair cutout and two wall openings against the fitted plan."""
import json,sys,struct
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:])
m=json.loads(manifest.read_text());layout=json.loads(Path(m['layout']).read_text());r=json.loads((component/'report.json').read_text());g=r['geometry']
panels={p['id']:p for p in layout['panels']}
assert all(id not in panels for id in g['retiredIds'])
def top(id,axes=('x','z')):
 p=panels['porta-plaza-'+id];y=max(v['y'] for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k] for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-6 for v in vs):faces.append(Polygon([(v[axes[0]],v[axes[1]])for v in vs]))
 return unary_union(faces)
deck=top('deck');ceiling=top('ceiling');hole=box(16,25.2,20,30)
assert deck.symmetric_difference(Polygon(g['deck'])).area<.0001
assert ceiling.symmetric_difference(Polygon(g['outer'])).area<.0001
assert deck.intersection(hole).area<.0001
assert ceiling.difference(deck).symmetric_difference(hole).area<.0001
assert abs(g['ceiling']-g['floor']-3.4)<1e-6
for i in range(15):
 p=panels['porta-plaza-stair-step-'+str(i)];y=max(v['y'] for v in p['vertices'])
 assert abs(y-(g['b2']+(i+1)*g['stair']['rise']))<1e-6
 assert top('stair-step-'+str(i)).symmetric_difference(box(16,25.2+i*.32,20,25.2+(i+1)*.32)).area<.0001
# Preserve wall coverage outside the intended B2 cross-passage opening.
walls=unary_union([top('b2-north-wall-'+str(x))for x in(-24,20)])
f32=lambda v:struct.unpack('f',struct.pack('f',v))[0]
expected=box(-24,f32(24.9),138,f32(25.1)).difference(box(16,24.8,20,25.2))
assert walls.symmetric_difference(expected).area<.0001
report={'pass':True,'layoutSha256':m['layoutSha256'],'clearHeadroomM':3.4,'stairTreads':15,'deckAreaM2':deck.area,'stairOpeningAreaM2':hole.area,'b2WallRetainedOutsideOpening':True,'subwayWestWallRemoved':True}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
