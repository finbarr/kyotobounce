"""Download explicitly catalogued public references; keep provenance and hashes."""
import concurrent.futures, datetime, hashlib, json, mimetypes, pathlib, re, urllib.request, urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
CATALOG=ROOT/'sources.json'
def collect(item):
    if item.get('access')=='link-only': return item
    req=urllib.request.Request(item['url'],headers={'User-Agent':'KyotoStationReferenceResearch/1.0 (personal architectural study)'})
    try:
        with urllib.request.urlopen(req,timeout=35) as response:
            limit=item.get("max_bytes",35_000_000)
            data=response.read(limit+1)
            if len(data)>limit: raise ValueError('Reference exceeds configured collection limit')
            content_type=response.headers.get_content_type(); final=response.url
        if item.get('format')=='pdf' and not data.startswith(b'%PDF'): raise ValueError('Expected PDF, received '+content_type)
        ext=item.get('format') or {'text/html':'html','image/svg+xml':'svg','application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}.get(content_type,'bin')
        folder='pages' if ext=='html' else item['category']
        path=ROOT/folder/(item['id']+'.'+ext);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
        item.update(status='downloaded',local_file=str(path.relative_to(ROOT)),bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),content_type=content_type,final_url=final,retrieved_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
        if ext=='html':
            text=data.decode('utf-8','replace')
            links=[]
            for link in re.findall(r'''(?:href|src|data-src)\s*=\s*["']([^"']+)''',text,re.I):
                url=urllib.parse.urljoin(final,link.replace('&amp;','&'))
                if url.startswith(('http://','https://')) and url not in links: links.append(url)
            item['discovered_links']=links
        print(item['id'],len(data),content_type,flush=True)
    except Exception as error:
        item.update(status='fetch-failed',error=str(error),retrieved_at=datetime.datetime.now(datetime.timezone.utc).isoformat());print(item['id'],'FAILED',str(error),flush=True)
    return item
if __name__=='__main__':
    rows=json.loads(CATALOG.read_text());pending=[i for i in rows if i.get('status') not in ['downloaded','link-only'] and i.get('access')!='link-only']
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for _ in pool.map(collect,pending): pass
    CATALOG.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
