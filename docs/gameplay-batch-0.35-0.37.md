# v0.35–v0.37 delivery

Three sequential releases, preserving protocol 16, schema 15 and existing economy.

| Release | Completed player-facing work | Verification |
| --- | --- | --- |
| v0.35 `42c2979` | Independent march orders, Stop/Recall, approximate route ETA, interruption/home feedback, bounded original arrow volleys | 265 server tests; 16,337 portable C# assertions |
| v0.36 `75e905b` | Clickable real prerequisites, private same-march commander comparison, inventory icons, period-aware reward confirmation, optional opening actions | 268 server tests; 16,343 portable C# assertions |
| v0.37 (this release) | Live alliance roster/help, matching-build join, bounded metrics, measured visibility/status reuse, real two-player restart proof | 275 server tests; 16,349 portable C# assertions |

Details: [army control](army-control-0.35.md), [progression](progression-0.36.md),
[multiplayer/readiness](multiplayer-0.37.md), [measurements](validation/measurements-0.37.md).
The release commit itself supplies the final v0.37 reference; build manifests bake
that exact source commit. No self-referential placeholder hash is shipped.

What can be played after a native rebuild: the existing city, progression,
training, commanders, mixed armies, gathering/cargo, PvE/PvP, alliances, help,
trading, garrisons and rallies with the improvements above. No extra combat
mechanics, currencies, rewards or balance changes were added by this batch.

No Unity Editor/client was available here. Linux/Windows binaries, native visuals,
input, audio, FPS and two-client UI have **not** been verified. Follow the complete
[build and playtest procedure](playtest-linux-0.37.md) before judging presentation.
