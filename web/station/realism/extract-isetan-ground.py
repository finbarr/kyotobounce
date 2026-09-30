"""Identify the blocked ground entrance and extend the existing food-hall core."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();l=json.loads(raw)
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
boxes=['add-isetan1f-rear','add-isetan1f-inner-doors','add-isetan1f-door-handle--1.4','add-isetan1f-door-handle-1.4']
panels=['isetan-basement-b1-ceiling','isetan-basement-stair-lower-opening-guard']
# The diagrams establish topology; these room and stair coordinates are fitted
# to the existing station and food-hall core, not survey measurements.
well=[[-84.2,-77.8],[8.2,14.2]]
cuts={}
for p in l['panels']:
 if not p['id'].startswith(('west-north-','west-south-')):continue
 if any(tag in p['id']for tag in ('floor','roof')):continue
 bounds=[[min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices'])]for k in ('x','y','z')]
 volume=[[-123.2,-72.8],[-.01,4.8],[-28.2,16.2]]
 if all(a<hi and b>lo for (a,b),(lo,hi) in zip(bounds,volume)):cuts[p['id']]=volume
for p in l['panels']:
 if p['id'] in cuts and all(all(lo<=v[k]<=hi for k,(lo,hi) in zip(('x','y','z'),cuts[p['id']]))for v in p['vertices']):
  panels.append(p['id']);del cuts[p['id']]
panels=[p['id']for p in l['panels']if p['id']in panels]
cuts['concourse']=[well[0],[-.61,.03],well[1]]
assert len(cuts)>1
flights=[]
for f in l['flights']:
 vs=[p for row in f['contours']for p in row['points']]
 if f.get('foundationDepth',0)>0 and min(p['x']for p in vs)<-73.12 and max(p['x']for p in vs)>-123 and min(p['y']for p in vs)<16 and max(p['y']for p in vs)>-28:flights.append(f['id'])
foundations=[id+' foundation'for id in flights]
ids=boxes+panels+foundations
assert {p['id']for p in l['boxes']if p['id']in ids}==set(boxes)
assert {p['id']for p in l['panels']if p['id']in ids}==set(panels)
bpy.ops.wm.open_mainfile(filepath=str(Path(m['sourceScene']).resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
rows=[]
for o in bpy.context.scene.objects:
 id=o.get('kyoto_surface',o.name)
 if o.type!='MESH' or id not in ids:continue
 vs=[o.matrix_world@v.co for v in o.data.vertices]
 rows.append(dict(name=id,dynamic=bool(o.get('kyoto_dynamic')),vertices=[[v.x,v.z,-v.y]for v in vs],materials=[m.name for m in o.data.materials],faces=[dict(vertices=list(p.vertices),material=p.material_index)for p in o.data.polygons]))
assert {r['name']for r in rows}==set(ids)
spec=dict(componentPrefix='isetan-ground-',retiredUnrenderedIds=[r['name']for r in rows if r['dynamic']],parentLayoutSha256=m['layoutSha256'],retiredIds=ids,retiredBoxIds=boxes,retiredSourceOnlyIds=foundations,modifiedFlightIds=flights,retiredLights=[],retiredRouteIds=[],retiredLabelIds=[],cuts=cuts,shaftBounds=dict(minX=well[0][0],maxX=well[0][1],minZ=well[1][0],maxZ=well[1][1]),well=well,ground=.006,b1=max(v['y']for p in l['panels']if p['id']=='isetan-basement-b1-floor'for v in p['vertices']))
out.mkdir(parents=True,exist_ok=True)
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(out/'retired-source.json').write_text(json.dumps(rows)+'\n')
(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print('ISETAN_GROUND_SCOPE',len(ids),'retired objects;',len(cuts),'bounded opening candidates',flush=True)
