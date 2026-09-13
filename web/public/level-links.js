import {copyLink} from './replay-links.js';
export const levelIdFromPath=path=>path.match(/^\/level\/([a-zA-Z0-9_-]{1,64})\/?$/)?.[1]||null;
export const levelURL=(id,origin=location.origin)=>`${origin}/level/${encodeURIComponent(id)}`;
export async function fetchLevel(id){
 const response=await fetch(`/api/level/${encodeURIComponent(id)}`);
 if(!response.ok)throw new Error(response.status===404?'Level not found. It may have been removed.':'Could not load this level. Please try again.');
 return response.json();
}
export const copyLevel=(id,button)=>copyLink(levelURL(id),button,'level');
