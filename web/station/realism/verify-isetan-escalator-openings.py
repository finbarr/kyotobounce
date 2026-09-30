"""Check retained slab footprints, the two wells and every passenger headroom box."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,shape
from shapely.ops import unary_union
manifest,component,output=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes()
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
layout=json.loads(raw);spec=json.loads((component/'spec.json').read_text());panels={p['id']:p for p in layout['panels']};prefix=spec.get('componentPrefix','isetan-escalators-')
def top(p):
    y=max(v['y']for v in p['vertices']);ts=[]
    for i in range(0,len(p['triangles']),3):
        vs=[p['vertices'][j]for j in p['triangles'][i:i+3]]
        if all(abs(v['y']-y)<1e-5 for v in vs):
            q=Polygon([(v['x'],v['z'])for v in vs])
            if q.area>1e-12:ts.append(q)
    return unary_union(ts)
slabs=[]
for row in spec['slabs']:
    p=panels[prefix+row['id']];actual=top(p);original=shape(row['original']);cut=shape(row['cut']);expected=original.difference(cut)
    error=actual.symmetric_difference(expected).area;assert error<.001,(row['id'],error)
    assert actual.intersection(cut.buffer(-.00003)).area<1e-8
    assert max(abs(min(v['y']for v in p['vertices'])-row['bottom']),abs(max(v['y']for v in p['vertices'])-row['top']))<1e-5
    slabs.append(dict(id=row['id'],areaError=error,openingArea=cut.area,retainedOutsideOpening=True))
assert not set(spec['retiredIds']).intersection(panels)
# Clip actual triangles into each passenger headroom prism. AABB overlap alone
# would wrongly reject sloping machinery and distant faces of broad panels.
def clipped_area(vs,bounds):
    poly=[[v[k]for k in ('x','y','z')]for v in vs]
    for axis,(lo,hi)in enumerate(bounds):
        for bound,sign in [(lo,1),(hi,-1)]:
            kept=[]
            for i,a in enumerate(poly):
                b=poly[(i+1)%len(poly)];da=sign*(a[axis]-bound);db=sign*(b[axis]-bound)
                if da>=0:kept.append(a)
                if (da>=0)!=(db>=0):
                    t=da/(da-db);kept.append([x+(y-x)*t for x,y in zip(a,b)])
            poly=kept
    area=0
    for i in range(1,len(poly)-1):
        a=[poly[i][k]-poly[0][k]for k in range(3)];b=[poly[i+1][k]-poly[0][k]for k in range(3)]
        cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];area+=sum(v*v for v in cross)**.5/2
    return area
lanes=[e for e in layout['escalators']if e['id'].startswith(prefix)];assert len(lanes)==2
retained=[e for e in layout['escalators']if e['id']in spec.get('retainedEscalatorIds',[])];assert len(retained)==len(spec.get('retainedEscalatorIds',[]))
all_lanes=lanes+retained
region=[(min(e['lowerCenter']['x']-e['flatLength']-.3 for e in all_lanes),max(e['lowerCenter']['x']+e['run']+e['flatLength']+.3 for e in all_lanes)),(min(e['lowerCenter']['y']+.3 for e in all_lanes),max(e['lowerCenter']['y']+e['height']+2.1 for e in all_lanes)),(min(e['lowerCenter']['z']-.3 for e in all_lanes),max(e['lowerCenter']['z']+.3 for e in all_lanes))]
near=[]
for p in layout['panels']:
    b=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')]
    if all(a<hi and z>lo for (a,z),(lo,hi)in zip(b,region)):near.append((p,b))
checks=0
for e,bank in zip(lanes,spec['banks']):
    assert e['lowerCenter']==bank['lowerCenter'] and abs(e['height']-bank['height'])<1e-6
for e in all_lanes:
    for q in e['path'][:e['publicPointCount']][::3]:
        x=e['lowerCenter']['x']+q['z'];z=e['lowerCenter']['z'];y=e['lowerCenter']['y']+q['y']
        bounds=[(x-.24,x+.24),(y+.3,y+2.1),(z-.24,z+.24)]
        for p,b in near:
            if not all(a<hi and z>lo for (a,z),(lo,hi)in zip(b,bounds)):continue
            for i in range(0,len(p['triangles']),3):
                vs=[p['vertices'][j]for j in p['triangles'][i:i+3]]
                assert clipped_area(vs,bounds)<1e-8,(e['id'],q,p['id'])
        checks+=1
assert sorted(e['speed']for e in lanes)==[-.5,.5]
report=dict(layoutSha256=m['layoutSha256'],slabs=slabs,lanes=len(lanes),retainedLanes=len(retained),headroomM=2.1,headroomVolumes=checks);report['pass']=True
output.write_text(json.dumps(report,indent=2)+'\n');print(report)
