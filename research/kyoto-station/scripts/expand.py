import json,re
from pathlib import Path
p=Path('research/kyoto-station/sources.json');s=json.loads(p.read_text());by={x['id']:x for x in s}
def add(i,title,url,cat='photos',fmt='jpg',publisher='Kyoto Station Building',note='',**kw):
 if i not in by:s.append(dict(id=i,title=title,url=url,category=cat,format=fmt,publisher=publisher,source_date='Undated; retrieved 2026-09-27 UTC',note=note,rights='Reference copy only; imagery is not licensed for redistribution or game textures.',**kw))
for u in by['official-squares']['discovered_links']:
 if re.search(r'/img_[a-z]+_\d+(?:_\d+)?\.(jpg|png)$',u):
  stem=u.rsplit('/',1)[1].split('.')[0];add('square-'+stem,stem.replace('img_','').replace('_',' '),u,note='Operator photo; inspect finishes and spatial relationships. Photo capture date unknown.')
for u in by['structural-engineer']['discovered_links']:
 if re.search(r'/\d+_800x\d+.jpg',u):add('structure-'+u.split('/')[-1].split('_')[0],'Kanebako structural project photograph',u,publisher='Kanebako Structural Engineers',note='Engineering project gallery, useful for truss geometry, bearing nodes and roof glazing; historical state.')
for u in by['fujitec-lifts']['discovered_links']:
 if '/uploads/1997/' in u and re.search(r'-1.jpg$',u):add('lift-'+u.rsplit('/',1)[1][:-4],'Fujitec station elevator / exterior',u,publisher='Fujitec',note='Original 1997 project reference; verify against current photos.')
for u in by['official-neighborhood']['discovered_links']:
 if '/guidemap/pdf/' in u and u.endswith('.pdf') and u not in [x['url'] for x in s]:add('guide-'+u.rsplit('/',1)[1][:-4],'Official guide '+u.rsplit('/',1)[1],u,'maps','pdf')
for u in by['official-floor-guide']['discovered_links']:
 if '/floorguide/' in u and not any(t in u for t in ['/img/','#','?']):
  add('floor-page-'+u.rstrip('/').split('/')[-1],'Official floor guide '+u.rstrip('/').split('/')[-1],u,'maps','html')
add('floor-overview-svg','All-floor building diagram','https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_all.svg','maps','svg',note='Schematic visitor orientation, not a dimensioned construction plan.')
add('kintetsu-plan','Kintetsu Kyoto station layout','https://www.kintetsu.co.jp/soukatsu/kounai/pdf/kyoto.pdf','maps','pdf','Kintetsu')
add('smart-navi-map','Kyoto Station Smart Navi interactive map','https://platinumaps.jp/d/kyoto-station-smart-navi','maps','html',access='link-only')
add('jr-west-3d','JR West 3D station map','https://3dmap.jrnc.jp/JRW/mobile/#/kyotoja/','maps','html','JR West',access='link-only')
add('hara-archive-db','Hara / Atelier Phi finding aid','https://db.nama.bunka.go.jp/index.php/g476-hwyx-ws6b','architecture','html','National Archives of Modern Architecture')
add('nama-bulletin-3','Architecture archive bulletin 3 (2023)','https://www.bunka.go.jp/nama/wp-content/uploads/2025/05/202505-00-01.pdf','architecture','pdf','National Archives of Modern Architecture',note='Research on Hara including Kyoto Station; inspect pages before deriving dimensions.')
add('city-existing-data','Municipal geometry already used by game','https://data.city.kyoto.lg.jp/resource/?id=21224','context','html','Kyoto City',note='Existing game source attribution says CC BY 4.0; preserve attribution and verify downloaded resource license.')
add('plateau-2024','Kyoto 2024 city model catalogue','https://www.geospatial.jp/ckan/dataset/plateau-26100-kyoto-shi-2024','context','html','G Spatial Information Center / Kyoto City',note='Catalogue only; LOD and texture coverage must be checked tile by tile before adoption. Multi-GB city archive not downloaded.')
add('north-bus-stops','Kyoto Station bus stops','https://www2.city.kyoto.lg.jp/kotsu/busdia/hyperdia/menu061','maps','html','Kyoto Municipal Transportation Bureau')
for i in ['pano-atrium-2016','pano-grand-stair-2016','pano-platform-night-2018','pano-observation-night']:
 by[i]['access']='link-only';by[i]['status']='link-only';by[i]['note']+=' Viewer download returned 403; use original viewer link.'
by['accessible-station']['access']='link-only';by['accessible-station']['note']+=' TLS hostname mismatch prevented safe download; retained as unverified lead.'
by['world-architecture-1997']['access']='link-only'
by['cca-competition-caution']['note']='EXCLUDE from built-station geometry: verified James Stirling / Michael Wilford competition proposal, circa 1990–1991, AP140.S2.SS1.D95.P16.'
p.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n');print(len(s),'catalogue entries')
