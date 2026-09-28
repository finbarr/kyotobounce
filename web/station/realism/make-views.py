"""Create initial inspection poses; these are not solved photo registrations."""
import json
from pathlib import Path
output=Path('web/station/realism/views.json')
if output.exists():raise SystemExit('Camera register exists; edit it in place instead of replacing registrations.')
layout=json.loads(Path('runtime/station-layout.json').read_text())
sources={s['id']:s for s in json.loads(Path('research/kyoto-station/sources.json').read_text())}
existing={v['id']:v for v in layout['cameras']+layout['stationAdditions']['views']}
def camera(key):
 v=existing[key]; vec=lambda d:[d['x'],d['y'],-d['z']]
 return {'position':vec(v['position']),'target':vec(v.get('target',v.get('lookAt'))),'fov':v['fov'],'rollDegrees':v.get('roll',0)}
def pose(p,t,f=65):return {'position':p,'target':t,'fov':f,'rollDegrees':0}
rows=[
 ('central-hall','structure-590',camera('03-along-atrium'),['west pier inner edge','east pier inner edge','Skyway underside','north lattice base','south gallery slab','concourse opening']),
 ('grand-staircase','square-img_grandstaircase_01',camera('02-great-stair'),['first riser west corner','first riser east corner','north escalator lower newel','north escalator upper landing','south facade band intersection','top stair portal']),
 ('canopy-junction','structure-596',pose([90,36,0],[65,49,-4]),['canopy crown','canopy north springing','canopy south springing','upper truss node','Skyway portal corner','end vertical mullion']),
 ('skyway-outward','square-img_skyway_02',camera('add-skyway-outward'),['left mullion','right mullion','upper rail intersection','lower rail intersection','Tower shaft center','Tower base roofline']),
 ('east-square','square-img_eastsquare_01',pose([112,36,6],[58,44,3]),['yellow volume corner','western canopy end','south facade window corner','north parapet step','central tree bed corner','Skyway portal']),
 ('roof-garden','square-img_oozorahiroba_01',camera('add-garden-arrival'),['near planter inside corner','far planter inside corner','yellow lamp post base','yellow lamp disc center','far terrace guard corner','central path junction']),
 ('west-square','square-img_westsquare_01',camera('add-westsquare-approach'),['left polished column foot','center polished column foot','right polished column foot','curved balcony return','side stair foot','upper glazing corner']),
 ('north-south-passage','square-img_pedestrianwalkway_01',camera('add-passage2f-north-arrival'),['near column foot','second column foot','third column foot','first ceiling lamp center','far passage opening corner','West Gate branch corner']),
 ('north-facade','structure-594',pose([10,22,-120],[-10,25,0],57),['west wing roof corner','east wing roof corner','central curtain wall top left','central curtain wall top right','entrance soffit west corner','entrance soffit east corner']),
 ('north-street-tower','square-img_ekimaesquare_01',pose([0,1.7,-35],[0,20,-160],70),['Tower shaft center','Tower hotel roof west corner','Tower hotel roof east corner','central bus canopy end','station return corner','Porta entrance corner']),
 ('hachijo-terrace','hachijo-municipal-brochure',pose([-60,3,125],[10,4,125],65),['terrace west end','terrace east end','taxi stand canopy','bus lane curb','sunken garden edge','south entrance axis']),
 ('south-facade-plaza','hachijo-completion',pose([0,12,210],[-15,24,60],60),['west facade end','east facade end','central entrance axis','terrace canopy west end','terrace canopy east end','taxi island corner']),
 ('grand-staircase-evening','square-img_grandstaircase_03',camera('02-great-stair'),['first riser west corner','first riser east corner','north escalator lower newel','north escalator upper landing','south facade band intersection','top stair portal']),
 ('east-square-evening','square-img_eastsquare_04',pose([112,36,6],[58,40,3]),['yellow volume corner','globe shelter base','south facade corner','north parapet step','central tree bed corner','Skyway portal']),
 ('skyway-evening','square-img_skyway_03',camera('06-skyway'),['left mullion foot','right mullion foot','left upper truss node','right upper truss node','far corridor portal','continuous handrail endpoint'])]
views=[]
for name,sid,cam,anchors in rows:
 s=sources[sid]
 views.append({'id':name,'lighting':'evening' if name.endswith('evening') else 'day','camera':cam,'source':{'id':sid,'url':s['url'],'localFile':s.get('local_file'),'date':s.get('source_date'),'retrievedAt':s.get('retrieved_at'),'page':2 if name=='hachijo-terrace' else 6 if name=='south-facade-plaza' else None},'registration':{'status':'initial inspection pose; photo registration pending','maxResidualPixels':None,'tolerancePixels':25.6,'anchors':[{'name':a,'imagePixel':None,'worldPoint':None,'confidence':'unassessed'} for a in anchors]},'notes': 'Municipal plan establishes topology only; select a pedestrian photo before fitting.' if name=='hachijo-terrace' else 'Reference date unknown unless explicitly recorded; image colors are not calibrated albedo.'})
output.write_text(json.dumps({'schema':1,'viewport':{'width':1280,'height':720},'coordinates':'Three.js: X east, Y up, Z south; metres; vertical FOV; roll in degrees','referencePeriod':'September 2026 public-space configuration; historical references used for permanent structure only','season':'leaf-on late summer; no autumn coloration or snow','registrationStatus':'All 15 are candidates, none accepted as matched. Null landmarks must be measured, never scored as zero error.','views':views},indent=2)+'\n')
print('Created',len(views),'candidate views')
