// Exact provisional surfaces replaced by the Kintetsu terminal connection.
import assert from 'node:assert/strict';
export function retiredKintetsuPanels(layout){
 const ids=layout.panels.filter(p=>['southern-gates-kintetsu-rear-wall','southern-gates-kintetsu-flap-4','railway-10-platform','railway-wire-10'].includes(p.id)||/^railway-10-(west-|coping-|tactile-)/.test(p.id)||p.id.startsWith('railway-track-10-')||/^shinkansen-viaduct-pier--(225|200|175|150|125|100)--134$/.test(p.id)).map(p=>p.id);
 assert.equal(ids.length,54,'Expected Shinkansen-delivery parent');return ids;
}
