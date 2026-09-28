# B1 escalator underside: source audit and metal finish

28 September 2026. [Before/after review](bank-cladding/index.html). This is an uninstalled material/detail candidate, not final photographic acceptance.

## Evidence changes the interpretation

The apparent bulk in the previous B1 corridor render comes from the two municipal source bank bodies. Eight vertical cross-sections give 1.45006–1.45025 m thickness through the middle incline. The working return extension reaches roughly 1.2 m below the tread profile. These measurements do not prove as-built dimensions, but they explain the existing mass; the available unregistered photograph does not justify thinning it.

The [Porta route photograph](../photos/porta-b2-route-05.jpg) clearly shows panel joints and a perforated underside. That supports a finish change. The candidate retains the source casing and attaches original metal detail to its exact two sloping underside triangles on each bank.

## Construction

- 24 nominal panels, represented by 36 closed pieces where panel boundaries cross the source's slightly different triangle planes.
- Two panel columns and six rows per bank. Source cladding areas: 21.0824 m² west and 21.0827 m² east.
- 6 mm panel gaps, 2 mm sheet thickness, outer face 3 mm from the source, 18 mm perforation pitch and 5 mm hole diameter are **provisional finish dimensions**, not measured from the photograph.
- Three original 512 px maps supply color, normal and metal/roughness response. Perforations are shaded recesses, not transparent holes or individual geometry. No source photograph pixels are included.
- 440 added triangles, one added material batch, three textures with an estimated 4 MiB RGBA allocation including mipmaps. Combined GLB grows by 163,060 bytes to 6,376,028 bytes. This is asset accounting, not a measured full-game frame-time result.

## Verification

All 786 parent records, including 639 colliding records and four escalator mechanisms, compare exactly. Every new cladding piece has `collision:false`; the native scene builder respects it. Every attachment stays inside its original source triangle projection and 1–3 mm outside the source face. No meaningful panel overlap is introduced. [Attachment proof](bank-cladding/attachment-proof.json).

Combined browser/native serialization agrees for all 66,306 triangles, with maximum Float32 coordinate error 1.035 micrometres. The browser build and diff check pass. Two final Chrome views were inspected. Existing assembly19 native probe and doorway-walk receipts remain evidence for the unchanged physical inputs; no new native or full-game runtime run is claimed.

## Artifacts

Existing worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`.

- Spec: `.local/station-realism/hall-bank-cladding-spec-01/spec.json`.
- Component: `.local/station-realism/hall-bank-cladding-01`.
- Assembly: `.local/station-realism/hall-descents-assembly-20`.
- Tools: `prepare-hall-bank-cladding.py`, `build-hall-bank-cladding.mjs`, `verify-hall-bank-cladding.py`.

## Remaining work

The close views are inspection poses, not registered photo matches. Perforation pitch, panel modules, reflective response and lighting need matched references; the repeating pattern needs moving-camera review in the game. B1 tenant frontage dimensions remain provisional. The B2 return flight, B1 passage continuation, course reconciliation, installation and wider visual/performance gates remain open. The full station remains courtyard life04/browser04.

Next work should resolve the lower circulation and adjoining hall connections, rather than adding more small escalator details.
