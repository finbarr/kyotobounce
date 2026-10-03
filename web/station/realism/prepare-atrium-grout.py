"""Make a conforming tiled floor with flush grout and no buried tile edges."""
import json,sys,hashlib,struct
from pathlib import Path
import shapely
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union,polygonize
from shapely.geometry.polygon import orient

manifest,out=map(Path,sys.argv[1:]);out.mkdir(parents=True,exist_ok=True)
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes()
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
floor=next(p for p in json.loads(raw)['panels']if p['id']=='hall-bay-floor-surface')
vs=floor['vertices'];triangles=[floor['triangles'][i:i+3]for i in range(0,len(floor['triangles']),3)]
def tops(y):
 return [shapely.set_precision(Polygon([(vs[i]['x'],vs[i]['z'])for i in t]),.000001)for t in triangles if all(abs(vs[i]['y']-y)<1e-6 for i in t)]
tile_faces=tops(0);tiles=unary_union(tile_faces);backing=unary_union(tops(-.002));footprint=tiles.union(backing)
# Noding before polygonization puts every shared top edge into both neighbours.
regions=[p for p in polygonize(unary_union([p.boundary for p in tile_faces]+[footprint.boundary]))if footprint.covers(p.representative_point())]
footprint=unary_union(regions);grout=footprint.difference(tiles)
assert grout.is_valid and grout.covers(Point(-2.28956294,-.57154548))
f32=lambda n:struct.unpack('f',struct.pack('f',n))[0]
vertices=[];indices=[];finishes=[];lookup={}
def index(x,y,z):
 p=tuple(map(f32,(x,y,z)))
 if p not in lookup:lookup[p]=len(vertices);vertices.append(dict(zip(('x','y','z'),p)))
 return lookup[p]
def face(points,grout=False):
 ids=[index(*p)for p in points]
 if len(set(ids))<3:return  # Distinct double coordinates may share one Float32.
 indices.extend(ids);finishes.append(1 if grout else 0)
for region in regions:
 is_grout=not tiles.covers(region.representative_point())
 for t in shapely.get_parts(shapely.constrained_delaunay_triangles(region)):
  a,b,c=list(orient(t,sign=1).exterior.coords)[:3]
  face([(x,0,z)for x,z in (a,c,b)],is_grout)
# Keep only the outside boundary and underside. Former buried tile walls and
# the backing's recessed top are internal to this solid and must not collide.
for part in shapely.get_parts(footprint):
 part=orient(part,sign=1)
 for t in shapely.get_parts(shapely.constrained_delaunay_triangles(part)):
  face([(x,-.2,z)for x,z in list(orient(t,sign=1).exterior.coords)[:3]])
 for ring in [part.exterior,*part.interiors]:
  points=list(ring.coords)
  for a,b in zip(points,points[1:]):
   aa=(a[0],0,a[1]);bb=(b[0],0,b[1]);ac=(a[0],-.2,a[1]);bc=(b[0],-.2,b[1])
   face([aa,bb,ac]);face([bb,bc,ac])
emitted=unary_union([Polygon([(vertices[i]['x'],vertices[i]['z'])for i in indices[k:k+3]])for k in range(0,len(indices),3)if all(vertices[i]['y']==0 for i in indices[k:k+3])])
missing=footprint.difference(emitted).area;overlap=sum(p.area for p in regions)-footprint.area
assert missing<1e-4 and abs(overlap)<1e-6,(missing,overlap)
report=dict(sourceLayoutSha256=m['layoutSha256'],surface=floor['id'],backingAreaM2=backing.area,tileAreaM2=tiles.area,groutAreaM2=grout.area,missingAreaM2=missing,tileOverlapAreaM2=overlap,topY=0,bottomY=-.2,vertices=vertices,triangles=indices,finishes=finishes)
(out/'grout.json').write_text(json.dumps(report,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in report.items()if k not in ['vertices','triangles','finishes']}))
