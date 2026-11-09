# Visual quality batch — consolidated delivery

| Release | Base / implementation | Automated verification |
| --- | --- | --- |
| v0.32 | `7d26252`: original crafted roofs/grass/vessels, painted tiles, city/worksite dressing, ambient/construction movement, RGB-only cloud fog | 257 server; 13,048 portable C# assertions; 70 C#/3 PowerShell hygiene |
| v0.33 | `e6cda3f`: one bounded commander VFX pool, distinct real shield/heal/volley/melee styles, coordinated combat motion, actual health/shield presentation, original skill cues | 257 server; 16,114 portable assertions; 72 C#/3 PowerShell hygiene |
| v0.34 | Current release commit: HUD/navigation, item/report layouts, Skills/Development, research/campaign flow, optional city/Captain opening, versioned Linux delivery | 263 server; 16,241 portable assertions; 79 C#/3 PowerShell hygiene; Bash/Node syntax |

Each release was implemented and verified before moving to the next. Source
commits are distinct. No gameplay balance, currency, AP cost, acquisition,
combat calculation or migration was changed. Protocol 16/schema 15 remain.
The only backend configuration addition is an optional local-playtest port.

Original asset provenance: v0.32 uses deterministic original geometry plus
`tools/build_craft_textures.py`; v0.33 adds original synthesized cues via
`tools/build_skill_audio.py`. No reference-game or downloaded artwork was added.
Shared mesh/material caches, scenery batching, the eight-lease/32-particle cap,
strategic LOD and audio limits remain. These are engineering bounds, not FPS data.

## Actual verification boundary

**Unity is unavailable in the cloud.** No Linux player executable was generated,
no new native headless Unity build/import contracts ran, and no rendering, font,
shader appearance, animation/audio synchronization, mouse/keyboard or FPS result
is claimed. Six Linux package/launcher tests ran the actual server with a **stub
client**; those establish launcher integrity, save and cleanup behavior only.

The Native Unity/Windows/Linux aesthetic acceptance criteria remain open. Some
legacy modular art, panels and pose previews remain. The source work is ready for
the requested independent Linux gameplay review, not a claim of final production
visual quality. Record the actual combined build before deciding its next art pass.

## Delivery and next action

Build on an installed Unity 6000.3.0f1 with Linux Build Support (Mono), using the new
menu or shell helper. The ZIP contains the real Unity client **when built**, matching
server, launcher, version/commit stamp and hashes. Linux requires host Node 24+.

[Exact Linux build, fresh-player showcase and recording matrix](playtest-linux-0.34.md)

[World/city details and provenance](art-release-0.32.md) ·
[Combat details and provenance](combat-release-0.33.md) ·
[UI and engineering details](ui-release-0.34.md)
