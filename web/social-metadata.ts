export const SOCIAL_ORIGIN='https://kyotobounce.com';
export const HOME_TITLE='Kyoto Bounce — Station Arcade';
export const HOME_DESCRIPTION='One ball. Endless angles. Ricochet through Kyoto Station, chain waypoints, chase arcade jackpots, and share your wildest shots. Play free in your browser.';
const image=`${SOCIAL_ORIGIN}/brand/kyoto-bounce-social.jpg`;
const imageAlt='Kyoto Bounce arcade artwork: an ivory robot throws a glowing orange ball through the steel-and-glass Kyoto Station atrium.';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function socialMetadata({title=HOME_TITLE,description=HOME_DESCRIPTION,path='/',unavailable=false}:{title?:string;description?:string;path?:string;unavailable?:boolean}={}){
 const url=SOCIAL_ORIGIN+path;
 return `<!-- social:start -->
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${escape(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kyoto Bounce">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(url)}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="600">
<meta property="og:image:alt" content="${imageAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${imageAlt}">${unavailable?'\n<meta name="robots" content="noindex">':''}
<!-- social:end -->`;
}
// Replace the entire home block, so crawlers never see competing title/image tags.
export function socialPage(shell:string,options:Parameters<typeof socialMetadata>[0]){
 const block=/<!-- social:start -->[\s\S]*?<!-- social:end -->/;
 if(!block.test(shell))throw new Error('Missing social metadata block in the browser shell');
 return shell.replace(block,()=>socialMetadata(options));
}
