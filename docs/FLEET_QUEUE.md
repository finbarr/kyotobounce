# Kyoto development work

Updated 2026-09-13. The accepted station-additions batch is complete: **22/22 packages**, including K033, K035, K036 and K038–K056. This pass used one local worktree and no remote machines.

- [Completed station acceptance checklist](STATION-DETAIL-BACKLOG.md)
- [Current implementation, references and verification](../web/station/additions/README.md)
- [Source-to-model mappings and limits](STATION-REFERENCE-AUDIT.md)
- [Current inspection cameras](STATION-AUDIT-VIEWS.json)

The current source/asset bundle contains the additions. Production deployment is a separate, explicitly requested action; this station pass did not deploy. No Unity C# or worker binary changed: the compatible worker loads the matching station layout at startup.

Retired machine assignments, obsolete release receipts and superseded station queues are removed. The Git history contains prior completed work. Keep only the current playable scene and course catalog.

For future bounded assignments, use [PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md): separate worktrees, ports, databases and logs; one integration owner for the shared layout and asset manifest; native and browser evidence before integration. Do not start additional agents or machines without a current delegation request.
