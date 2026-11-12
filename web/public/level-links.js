import {copyLink} from './replay-links.js';
export const levelIdFromPath=path=>path.match(/^\/level\/([a-zA-Z0-9_-]{1,64})\/?$/)?.[1]||null;
export const levelURL=(id,origin=location.origin)=>`${origin}/level/${encodeURIComponent(id)}`;
export const copyLevel=(id,button)=>copyLink(levelURL(id),button,'level');
