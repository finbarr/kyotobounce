"""Verify the new North stair opening and the bounded island/ceiling extension."""
import json,sys
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
parent_path,next_path,out=map(Path,sys.argv[1:])
parent=json.loads(parent_path.read_text());candidate=json.loads(next_path.read_text())
old=json.loads(Path(parent['layout']).read_text());new=json.loads(Path(candidate['layout']).read_text())
def top(layout,id):
    p=next(p for p in layout['panels'] if p['id']==id)
    y=max(v['y'] for v in p['vertices']);faces=[]
    for i in range(0,len(p['triangles']),3):
        vs=[p['vertices'][k] for k in p['triangles'][i:i+3]]
        if all(abs(v['y']-y)<1e-6 for v in vs):faces.append(Polygon([(v['x'],v['z']) for v in vs]))
    return unary_union(faces)
shaft=box(174,16.15,180,28);checks=[]
for before,after,extension,cut,area in (
    ('subway-central-two-paid-deck','paid-deck',None,shaft,-71.1),
    ('subway-central-two-platform-ceiling','platform-ceiling',box(162,16,192,32.5),shaft,423.9),
    ('subway-platforms-platform','platform',box(171,16,183,32.5),None,198),
):
    a=top(old,before);b=top(new,'subway-north-'+after);expected=a
    if extension is not None:expected=expected.union(extension)
    if cut is not None:expected=expected.difference(cut)
    error=expected.symmetric_difference(b).area
    assert error<2e-5,(after,error)
    assert abs((b.area-a.area)-area)<2e-5,(after,b.area-a.area,area)
    checks.append({'surface':after,'areaChangeM2':b.area-a.area,'differenceErrorM2':error})
report={'pass':True,'layoutSha256':candidate['layoutSha256'],'existingOpeningsPreserved':True,'checks':checks}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
