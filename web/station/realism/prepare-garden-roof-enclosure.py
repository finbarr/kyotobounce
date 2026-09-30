"""Replace the temporary rails at the garden's northern roof enclosure."""
import hashlib,json,sys
from pathlib import Path
manifest,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes()
assert Path('.local').resolve() in out.resolve().parents
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw)
panels={p['id']:p for p in layout['panels']}
G=max(v['y']for v in panels['garden-promenade-public-floor']['vertices'])
prefixes=['garden-promenade-edge-'+str(i)+'-'for i in (12,13,14)]+['garden-promenade-north-window-']
retired=[id for id in panels if id.startswith(tuple(prefixes))];assert len(retired)==33
# Clear the old, shallow viewing screen through its full thickness. The new
# sill, glazing and jambs enclose this same bay, with a supported floor collar.
cuts={'municipal-station-wing-west-Untitled.203':[[[-201.9,-189.75],[G-.34,G+3.2],[7.9,9.7]],[[-190.35,-189.75],[G-.3,G+4.66],[5.3,7.9]]]}
spec=dict(componentPrefix='garden-roof-enclosure-',parentLayoutSha256=m['layoutSha256'],floor=G,retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],retiredRouteIds=[],retiredLabelIds=[],retiredLights=[],modifiedFlightIds=[],cuts=cuts,preservedOverlapArea={id:0 for id in retired},window=dict(minX=-197.5,maxX=-193.9,sill=.45,head=2.6,planeZ=9.05),collar=[-201.9,-190,8.4,9.04],mainFace=[-190,-168,5.32,5.65],mainHeight=4.58)
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print(dict(retired=len(retired),floor=G,modified=list(cuts)))
