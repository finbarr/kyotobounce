# Ground-floor concourse detail

Original modeled detail for the playable central concourse and its existing
frontage bays. This is an interpretation of Kyoto Station, not a measured retail
floorplan or an inventory of every tenant in the whole building.

References checked September 12, 2026:

- [Official 1F map](https://www.kyoto-station-building.co.jp/floorguide/1f/?tenant=sta-bldg): the bar is the western tenant in the east district; 7 Taps is farther east. The model compresses these into its existing east north-facing bays. The three 7 Taps headers identify one continuous frontage, not three shops.
- [Osake no Bijutsukan, Central Gate](https://www.kyoto-station-building.co.jp/restaurant_cafe/124/): current 1F identity and bottle-shelf reference. Original lettering and reconstructed shelves/counter/stools; no photographic textures or copied logos.
- [7 Taps Tavern](https://www.kyoto-station-building.co.jp/restaurant_cafe/002/): current 1F pub/grill identity, counter/dining/display use. Interior dimensions, furniture arrangement, menu artwork and shop-to-model transforms are inferred.
- [Operator route photographs](https://www.kyoto-station-building.co.jp/directions/): central gate, ticket/information frontage, framed notices and covered concourse.
- [Interior Street View](https://www.google.com/maps/@?api=1&map_action=pano&pano=fx-nt8QKKxR0HkRNsB6MCQ&heading=119&pitch=0&fov=75): February 2017 west-concourse vending, poster and fire-equipment reference. Current vending products/brands and exact service-alcove coordinates are not established by this older image.

The service interpretation includes four ticket machines, three drink machines,
two recycling units, fifteen locker doors, a directory, clock, two fire/AED
panels, information counter equipment and framed notices. The west service edge
uses the existing solid cafe volume as backing. High posters are attached to that
same wall. No information desk is invented at an unidentified hotel service door.
The existing West Exit 2F 7-Eleven/Heart-in remains in its established location.

`build.py` appends to the reviewed assets-v3 Blender/layout pair. It preserves all
baseline boxes, beams and panels, checks the bounds of 52 new native solid
fixtures, and embeds the exact new layout bytes in the editable blend. Appliance
edge bevels remain within their native box hulls. Display dressing behind existing
solid shop glazing has no new accessible collision; all projecting public-side
fixtures have native boxes. The rounded bottles, counter furniture and artwork
are original. Research photographs stay outside the asset pack and Git.

`concourseDetails` metadata travels with the exported station bundle.
`web/public/concourse-details.js` draws 64 registered artwork faces into a single
4096×2048 filtered atlas and one mesh. No new dynamic lights or per-frame artwork
redraw. Old bundles lacking this metadata receive none of the additions. The
previous production layout and its six browser/collision assets are retained in
the archive registry before new exports are installed.

Rebuild from the installed assets-v3 checkout, or pass `--baseline DIRECTORY`
containing its `KyotoAtrium.blend` and `station-layout.json`:

```sh
blender -b -t 2 --python-exit-code 1 --python web/station/concourse/build.py -- --output .local/concourse-candidate
blender -b -t 2 --python-exit-code 1 --python web/station/assembly/export-browser.py -- --source .local/concourse-candidate/KyotoAtrium.blend --layout .local/concourse-candidate/station-layout.json --output .local/concourse-candidate/browser
blender -b -t 2 --python-exit-code 1 --python tools/build_atrium_detail.py -- --layout .local/concourse-candidate/station-layout.json --output .local/concourse-candidate/browser --source-output .local/concourse-candidate/hardware-source
```

`native-check.mjs OUTPUT` uses an explicit `KYOTO_LAYOUT` and compatible
`KYOTO_WORKER_EXECUTABLE` to check appliance faces and the five latest courses,
including three Last Order deliveries at full translation/spin rest. Catch the
Lift uses the previously proven escalator release phase. It is a controlled
native proof; ordinary browser timing remains a separate interaction check.
The new Catch the Lift hint includes that timing cue. Only the new Last Order
revision increases its destination radius from 0.9 to 1.05 m, accommodating the
observed delivery variation while staying inside the shop floor. Historical
course JSON, attempts and scoreboards remain unchanged.
