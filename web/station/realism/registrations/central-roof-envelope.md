# Central canopy source registration

Source: Kyoto City municipal station model, CC BY 4.0; exact object, SHA-256 and face IDs are in `central-roof-envelope.json`.

`audit-central-roof.mjs` reproduces the downward seed pick and connected-face angle trials. The 30-degree trial selects 113 outward/upward triangles: 65 main roof, 24 western transverse and 24 eastern transverse. The 40-degree trial additionally selects twelve vertical side faces; preserve those in the source interface. The eastern and western flares are registered separately.

The exact outer source vertices form one orientable surface with 97 vertices, 113 triangles and 79 boundary edges. `build-central-roof.mjs` retains those coordinates and creates one closed glazing shell by offsetting the back along averaged normals. The provisional 24 mm offset does not represent a verified glass specification. No internal caps are added across source triangulation.

Grid parameters use the existing source central profile and measured longitudinal slope. The transverse profiles are independently intersected at renderer Z=0 and corrected for the plan rotation. Maximum projection distances are 7.36, 2.83 and 1.80 mm respectively; these are parameterization residuals, not survey errors. The 1.44 m pitch and phase remain assumptions. The nominal 100 mm tube is corroborated by World Architecture 61, printed p43; the 2 m inner truss is not yet constructed.

Commands, from the worktree root:

```sh
node web/station/realism/audit-central-roof.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/central-roof-audit-01
node web/station/realism/build-central-roof.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/roof-registration/fit-02/fit.json .local/station-realism/station-east-clearance-01/station-layout.json .local/station-realism/central-roof-02
```

Component 02 has 3,155 closed panels and 38,232 triangles, two material batches and exact browser/native winding correspondence. Every outer and inner glass triangle plus 24 frame samples are covered by the 250 passing native probes. An independent rebuild has identical bytes. See `STATE.md` for current hashes and remaining interference. The full playable candidate, central corridor and inner structure have not changed.

Qualitative source corroboration: FUJISASH historical aerial `QA97036-27`, Kanebako structural photographs 590/592, and the published sections/axonometric. Cameras are not matched. The source inner shell obstructs the hall inspection; it must be registered before removal, not hidden to claim an interior pass.
