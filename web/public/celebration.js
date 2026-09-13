// Achievement tiers are cosmetic. Only the authoritative result chooses them.
export function celebrationProfile(result){
 if(!result?.saved||!(result.score>0)||['forfeit','route-missed'].includes(result.breakdown?.outcome))return {tier:0,label:'',duration:0};
 const rank=result.standings?.rank,contenders=result.standings?.before?.length||0;
 let tier=result.score>=20_000_000?5:result.score>=5_000_000?4:result.score>=1_000_000?3:result.score>=100_000?2:1;
 if(result.records?.personalBest)tier=Math.max(tier,2);
 if(rank&&rank<=10)tier=Math.max(tier,3);
 if(rank&&rank<=3&&contenders>=3)tier=Math.max(tier,4);
 if(rank===1&&contenders>=3)tier=5;
 return {tier,label:['','NICE SHOT','PERSONAL BEST ENERGY','VICTORY DANCE','PODIUM PARTY','JACKPOT!'][tier],duration:[0,2.2,3.4,4.6,5.6,6.4][tier]};
}
