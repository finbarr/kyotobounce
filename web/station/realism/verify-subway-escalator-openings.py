"""Check the composed floor holes, clipped joints and narrowed staircase widths."""
import json, sys, hashlib
from pathlib import Path
from shapely.geometry import Polygon, shape
from shapely.ops import unary_union

manifest, component, output = map(Path,sys.argv[1:])
m=json.loads(manifest.read_text()); raw=Path(m['layout']).read_bytes()
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
layout=json.loads(raw); spec=json.loads((component/'spec.json').read_text())
panels={p['id']:p for p in layout['panels']}; prefix='subway-escalators-'
def top(p):
    y=max(v['y'] for v in p['vertices']); ts=[]
    for i in range(0,len(p['triangles']),3):
        vs=[p['vertices'][j] for j in p['triangles'][i:i+3]]
        if all(abs(v['y']-y)<1e-5 for v in vs):
            q=Polygon([(v['x'],v['z']) for v in vs])
            if q.area>1e-12: ts.append(q)
    return unary_union(ts)
slabs=[]
for row in spec['slabs']:
    actual=top(panels[prefix+row['id']]); expected=shape(row['shape'])
    error=actual.symmetric_difference(expected).area
    assert error<.001, (row['id'],error)
    slabs.append(dict(id=row['id'],areaError=error))
holes=unary_union([shape(b['lowerPit']).buffer(-.00003) for b in spec['banks']])
for p in layout['panels']:
    if p['role']=='floor-joint' and p['id'].startswith(('subway-platforms-','subway-north-',prefix)):
        assert top(p).intersection(holes).area<1e-8, p['id']
for bank in spec['banks']:
    steps=[p for p in layout['panels'] if p['id'].startswith(prefix+bank['prefix']+'step-')]
    assert len(steps)==30
    for p in steps:
        assert abs(min(v['x'] for v in p['vertices'])-176)<1e-5
        assert abs(max(v['x'] for v in p['vertices'])-180)<1e-5
    lane=next(e for e in layout['escalators'] if e['id']==prefix+bank['name'])
    assert lane['speed']>0 and lane['lowerCenter']['y']==-11.2 and lane['height']==5
assert not set(spec['retiredIds']).intersection(panels)
report=dict(pass_=True,layoutSha256=m['layoutSha256'],slabs=slabs,lanes=4,stairs=4,stairWidthM=4,clippedJointPanels=len(spec['joints']))
report['pass']=report.pop('pass_');output.write_text(json.dumps(report,indent=2)+'\n');print(report)
