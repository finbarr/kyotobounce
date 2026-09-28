"""Save current Porta route evidence without replacing prior source copies."""
from pathlib import Path
from urllib.request import Request,urlopen
from datetime import datetime,timezone
import json,hashlib
ROOT=Path(__file__).resolve().parents[1];register=ROOT/'sources.json';rows=json.loads(register.read_text());existing={r['id']for r in rows}
items=[dict(id='porta-navigation',title='Porta official route guide: central concourse via B1F to B2F',url='https://www.porta.co.jp/navigation',category='maps',format='html',local_file='pages/porta-navigation.html',note='Step-by-step operator route distinguishes first descent to B1F, turnback beside Ogaki Bookstore, and second descent to B2F south area.'),dict(id='porta-shopguide-2026',title='Porta tenant floor guide, current PDF',url='https://www.porta.co.jp/common/pdf/floor/shopguide_jp.pdf',category='maps',format='pdf',local_file='maps/porta-shopguide-2026.pdf',note='Five-page operator tenant guide. PDF title FloorGuide_A4_260629; schematic adjacency, not measured construction dimensions.')]
for i in range(1,7):items.append(dict(id=f'porta-b2-route-{i:02d}',title=f'Porta central concourse to B2F, route photograph {i}',url=f'https://www.porta.co.jp/common/img/navigation/img_c_b2fs_{i:02d}.jpg',category='photos',format='jpg',local_file=f'photos/porta-b2-route-{i:02d}.jpg',note=['Central gate departure toward the first descent.','First descending escalator toward B1F.','B1F turnback toward next descent.','Second descent in front of Ogaki Bookstore.','Escalator down to B2F.','B2F south-area arrival.'][i-1],parent_url='https://www.porta.co.jp/navigation'))
for item in items:
 if item['id']in existing:continue
 p=ROOT/item['local_file'];assert not p.exists(),p
 row={**item,'publisher':'Kyoto Porta','source_date':'Current operator page; individual photograph capture dates unlisted','rights':'Copyright Kyoto Porta. Research reference only; no permission to ship images as game textures established.','retrieved_at':datetime.now(timezone.utc).isoformat()}
 try:
  with urlopen(Request(row['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=40)as response:data=response.read();row.update(content_type=response.headers.get('Content-Type'),final_url=response.url)
  if item['format']=='jpg':assert data[:2]==b'\xff\xd8'
  if item['format']=='pdf':assert data[:5]==b'%PDF-'
  p.write_bytes(data);row.update(status='downloaded',bytes=len(data),sha256=hashlib.sha256(data).hexdigest());print(row['id'],len(data))
 except Exception as error:row.update(status='unavailable',error=str(error));print(row['id'],str(error))
 rows.append(row);register.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
