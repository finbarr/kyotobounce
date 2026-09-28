"""Publish private full-station basement integration evidence to the research library."""
from pathlib import Path
import json,shutil,html,hashlib
root=Path('/Users/finbarr/code/games/kyoto/research/kyoto-station')
work=Path('/Users/finbarr/.codex/worktrees/performance-audit/kyoto');local=work/'.local/station-realism';out=root/'notes/hall-full-integration';out.mkdir(exist_ok=True)
receipts={
 'native-scope.json':'station-hall-basement-04/scope-proof.json',
 'physics-equivalence.json':'station-hall-basement-04/physics-equivalence.json',
 'materials.json':'hall-basement-browser-04/attribute-proof.json',
 'browser-scope.json':'hall-basement-browser-04/scope-proof.json',
 'floor-boundary-unresolved.json':'hall-basement-browser-04/concourse-coverage-comparison.json',
 'course-conflicts.json':'hall-full-course-support-04/report.json',
 'b1-walks.json':'full-station-b1-return-01/report.json',
 'motion.json':'hall-basement-motion-01/proof.json',
 'compression.json':'hall-basement-browser-04/compression.json',
 'runtime-workspace.json':'runtime-hall-basement-01/candidate-runtime.json'}
for name,source in receipts.items():shutil.copyfile(local/source,out/name)
for name in ['overview','overview-clear','b1-west']:
 shutil.copyfile(local/f'hall-basement-views-01/{name}/source.png',out/f'{name}.png')
 shutil.copyfile(local/f'hall-basement-views-01/{name}/projection.json',out/f'{name}.json')
course=json.loads((out/'course-conflicts.json').read_text());catalog={c['id']:c for c in json.loads((work/'web/starter-challenges.json').read_text())};rows=[]
for c in course['changes']:
 result=c['after'];rows.append('| '+c['course']+' | '+c['feature']+' | '+('Accepted, but surface identity changes to `'+result['surface']+'`.' if result['ok'] else result['message'])+' |')
