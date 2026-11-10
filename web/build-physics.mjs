import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
export async function buildBrowserPhysics(output='.local/browser-physics/worker.js'){
 await mkdir(new URL('../.local/browser-physics/',import.meta.url),{recursive:true});
 return build({entryPoints:['web/public/physics/worker.js'],bundle:true,format:'esm',platform:'browser',target:['chrome120','firefox121','safari17'],outfile:output,legalComments:'eof'});
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])await buildBrowserPhysics();
