"""Photo-informed terrace outlines and a dated courtyard furnishing hypothesis."""
import json,hashlib,sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
out=Path(sys.argv[1]);assert not out.exists() and Path('.local').resolve() in out.resolve().parents;out.mkdir(parents=True)
L=Path('.local/station-realism');read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();g=read(L/'east-court-04/report.json')['geometry'];O=np.array(g['originRenderer']);D=np.array(g['forwardRenderer']);A=np.array(g['southRenderer']);Y=g['gardenY']
refs={}
for v,name in [('jr','niwa-jr-02a.jpg'),('rurubu','niwa-rurubu-frontage.jpg')]:
 d=L/'niwa-frontage-joint-01'/v;camera=read(d/'camera.json');proj=read(d/'render/projection.json');size=[816,544] if v=='jr' else [1200,800];refs[v]={'camera':camera,'quaternion':proj['camera']['quaternion'],'size':size,'cameraSha256':sha(d/'camera.json'),'photoSha256':sha(Path('/Users/finbarr/code/games/kyoto/research/kyoto-station/photos')/name)}
def ground(view,pixel,height):
 r=refs[view];c=np.array(r['camera']['position']);w,h=r['size'];f=h/(2*np.tan(np.deg2rad(r['camera']['fov']/2)));ray=Rotation.from_quat(r['quaternion']).apply([(pixel[0]-w/2)/f,-(pixel[1]-h/2)/f,-1]);t=(Y+height-c[1])/ray[1];assert t>0;point=c+t*ray;return [float((point-O)@D),float((point-O)@A)]
# Visible front runs at assumed stair levels. Hidden rear extents meet the
# already registered cafe threshold. Higher tiers supply minimum support below.
levels=[.1585945311703071,.3171890623406142,.4757835935109213,.6343781246812284,.7929726558515355]
fronts=[[[925,611],[1133,635]],[[813,579],[937,592],[1122,611]],[[857,543],[987,556],[995,542],[1050,548],[1060,559],[1160,577]],[[879,524],[971,536],[977,523],[1051,531],[1058,540],[1154,551]],[[908,485],[1048,497],[1050,519],[1081,522],[1085,502],[1127,503],[1131,482],[1148,485]]]
tiers=[];higher=None
for k in reversed(range(5)):
 pts=[ground('rurubu',p,levels[k]) for p in fronts[k]]
 # Order observed boundary from cafe side to outside, then close at the known
 # far end. Points can be locally oblique; no survey orthogonality is claimed.
 poly=Polygon(pts+[[pts[-1][0],32.6],[46.12,32.6],[46.12,max(21.4,pts[0][1])]])
 if not poly.is_valid:poly=poly.buffer(0)
 assert poly.geom_type=='Polygon' and not poly.interiors
 observed=poly.area
 if k==4:poly=unary_union([poly,box(45.5,21.4,46.12,32.6)])
 if higher is not None:poly=unary_union([poly,higher])
 poly=poly.simplify(1e-8,preserve_topology=True)
 assert poly.geom_type=='Polygon' and not poly.interiors
 tiers.insert(0,{'id':str(k),'topY':Y+levels[k],'bottomY':Y if k==0 else Y+levels[k-1],'outlineUV':list(map(list,list(poly.exterior.coords)[:-1])),'frontPixels':fronts[k],'frontUV':pts,'hiddenSupportAddedM2':poly.area-observed});higher=poly
spec={'schema':1,'status':'Integrated courtyard construction hypothesis from the 2025 reference views; not final visual acceptance.','referencePeriod':'September 2025 dining arrangement; late-summer evergreen palette. June photograph supports fixed terrace/planter form, not its temporary parasols.','parentLayoutSha256':'7bd8ddef8657e327c99c8375578c32133035944a8c64454bb59511a38b4c51d9','frame':{'origin':O.tolist(),'forward':D.tolist(),'south':A.tolist(),'floorY':Y},'references':refs,'terrace':{'tiers':tiers,'removedPanelIds':['east-court-niwa-terrace-core-'+str(i) for i in range(5)]+['east-court-niwa-terrace-landing'],'landingY':31.6,'glassU':46.12,'endV':32.6,'method':'Back-project visible front polylines at five assumed levels; close hidden rear edges at the registered cafe boundary and union minimum support under higher tiers. Level count and hidden outlines remain hypotheses.'},'tables':[],'umbrellas':[],'planter':{'u':45.35,'v':13.27,'sizeU':1.58,'sizeV':1.5,'bottomY':Y,'topY':32.00028095748308,'method':'Near planter uses the established middle planter height/size; position inferred from the Rurubu visible cap at pixel40,610.'},'trees':[{'id':'near','u':45.35,'v':13.27,'rootY':31.91,'crownY':34.2,'radiusU':.85,'radiusV':.85,'radiusY':1.65,'leaves':4800,'seed':1969},{'id':'above-pergola','u':0,'v':0,'rootY':31.6,'crownY':36.3,'radiusU':1.95,'radiusV':1.1,'radiusY':.42,'leaves':2800,'clumps':[{'offset':[-.75,-.02,-.2],'radius':[1.2,.25,.7]},{'offset':[.65,.08,0],'radius':[1.3,.30,.7]},{'offset':[-.15,.35,.35],'radius':[.65,.25,.45]}],'seed':2025}], 'limits':['Terrace elevations, hidden closures and original camera calibration remain uncertain; visible front picks are construction input, not independent validation.','Furniture dimensions and occluded table/chair placements are inferred. The front court table is shifted 0.4 m south to retain clearance at the established north-stair endpoint. September dining umbrellas are selected; June parasols and temporary promotional displays are excluded.','Near evergreen species is unidentified. Late-summer color and unseen crown extent are original approximations.','The above-pergola tree crown is located from the JR view at an assumed height; its root and hidden trunk are inferred behind the cafe frontage.','Reference images are not texture assets. Existing original granite is reused; all furniture and vegetation geometry is original.']}
for row,us,vs in [('cafe',[37.06,37.7,38.0,38.1],[19.30,23.1,26.8,30.1]),('court',[34.60,35.1,35.3,35.5],[20.26,23.65,27.1,30.1])]:
 for i,(u,v) in enumerate(zip(us,vs)):spec['tables'].append({'id':row+'-'+str(i),'u':u,'v':v,'topY':Y+.75,'sizeU':.90,'sizeV':.75,'chairs':4})
for i,(u,v,r) in enumerate([[38.22,21.42,1.35],[35.32,24.66,1.25],[38.61,25.74,1.35],[37.8,29.8,1.2],[34.6,30.3,1.0]]):spec['umbrellas'].append({'id':str(i),'u':u,'v':v,'radius':r,'eaveY':Y+2.18,'peakY':Y+2.68})
spec['trees'][1]['u'],spec['trees'][1]['v']=ground('jr',[253,194],36.3-Y)
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');print(json.dumps({'terrace':[{k:t[k] for k in ['id','topY','hiddenSupportAddedM2','outlineUV']} for t in tiers],'tables':len(spec['tables']),'chairs':32,'umbrellas':len(spec['umbrellas']),'trees':spec['trees']},indent=2))
