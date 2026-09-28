import sharp from 'sharp';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {hash} from '../../benchmarks/source-variant.mjs';
const folder=process.argv[2]||'.local/station-realism/views-baseline';
const research=process.argv[3]||'research/kyoto-station';
const manifestBytes=await readFile(path.join(folder,'views.json'));
const manifest=JSON.parse(manifestBytes);
const notes=JSON.parse(await readFile('web/station/realism/review-notes.json','utf8'));
const capture=JSON.parse(await readFile(path.join(folder,'capture.json'),'utf8'));
if(hash(manifestBytes)!==capture.manifestHash)throw Error('Capture manifest hash mismatch');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await mkdir(path.join(folder,'references'),{recursive:true});
const cards=[],tiles=[];
for(const [i,v] of manifest.views.entries()){
 const receipt=capture.views.find(x=>x.id===v.id);if(!receipt)continue;
 let file=v.source.localFile;
 if(v.id==='hachijo-terrace')file='plans/hachijo-facility-plan.png';
 if(v.id==='south-facade-plaza')file='plans/hachijo-page6.png';
 const ref=`references/${v.id}${path.extname(file)}`;
 await copyFile(path.join(research,file),path.join(folder,ref));
 const cpu=receipt.timing.renderCpuMs.p95.toFixed(1),gpu=receipt.timing.gpuMs?.p95.toFixed(1)??'unavailable';
 cards.push(`<section id="${v.id}"><h2>${esc(v.id)}</h2><p class="status">Registration pending · ${v.lighting} · ${manifest.viewport.width}×${manifest.viewport.height}</p><div class="pair"><figure><a href="${esc(ref)}"><img loading="lazy" src="${esc(ref)}"></a><figcaption>Reference: <a href="${esc(v.source.url)}">${esc(v.source.id)}</a> · source date ${esc(v.source.date||'unknown')}${v.source.page?` · PDF page ${v.source.page}`:''}</figcaption></figure><figure><a href="${v.id}.png"><img loading="lazy" src="${v.id}.png"></a><figcaption>Current game · CPU render p95 ${cpu} ms · GPU p95 ${gpu} ms · ${receipt.timing.drawCalls.p95} draw calls</figcaption></figure></div><p>${esc(notes[v.id])}</p><details><summary>Camera and proposed landmarks</summary><pre>${esc(JSON.stringify({camera:v.camera,registration:v.registration},null,2))}</pre></details></section>`);
 tiles.push({input:await sharp(path.join(folder,v.id+'.png')).resize(384,216).png().toBuffer(),left:i%3*384,top:Math.floor(i/3)*246});
 tiles.push({input:Buffer.from(`<svg width="384" height="30"><rect width="384" height="30" fill="white"/><text x="8" y="20" font-size="14">${esc(v.id)}</text></svg>`),left:i%3*384,top:Math.floor(i/3)*246+216});
}
await sharp({create:{width:1152,height:Math.ceil(manifest.views.length/3)*246,channels:3,background:'white'}}).composite(tiles).png().toFile(path.join(folder,'contact-sheet.png'));
await writeFile(path.join(folder,'index.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kyoto Station reconstruction baseline</title><style>body{font:16px/1.55 system-ui;margin:auto;max-width:1500px;padding:32px;background:#f4f2ed;color:#202827}h1{font-size:36px}a{color:#1c6258}section{background:white;border:1px solid #ddd9ce;border-radius:12px;padding:24px;margin:24px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{width:100%;height:370px;object-fit:contain;background:#e6e4dd}figcaption,.status{font-size:14px;color:#52635f}pre{overflow:auto;font-size:12px}nav{display:flex;gap:12px;flex-wrap:wrap}@media(max-width:800px){body{padding:12px}.pair{grid-template-columns:1fr}img{height:auto}}</style><h1>Kyoto Station: reconstruction baseline</h1><p>Captured ${esc(capture.date)} in Chrome ${esc(capture.browser)} from the actual local game. These 15 inspection views establish visible gaps. None has passed photo registration or the final visual rubric. Reference media is for local research and is excluded from the game and Git.</p><p>Short GPU-instrumented captures are diagnostic; the separate full-game baseline failed the frame-time targets at two fixed views. These short captures do not replace that result.</p><nav>${manifest.views.map(v=>`<a href="#${v.id}">${esc(v.id)}</a>`).join('')}</nav>${cards.join('')}`);
console.log('Review gallery:',folder+'/index.html');
