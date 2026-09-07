# Contributing to Kyoto Bounce

Use a branch and a focused pull request. Include the player-facing change, what you tested and any remaining limits. Keep unrelated station redesigns, protocol changes and scoring changes in separate PRs.

1. Follow [local setup](docs/LOCAL_PLAY.md).
2. Make one bounded improvement with a clear acceptance check.
3. Run `npm run typecheck`, `npm test`, and `npm run build:web` when assets are installed.
4. For native changes, rebuild the worker and exercise the actual game. For UI changes, verify the rendered result and controls in a browser. For scores/persistence, verify historical replays and challenge revisions.
5. Open a PR. Include a screenshot or short capture for visible changes when useful. Native test receipts may be summarized; never upload guest tokens or private databases.

Asset changes follow [the asset workflow](docs/ASSETS.md). Editable source and matching runtime exports must travel together. A Blender file cannot be meaningfully merged like text; coordinate ownership before editing the same file.

[Parallel Codex development](docs/PARALLEL_DEVELOPMENT.md) explains how to keep multiple tasks isolated. Automated CI does not deploy the public game. Deployment remains an explicit maintainer action.

Contributions are provided under the project's MIT license. Include attribution and compatible licensing for any new third-party material; do not import game audio, station photos or proprietary asset packs without redistribution rights.
