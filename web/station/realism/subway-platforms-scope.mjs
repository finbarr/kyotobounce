import assert from 'node:assert/strict';
export function retiredSubwayPlatformPanels(layout){
 const ids=['south-side-170','south-north-return','corridor-wall-155.5','corridor-base-155.4','corridor-band-155.4','gate-flap-2','paid-screen-base','paid-screen',...[-48,-44,-40,-36].map(z=>'wall-joint-155.4-'+z)].map(id=>'subway-passage-'+id);
 assert(ids.every(id=>layout.panels.some(p=>p.id===id)));return ids;
}
