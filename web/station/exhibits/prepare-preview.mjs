// Isolated assembled app. No canonical asset, layout, registry or exporter writes.
import {readFile,writeFile,mkdir,readdir,symlink,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve('.'),base=resolve('.local/station-detail'),app=join(base,'app'),candidate=join(base,'candidate');
async function links(from,to){await mkdir(to,{recursive:true});for(const e of await readdir(from,{withFileTypes:true})){const src=join(from,e.name),dest=join(to,e.name);if(e.isDirectory())await links(src,dest);else {await rm(dest,{force:true});await symlink(src,dest);}}}
await mkdir(join(app,'web'),{recursive:true});for(const e of await readdir('web',{withFileTypes:true}))if(e.isFile()){const to=join(app,'web',e.name);await rm(to,{force:true});await symlink(join(root,'web',e.name),to);}
await links(resolve('web/public'),join(app,'web/public'));
for(const name of ['node_modules','runtime']){await rm(join(app,name),{force:true});await symlink(join(root,name),join(app,name));}
const manifest=JSON.parse(await readFile(join(candidate,'manifest.json')));
for(const name of ['station.json','atrium-detail.json']){const p=join(app,'web/public/assets',name);const data=JSON.parse(await readFile(p));if(name==='station.json')data.layoutSha256=manifest.layoutSha256;else data.sourceLayoutSha256=manifest.layoutSha256;data.k029Candidate={baseLayout:'7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775',layers:manifest.layers};await rm(p);await writeFile(p,JSON.stringify(data));}
for(const name of ['grand','upright','miniature']){const to=join(app,'web/public/assets',`k029-${name}.glb`);await rm(to,{force:true});await symlink(join(candidate,`k029-${name}.glb`),to);}
let game=await readFile('web/public/game.js','utf8');game=game.replace('    stationLook.captureEnvironment();',`    if(data.layoutSha256==='${manifest.layoutSha256}') { for(const name of ['grand','upright','miniature']){const exhibit=await loader.loadAsync('/assets/k029-'+name+'.glb');exhibit.scene.traverse(o=>{if(o.isMesh){o.geometry.computeBoundsTree();o.receiveShadow=true;o.castShadow=!o.material.transparent;}});station.add(exhibit.scene);}station.updateMatrixWorld(true);
    window.k029Layout='${manifest.layoutSha256}'; }
    stationLook.captureEnvironment();`);
const gamePath=join(app,'web/public/game.js');await rm(gamePath);await writeFile(gamePath,game);
// Local QA starter only; cloned rules/geometry, new candidate layout, private DB.
const starter=JSON.parse(await readFile('web/starter-challenges.json'));
for(const c of starter){c.layout=manifest.layoutSha256;c.physics='kyoto-p3-3';}
const starterPath=join(app,'web/starter-challenges.json');await rm(starterPath);await writeFile(starterPath,JSON.stringify(starter));
console.log(`Prepared ${app}; candidate ${manifest.layoutSha256}`);
