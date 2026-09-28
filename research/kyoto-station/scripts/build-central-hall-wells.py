"""Publish verified complete floor openings and source-derived guard construction."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('./.local/station-realism')
OUT = ROOT / 'notes/central-hall-wells'
OUT.mkdir(exist_ok=True)
load = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
files = {
    'spec.json': 'central-hall-bay-spec-07/spec.json',
    'component.json': 'central-hall-bay-11/report.json',
    'floor-proof.json': 'central-hall-bay-11/floor-proof.json',
    'serialization.json': 'central-hall-bay-11/serialization.json',
    'normals.json': 'central-hall-bay-11/normals.json',
    'native.json': 'central-hall-bay-native-11/report.json',
    'walks.json': 'central-hall-well-walk-02/report.json',
    'before.png': 'central-hall-bay-11/render-before07/source.png',
    'after.png': 'central-hall-bay-11/render-overview/source.png',
    'close.png': 'central-hall-bay-11/render-close/source.png',
    'render-before.json': 'central-hall-bay-11/render-before07/projection.json',
    'render-after.json': 'central-hall-bay-11/render-overview/projection.json',
    'render-close.json': 'central-hall-bay-11/render-close/projection.json',
}
build = load(WORK / files['component.json'])
native = load(WORK / files['native.json'])
walks = load(WORK / files['walks.json'])
floor = load(WORK / files['floor-proof.json'])
assert floor['pass'] and walks['pass'] and not native['failures']
assert len(walks['walks']) == 18 and len(walks['wellCutouts']) == 3
assert build['outputs']['nativePanelsSha256'] == floor['nativeSha256'] == native['nativePanelsSha256'] == walks['componentNativeSha256']
assert build['outputs']['glbSha256'] == native['glbSha256'] == walks['componentGlbSha256']
assert sha(WORK / files['spec.json']) == build['specSha256']
assert load(WORK / files['render-after.json'])['assetSha256'] == build['outputs']['glbSha256']
assert load(WORK / files['render-close.json'])['assetSha256'] == build['outputs']['glbSha256']
assert load(WORK / files['render-before.json'])['camera'] == load(WORK / files['render-after.json'])['camera']
for dest, src in files.items():
    shutil.copyfile(WORK / src, OUT / dest)
failed = load(WORK / 'central-hall-bay-native-10/report.json')
assert len(failed['failures']) == 1
rejected = dict(glbSha256=failed['glbSha256'], nativePanelsSha256=failed['nativePanelsSha256'],
                failures=failed['failures'], samples=[s for s in failed['samples'] if s['error'] is None or s['error'] > .001],
                pass_=False, explanation='A 0.236 mm nearly collinear floor-boundary edge produced an ill-conditioned long triangle. Coalescing one vertex moves the outline less than 0.3 micrometres. Native 1 mm and footprint 1e-6 m² tolerances are unchanged.')
rejected['pass'] = rejected.pop('pass_')
(OUT / 'rejected-collision.json').write_text(json.dumps(rejected, indent=2) + '\n')
max_error = max(s['error'] for s in native['samples'])
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Central hall · complete well openings</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f2ec;color:#203b33;font:16px/1.55 system-ui}main{max-width:1320px;margin:auto;padding:32px}h1{font-size:clamp(32px,5vw,50px);line-height:1.1}h2{margin-top:32px}nav{display:flex;gap:18px;flex-wrap:wrap}a{color:#17614d}.notice{background:#fff0d1;border-left:4px solid #ad7b1b;padding:18px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0}img{width:100%;height:auto;display:block}figcaption,small{font-size:13px;color:#52675e}li{margin:8px 0}code{overflow-wrap:anywhere}@media(max-width:700px){main{padding:18px}.grid{grid-template-columns:1fr}}
</style><main><nav><a href="../../index.html">Research library</a><a href="../CENTRAL-HALL-WELLS.md">Evidence note</a><a href="../central-hall-basement/index.html">Source maps and photographs</a></nav><h1>Three complete openings,<br>with their curbs and guards.</h1><p>The hall floor now preserves the full source well shapes. The two escalator wells and central oval have source-derived glass bodies, metal caps and curbs, with open approaches retained.</p><p class="notice"><strong>Uninstalled construction component.</strong> This establishes the above-ground floor and guard geometry. Moving descents, basement lining, lower landings, blue glass decoration and full-station integration remain unfinished. The central oval's purpose is still unverified.</p><h2>Matched construction views</h2><div class="grid"><figure><a href="before.png"><img src="before.png" alt="Earlier passage component with only the southern tips of the floor openings"></a><figcaption>Before: passage07. The sample intersected only the southern tips of the basement openings.</figcaption></figure><figure><a href="after.png"><img src="after.png" alt="Expanded floor with all three complete well openings and source guards"></a><figcaption>After: component11, exactly the same camera. Inspection lighting; no accepted photographic registration or performance measurement.</figcaption></figure></div><h2>Walking-height review</h2><figure><a href="close.png"><img src="close.png" alt="Walking-height view of the curved glass guard, metal cap and dark stone curb"></a><figcaption>The well remains visibly empty below the floor because its descents and lower architecture are not constructed yet. Glass color/decoration, surface finish, joint aliasing and lighting still need work.</figcaption></figure><h2>Verified geometry and routes</h2><ul><li>452.96 m² of floor with three complete openings and 370 paving slabs. One native floor surface continues across the joints.</li><li>All 1,616 original guard/cap source triangles are preserved exactly after the declared height shift. Fifteen horizontal sections match; the source's open glass/cap interfaces are closed at their original boundary vertices.</li><li>Every browser/native vertex, triangle index and face normal passes. The component has 14,976 triangles, eight material batches and nine original 512 px maps.</li>'''
page += f'<li>{len(native["samples"]):,} isolated native ray probes pass; maximum hit difference {max_error*1000:.5f} mm. The unchanged limit is 1 mm.</li>'
page += '''<li>Eighteen native walks pass: six through the gate and twelve around the wells, including both narrow gaps beside the oval. Three downward native queries confirm the openings remain unfilled.</li><li>The failed prior collision probe is retained. One nearly collinear boundary vertex was removed to fix the long, thin floor triangle; the outline shift stays below 0.3 micrometres.</li></ul><h2>Next construction</h2><p>Build the paired descents and supported lower route, reconcile the first landing independently of the official B2F route destination, and resolve the Balcony course footprints before replacing the station floor. This component's checks do not establish whole-station gameplay, final visual fidelity or the long Chrome/audio performance gates.</p><nav>'''
page += ''.join(f'<a href="{file}">{label}</a>' for file,label in [
    ('spec.json','Specification'), ('component.json','Construction report'), ('floor-proof.json','Source and footprint proof'),
    ('serialization.json','Export agreement'), ('normals.json','Face normals'), ('native.json','All native probes'),
    ('walks.json','Eighteen walks'), ('rejected-collision.json','Prior collision failure')])
page += '</nav><p><small>Source geometry: Kyoto City, CC BY 4.0. Photographs were references only. The full station remains courtyard life04/browser04; no deployment.</small></p></main></html>'
(OUT / 'index.html').write_text(page)
(OUT / 'publication-receipt.json').write_text(json.dumps(dict(files={n:sha(OUT/n) for n in [*files,'rejected-collision.json','index.html']},
    componentGlbSha256=build['outputs']['glbSha256'], componentNativeSha256=build['outputs']['nativePanelsSha256'],
    nativeSamples=len(native['samples']), nativeMaximumErrorM=max_error, walks=len(walks['walks']), fullStationChanged=False,
    finalVisualAcceptance=False), indent=2) + '\n')
print(OUT / 'index.html')
