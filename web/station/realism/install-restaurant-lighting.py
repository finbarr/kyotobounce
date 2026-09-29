"""Attach warm practical lights to the existing restaurant ceiling fixtures."""
import bpy,json,hashlib,sys,math
from pathlib import Path
base_path,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents and not out.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
base=json.loads(base_path.read_text());raw=Path(base['layout']).read_bytes();layout=json.loads(raw)
assert sha(raw)==base['layoutSha256'];assert not any(l['id'].startswith('restaurant-practical-')for l in layout['authoredLights'])
fixtures=[p for p in layout['panels'] if p['id'].startswith('west-restaurant-ceiling-light-')];assert len(fixtures)==7
lights=[]
for p in fixtures:
 center={k:sum(v[k] for v in p['vertices'])/len(p['vertices']) for k in ('x','y','z')}
 lights.append({'id':'restaurant-practical-'+p['id'].rsplit('-',1)[1],'position':center,'direction':{'x':0,'y':-1,'z':0},'linearColor':{'r':1,'g':.83,'b':.62,'a':1},'intensity':22,'range':7,'spotAngle':85,'innerSpotAngle':45,'source':'https://soulkyoto.blog.fc2.com/blog-entry-395.html','note':'Warm aisle downlighting inferred from the 9 February 2014 corridor photograph. Positions follow the existing registered ceiling fixtures; output, color and cone angles are authored estimates.'})
layout['authoredLights'].extend(lights);text=json.dumps(layout,separators=(',',':'))+'\n';layout_sha=sha(text.encode())
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
collection=bpy.data.collections.new('Restaurant practical lighting');bpy.context.scene.collection.children.link(collection)
for row in lights:
 assert not bpy.data.objects.get(row['id'])
 lamp=bpy.data.lights.new(row['id'],'SPOT');lamp.color=tuple(row['linearColor'][k]for k in ('r','g','b'));lamp.energy=row['intensity'];lamp.spot_size=math.radians(row['spotAngle']);lamp.spot_blend=1-row['innerSpotAngle']/row['spotAngle']
 obj=bpy.data.objects.new(row['id'],lamp);collection.objects.link(obj);p=row['position'];obj.location=(p['x'],p['z'],p['y']);obj['kyoto_fixture']=True;obj['kyoto_unity_intensity']=row['intensity'];obj['kyoto_range_m']=row['range'];obj['reference']=row['source'];obj['inference']=row['note']
out.mkdir();(out/'station-layout.json').write_text(text);(out/'textures').symlink_to((Path(base['sourceScene']).parent/'textures').resolve(),target_is_directory=True)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
# Verify persisted source light transforms and metadata, not merely an in-memory scene.
bpy.ops.wm.open_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()));assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==layout_sha
for row in lights:
 o=bpy.data.objects[row['id']];p=row['position'];assert max(abs(a-b)for a,b in zip(o.location,(p['x'],p['z'],p['y'])))<.00001
 assert o['kyoto_fixture'] and o['kyoto_range_m']==row['range'] and o['kyoto_unity_intensity']==row['intensity'];assert abs(math.degrees(o.data.spot_size)-row['spotAngle'])<.0001
 assert abs((1-o.data.spot_blend)*math.degrees(o.data.spot_size)-row['innerSpotAngle'])<.0001
 assert max(abs(o.data.color[i]-row['linearColor'][k])for i,k in enumerate(('r','g','b')))<.000001
station=json.loads(Path(base['station']).read_text());station.update(authoredLights=layout['authoredLights'],layoutSha256=layout_sha);(out/'station.json').write_text(json.dumps(station)+'\n')
detail=json.loads(Path(base['detail']).read_text());detail['sourceLayoutSha256']=layout_sha;detail['candidateMotionIntegration'].update(layoutSha256=layout_sha,parentLayoutSha256=base['layoutSha256'],scope='Hardware and all physical geometry unchanged; only restaurant lighting metadata added.');(out/'atrium-detail.json').write_text(json.dumps(detail)+'\n')
manifest=dict(base,layout=str(out/'station-layout.json'),layoutSha256=layout_sha,station=str(out/'station.json'),detail=str(out/'atrium-detail.json'),motionLayout=str(out/'station-layout.json'),sourceScene=str(out/'KyotoAtrium.blend'));(out/'assets.json').write_text(json.dumps(manifest,indent=2)+'\n')
proof={'pass':True,'parentLayoutSha256':base['layoutSha256'],'layoutSha256':layout_sha,'parentSourceSha256':sha(Path(base['sourceScene']).read_bytes()),'sourceSha256':sha((out/'KyotoAtrium.blend').read_bytes()),'geometrySha256':base['geometrySha256'],'unchangedGeometry':True,'fixtures':lights,'savedSourceVerified':True}
original=json.loads(raw);assert layout['authoredLights'][:-7]==original['authoredLights'];assert all(layout[k]==v for k,v in original.items()if k!='authoredLights')
(out/'report.json').write_text(json.dumps(proof,indent=2)+'\n');print('RESTAURANT_LIGHTING_READY',json.dumps({k:v for k,v in proof.items()if k!='fixtures'}),flush=True)
