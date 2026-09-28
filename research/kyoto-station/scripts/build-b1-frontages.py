"""Publish the local, provisional B1 construction with its verification receipts."""
from pathlib import Path
import json, shutil

root = Path(__file__).resolve().parents[1]
work = Path('./.local/station-realism')
assembly = work / 'hall-descents-assembly-19'
native = work / 'hall-b1-frontages-native-03/report.json'
walks = work / 'hall-b1-walks-03/report.json'
n, w = json.loads(native.read_text()), json.loads(walks.read_text())
assert not n['failures'] and w['pass']
out = root / 'notes/b1-frontages'
out.mkdir(exist_ok=True)
for src, name in [(assembly/'before/source.png', 'before.png'),
                  (assembly/'b1-north/source.png', 'after.png'),
                  (assembly/'frontage/source.png', 'frontage.png'),
                  (native, 'native-proof.json'), (walks, 'walking-proof.json'),
                  (assembly/'interfaces-proof.json', 'interfaces-proof.json'),
                  (assembly/'serialization-proof.json', 'serialization-proof.json'),
                  (work/'hall-b1-frontages-04/report.json', 'component.json')]:
    shutil.copyfile(src, out/name)
max_error = max(row['error'] for row in n['samples']) * 1000
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>B1F frontage construction</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f2ec;color:#18382f;font:16px/1.55 system-ui,sans-serif}main{max-width:1300px;margin:auto;padding:32px}h1{line-height:1.15}a{color:#165b49}img{width:100%;display:block}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}figure{margin:0;background:white;padding:12px}figcaption{padding:12px 0}.notice{padding:18px;background:#e4dfc9}nav{display:flex;gap:18px;flex-wrap:wrap}@media(max-width:650px){main{padding:18px}.grid{grid-template-columns:1fr}}
</style><main><nav><a href="../../index.html">Research library</a><a href="../B1-FRONTAGES.md">Evidence and assumptions</a><a href="../BASEMENT-ROUTE-UPDATE.md">Official route findings</a></nav><h1>B1F: opening the lower frontage</h1>
<p class="notice">Provisional construction, uninstalled. Shop widths, recess depth and materials still need photographic alignment. These views use inspection lighting; they do not demonstrate photorealism.</p>
<div class="grid"><figure><img src="before.png" alt="Previous closed well wall beside the first descent"><figcaption>Before: continuous lower enclosure.</figcaption></figure><figure><img src="after.png" alt="New open B1 shop portals beside the same escalator bank"><figcaption>After, same camera: open portals and recessed glazing. Bulky bank undersides and missing B2 continuation remain visible.</figcaption></figure><figure><img src="frontage.png" alt="Unfurnished shop recess with open doorway"><figcaption>Shallow interior construction; fit-out, surface detail and lighting remain unfinished.</figcaption></figure><figure><img src="../../photos/porta-b2-route-05.jpg" alt="Porta operator reference showing the actual B1 corridor"><figcaption>Operator reference, different camera. Undated photograph with historical branding; use the current tenant map for shop identity.</figcaption></figure></div>
<h2>Verification</h2><p>PROOF_SUMMARY</p><nav><a href="native-proof.json">Native probes</a><a href="walking-proof.json">Doorway walks</a><a href="interfaces-proof.json">Floor seams and retained parents</a><a href="serialization-proof.json">Export agreement</a><a href="component.json">Geometry and assumptions</a></nav>
<h2>Next</h2><p>Register corridor landmarks, refine shop boundaries and current finishes, investigate bank undersides and reconstruct the second descent. Complete full-station course/runtime and performance checks before installation.</p></main></html>'''
page = page.replace('PROOF_SUMMARY', f"{len(n['samples']):,} native collision probes pass; maximum error {max_error:.4f} mm. All {len(w['supports'])} support/headroom samples and {len(w['walks'])} doorway walks pass. The 675 parent hall/descent records and all four mechanisms remain unchanged. Full-game performance and the stability soak remain open.")
(out/'index.html').write_text(page)
print(json.dumps(dict(native_probes=len(n['samples']), max_error_mm=max_error, walks=len(w['walks']), gallery=str(out/'index.html'))))
