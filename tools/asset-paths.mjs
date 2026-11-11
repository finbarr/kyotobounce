// Runtime inputs only. Editable Blender originals stay in the current source
// bundle; never archive an entire .local/, research or authoring directory.
export const validAssetPath=p=>typeof p==='string'&&/^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.startsWith('/')&&!p.split('/').some(s=>s==='..'||s==='.'||!s);
export function currentAssetPaths(config){
 if(config.layout!==config.motionLayout)throw Error('Use one canonical layout path for station and motion');
 const files=[config.layout,config.geometry,config.station,config.detail,config.hardware,'web/public/assets/ori.glb'];
 if(files.some(p=>!validAssetPath(p))||new Set(files).size!==6)throw Error('Invalid current station asset paths');
 return files.sort();
}
