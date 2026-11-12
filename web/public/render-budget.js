// A 50 FPS stream can still have a 16.7 ms median: most frames meet one refresh,
// while the remainder miss it. Include those misses when adapting resolution.
export function renderBudget(frameTimes,{allowIncrease=true,transitioning=false}={}){
 if(transitioning)return 'hold';
 const recent=frameTimes.slice(-120).filter(ms=>Number.isFinite(ms)&&ms>0&&ms<100).sort((a,b)=>a-b);
 if(recent.length<90)return 'hold';
 const mean=recent.reduce((sum,ms)=>sum+ms,0)/recent.length,p95=recent[Math.floor(recent.length*.95)];
 if(mean>18||p95>25)return 'over-budget';
 if(allowIncrease&&mean<17.2&&p95<18)return 'headroom';
 return 'hold';
}
