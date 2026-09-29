# Porta western loop and forecourt stair repair

29 September 2026. Connect the missing western mall block and replace the forecourt stair's sealed receiving room.

## Reproduced defect

The old stair ended at Y−4.14 m in a small corridor, while the connected plaza mall is at Y−6.2 m. A normal-speed native walk stopped against its eastern wall at X−17.395, Y−4.115, Z31. Chrome inspection showed the same sealed room. The mall's separate western wall also closed both shopping streets.

The replacement retains the existing ground-level entrance and its opening through the forecourt. Two flights, with 35 fitted risers and a 1.8 m intermediate landing, descend to the actual mall datum. Enclosing walls guard the well; handrails follow both flights and the landing. The obsolete room, directory, lights and stale route are removed. The mall ceiling has an opening above the descent.

Both shopping streets now extend to a western cross-passage, making a connected loop around the missing block. The new wing spans X−46 to 12 m and Z25.2 to 61 m. Fifteen shallow shop rooms have usable entrances. The earlier west lift and B2 stair remain accessible.

## Evidence and limits

Page 1 of the saved [Porta operator floor guide](https://www.porta.co.jp/common/pdf/floor/shopguide_jp.pdf), printed 29 May 2026, establishes the western dining block, North Street, South Street and surrounding cross-passages. The saved [station B1 diagram](https://www.kyoto-station-building.co.jp/floorguide/b1/) corroborates that arrangement. Both diagrams were visually inspected. The operator's saved [west-arrival photograph](https://www.porta.co.jp/common/img/navigation/img_c_b2fw_05.jpg) guides the pale floor, transverse dark bands, glazed portals, tactile route and overhead directions. Reference pixels are not used as game textures.

The existing forecourt entrance is a model registration; this pass does not establish its exact numbered street exit. Lengths, shop partitions, 0.177143 m risers, 0.330435 m goings, finishes and fixture positions are fitted approximations. Detailed shop interiors, other street exits, Isetan connections and Kotochika remain unfinished. This repair extends the usable interior structure; photographic material refinement remains later work.

## Construction and checks

`extract-porta-west.py` reads the editable source and pins the exact retired surfaces. `prepare-porta-west-base.mjs` removes those authored faces while retaining unrelated browser buffer bytes. `build-porta-west.mjs`, `web/v2/compose-component.mjs` and `finalize-east-transfer.mjs` append the replacement and bind the unchanged moving hardware. `install-east-transfer.py` installs it in the same editable station and remaps retained box bindings.

`verify-east-transfer-geometry.mjs` checks matching visual/native geometry and retained records. `verify-porta-west-openings.py` checks the complete new floor footprint, open ceiling well, every tread and the intermediate landing; 36 volumes check at least 2.1 m of headroom against the complete station. Native route verification covers fourteen walks and both forecourt guards. `walk-porta-west-chrome.mjs` exercises the descent, intermediate landing and South Street arrival with actual browser keyboard controls. Ten Chrome views cover the new routes and retained lift.

The replacement adds 640 panels and 7,696 triangles, removing 1,025 old browser triangles. It adds 811,724 browser bytes and eight fixtures sharing the existing two-light pool. All seven lifts and existing escalators retain their geometry and behavior. The saved Blender scene reopens with matching geometry, UVs, normals, materials and collision bindings.

All fourteen native walks pass with 6,301 position samples, plus 120 guard samples. The Chrome keyboard walk reaches every landing and South Street. Ordinary native and Chrome gameplay also pass, including full translation/spin rest, recall and home. The browser asset build passes. Ten inspected Chrome views retain 373 textures and seven reflection captures; short samples have a 16.7 ms median and 16.8 ms p99. These samples are not a sustained performance benchmark.

Private proof files are retained in `.local/v2/current/components/porta-west/` after delivery. The final asset hashes are pinned in `web/v2/assets.json`. Current source and exports replace their predecessors in place; superseded candidate exports are removed after promotion. Publication is local main only.