report='''# Private full-station basement integration

28 September 2026. [Visual inspection gallery](hall-full-integration/index.html).

## Result

The basement assembly is now exported within a private complete-station candidate. Three well openings, four moving lanes, the lower floor, enclosure and provisional B1 return/outer aisles are visible together with the retained station. This candidate has **not** replaced the active courtyard-life station or been committed, pushed or deployed.

The broader reconstruction goal remains active. This is a construction review; the plain blue walls, shop bays, floor palette and inspection lighting do not pass the photorealism rubric.

## Architecture and scope

- Final native candidate: `station-hall-basement-04`; browser: `hall-basement-browser-04`.
- The old `concourse` panel is replaced by 263 selected component records, including its cut replacement. All 34,872 unrelated native panels are retained exactly.
- Four basement lanes join **18 existing lanes**, for **22 total**. Earlier working notes that assumed 20 existing lanes were incorrect.
- The gate/upper-bay sample is excluded. The retained broad gate facade and upper route geometry still need coordinated reconstruction.
- The official [station floor guide](https://www.kyoto-station-building.co.jp/floorguide/) and [Porta guide](https://www.porta.co.jp/floor) were rechecked during this continuation. They distinguish B1F and B2F but do not establish the missing metric B2 elevation. Refer to [the route evidence](BASEMENT-ROUTE-UPDATE.md) for dated photographs and current/historical distinctions.

## Native checks

[Ten complete-station B1 return walks and 35 support/headroom checks](hall-full-integration/b1-walks.json) pass. These tests ran on native candidate02. The final candidate04 changes duplicated vertex/index representation for eight flat landing panels; [the equivalence receipt](hall-full-integration/physics-equivalence.json) proves every native triangle corner, triangle order, surface ID, material and mechanism remains exact.

This equivalence supports reuse of that physics evidence. It does not establish all-course playability, all four rides in the complete station, or a new full-game runtime/soak pass.

## Course conflicts: full target footprints

The [before/after placement audit](hall-full-integration/course-conflicts.json) checks all 74 authored concourse features across 17 courses with each feature's actual radius. All 74 pass before the change. Afterward, **16 placements are rejected and four change surface identity**, across six courses. The remaining 54 retain their authored placement and surface.

This supersedes the earlier center-only count of ten conflicts. No course locations or scores were changed. Real wells must stay open while the affected routes are reconstructed.

| Course | Feature | Result after integration |
|---|---|---|
'''+ '\n'.join(rows)+'''

## Export and motion corrections

The source landing plates had inappropriate smooth corner normals. Eight panels now use flat face normals without changing physical triangles. Blender still reset one nearly degenerate corner to its default normal; restoration matches the entire oriented triangle and requires all incident faces to agree. Unknown positions, changed UVs and ambiguous attributes still reject without writing. Five focused regression tests pass.

[All 191,286 installed vertices and 17 material definitions pass comparison](hall-full-integration/materials.json), with maximum normal error 0.04944 degrees under the unchanged 0.05-degree gate. Six added texture images preserve their source effective channels. The [scope check](hall-full-integration/browser-scope.json) retains 1,900 unrelated batches, all 304 previous images byte-for-byte and all 489 previous material definitions semantically unchanged. Three existing batches change through the intended floor cut and its coplanar edge removal.

The actual game's moving-step code reads `atrium-detail.json`, so passing endpoints only to a component viewer was insufficient. The private runtime now receives a derived detail JSON containing the eight new comb supports. All 22 lanes have endpoint pairs, and new endpoints match their native support footprint. Original hardware geometry and its historical source-layout hash remain unchanged; derived motion metadata has a separate current-layout hash. Four unused inherited support entries remain documented. This is not a new audit of inherited hardware geometry.

## Unresolved floor-boundary check

[The stricter concourse comparison remains failed](hall-full-integration/floor-boundary-unresolved.json). A first comparison incorrectly required hidden native floor faces to remain in the browser mesh: about 385.45 m² were already omitted by the preceding export's overlap removal.

Applying the new native cut to the preceding visible floor leaves only 0.00015733 m² of difference. The differences disappear after a two-micrometre inward buffer, consistent with thin Float32 slivers. Nevertheless, the boundary Hausdorff check fails because microscopic slits alter boundary topology; the measured 10.85 m distance is between boundaries, not the width of a floor hole. The original failure and raw measurements remain saved. A triangle-level clipping audit is still needed before claiming complete floor export parity; no tolerance was relaxed to label this pass.

## Browser inspection and cost

Three Chrome screenshots were inspected. The first elevated view is obstructed by retained columns; the centered view better shows the three openings, while the lower view shows the western return and bank underside. All use the same complete station asset and 22-lane motion metadata at time 8 seconds. They use inspection lighting and omit separate detail/decal layers; they are not actual-game photographic acceptance views.

- Raw browser GLB: 288,445,832 bytes; 2,234,498 triangles; 1,919 batches; 506 materials; 310 images.
- Lossless runtime GLB: **122,594,080 bytes**, up **1,902,356 bytes (1.58%)** from the preceding candidate.
- Added cost: 63,799 triangles, 16 batches, 17 materials and six images. No measured FPS claim is made.
- `npm run build:web`, five export-helper regression tests and `git diff --check` pass.
- One packaging attempt used the wrong optimizer result field and wrote no runtime asset. The corrected package uses `output`, and its hash is recorded below.

## Final identities

| Artifact | SHA-256 |
|---|---|
| Native layout | `3707bd0adda7e5efb69de7cd95127fcd0f92ec9437c2ceb24b4eaff67f3d16ee` |
| Raw browser GLB | `9809936587732ac0733f2c16b243b4e833a16b83152d4a5df09289d8e451d26a` |
| Compressed runtime GLB | `4c803d0f98442145c7705ecdc3de93bec970bee7f0517dd751961057ba66aeb4` |
| Derived detail metadata | `71aaa1785bf0583e122cff79201f9ea28cb2d279e9a68c7fd5edcbac2793c919` |

## Next work

Resolve floor clipping evidence, then reconcile the six affected courses against their intended routes and the new physical surfaces. Complete adjoining hall/gate architecture and obtain defensible B2 geometry. The provisional shop dimensions and materials still need reference registration. All fifteen visual comparisons, broader plazas/street fronts/vegetation/lighting, complete runtime checks, paired gameplay performance and the twenty-minute audio/context soak remain required. All processes started for these checks have finished.
'''
(root/'notes/HALL-FULL-INTEGRATION.md').write_text(report)
figures=[('overview-clear','Centered full-station view','All three openings are visible; foreground columns, plain finishes and retained gate geometry remain.'),('b1-west','Western B1 return','Provisional shop bays and underside cladding; current inspection lighting does not model final reflections or shadows.'),('overview','First elevated view — obstructed','Retained columns block part of the view. Kept as diagnostic evidence, not an accepted reference camera.')]
body=''.join(f'<figure><img src="{n}.png" alt="{html.escape(title)}"><figcaption><strong>{html.escape(title)}</strong> — {html.escape(text)}</figcaption></figure>'for n,title,text in figures)
links=''.join(f'<li><a href="{name}">{html.escape(name)}</a></li>'for name in receipts)
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kyoto Station — private basement integration</title><style>body{margin:0;background:#161a20;color:#e4e8ef;font:16px/1.6 system-ui}main{max-width:1100px;margin:auto;padding:32px 20px}a{color:#95cfff}h1{line-height:1.2}figure{margin:28px 0}img{display:block;width:100%;height:auto;border:1px solid #59616d;box-sizing:border-box}figcaption{padding:10px 0;color:#bdc7d5}.status{padding:16px;background:#383123;border-left:4px solid #d4ae63}code{overflow-wrap:anywhere}</style><main><a href="../../index.html">Research library</a><h1>Basement in the complete station</h1><p>28 September 2026 · Private construction candidate · Chrome inspection lighting</p><p class="status">Not accepted for the game: 16 authored placements fail, four change surface identity, and a floor-boundary check remains unresolved. Photographic materials, B2 and adjoining architecture are unfinished.</p><p>Ten complete-station return walks pass. All 191,286 new vertices and 17 materials pass source comparison. The lossless station asset grows by 1.9 MB. <a href="../HALL-FULL-INTEGRATION.md">Read the complete evidence and limitations.</a></p>'''+body+'<h2>Evidence receipts</h2><ul>'+links+'</ul></main></html>'
(out/'index.html').write_text(page)
validation={'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in out.iterdir()if p.is_file()and p.name!='manifest.json'},'sourceWorktree':str(work),'status':'private unaccepted candidate; failures retained'}
(out/'manifest.json').write_text(json.dumps(validation,indent=2)+'\n')
print(out)
