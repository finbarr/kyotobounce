// Archive boot is read-only. It must complete before creating a live WebSocket.
export async function archiveBoot(){
 const attempt=new URL(location.href).searchParams.get('replay');if(!attempt)return null;
 const response=await fetch('/api/archive/replay?attempt='+encodeURIComponent(attempt),{cache:'no-store'}),data=await response.json();
 if(!response.ok)throw new Error(data.error||'Matching replay assets are unavailable');
 if(!data.replay||data.bundle?.layout!==data.replay.layout)throw new Error('Replay and archived station identity differ');
 for(const file of Object.values(data.bundle.assets)){if(!file.url?.startsWith(`/assets/layouts/${data.replay.layout}/`))throw new Error('Invalid archive asset URL');}
 return data;
}
export function replayNavigation(attempt){return '/?replay='+encodeURIComponent(attempt);}
