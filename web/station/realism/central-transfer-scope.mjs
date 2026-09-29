// The exact bridge floor, closures and provisional track extension replaced here.
import assert from 'node:assert/strict';
export function retiredTransferPanels(layout) {
  const ids=layout.panels.filter(p=>[
    'railway-paid-floor','railway-end-parapet--128','railway-end-glass--128',
    'shinkansen-paid-north-wall','kintetsu-corrected-railway-wire-10',
  ].includes(p.id)||p.id.startsWith('kintetsu-corrected-railway-track-10-')||p.id.startsWith('kintetsu-jr10-buffer')).map(p=>p.id);
  assert.equal(ids.length,16,'Expected the Kintetsu-delivery parent');
  return ids;
}
