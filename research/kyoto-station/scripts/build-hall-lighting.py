"""Create the local source-reading gallery, preserving originals and provenance."""
from pathlib import Path
import html, json, hashlib

root = Path(__file__).resolve().parents[1]
out = root / 'notes/hall-lighting'
out.mkdir(parents=True, exist_ok=True)
rows = {x['id']: x for x in json.loads((root / 'sources.json').read_text())}
groups = [
    ('Recent detail and deeper bays', [
        ('hall-maeda-2026', 'July 2026. Stone returns, recessed glazing, gate soffit and floor openings. CC0 1.0 declared by the photographer.'),
        ('hall-believer-2019-100', 'November 2019. Roof, corbels, glazing returns and suspended bridge. CC BY-SA 4.0; historical tenant state.')]),
    ('Historical built lighting', [
        ('lighting-lpa-01', 'Upward hall view: truss illumination and fixtures under the suspended route.'),
        ('lighting-lpa-02', 'Elevated concourse view: floor reflections, dark edges and escalator lighting.'),
        ('lighting-lpa-03', 'Staircase approach: illuminated wall, bridge and stair interfaces.'),
        ('lighting-lpa-04', 'Grand Staircase: localized step and handrail light, substantial retained shadow.'),
        ('lighting-lpa-05', 'Circular canopy: local floor illumination and strong directional shadows.')]),
    ('Design studies — not photographs of installed work', [
        ('lighting-lpa-06', 'Painted architectural lighting study. Do not treat its silhouette or lighting as measured as-built evidence.'),
        ('lighting-lpa-07', 'Physical concept model with figures and pools of light. This is a design demonstration, not an occupied concourse photograph.')]),
]
sections = []
for title, items in groups:
    cards = []
    for key, caption in items:
        item = rows[key]
        local = '../../' + item['local_file']
        cards.append(f'<figure><a href="{html.escape(local)}"><img src="{html.escape(local)}" alt="{html.escape(item["title"])}"></a><figcaption>{html.escape(caption)} <a href="{html.escape(item.get("parent_url", item["url"]))}">Original source</a></figcaption></figure>')
    sections.append('<section><h2>' + title + '</h2><div class="grid">' + ''.join(cards) + '</div></section>')

page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kyoto Station · hall materials and lighting references</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef1ed;color:#203a32;font:16px/1.55 system-ui,sans-serif}main{max-width:1320px;margin:auto;padding:32px}h1{font-size:clamp(30px,4vw,50px);line-height:1.12;max-width:950px}h2{font-size:25px;margin-top:38px}a{color:#17614d}nav{display:flex;gap:20px;flex-wrap:wrap}.intro{max-width:880px}.notice{padding:18px;background:#fff0d0;border-left:4px solid #b17c19}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}figure{margin:0;background:white;padding:12px;border:1px solid #d2ddd4;border-radius:8px}img{display:block;width:100%;height:440px;object-fit:contain;background:#e1e6df}figcaption{font-size:14px;padding-top:10px}.pdf img{height:auto}.meta{font-size:13px;color:#50685f}li{margin:8px 0}@media(max-width:700px){main{padding:18px}.grid{grid-template-columns:1fr}img{height:auto;max-height:560px}}
</style><main><header><p class="meta">KYOTO STATION · SOURCE REVIEW · 27 SEPTEMBER 2026</p><h1>Deep bays, dark stone and selective light.</h1><p class="intro">Recent photographs clarify the hall’s layered construction. The original lighting designer explains the intended contrast between illuminated surfaces and shadow. These references guide the next material and geometry study.</p><nav><a href="../../index.html">Research library</a><a href="../CENTRAL-HALL-LIGHTING.md">Findings and construction implications</a><a href="../central-hall-bay/index.html">Geometry discrepancy and camera diagnostics</a></nav><p class="notice"><strong>Research evidence, not accepted reconstruction.</strong> No new hall camera is registered. The photographs have different dates, exposures and processing. Historical design studies do not establish current fixtures.</p></header>'''
page += ''.join(sections)
page += '''<section><h2>Original publication</h2><p>Kaoru Mende + Lighting Planners Associates, <em>Lighting Design for Urban Environments and Architecture</em>, Rikuyosha, 30 May 2005. <a href="../../architecture/lighting-design-station.pdf">Open the source PDF</a> · <a href="https://www.lighting.co.jp/en/projects/kyoto-station-building/">Designer’s project page</a>.</p><div class="grid pdf"><figure><a href="../../architecture/lighting-design-station.pdf#page=21"><img src="../../architecture/lighting-design-station-21.png" alt="Published Kyoto Station lighting concept diagram and explanatory text"></a><figcaption>PDF page 21 / printed 66–67. Lighting concept diagram and model studies; not a surveyed floor plan.</figcaption></figure><figure><a href="../../architecture/lighting-design-station.pdf#page=22"><img src="../../architecture/lighting-design-station-22.png" alt="Historical hall photograph, proposed winter daylight section and explanatory text"></a><figcaption>PDF page 22 / printed 68–69. The winter mirror proposal shown in the section was abandoned after glass tests. Do not model it as installed work.</figcaption></figure></div></section><section><h2>How this changes the next bay</h2><ul><li>Model the upper bays’ actual recesses and returns before surface tuning.</li><li>Develop a close-range stone, metal, glazing and joint sample.</li><li>Preserve intentional shadow while keeping the route and ball readable.</li><li>Check current fixtures against recent evidence, and measure rendering cost before extending the lighting treatment.</li></ul><p class="meta">Source copies retain their original rights and remain outside the game bundle. Five LPA building photographs were individually inspected; the two design studies were inspected together. PDF previews are derived from the unchanged source. The current full-station candidate remains courtyard life04 / browser04.</p></section></main></html>'''
(out / 'index.html').write_text(page)
receipt = {'sourceIDs': [key for _, items in groups for key, _ in items] + ['lighting-design-station','lighting-lpa-project'], 'sourceHashes': {key: rows[key]['sha256'] for key in [key for _, items in groups for key, _ in items] + ['lighting-design-station','lighting-lpa-project']}, 'gameChanged': False, 'newRegistrationAccepted': False}
(out / 'publication-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(out / 'index.html')
