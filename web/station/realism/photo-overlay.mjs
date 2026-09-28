// Compare a measured photo camera with the municipal source and optional game capture.
// Reference photographs remain in ignored research output.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const fitPath=resolve(process.argv[2]),out=dirname(fitPath),fit=JSON.parse(await readFile(fitPath));
assert(out.startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const photo=await readFile(fit.reference.localFile);assert.equal(sha(photo),fit.reference.sha256);
await copyFile(fit.reference.localFile,out+'/reference.jpg');
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const title=fit.reference.displayTitle||'North facade',viewId=fit.reference.viewId||'north-facade';
assert(/^[a-z0-9-]+$/.test(viewId));
const {width,height}=fit.camera.viewport;
const markers=fit.anchors.map((a,i)=>`<g><line x1="${a.referenceViewportPixel[0]}" y1="${a.referenceViewportPixel[1]}" x2="${a.projectedViewportPixel[0]}" y2="${a.projectedViewportPixel[1]}" stroke="#ffbe45"/><circle cx="${a.referenceViewportPixel[0]}" cy="${a.referenceViewportPixel[1]}" r="5" fill="none" stroke="${a.use==='fit'?'#55ffb2':'#4de7ff'}" stroke-width="2"/><path d="M ${a.projectedViewportPixel[0]-4} ${a.projectedViewportPixel[1]-4} l 8 8 m 0 -8 l -8 8" stroke="#ff5c73" stroke-width="2"/><text x="${a.referenceViewportPixel[0]+7}" y="${a.referenceViewportPixel[1]-8}" fill="white" stroke="black" stroke-width="3" paint-order="stroke" font-size="16">${i+1}</text></g>`).join('');
const lines=(fit.lineConstraints||[]).map(l=>{
 const [a,b]=l.imageEndpointViewportPixels;
 return `<g><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#eb9eff" stroke-width="3"/>${l.projectedViewportPixels.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#ff5c73"/>`).join('')}</g>`;
}).join('');
let game=null,gameView=null;
if(process.argv[3]){
 const folder=resolve(process.argv[3]);assert(folder.startsWith(resolve('.local')+'/'));
 game=JSON.parse(await readFile(folder+'/capture.json'));gameView=game.views.find(v=>v.id===viewId);assert(gameView);
 const screenshot=await readFile(folder+'/'+viewId+'.png');assert.equal(sha(screenshot),gameView.imageSha256);
 assert.deepEqual(gameView.camera.position,fit.camera.position);assert.equal(gameView.camera.fov,fit.camera.fov);
 assert.deepEqual(gameView.buffer,{width,height});
 const source=JSON.parse(await readFile(out+'/render/projection.json'));
 gameView.camera.quaternion.forEach((v,i)=>assert(Math.abs(v-source.camera.quaternion[i])<1e-10));
 await copyFile(folder+'/'+viewId+'.png',out+'/game.png');await writeFile(out+'/game-capture.json',JSON.stringify(game,null,2)+'\n');
}
const rows=fit.anchors.map((a,i)=>`<tr><td>${i+1}</td><td>${esc(a.name)}</td><td>${a.use}</td><td>${a.residualPixels.toFixed(2)} px</td></tr>`).join('');
const lineRows=(fit.lineConstraints||[]).map(l=>`<tr><td>Line</td><td>${esc(l.name)}</td><td>${l.use}</td><td>${Math.max(...l.perpendicularResidualPixels).toFixed(2)} px perpendicular</td></tr>`).join('');
await writeFile(out+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} photo registration</title><style>body{margin:0;background:#18201f;color:#e8f0ea;font:16px/1.5 system-ui}main{max-width:1280px;margin:auto;padding:20px}h1{line-height:1.15}svg{width:100%;display:block}a{color:#95dbc3}label{display:inline-block;margin:12px 20px 12px 0}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:8px;border-bottom:1px solid #40514b}.status{color:#f1ce80}input[type=range]{width:250px;max-width:40vw}select{max-width:100%}</style><main><h1>${esc(title)}: measured camera candidate</h1><p class="status">${fit.fitLandmarks} fitted points and ${fit.checkLandmarks} withheld point checks${lines?`; ${(fit.lineConstraints||[]).length} line constraint(s)`:''}. This registers source geometry; it does not accept the reconstruction.</p><p><a href="${esc(fit.reference.url)}">Original architectural photograph</a> · ${esc(fit.reference.date)}. The municipal layer is Kyoto City’s recovered station shell.</p>${game?`<p class="status">${esc(gameView.inspectionNote)} <a href="game-capture.json">Game capture receipt</a></p><label>Layer <select id="layer"><option value="game.png">Actual game candidate</option><option value="render/source.png">Municipal source used for registration</option></select></label>`:''}<label>Model opacity <input id="opacity" type="range" min="0" max="1" step=".01" value=".45"></label><label><input id="markers" type="checkbox" checked> Landmarks</label><svg id="stage" viewBox="0 0 ${width} ${height}"><defs><clipPath id="frame"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#frame)"><image href="reference.jpg" width="${width}" height="${fit.reference.size[1]*fit.imageTransform.scale}" y="${-fit.imageTransform.cropTopPixels}"/><image id="model" href="${game?'game.png':'render/source.png'}" width="${width}" height="${height}" opacity=".45"/><g id="points">${markers}${lines}</g></g></svg><p>Green circles: fitted photo points. Blue circles: withheld photo checks. Red crosses: projected geometry. Amber lines: disagreement. Purple: photo line constraint. Uniform scale/crop only; no perspective warp or geometry movement.</p><p>Fit RMS ${fit.fitRmsPixels.toFixed(2)} px; fit maximum ${fit.fitMaxPixels.toFixed(2)} px; check maximum ${fit.checkMaxPixels.toFixed(2)} px. Tolerance ${fit.tolerancePixels.toFixed(2)} px at ${width} px width. ${esc(fit.model)}.</p><p>${esc(fit.methodNote||'Camera calibration and source geometry remain uncertain.')}</p><table><thead><tr><th>#</th><th>Landmark</th><th>Use</th><th>Residual at ${width} px</th></tr></thead><tbody>${rows}${lineRows}</tbody></table><p><a href="fit.json">Fit receipt and sensitivity</a> · <a href="camera.json">Camera</a> · <a href="render/projection.json">Source render receipt</a></p></main><script>const model=document.getElementById('model'),points=document.getElementById('points'),opacity=document.getElementById('opacity'),markers=document.getElementById('markers');document.querySelector('#layer')?.addEventListener('change',e=>model.setAttribute('href',e.target.value));opacity.oninput=()=>model.setAttribute('opacity',opacity.value);markers.onchange=()=>points.style.display=markers.checked?'':'none';</script></html>`);
console.log(out+'/index.html');
