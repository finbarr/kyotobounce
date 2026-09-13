// Presentation reads authoritative scores. It never awards points.
export function scoreAt(frames,time){
 if(!frames?.length||time<frames[0].t)return null;
 let low=0,high=frames.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(frames[mid].t<=time)low=mid;else high=mid-1;}
 return frames[low].score;
}
export const HEAT_STAGES=[
 {name:'BUILD YOUR LINE',at:0,color:0xf1673d},
 {name:'SPARK',at:25_000,color:0x79ffb8},
 {name:'GOLD RUSH',at:100_000,color:0xffd34d},
 {name:'ON FIRE',at:350_000,color:0xff592c},
 {name:'THUNDERBALL',at:1_000_000,color:0x55dfff},
 {name:'HYPERDRIVE',at:5_000_000,color:0xf27aff},
 {name:'MEGA JACKPOT',at:20_000_000,color:0xffefaa}
];
export const currentScore=score=>!!score&&['waypoint-v3','combo-v7'].includes(score.version);
export function heatTier(score){
 if(!currentScore(score))return 0;
 const earned=Number(score.total)||0;
 return HEAT_STAGES.findLastIndex(stage=>earned>=stage.at);
}
export function collectedIds(score){return new Set(score?.version==='waypoint-v3'?(score.waypointIds||[]):[]);}
export const actionCount=score=>(score?.styleBanks||0)+(score?.waypointCount||0)+(score?.destinationReached?1:0);
export function scoreEvents(previous,score){
 if(!currentScore(score))return [];
 if(previous&&(score.styleBanks<previous.styleBanks||(score.waypointCount||0)<(previous.waypointCount||0)))return [];
 const events=[],banks=score.styleBanks-(previous?.styleBanks||0),waypoints=(score.waypointCount||0)-(previous?.waypointCount||0);
 if(banks>0)events.push({kind:'bank',label:score.lastBank||'CLEAN BANK',multiplier:score.bankMultiplier,count:banks});
 if(waypoints>0)events.push({kind:'waypoint',label:waypoints===2?'DOUBLE TARGET':waypoints>2?`${waypoints} TARGETS AT ONCE`:`TARGET ${score.waypointCount}`,multiplier:score.waypointMultiplier/2,count:waypoints});
 if(score.version==='waypoint-v3'?score.destinationReached&&!previous?.destinationReached:score.goalVisited&&!previous?.goalVisited)events.push({kind:score.version==='waypoint-v3'?'destination':'goal',label:score.version==='waypoint-v3'?'DESTINATION BONUS':'TARGET TAGGED',multiplier:score.bankMultiplier,count:1});
 // Changes in position, spin, time or landing accuracy cannot ring the machine.
 const tier=heatTier(score);
 if(events.length&&tier>heatTier(previous))events.push({kind:'special',label:HEAT_STAGES[tier].name,tier,multiplier:score.bankMultiplier,count:1});
 return events;
}

// A tier promotion must not hide a simultaneous target collection. Its color
// and ball effect still advance, while the popup explains the earned targets.
export function pendingScoreEvent(pending,event){
 if(pending?.kind==='waypoint'&&pending.count>1&&event.kind==='special')return {...pending,tier:event.tier};
 return !pending||event.kind!=='bank'?event:pending;
}
