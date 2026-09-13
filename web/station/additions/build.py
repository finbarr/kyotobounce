"""Build all accepted September station additions from the pinned source.

blender -b --python-exit-code 1 --python web/station/additions/build.py -- \
  --baseline .local/base --output .local/station-candidate
The baseline is read-only. Candidate .blend and collision JSON share one seed.
"""
import argparse, hashlib, json, math, shutil, sys
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parents[3]
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).parent))
from geometry import Builder,palette
import ground,circulation,terraces

p=argparse.ArgumentParser();p.add_argument('--baseline',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);base=args.baseline.resolve();out=args.output.resolve();out.mkdir(parents=True,exist_ok=False)
raw=(base/'station-layout.json').read_text();layout=json.loads(raw)
assert not layout.get('stationAdditions'),'Build from the pinned pre-additions baseline, not an accumulated candidate'
concourse_physical=next(r['material']for r in layout['panels']if r['id']=='concourse')
bpy.ops.wm.open_mainfile(filepath=str(base/'KyotoAtrium.blend'))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw,'Baseline source and collision mismatch'
b=Builder(layout);palette(b)
for module in [ground,circulation,terraces]:
    module.build(b);print('ADDED',module.__name__,len(b.objects),'objects',len(b.solids),'solids',flush=True)
assert next(r['material']for r in layout['panels']if r['id']=='concourse')==concourse_physical,'A floor opening must preserve the existing ball response'
layout['concourseDetails']['labels'].extend(b.labels)
layout['routes'].extend(b.routes)
layout['inspectionCameras'].extend(b.views)

# The LED strips use the actual individual Grand Staircase riser contours.
# They are purely flush artwork; native collision remains the original riser.
risers=[]
for flight in layout['flights']:
    if not flight['id'].startswith('daikaidan-flight-'):continue
    for i,contour in enumerate(flight['contours'][:-1]):
        risers.append(dict(points=contour['points'],bottom=flight['baseElevation']+i*flight['rise']+.012,top=flight['baseElevation']+(i+1)*flight['rise']-.018))
layout['stationInstallations']=dict(risers=risers,skyway=dict(start=-76,end=65,y=47.67,z=[1.11,3.54]),eastWall=dict(center=[112.46,43.5,-5.4],width=14,height=8.2),source='https://www.kyoto-station-building.co.jp/service/square/')
layout['stationAdditions']=dict(checked='2026-09-13',source='web/station/additions/README.md',packages=['K056','K038','K039','K040','K041','K042','K035','K043','K044','K033','K045','K046','K047','K048','K049','K036','K051','K053','K055','K050','K052','K054'],registration='Floor/wing and route topology from operator maps; dimensions and interiors are original photographic interpretations, not a metric survey',views=b.views,routes=b.routes)

# Verify every generated solid against its Blender mesh, including yawed boxes.
bpy.context.view_layer.update()
for r in b.solids:
    o=bpy.data.objects[r['id']];points=[o.matrix_world@v.co for v in o.data.vertices]
    assert r['material']==o['kyoto_physical'],r['id']
    actual=[[min(v[k]for v in points),max(v[k]for v in points)]for k in [0,2,1]]
    if 'center' in r:
        a=math.radians(r.get('yaw',0));c,s=abs(math.cos(a)),abs(math.sin(a));d=r['size'];sizes=[c*d['x']+s*d['z'],d['y'],s*d['x']+c*d['z']]
        expected=[[r['center'][k]-sizes[i]/2,r['center'][k]+sizes[i]/2]for i,k in enumerate('xyz')]
    else:expected=[[min(v[k]for v in r['vertices']),max(v[k]for v in r['vertices'])]for k in 'xyz']
    assert max(abs(x-y)for aa,ee in zip(actual,expected)for x,y in zip(aa,ee))<.0001,(r['id'],actual,expected)
ids=[r['id']for key in ['boxes','panels']for r in layout[key]]
assert len(ids)==len(set(ids)),'Duplicate collision surface IDs'
assert len(b.views)>=24 and len(b.routes)>=14
raw=json.dumps(layout,separators=(',',':'))+'\n';(out/'station-layout.json').write_text(raw)
seed=bpy.data.texts.get('Kyoto runtime seed.json');bpy.data.texts.remove(seed)
seed=bpy.data.texts.load(str(out/'station-layout.json'),internal=True);seed.name='Kyoto runtime seed.json';assert seed.as_string()==raw
shutil.copytree(base/'textures',out/'textures')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'KyotoAtrium.blend'))
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in b.collection.objects if o.type=='MESH')
receipt=dict(layoutSha256=hashlib.sha256(raw.encode()).hexdigest(),baseLayoutSha256=hashlib.sha256((base/'station-layout.json').read_bytes()).hexdigest(),objects=len(b.collection.objects),triangles=triangles,solidCount=len(b.solids),labels=len(b.labels),removed=b.removed,views=b.views,routes=b.routes,solids=b.solids)
(out/'additions.json').write_text(json.dumps(receipt,separators=(',',':'))+'\n')
print('STATION_ADDITIONS_READY',receipt['layoutSha256'],len(b.collection.objects),'objects',triangles,'triangles',len(b.solids),'matched solids',len(b.labels),'sign faces',flush=True)
