"""Check the new decoration against its source triangles and unchanged physics."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,MultiPoint
from shapely.ops import unary_union
sp,parent,candidate,out=map(Path,sys.argv[1:]);s=json.loads(sp.read_text());old=json.loads((parent/'native-panels.json').read_text());new=json.loads((candidate/'native-panels.json').read_text());byId={p['id']:p for p in new['panels']}
assert all(byId[p['id']]==p for p in old['panels']);assert old['escalators']==new['escalators'] and old['combSupports']==new['combSupports']
assert [p for p in old['panels']if p['collision']]==[p for p in new['panels']if p['collision']]
added=[p for p in new['panels']if p['id']not in {q['id']for q in old['panels']}];assert len(added)==36 and all(not p['collision']for p in added)
source=json.loads(Path(s['parent']['path']).read_text());mesh={p['id']:p for p in source['meshes']};rows=[]
for bank in s['banks']:
 m=mesh[bank['sourceBody']];vs=np.array(m['vertices']);fs=np.array(m['indices']).reshape(-1,3);O=np.array(bank['origin']);U=np.array(bank['across']);V=np.array(bank['along']);regions=[];offsets=[]
 for p in [p for p in s['parts']if p['bank']==bank['bank']]:
  native=byId[p['id']];assert native['vertices']==[dict(x=p['vertices'][i][0],y=p['vertices'][i][1],z=-p['vertices'][i][2])for i in p['indices']]
  tri=vs[fs[p['sourceFace']]];n=np.cross(tri[1]-tri[0],tri[2]-tri[0]);n/=np.linalg.norm(n);points=np.array(p['vertices']);distance=(points-tri[0])@n;offsets.extend(distance.tolist());assert min(distance)>.00099999 and max(distance)<.00300001
  projected=points-n*distance[:,None];xy=np.column_stack(((projected-O)@U,(projected-O)@V));foot=MultiPoint(xy).convex_hull;src=Polygon(np.column_stack(((tri-O)@U,(tri-O)@V)));assert foot.difference(src).area<1e-8;regions.append(foot)
 overlap=sum(p.area for p in regions)-unary_union(regions).area;assert abs(overlap)<1e-8
 rows.append(dict(bank=bank['bank'],sourceTriangles=bank['sourceFaces'],panels=len(regions),areaM2=unary_union(regions).area,overlapM2=overlap,minimumOffsetM=min(offsets),maximumOffsetM=max(offsets)))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report=dict(unchangedParentPanels=len(old['panels']),unchangedCollisionPanels=sum(p['collision']for p in old['panels']),unchangedMechanisms=len(old['escalators']),addedDecorativePanels=len(added),banks=rows,parentNativeSha256=sha(parent/'native-panels.json'),candidateNativeSha256=sha(candidate/'native-panels.json'),candidateGlbSha256=sha(candidate/'assembly.glb'),specSha256=sha(sp),verification='All existing native records and four mechanisms exact; new records have collision=false, respected by StationWorld.cs:162.',limits=['This proves decorative attachment and unchanged physical inputs; no new full-game/native runtime run is implied.'])
report['pass']=True;out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
