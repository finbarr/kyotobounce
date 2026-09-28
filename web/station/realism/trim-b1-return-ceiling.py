"""Trim the return ceiling to the existing upper enclosure projection."""
from pathlib import Path
import json,sys
from shapely.geometry import Polygon
from shapely.ops import unary_union
src,out=map(Path,sys.argv[1:]);s=json.loads(src.read_bytes());p=next(p for p in s['parts']if p['id']=='upper-source-well');tris=[]
for i in range(0,len(p['indices']),3):
 t=Polygon([(p['vertices'][k][0],p['vertices'][k][2])for k in p['indices'][i:i+3]])
 if t.area>1e-12:tris.append(t)
foot=unary_union(tris);original=Polygon(s['westReturn']['floorRing']);ceiling=original.difference(foot)
assert ceiling.geom_type=='Polygon' and ceiling.is_valid and not ceiling.interiors
assert ceiling.intersection(foot).area<1e-9
s['westReturn']['ceilingRing']=[list(p)for p in list(ceiling.exterior.coords)[:-1]];s['westReturn']['ceilingTrim']={'sourcePart':'upper-source-well','originalAreaM2':original.area,'finalAreaM2':ceiling.area,'removedOverlapM2':original.intersection(foot).area,'method':'Subtract full X/Z projection of source upper enclosure triangles; floor and opening unchanged.'}
out.mkdir(exist_ok=False);(out/'spec.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s['westReturn']['ceilingTrim']))
