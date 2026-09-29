import assert from 'node:assert/strict';
export function retiredHachijoEastPanels(layout) {
 const ids=['hachijo-entrance-paid-floor','hachijo-entrance-ground-south-east'];
 assert(ids.every(id=>layout.panels.some(p=>p.id===id)),'Expected the Hachijo ground entrance parent');
 return ids;
}
