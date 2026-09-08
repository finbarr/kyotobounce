import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {RECORDED_PHYSICS,SUPPORTED_SCORING} from './types.ts';
export type AssetFile={url:string;bytes:number;sha256:string};
export type StationBundle={layout:string;assets:Record<'atrium'|'station'|'detail'|'detailMeta'|'robot'|'collision',AssetFile>};
export class LayoutAssets{
 private verified=new Map<string,string>();
 bundles:Record<string,StationBundle>;publicRoot:string;
 constructor(bundles:Record<string,StationBundle>,publicRoot=resolve('web/public')){this.bundles=bundles;this.publicRoot=publicRoot;}
 static async load(path=resolve('web/layout-assets.json'),publicRoot=resolve('web/public')){const data=JSON.parse(await readFile(path,'utf8'));if(data.version!==1||!data.layouts)throw new Error('Invalid layout asset registry');return new LayoutAssets(data.layouts,publicRoot);}
 has(layout:string){return /^[a-f0-9]{64}$/.test(layout)&&Object.hasOwn(this.bundles,layout);}
 async bundle(layout:string):Promise<StationBundle>{
  if(!this.has(layout))throw new Error('Matching station assets are not registered. This replay is unavailable.');
  const bundle=this.bundles[layout];if(bundle.layout!==layout)throw new Error('Archive layout identity mismatch');
  for(const key of ['atrium','station','detail','detailMeta','robot','collision'] as const){
   const file=bundle.assets[key];if(!file||!file.url.startsWith(`/assets/layouts/${layout}/`)||file.url.includes('..')||file.url.includes('\\')||!/^\/[a-zA-Z0-9_./-]+$/.test(file.url)||!Number.isSafeInteger(file.bytes)||! /^[a-f0-9]{64}$/.test(file.sha256))throw new Error('Invalid archived asset entry');
   const path=resolve(this.publicRoot,'.'+file.url);if(!path.startsWith(this.publicRoot+sep))throw new Error('Invalid archived asset path');
   const info=await stat(path).catch(()=>null);if(!info?.isFile()||info.size!==file.bytes)throw new Error('Matching station assets are missing or corrupt. No replacement geometry will be used.');
   const identity=`${info.size}:${info.mtimeMs}:${info.ctimeMs}:${file.sha256}`;
   if(this.verified.get(path)!==identity){const hash=createHash('sha256');for await(const part of createReadStream(path))hash.update(part);if(hash.digest('hex')!==file.sha256)throw new Error('Matching station asset checksum failed. No replacement geometry will be used.');this.verified.set(path,identity);}
  }
  if(bundle.assets.collision.sha256!==layout)throw new Error('Archived collision does not match layout identity');
  const station=JSON.parse(await readFile(resolve(this.publicRoot,'.'+bundle.assets.station.url),'utf8'));
  const detail=JSON.parse(await readFile(resolve(this.publicRoot,'.'+bundle.assets.detailMeta.url),'utf8'));
  if(station.layoutSha256!==layout||detail.sourceLayoutSha256!==layout)throw new Error('Archived station metadata does not match the replay layout');
  return bundle;
 }
 async replay(replay:any){
  if(!replay)throw new Error('Replay not found');
  if(!RECORDED_PHYSICS.includes(replay.physics)||!['ori-grip-v1','ori-carry-v2'].includes(replay.animation)||!SUPPORTED_SCORING.includes(replay.scoring||'distinct-v1'))throw new Error('Replay uses an unsupported animation, physics or scoring version');
  return {replay,bundle:await this.bundle(replay.layout)};
 }
}
