import json,urllib.request,re
from pathlib import Path
p=Path('research/kyoto-station/sources.json');s=json.loads(p.read_text());ids={x['id'] for x in s}
def add(i,title,url,cat,fmt='html',publisher='',note='',**kw):
 if i not in ids:s.append(dict(id=i,title=title,url=url,category=cat,format=fmt,publisher=publisher,note=note,source_date='See source; retrieved 2026-09-27 UTC',rights='Reference only; check source-specific reuse terms before shipping.',**kw))
add('jr-central-map-page','JR Central Kyoto Shinkansen map','https://railway.jr-central.co.jp/station-guide/shinkansen/kyoto/map.html','maps',publisher='JR Central')
add('subway-map-page','Kyoto subway station diagram links','https://www2.city.kyoto.lg.jp/kotsu/webguide/ja/tika/pop_station_map.html','maps',publisher='Kyoto Municipal Transportation Bureau')
add('bus-map-page','Current city bus / subway maps','https://www.city.kyoto.lg.jp/kotsu/page/0000019770.html','maps',publisher='Kyoto Municipal Transportation Bureau')
add('tower-access','Nidec Kyoto Tower street approach','https://www.kyoto-tower.jp/access/','context',publisher='Kyoto Tower')
add('plateau-index','2024 Kyoto 3D model coverage index','https://assets.cms.plateau.reearth.io/assets/a0/50000d-4c98-4293-8e22-80a5200a0729/26100_indexmap_op.pdf','context','pdf','Kyoto City / PLATEAU',note='Coverage index; not a photogrammetric scan or interior model.')
add('video-navigation-2024','Porta, Miyakomichi and north–south passage walk','https://www.youtube.com/watch?v=ST2SzFYvBrs','videos',publisher='The KYOTO',note='Recorded 2024-04-21. Creator chapters: 00:36 main entrance; 02:40 Porta west; 08:09 Porta east; 13:28 Hachijo; 14:18 Miyakomichi; 19:55 Hachijo street; 22:30 north–south deck. Metadata verified; full video not watched.',access='link-only',status='link-only')
add('video-every-corner-2024','Weekend walk to every corner of Kyoto Station','https://www.youtube.com/watch?v=qQBaPvCVlxU','videos',publisher='Bubuzuke Walking',note='May 2024. Creator chapters: 00:00 Hachijo; 03:23 Miyakomichi; 14:08 piano; 24:39 post office; 27:23 bus stops; 38:26 stairs; 41:18 roof garden; 46:06 Skyway; 50:06 East Square; 55:06 Kyoto Tower; 1:00:23 subway; 1:02:16 Porta. Chapters from syndicated creator description; video frames not inspected.',access='link-only',status='link-only')
add('video-station-2026','Station entrances and gates, March 2026','https://www.youtube.com/watch?v=HywEoMgzKyw','videos',publisher='The Japan',note='2026-03-20. Chapters in creator metadata: 00:41 Karasuma bus stops; 02:42 Central gate; 04:19 free passage; 05:37 West gate; 08:03 Hachijo exterior; 17:44 Tower square. Discovery metadata verified, playback not inspected.',access='link-only',status='link-only')
add('video-evening-2025','Evening station and northern streets','https://www.youtube.com/watch?v=vdr3VHryjyU','videos',publisher='VIRTUAL KYOTO',note='2025-08-16 capture. Creator chapter metadata: 00:00 Shinkansen platform; 02:57 station; 08:33 forecourt; 10:55 Karasuma/Shiokoji junction; 12:44 Kizuyabashi; 15:40 Shiokoji. Playback not inspected.',access='link-only',status='link-only')
add('video-rain-2022','Rainy night around Kyoto Station','https://www.youtube.com/watch?v=9PovSqpseFQ','videos',publisher='Creator at linked YouTube page',note='Title specifies 2022-06-14. Historical wet-ground and exposure reference. Search metadata verified; playback not inspected.',access='link-only',status='link-only')
add('video-smart-navi','Official Smart Navi introduction','https://www.youtube.com/watch?v=Y4BJEkWiTUM','videos',publisher='Linked by Kyoto City Tourism Association',note='Linked from official tourism announcement; orientation aid, not architectural survey. Playback not inspected.',access='link-only',status='link-only')
add('official-video-channel','Station building official video channel','https://www.youtube.com/channel/UCFN-5FOtfCPhkjhm7rv8XmQ','videos',publisher='Kyoto Station Building',note='Official current events and installations; channel catalogue rather than a single captured video.',access='link-only',status='link-only')
for i,url in [('winter-walk','https://www.ciaonihon.com/442171/'),('lightshow-walk','https://www.alojapan.com/1281792/kyoto-staton-walking-tour-and-light-show-4k-walking-tour/')]:
 try:
  html=urllib.request.urlopen(url,timeout=25).read().decode('utf8','replace')
  Path('research/kyoto-station/notes/'+i+'-discovery.html').write_text(html)
  vids=list(dict.fromkeys(re.findall(r'(?:youtube.com/(?:embed/|watch\?v=)|youtu.be/)([A-Za-z0-9_-]{11})',html)))
  print(i,vids)
  if vids:add('video-'+i,'Station '+i,'https://www.youtube.com/watch?v='+vids[0],'videos',publisher='Creator identified on original YouTube page',note='Original video URL extracted from '+url+'; metadata lead, playback not inspected.',access='link-only',status='link-only',discovery_url=url)
 except Exception as e:print(i,e)
p.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
