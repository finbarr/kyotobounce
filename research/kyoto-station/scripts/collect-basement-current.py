"""Collect dated operator evidence without replacing previous snapshots."""
from pathlib import Path
from urllib.request import Request, urlopen
from datetime import datetime, timezone
import hashlib, json

root = Path(__file__).resolve().parents[1]
catalogue = root / 'sources.json'
rows = json.loads(catalogue.read_text())
items = [
    ('porta-renovation-2025', 'Porta spring 2025 renovation announcement', 'https://jrwsc.co.jp/storage/files/porta.pdf', 'plans/porta-renovation-2025.pdf', 'plans', 'pdf', 'JR West Kyoto SC Development', '2025-02-20', 'B1F redevelopment plan and illustrative design rendering. Proposed appearance must not be treated as an as-built photograph.'),
    ('dailyservice-map-2026', 'JR West Daily Service Net Kyoto shop map', 'https://www.dailyservice.co.jp/shop/map?type=kyoto', 'pages/dailyservice-map-2026.html', 'maps', 'html', 'JR West Daily Service Net', 'July 2026 shown on page', 'Current retail map page with basement, ground-floor and second-floor diagrams and a link to the interactive JR station viewer.'),
    ('dailyservice-basement-2026', 'Kyoto B1F/B2F retail and circulation diagram', 'https://www.dailyservice.co.jp/assets/common/img/shop/map/kyoto_b1f2f.png', 'maps/dailyservice-basement-2026.png', 'maps', 'png', 'JR West Daily Service Net', 'July 2026 parent page; image date unlisted', 'Operator schematic for retail locations and basement connections; not a measured building plan.'),
]
for id, title, url, filename, category, fmt, publisher, date, note in items:
    if any(row['id'] == id for row in rows):
        continue
    path = root / filename
    assert not path.exists(), path
    with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60) as response:
        data = response.read()
        content_type, final_url = response.headers.get('Content-Type'), response.url
    if fmt == 'pdf': assert data.startswith(b'%PDF-')
    if fmt == 'png': assert data.startswith(b'\x89PNG')
    path.write_bytes(data)
    rows.append(dict(id=id, title=title, url=url, local_file=filename, category=category,
        format=fmt, publisher=publisher, source_date=date, note=note,
        rights='Research reference only; redistribution permission not established.',
        status='downloaded', bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
        content_type=content_type, final_url=final_url,
        retrieved_at=datetime.now(timezone.utc).isoformat()))
    catalogue.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    print(id, len(data))
