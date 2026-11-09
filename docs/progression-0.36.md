# v0.36.0 — Civilization progression experience

Based on v0.35 `42c2979`. Building and technology snapshots now include typed,
server-derived prerequisites (kind, ID, name, current/required level, satisfied).
City context, district list and research expose clickable prerequisite navigation;
no client parsing of lock-reason text or bypass of construction/research rules.
Maximum-level cards do not advertise impossible future dependencies.

Owned commander comparison is a private read-only authenticated endpoint. It
reuses World.stats for the same march's troops, equipment, research and city bonuses
with the requested owned commander. UI shows current/candidate HP, base damage,
speed, gathering and recovery, with a refresh/context disclaimer and assignment
availability. Foreign marches and unowned heroes are rejected; GET does not recruit,
spend, assign or grant progression. Existing summon/shard acquisition remains.

Daily/chest/alliance-goal confirmation feedback now includes exact authored reward
previews and stored-item labels after successful server acknowledgement. Keys
include the real period, so next-day claims are not accidentally silenced. Existing
reports remain the source of actual delivered/PvE amounts. Inventory stacks have
category/resource icons. No duplicate reward ledger or currency was introduced.

Optional guidance provides a direct Captain-to-training action and a nearby-frontier
survey action using the existing scout command. Construction selection/queues,
completion effects, healing and all five culture visuals are retained. No new
forced pop-up, arbitrary grant, recruitment purchase or balance change.

Verification: **268 server tests passed**, including prerequisite truthfulness,
comparison purity/privacy over real HTTP and existing migration, acquisition,
training/healing, inventory, rewards and first-session tests. **16,343 portable
C# assertions passed** (typed DTOs, period/alliance reward filtering and prior
presentation contracts). **82 C# / 3 PowerShell source checks: zero issues**.
Protocol 16/schema 15 remain; new snapshot fields and GET endpoint are additive,
not persisted. Unity compilation/rendering/input/audio/FPS remain pending.

Native checks: follow a locked Citadel/academy dependency through direct building
selection; complete construction/research; compare two legitimately owned heroes,
change a formation and refresh; claim daily rewards, inspect stored packs, use an
eligible speedup/AP/oath item and verify server quantities. Repeat optional guidance
off and resume a returning city. Use the final v0.37 Linux checklist for the batch.
