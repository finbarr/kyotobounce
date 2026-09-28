"""Publish the rejected relay proposal and retain the actual Chrome failure."""
from pathlib import Path
import hashlib, html, json, shutil
ROOT=Path(__file__).resolve().parents[1]
LOCAL=Path('/Users/finbarr/.codex/worktrees/performance-audit/kyoto/.local/station-realism')
OUT=ROOT/'notes/relay-proposal'
OUT.mkdir(exist_ok=True)
read=lambda p:json.loads(p.read_text())
files={
 'placement.json':'relay-route-proposal-01/report.json',
 'catalog.json':'relay-route-proposal-01/catalog.json',
 'native-original-report.json':'relay-route-proof-01/report.json',
 'native-corrected-summary.json':'relay-route-proof-01/corrected-summary.json',
 'native-hint.json':'relay-route-proof-01/0.json',
 'native-repeat.json':'relay-route-proof-01/1.json',
 'native-angle-neighbor.json':'relay-route-proof-01/2.json',
 'native-charge-plus.json':'relay-route-proof-01/3.json',
 'native-charge-minus.json':'relay-route-proof-01/4.json',
 'browser-report.json':'relay-browser-01/report.json',
 'browser-replay.json':'relay-browser-01/replay.json',
 'browser-aim.png':'relay-browser-01/aim.png',
 'browser-result.png':'relay-browser-01/result.png',
 'reduced-spin-study.json':'relay-route-study-04/report.json',
 'steeper-launch-study.json':'relay-route-study-05/report.json',
 'forward-spin-study.json':'relay-route-study-06/report.json',
 'runtime.json':'runtime-relay-01/candidate-runtime.json',
}
for name,source in files.items():shutil.copyfile(LOCAL/source,OUT/name)
proof=read(OUT/'native-corrected-summary.json');assert not proof['pass']
assert [r['fullClear'] for r in proof['results']]==[True,True,False,False,False]
browser=read(OUT/'browser-report.json');assert not browser['pass'] and not browser['errors']
r=read(OUT/'browser-replay.json')['replay'];assert len(r['waypointHits'])==1 and not r['success']
assert browser['result']['diagnostics']['sleeping']
assert all(v==0 for field in ['velocity','spin'] for v in browser['result'][field].values())
new=read(OUT/'native-hint.json');before=read(LOCAL/'relay-before-proof-01/0-kyoto-cascade5.json')
course=next(c for c in read(OUT/'catalog.json') if c['id']=='kyoto-cascade5')
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640"><title>Original relay, proposed B1 relay, and failed keyboard throw</title><rect width="960" height="640" fill="#192029"/>']
for label,axis,ox,oy,w,h,bounds in [('Plan · height omitted','z',35,45,880,180,(-110,20,-14,14)),('Elevation · depth omitted','y',35,315,880,250,(-110,20,-34,8))]:
 xmin,xmax,ymin,ymax=bounds;scale=min(w/(xmax-xmin),h/(ymax-ymin));xy=lambda x,y:(ox+(x-xmin)*scale,oy+(y-ymin)*scale)
 svg.append(f'<text x="35" y="{oy-15}" font-family="sans-serif" font-size="18" fill="white">{label}</text>')
 for trace,color in [(before,'#64bfff'),(new,'#f5b266'),(r,'#ee82a4')]:
  pts=' '.join('%.2f,%.2f'%xy(p['p']['x'],-p['p'][axis]) for p in trace['poses'][::3])
  svg.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2"/>')
 for i,p in enumerate(course['waypoints'],1):
  x,y=xy(p['center']['x'],-p['center'][axis]);svg.append(f'<circle cx="{x}" cy="{y}" r="{max(2,p["radius"]*scale)}" fill="none" stroke="white"/><text x="{x+5}" y="{y-10}" fill="white" font-family="sans-serif" font-size="12">{i}</text>')
 x,y=xy(r['poses'][-1]['p']['x'],-r['poses'][-1]['p'][axis]);svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#ee82a4"/>')
svg.append('<text x="35" y="615" fill="#64bfff" font-family="sans-serif" font-size="15">Original exact hint</text><text x="275" y="615" fill="#f5b266" font-family="sans-serif" font-size="15">B1 proposal: exact hint</text><text x="600" y="615" fill="#ee82a4" font-family="sans-serif" font-size="15">Keyboard: 1 / 7 targets</text></svg>')
(OUT/'route.svg').write_text(''.join(svg))
links=''.join(f'<li><a href="{name}">{html.escape(name)}</a></li>' for name in files)
(OUT/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unaccepted relay proposal</title><style>body{margin:0;background:#121920;color:#e7eef5;font:16px/1.6 system-ui}main{max-width:1000px;margin:auto;padding:24px 18px}a{color:#8dcaff}h1{line-height:1.2}img{width:100%;height:auto}p,li{overflow-wrap:anywhere}.status{padding:16px;background:#342831;border-left:4px solid #ee82a4}figure{margin:24px 0}figcaption{color:#bac6d1}</style><main><a href="../../index.html">Research library</a><h1>A feasible B1 line, still too sensitive to play</h1><p class="status">Unaccepted proposal. Two exact native throws collect all seven targets, but nearby inputs fail. The real Chrome keyboard throw at 5.013 m/s hits only target 1. No playable catalog or geometry was replaced.</p><p>The proposal retains the upper start, first target, seven radii and successive public levels. Five later targets move within their original levels; target 7 moves onto a native-validated fixed B1 floor. Its 173 m path is longer than the original 158 m. Forward spin replaces the original backspin.</p><figure><img src="route.svg" alt="Plan and elevation of original, proposed, and failed keyboard trajectories"><figcaption>Circles mark the proposed targets. The orange path is an exact native solution; it is not evidence of keyboard usability.</figcaption></figure><figure><img src="browser-aim.png" alt="Chrome showing the upper start and 5 m/s hint"><figcaption>Actual Chrome controls: H sets the proposed aim and spin; Space charges the throw.</figcaption></figure><figure><img src="browser-result.png" alt="Chrome result showing one of seven targets collected"><figcaption>Partial score at full physical rest: 52,681 points, one of seven targets, course incomplete. Local test database only.</figcaption></figure><p><a href="../RELAY-PROPOSAL.md">Full findings, verifier correction and remaining work.</a></p><h2>Evidence</h2><ul>'''+links+'</ul></main></html>')
(OUT/'manifest.json').write_text(json.dumps({'status':'Unaccepted; native neighbors and actual Chrome fail','files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir() if p.is_file() and p.name!='manifest.json'}},indent=2)+'\n')
print(OUT)
