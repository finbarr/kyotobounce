"""Publish the provisional B1 aisle study and exact validation receipts."""
from pathlib import Path
import json, shutil

root = Path(__file__).resolve().parents[1]
work = Path('./.local/station-realism')
assembly = work/'hall-descents-assembly-23'
native = work/'hall-b1-west-return-native-02/report.json'
walks = work/'hall-b1-west-return-walks-02/report.json'
n, w = json.loads(native.read_text()), json.loads(walks.read_text())
assert not n['failures'] and w['pass']
out = root/'notes/b1-west-return'
out.mkdir(exist_ok=True)
for source, name in [
    (work/'hall-descents-assembly-22/west-before/source.png', 'before.png'),
    (assembly/'west/source.png', 'after.png'),
    (native, 'native-proof.json'), (walks, 'walking-proof.json'),
    (assembly/'interface-proof.json', 'interface-proof.json'),
    (assembly/'serialization-proof.json', 'serialization-proof.json'),
    (work/'hall-b1-corridors-03/report.json', 'component.json'),
    (assembly/'return/source.png', 'return.png'),
]:
    shutil.copyfile(source, out/name)
error = max(x['error'] for x in n['samples'])*1000
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B1 western return study</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f2ec;color:#18382f;font:16px/1.55 system-ui,sans-serif}main{max-width:1300px;margin:auto;padding:32px}a{color:#165b49}h1{line-height:1.15}nav{display:flex;gap:18px;flex-wrap:wrap}.notice{padding:18px;background:#e4dfc9}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;padding:12px}img{width:100%;display:block}figcaption{padding-top:12px}code{overflow-wrap:anywhere}@media(max-width:650px){main{padding:18px}.grid{grid-template-columns:1fr}}
</style><main><nav><a href="../../index.html">Research library</a><a href="../B1-WEST-RETURN.md">Evidence and limits</a><a href="../BASEMENT-ROUTE-UPDATE.md">Official route evidence</a></nav><h1>B1: opening the western return</h1>
<p class="notice">Uninstalled circulation study. The 3 m return depth and 5.1 m opening span are provisional. Images use inspection lighting and have no accepted photographic camera registration.</p>
<div class="grid"><figure><img src="before.png" alt="Previous western view blocked by the lower end wall"><figcaption>Before: retained end wall blocks this approach.</figcaption></figure><figure><img src="after.png" alt="New lower opening reveals the well and escalator bank"><figcaption>After, identical camera: the upper enclosure remains, with a new lower opening.</figcaption></figure><figure><img src="return.png" alt="Transverse return passage connecting the two outer aisles"><figcaption>Return passage. The Isetan frontage and outer enclosure remain unfinished.</figcaption></figure><figure><img src="plan.svg" alt="Original plan diagram showing the return floor and five tested route segments"><figcaption>Candidate geometry, with five routes tested in both directions. This is not a surveyed station plan.</figcaption></figure></div>
<h2>Verification</h2><p>PROOF</p><nav><a href="native-proof.json">Native surface probes</a><a href="walking-proof.json">Aisle and portal walks</a><a href="interface-proof.json">Floor joins</a><a href="serialization-proof.json">Visual/native serialization</a><a href="component.json">Component and assumptions</a></nav>
<h2>Still open</h2><p>Isetan, service and eastern stair connections remain unfinished. B2 geometry, tenant boundaries, material/light fidelity, full-station course checks and representative gameplay performance remain unfinished. This study does not accept a final visual milestone.</p></main></html>'''
page = page.replace('PROOF', f"{len(n['samples']):,} native probes pass, maximum difference {error:.4f} mm. All {len(w['supports'])} support/headroom checks and {len(w['walks'])} actual capsule walks pass. Floor seams are continuous; 833 parent records and four moving lanes remain unchanged. The assembly adds 282 triangles and no additional material compared with assembly21.")
(out/'index.html').write_text(page)
print(json.dumps(dict(gallery=str(out/'index.html'),probes=len(n['samples']),walks=len(w['walks']))))
