from pathlib import Path
p=Path('artifacts/station-detail/plaza-landmarks/review.html')
views=['shukobu','space','kyoto'];html='''<!doctype html><meta charset="utf-8"><title>K028 review</title><style>body{font:16px system-ui;background:#152027;color:#eef;margin:30px}h1{font-size:28px}section{margin:30px 0}article{display:grid;grid-template-columns:1fr 1fr;gap:12px}img,video{width:100%}a{color:#83dded}small{color:#b9cbd2}</style><h1>K028 — three 4F plaza landmarks</h1><p>Matched full-game views: baseline left, candidate right. Dimensions/placement are inferred. Linux SwiftShader capture.</p>'''
for name in views:
 html+=f'<section><h2>{name}</h2>'
 for view in ['approach','opposite','near']:
  html+=f'<h3>{view}</h3><article><img src="baseline/{name}-{view}.png"><img src="candidate/{name}-{view}.png"></article>'
 html+='</section>'
html+='<h2>Base contact views (HUD hidden)</h2>'+''.join(f'<img src="candidate/{name}-opposite-viewport.png">' for name in views)
html+='<h2>Moving camera inspection</h2><video controls src="candidate/inspection.mp4"></video><p>54 sampled full-game frames played at 6 fps. This is camera-path evidence, not real-time performance.</p>'
html+='<p><a href="candidate/anchors.json">Anchors and support evidence</a> · <a href="native.json">Native checks</a> · <a href="scoring-runtime.json">Authoritative scoring</a> · <a href="candidate/browser.json">Browser and cost evidence</a></p>'
p.write_text(html)
