"""Collect public gate references; retain provenance and avoid replacing prior captures."""
import importlib.util,json,pathlib,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collector',ROOT/'scripts/collect.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
rows=json.loads((ROOT/'sources.json').read_text());ids={r['id'] for r in rows}
new=[
 {'id':'gate-jrwest-2026-map','title':'JR West station schematic, 31 January 2026','url':'https://eki.jr-odekake.net/premises/0610116_7f538800-5356-4f28-bb23-1dd129364f57.pdf','category':'maps','format':'pdf','publisher':'JR West','source_date':'2026-01-31','note':'Official current station-page map. Schematic adjacency, not measured construction geometry.'},
 {'id':'gate-jrwest-commons-page','title':'JR West Kyoto Station JR Line Central Gate photo provenance','url':'https://commons.wikimedia.org/wiki/File:JR_West_Ky%C5%8Dto_Station_JR_Line_Central_Gate.jpg','category':'architecture','format':'html','publisher':'Wikimedia Commons original photographer; inspect attribution','source_date':None},
 {'id':'gate-20200229-page','title':'Kyoto Station 20200229-16 photo provenance','url':'https://commons.wikimedia.org/wiki/File:Kyoto_Station_20200229-16.jpg','category':'architecture','format':'html','publisher':'Wikimedia Commons original photographer; inspect attribution','source_date':None},
 {'id':'gate-universal-page','title':'City of Kyoto universal-access station guide','url':'https://kyoto-universal.jp/traffics/template/kyoto_station.html','category':'maps','format':'html','publisher':'City of Kyoto universal tourism guide','source_date':'Undated page; copyright footer 2009','note':'Historical detailed access diagrams. Cross-check current operators and photographs; not metric plans.'},
 {'id':'gate-universal-detail','title':'JR central ticket gate detailed access diagram','url':'https://kyoto-universal.jp/traffics/images/map03.gif','category':'maps','format':'gif','publisher':'City of Kyoto universal tourism guide','source_date':'Undated drawing on historical access page','parent_url':'https://kyoto-universal.jp/traffics/template/kyoto_station.html','note':'Elevator/office/barrier adjacency only; current configuration must be corroborated.'},
]
new=[r for r in new if r['id'] not in ids]
for r in new:r.setdefault('rights','Research reference only; no permission to ship or redistribute images as game textures established.')
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:new=list(pool.map(m.collect,new))
rows+=new;(ROOT/'sources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
