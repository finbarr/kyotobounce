"""Publish the verified, uninstalled hall descent construction receipt."""
from pathlib import Path
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
WORK=Path('/Users/finbarr/.codex/worktrees/performance-audit/kyoto/.local/station-realism')
OUT=ROOT/'notes/hall-descents';OUT.mkdir(exist_ok=True)
load=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
build=load(WORK/'hall-descents-02/report.json');assembly=load(WORK/'hall-descents-assembly-02/report.json');native=load(WORK/'hall-descents-native-03/report.json');motion=load(WORK/'hall-descents-02/motion-proof.json')
assert native['summary']['pass'] and native['summary']['walks']==24 and native['summary']['rides']==4
assert native['nativeSha256']==assembly['outputs']['nativePanelsSha256']
assert motion['nativeSha256']==build['outputs']['nativePanelsSha256']
files={
 'before.png':ROOT/'notes/central-hall-wells/after.png',
 'after.png':WORK/'hall-descents-assembly-02/overview/source.png',
 'close.png':WORK/'hall-descents-assembly-02/close/source.png',
 'component.json':WORK/'hall-descents-02/report.json',
 'assembly.json':WORK/'hall-descents-assembly-02/report.json',
 'spec.json':WORK/'hall-descents-spec-01/spec.json',
 'joins.json':WORK/'hall-descents-spec-01/joins.json',
 'joins-proof.json':WORK/'hall-descents-02/joins-proof.json',
 'geometry-proof.json':WORK/'hall-descents-02/geometry-proof.json',
 'serialization-proof.json':WORK/'hall-descents-02/serialization-proof.json',
 'motion-proof.json':WORK/'hall-descents-02/motion-proof.json',
 'native.json':WORK/'hall-descents-native-03/report.json',
 'prior-probe-failure.json':WORK/'hall-descents-native-01/report.json',
 'overview-camera.json':WORK/'hall-descents-assembly-02/overview/projection.json',
 'close-camera.json':WORK/'hall-descents-assembly-02/close/projection.json'
}
for name,src in files.items():shutil.copyfile(src,OUT/name)
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Central hall · basement descents</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f2ec;color:#203b33;font:16px/1.55 system-ui}main{max-width:1320px;margin:auto;padding:32px}h1{font-size:clamp(32px,5vw,50px);line-height:1.1}h2{margin-top:32px}nav{display:flex;gap:18px;flex-wrap:wrap}a{color:#17614d}.notice{background:#fff0d1;border-left:4px solid #ad7b1b;padding:18px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0}img{width:100%;height:auto;display:block}figcaption,small{font-size:13px;color:#52675e}li{margin:8px 0}code{overflow-wrap:anywhere}@media(max-width:700px){main{padding:18px}.grid{grid-template-columns:1fr}}
</style><main><nav><a href="../../index.html">Research library</a><a href="../HALL-DESCENTS.md">Evidence note</a><a href="../central-hall-basement/index.html">Source maps and photographs</a></nav><h1>Four moving lanes,<br>with a supported lower landing.</h1><p>Both escalator banks now follow the municipal source's lane positions, widths and incline. The assembly retains all three upper openings, all existing guards and the lower deck's two holes.</p><p class="notice"><strong>Uninstalled construction candidate.</strong> Source-specific handrail profiles, shared bank cladding, well walls, retail architecture, blue glass decoration and lighting remain unfinished. These views do not pass the final visual rubric. The first lower deck's B1F/B2F identity remains unresolved.</p><h2>Same-camera construction comparison</h2><div class="grid"><figure><a href="before.png"><img src="before.png" alt="Hall floor and guards before the basement escalators were added"></a><figcaption>Before: hall11, with empty wells. Camera and inspection lighting are unchanged.</figcaption></figure><figure><a href="after.png"><img src="after.png" alt="Hall assembly with four escalator lanes and a lower floor"></a><figcaption>After: descent02 plus unchanged hall11. This is an isolated component viewer, not the full game.</figcaption></figure></div><h2>Walking-height review</h2><figure><a href="close.png"><img src="close.png" alt="Two descending lanes with moving treads, landing covers, handrails and unfinished well surroundings"></a><figcaption>The source-derived landing infills close the strips beside the covers. Thick inherited handrails, exposed side spaces, plain surfaces and missing lower architecture remain visible work items.</figcaption></figure><h2>What is established</h2><ul><li>Four lanes, approximately 0.985 m wide, with a 4.914 m rise, 8.480 m inclined run and 30.09° incline. Speed, direction, chain easing and housing sections remain explicit game settings.</li><li>The lower floor retains its 157.810 m² footprint and two holes. All 590 parent hall records remain identical.</li><li>125 closed component records and 63,576 triangles, in four material batches. Browser/native vertices and indices agree within 0.536 µm after Float32 export.</li><li>128,000 tread-height samples across 80 phases pass. Adjacent visible treads and both comb joins have no gaps within the unchanged 10 µm numerical tolerance.</li><li>324 native support/headroom points, 24 through walks and four standing rides pass. Moving-tread support is established by walking, because the placement API intentionally rejects moving targets.</li><li>Chrome inspection renders and the browser asset build pass. Full-game frame timings, all-course integration and the twenty-minute audio/context soak remain open.</li></ul><h2>Next connected work</h2><p>Complete the bank casing and source-specific rails, resolve the lower route and well walls, and reconcile nearby Balcony course support before replacing the station floor. The rest of the station, both plazas and street frontages remain in the active goal.</p><nav>'''
for file,label in [('spec.json','Measured specification'),('component.json','Component'),('assembly.json','Assembly'),('joins-proof.json','Floor and landing proof'),('geometry-proof.json','Closed shells and chain envelope'),('serialization-proof.json','Export agreement'),('motion-proof.json','Tread motion'),('native.json','Native walks and rides'),('prior-probe-failure.json','Initial placement failure')]:page+=f'<a href="{file}">{label}</a>'
page+='''</nav><p><small>Kyoto City source geometry: CC BY 4.0. Official route evidence: <a href="https://www.kyoto-station-building.co.jp/directions/">Kyoto Station Building</a>. Source photographs remain references. Full-station candidate remains courtyard life04/browser04; no deployment. Construction review: 28 September 2026.</small></p></main></html>'''
(OUT/'index.html').write_text(page)
(OUT/'publication-receipt.json').write_text(json.dumps(dict(files={n:sha(OUT/n)for n in [*files,'index.html']},componentGlbSha256=build['outputs']['glbSha256'],componentNativeSha256=build['outputs']['nativePanelsSha256'],assemblyGlbSha256=assembly['outputs']['glbSha256'],nativeSummary=native['summary'],fullStationChanged=False,finalVisualAcceptance=False),indent=2)+'\n')
print(OUT/'index.html')
