"""Fit the documented central store connection between the constructed 3F and 4F."""
import hashlib,json,math,sys
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union

manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
G=max(v['y']for v in panels['west-south-floor-01']['vertices']);F=max(v['y']for v in panels['west-south-floor-02']['vertices'])
template=next(e for e in layout['escalators']if e['id']=='hall-basement-west-escalator-1')
chassis=[p for p in layout['panels']if p['id'].startswith(template['id']+'-')]
flat=template['flatLength'];run=(F-G)/math.tan(math.pi/6);u=template['uphill'];o=template['lowerCenter']
cover=panels[template['id']+'-lower-pit-cover']
along=[(v['x']-o['x'])*u['x']+(v['z']-o['z'])*u['z']for v in cover['vertices']]
across=[-(v['x']-o['x'])*u['z']+(v['z']-o['z'])*u['x']for v in cover['vertices']]
# The slab overlaps the pit cover by 0.01 mm, avoiding an exposed seam.
half=min(abs(min(across)),abs(max(across)))-.00001;back=min(along)+.00001
banks=[];lower=[];upper=[];ceiling=[]
for name,z,speed in [('up',-20,.5),('down',-17,-.5)]:
    lower.append(box(-104+back,z-half,-103.1,z+half))
    upper.append(box(-104+back,z-half,-104+run-back,z+half))
    ceiling.append(box(-104+back-.1,z-.72,-104+run-back+.1,z+.72))
    banks.append(dict(name=name,lowerCenter=dict(x=-104,y=G,z=z),uphill=dict(x=1,y=0,z=0),run=run,height=F-G,flatLength=flat,speed=speed))

def top_shape(p):
    y=max(v['y']for v in p['vertices']);triangles=[]
    for i in range(0,len(p['triangles']),3):
        vs=[p['vertices'][j]for j in p['triangles'][i:i+3]]
        if all(abs(v['y']-y)<1e-6 for v in vs):
            q=Polygon([(v['x'],v['z'])for v in vs])
            if q.area>1e-12:triangles.append(q)
    q=unary_union(triangles);assert q.is_valid and q.geom_type=='Polygon',p['id'];return q

slabs=[];retired=['isetan-fourth-display-south','isetan-fourth-display-top-south']
for id,holes in [('west-south-floor-01',lower),('isetan-third-second-ceiling',lower),('west-south-floor-02',upper),('isetan-third-ceiling',ceiling)]:
    p=panels[id];assert not p.get('uv');shape=top_shape(p);cut=unary_union(holes);kept=shape.difference(cut)
    assert kept.is_valid and kept.geom_type=='Polygon' and kept.area<shape.area
    assert cut.difference(shape).area<1e-8,id+' opening lies outside its slab'
    slabs.append(dict(id=id,shape=mapping(kept),original=mapping(shape),cut=mapping(cut),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']))
    retired.append(id)
used={p['appearance']for p in chassis+slabs}
spec=dict(parentLayoutSha256=m['layoutSha256'],banks=banks,template=template,chassis=chassis,slabs=slabs,retiredIds=retired,retiredLights=[],materials=[r for r in layout['authoredMaterials']if r['id']in used],floor3=G,floor4=F,pitHalfWidth=half,pitBack=back,
          assumptions=['The operator plans show central store escalator banks on 3F and 4F. This pair establishes that connection within the constructed rooms.',
                       'Position, two lanes, assigned up/down directions, 30-degree incline and machinery dimensions are fitted approximations, not surveyed measurements.',
                       'Further escalator banks and higher-floor lift service remain unfinished.'])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print(dict(retired=len(retired),slabs=len(slabs),rise=F-G,run=run))
