export const replayIdFromPath=path=>path.match(/^\/replay\/([a-zA-Z0-9_-]{1,64})\/?$/)?.[1]||null;
export const replayURL=(attempt,origin=location.origin)=>`${origin}/replay/${encodeURIComponent(attempt)}`;
export async function fetchReplay(attempt,{signal}={}){
 const response=await fetch(`/api/replay/${encodeURIComponent(attempt)}`,{signal});
 if(!response.ok)throw new Error(response.status===404?'Replay not found. This shot may no longer be available.':'Could not load this replay. Please try again.');
 return (await response.json()).replay;
}
export async function copyReplay(attempt,button){
 const url=replayURL(attempt),label=button.textContent;
 try{await navigator.clipboard.writeText(url);button.textContent='LINK COPIED ✓';setTimeout(()=>button.textContent=label,2200);}
 catch{
  const panel=document.createElement('dialog');panel.className='share-link-dialog';
  const title=document.createElement('h2');title.textContent='Share this replay';
  const input=document.createElement('input');input.readOnly=true;input.value=url;input.setAttribute('aria-label','Replay link');
  const close=document.createElement('button');close.textContent='Done';close.onclick=()=>panel.close();panel.append(title,input,close);
  panel.onclose=()=>panel.remove();document.body.append(panel);panel.showModal();input.select();
 }
}
