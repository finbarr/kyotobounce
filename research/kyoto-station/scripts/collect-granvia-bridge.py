"""Save corridor reference photos and provenance without replacing prior sources."""
import importlib.util,json,pathlib,concurrent.futures
R=pathlib.Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('collector',R/'scripts/collect.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
rows=json.loads((R/'sources.json').read_text());existing={x['id'] for x in rows}
url='https://chottoiitoko.com/kashikojimabasaratei-shimakaze/'
base=dict(publisher='ちょっとイイとこに泊まってみたい / りえごん',source_date='Page published 2026-01-30, updated 2026-02-19; narrative says January2025 but image filenames say January2026. Capture date unresolved.',rights='Research reference only. No game texture or image redistribution license established.',parent_url=url)
new=[dict(base,id='granvia-bridge-travel-page',title='First-person Granvia M3F glass corridor visit',url=url,category='architecture',format='html')]
for n,t in [('entry','14.49.21'),('inside','14.49.28'),('outward','14.52.48'),('over-gate','14.53.00')]:
 new.append(dict(base,id='granvia-bridge-'+n,title='Granvia M3F corridor reference: '+n,url='https://chottoiitoko.com/wp-content/uploads/2026/01/2026-01-10-'+t+'.jpg',category='photos',format='jpg',note='Shape and relationship reference; no surveyed dimensions. Full-resolution URL explicitly listed by source page.'))
for x in new:
 if x['id']=='granvia-bridge-outward':x.update(title='Granvia high-level window view over East Square',note='Visually verified hotel view over East Square, not the M3F gate bridge.')
 if x['id']=='granvia-bridge-over-gate':x.update(title='Granvia high-level north view toward Kyoto Tower and forecourt',note='Visually verified high-level hotel view, not the central gate; historical ID retained.')
new.append(dict(id='granvia-bridge-2024-visit',title='March2024 first-person account of hotel corridor over central gate',url='https://iko-yo.net/experiences/88517',category='architecture',format='html',publisher='いこーよ / どんぐりこ',source_date='Visit March2024; page current on retrieval',rights='Research reference only; no game texture permission established.',note='First-person account places hotel-user corridor above central gate, with railway views on the opposite side. Corroborates identity but not metric dimensions or current access policy.'))
new=[x for x in new if x['id'] not in existing]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as p:new=list(p.map(m.collect,new))
(R/'sources.json').write_text(json.dumps(rows+new,ensure_ascii=False,indent=2)+'\n')
