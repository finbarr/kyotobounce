import assert from 'node:assert/strict';
export function retiredHachijoPanels(layout) {
  const ids=layout.panels.filter(p=>['shinkansen-paid-floor','shinkansen-ground-south-wall'].includes(p.id)).map(p=>p.id);
  assert.equal(ids.length,2,'Expected the central-transfer parent');
  return ids;
}
