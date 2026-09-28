"""Publish the provisional B1 aisle study and exact validation receipts."""
from pathlib import Path
import json, shutil

root = Path(__file__).resolve().parents[1]
work = Path('./.local/station-realism')
assembly = work/'hall-descents-assembly-21'
native = work/'hall-b1-corridors-native-01/report.json'
walks = work/'hall-b1-corridor-walks-01/report.json'
n, w = json.loads(native.read_text()), json.loads(walks.read_text())
assert not n['failures'] and w['pass']
out = root/'notes/b1-corridors'
out.mkdir(exist_ok=True)
for source, name in [
    (assembly/'aisle-before/source.png', 'before.png'),
    (assembly/'aisle/source.png', 'after.png'),
    (native, 'native-proof.json'), (walks, 'walking-proof.json'),
    (assembly/'interface-proof.json', 'interface-proof.json'),
    (assembly/'serialization-proof.json', 'serialization-proof.json'),
    (work/'hall-b1-corridors-01/report.json', 'component.json'),
    (work/'hall-b1-source-extent-01/summary.json', 'source-extent.json'),
    (work/'hall-b1-registration-03/study.json', 'rejected-camera.json'),
]:
    shutil.copyfile(source, out/name)
error = max(x['error'] for x in n['samples'])*1000
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B1 continuous aisle study</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f2ec;color:#18382f;font:16px/1.55 system-ui,sans-serif}main{max-width:1300px;margin:auto;padding:32px}a{color:#165b49}h1{line-height:1.15}nav{display:flex;gap:18px;flex-wrap:wrap}.notice{padding:18px;background:#e4dfc9}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;padding:12px}img{width:100%;display:block}figcaption{padding-top:12px}code{overflow-wrap:anywhere}@media(max-width:650px){main{padding:18px}.grid{grid-template-columns:1fr}}
</style><main><nav><a href="../../index.html">Research library</a><a href="../B1-CORRIDORS.md">Evidence and limits</a><a href="../BASEMENT-ROUTE-UPDATE.md">Official route evidence</a></nav><h1>B1: continuous outer aisles</h1>
<p class="notice">Uninstalled circulation study. The 3 m aisle width and shop dimensions are provisional. Images use inspection lighting and have no accepted photographic camera registration.</p>
<div class="grid"><figure><img src="before.png" alt="Previous shallow shop recess with a wall blocking the longitudinal path"><figcaption>Before: cross walls divide the outer strip into separate rooms.</figcaption></figure><figure><img src="after.png" alt="Continuous pale aisle with shopfronts set back on the left and escalator well on the right"><figcaption>After, identical camera: a continuous aisle connects all three portals on this side. The opposite side receives the same circulation correction.</figcaption></figure><figure><img src="../../photos/porta-b2-route-03.jpg" alt="Operator photo of the pale B1 corridor and PRONTO frontage"><figcaption>Operator reference, different camera: pale outer shopping corridor. Current fit-out, ceiling design and stone finish remain unfinished.</figcaption></figure></div>
<h2>Verification</h2><p>PROOF</p><nav><a href="native-proof.json">Native surface probes</a><a href="walking-proof.json">Aisle and portal walks</a><a href="interface-proof.json">Floor joins</a><a href="serialization-proof.json">Visual/native serialization</a><a href="component.json">Component and assumptions</a><a href="source-extent.json">Municipal floor extent</a><a href="rejected-camera.json">Rejected camera hypothesis</a></nav>
<h2>Still open</h2><p>The aisle ends need their real Isetan, service and stair connections. B2 geometry, tenant boundaries, material/light fidelity, full-station course checks and representative gameplay performance remain unfinished. This study does not accept a final visual milestone.</p></main></html>'''
page = page.replace('PROOF', f"{len(n['samples']):,} native probes pass, maximum difference {error:.4f} mm. All {len(w['supports'])} support/headroom checks and {len(w['walks'])} actual capsule walks pass. Floor seams are continuous; 711 non-frontage records and four moving lanes remain unchanged apart from material index renumbering. The assembly adds 144 triangles and one material compared with assembly20.")
(out/'index.html').write_text(page)
print(json.dumps(dict(gallery=str(out/'index.html'),probes=len(n['samples']),walks=len(w['walks']))))
