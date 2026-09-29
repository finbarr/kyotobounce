"""Check that replacing the shared deck changes only the Central 2 opening."""
import json,sys
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union

parent_path,next_path,out=map(Path,sys.argv[1:])
parent=json.loads(parent_path.read_text());next_manifest=json.loads(next_path.read_text())
old=json.loads(Path(parent['layout']).read_text());new=json.loads(Path(next_manifest['layout']).read_text())

def top(layout,id):
    p=next(p for p in layout['panels'] if p['id']==id)
    y=max(v['y'] for v in p['vertices']);faces=[]
    for i in range(0,len(p['triangles']),3):
        vs=[p['vertices'][k] for k in p['triangles'][i:i+3]]
        if all(abs(v['y']-y)<1e-6 for v in vs):
            faces.append(Polygon([(v['x'],v['z']) for v in vs]))
    return unary_union(faces)

checks=[]
for name in ('paid-deck','platform-ceiling'):
    a=top(old,'subway-platforms-'+name);b=top(new,'subway-central-two-'+name)
    shaft=box(174,-70,180,-58.15)
    error=a.difference(shaft).symmetric_difference(b).area
    # Layout vertices are float32; the decimal endpoint rounds by less than 2 μm.
    assert error<2e-5,(name,error)
    assert abs(a.area-b.area-71.1)<2e-5,(name,a.area,b.area)
    checks.append({'surface':name,'changedAreaM2':a.area-b.area,'differenceErrorM2':error})
report={'pass':True,'layoutSha256':next_manifest['layoutSha256'],'unchangedFloorOutsideNewShaft':True,'checks':checks}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
