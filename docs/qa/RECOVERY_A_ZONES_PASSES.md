# Recovery A — functional zones, passes and military access

Starting published source: `69c58ea6e55b7bfe0c0cba0c2a0ea096e32a6d81`. Checked 2026-11-17. **Functional compatibility implementation; numerical RoK parity UNVERIFIED.** The owner explicitly approved: “Reuse existing rules; clearly mark numerical parity unverified.” The decision is recorded in `research/parity/approvals/recovery-a-divine-gate-compatibility.json` and the pre-implementation feature record.

## Authoritative inventory

The original 256-unit world, city coordinates and seven province IDs remain. Four existing starting regions retain their local resources and beginner PvE; two intermediate provinces lead to the central First Throne.

- `first-frontier` — First Frontier, starting: x 0–40, z 0–40.
- `legacy-east` — Sunward Province, intermediate: x 40–80, z 0–40.
- `legacy-north` — Runic Province, intermediate: x 0–40, z 40–80.
- `legacy-crown` — First Throne, central: x 40–80, z 40–80; original First Sanctuary remains at (65,65).
- `dawn-reach` — Dawn Reach, starting: x 80–256, z 0–80.
- `ashen-fields` — Ashen Fields, starting: x 0–80, z 80–256.
- `outer-marches` — Outer Marches, starting: x 80–256, z 80–256.

Boundary coordinates belong to the lower-coordinate rectangle, with zero included on the world edge. Every integer coordinate from (0,0) through (256,256) maps to exactly one province. Ordinary command destinations retain their existing safe 1–255 limits. Shared mountain borders have ten explicit crossings; there are no diagonal or corner connections.

Each crossing now has its own persistent pass. Coordinates below are the structure's original-side location; the two corridor endpoints straddle the border by one unit on each side.

- `gate-east` — Eastern Divine Gate (39,20), First Frontier ↔ Sunward, border x=40 at z=20.
- `gate-north` — Northern Divine Gate (20,39), First Frontier ↔ Runic, border z=40 at x=20.
- `gate-crown-west` — Gate of the Norn Crown (39,60), Runic ↔ First Throne, border x=40 at z=60.
- `gate-crown-south` — Gate of the Sun Oath (60,39), Sunward ↔ First Throne, border z=40 at x=60.
- `gate-dawn-low` — Gate of Eos (79,20), Sunward ↔ Dawn, border x=80 at z=20.
- `gate-dawn-high` — Gate of the Dawn Throne (79,60), First Throne ↔ Dawn, border x=80 at z=60.
- `gate-ashen-low` — Gate of the Ashen Oath (20,79), Runic ↔ Ashen, border z=80 at x=20.
- `gate-ashen-high` — Gate of the Ember Crown (60,79), First Throne ↔ Ashen, border z=80 at x=60.
- `gate-outer-south` — Gate of the Starward March (128,79), Dawn ↔ Outer, border z=80 at x=128.
- `gate-outer-west` — Gate of the Worldroot (79,128), Ashen ↔ Outer, border x=80 at z=128.

The original two Divine Gate IDs, names and positions remain. The remaining eight sites replace distant shared-gate authority and the two empty frontier IDs. Tier labels are original topological categories, not a verified RoK defender-strength curve. Machine-readable bounds, endpoints, names, adjacency and opening metadata are in `evidence/recovery-a/topology.json`.

## Capture and travel

All passes inherit the existing “Divine Gates Awaken” kingdom milestone. Original first-gate/sanctuary progression still counts the two original Divine Gates rather than any two of the expanded ten. No new opening timer, reward table or combat coefficient was invented.

An alliance leader/officer with Citadel two, an Oathbound Hall and an idle, fully recovered formation at home can assemble a rally when connected territory adjoins the target and an authorized approach exists. The target pass itself does **not** have to be owned. Both adjacent approach sides work. Neutral passes now use the existing production fortification encounter rather than free occupation; enemy-owned passes also support existing garrison combat. Victory writes alliance ownership, fortification state, combat contribution reports and the existing objective contribution. No new first-capture loot/drop rule was added.

The approved original baseline is 450 fortification HP in the old profile, scaled to 450,000 in the current numeric profile, with the existing regeneration/rally/combat rules. It is a fortification encounter, **not a newly invented RoK neutral troop roster**. Real neutral guard unit counts/stats, exact tier scaling, protection exceptions and current RoK opening calendars remain unresolved. Non-pass occupation rules are unchanged.

Military access is derived from the saved home province through open passes controlled by the same alliance. Each edge checks its own pass; one distant gate cannot unlock unrelated borders. Existing cities retain local access wherever they are saved. Move, PvE, PvP, gather, objectives, rally assembly/transit, garrisons and retargeting retain server-side route validation. Every rally member follows a physical route; the group no longer translates members across a border by a shared positional offset.

Route authority is reevaluated during travel. Enemy recapture stops unauthorized movement while preserving units and cargo. Return privilege is restricted to the saved home destination and still follows physical corridors; a client cannot supply arbitrary return/scout privileges. Genuine scouts retain ownership/opening exemption while using the same physical graph.

## Executed evidence

Six initial topology/recall regressions ran **0/6 red** against the starting source, then **6/6 green**. The expanded permanent suite has 19 scenarios, including 20 actual production conquests across all ten passes and both approach sides, two consecutive captures, outsider denial, scout completion, real enemy recapture, cargo-safe recall/delivery, garrisons, truthful approach-route previews, saved-topology tamper rejection, all edges/corners and 32 seeded starter worlds. Setup fixtures are explicitly labeled; pass ownership changes occur through production combat, never direct ownership assignment.

Separately, `node scripts/recovery-a-playthrough.mjs` starts a default fresh Greek city and uses **56 production commands**, no resource/XP/troop/position/milestone/ownership grants. It builds Citadel two and the hall, trains a paid batch, gathers resources, wins four real camps and opens the actual milestone. It captures Eastern Divine Gate, crosses to (50,20), proves that one pass cannot reach the First Throne, captures Gate of the Sun Oath and crosses to (65,60). An outsider's production move is rejected; its scout reaches the same target cell and returns. Total accelerated production time: **2,009.75 seconds**. This is legitimate server progression with a declared clock, not human/native elapsed playtime. All accepted actions and before/after balances are published in `evidence/recovery-a/legal-playthrough.json`.

Full server suite: **435 tests, 430 passed, zero failed, five existing platform skips**, 45,697.3698 ms. Command from `server/`: `node --test --test-concurrency=4`. Skips are Linux executable/launcher cases and the Windows-restricted Linux symlink fixture; none are counted as passes. Contract gate: 19 offline cases; old research gate: 16; portable C# presentation contracts: 16,769. The required publication plan now has 49 checks, including the fresh expedition and source-bound evidence validator. Publication results and SHAs must be confirmed by the guarded publisher.

One randomized HTTP PvP fixture forced combat into First Frontier while retaining random distant homes. Its preparation now explicitly places the fixture homes in that same province; all authorization, hospital and bystander-privacy assertions remain. Other old tests now grant the actual required adjacent passes and expect schema 28. No gate was reopened to satisfy a fixture.

## Save and restart safety

Schema **27 → 28**, protocol **17** unchanged (additive snapshot fields). Append eight missing passes; preserve all existing city/home/army/commander/alliance IDs and coordinates, ownership, resources, paid jobs, cargo and reports. Pass type, position, corridor ID and zone adjacency are validated against canonical definitions. Malformed saves are rejected, not silently reinterpreted. Existing interrupted direct gate-occupation orders are safely canceled; a pass requires a proper rally encounter.

`node scripts/check-recovery-a-legacy-saves.mjs` replays the actual immutable starting-commit code into an ignored plain source archive, **not another Git worktree**. Thirty-two synthetic old-version worlds with real joins, alliances and paid construction queues all load into schema 28 with their original state unchanged except normal offline presence and eight appended passes. Existing camps, nodes, sites, sessions and kingdom state are conserved. No real user save is read.

Separate real JSON and SQLite hosted-process tests load schema-27 state with an actually captured gate, start/stop each production host twice and resume the authenticated owner. The JSON case additionally archives its exact input bytes. All ten passes, captured ownership, homes, units and commander survive. The schema-27 archive remains byte-for-byte identical. Serialization-only evidence is not mislabeled process restart.

## Windows presentation and remaining limits

The client consumes the same public graph: seven zone names/categories, server-derived mountain borders, ten pass models, explicit crossing gaps, opening/ownership colors and allied/blocked explanations. The minimap shows all ten passes. Objective and warfare controls include neutral pass rallies and selected-pass garrison actions. Public strategic control does not expose hidden defender health or enemy garrison details; scouting/current vision remains necessary for that intelligence.

Actual Unity 6000.3.0f1 source-bound validation exited zero and instantiated **seven zone labels, ten pass models at authoritative coordinates, ten crossing objects and 447 mountain mesh renderers**. The report contains the tested C# source fingerprint. This verifies actual Unity objects, **not native clicking, readability, camera usability or FPS**. Both updated Windows packages were subsequently built and verified from clean source f6cb144. Native interaction was attempted but remains NOT TESTED due to the exact target-window capture blocker below; existing archives remain byte-identical.

The source checkpoint is not full RoK numerical parity or a completion claim for Tasks 7–10. Reference defender troops, precise opening/protection tables and version/mode differences remain open. In particular, published home-kingdom descriptions of early tier-one free passage must not be merged with KvK alliance-ownership rules or silently treated as the current home baseline. The owner explicitly requires controlled military crossings and approved the existing local opening rules. Sources, access limitations, dates and that bounded decision remain in the feature record.

## 2026-11-17 Windows artifact verification checkpoint

Source checkpoint `f6cb144db0fc0ff1472b7f0d122274e3203c5506` was published with all 49 required checks passing and independently verified on origin/main. Both actual Unity Windows builds exited zero from that clean source: client ZIP 145 verified files / 87,201,157 bytes; full ZIP 193 verified files / 121,944,847 bytes, protocol17. Isolated package names contain `Passes-f6cb144`; all three pre-existing archives remain byte-identical. Generated packages remain local and untracked.

Actual bundled Windows Node and Server/index.mjs passed nine runtime checks: matching build, unauthorized rejection, three fresh authenticated cities, military denial/scout exemption, foreign-army rejection, paid training, real 20.10-second Citadel construction, process restart preserving identities/city/job, and graceful shutdown. This is independent of the accelerated legal expedition.

Native gameplay interaction is **NOT TESTED**. The new executable launched against a private loopback QA world, but the UI tool failed to capture its selected window reliably. After refresh and the exposed Raise action, it reported no screenshot target. No gameplay input was sent; an unrelated foreground screenshot was not retained. Only the owned QA client/host were closed. This does not certify native pass visibility, clicking, readable labels, camera comfort or FPS. See `docs/qa/evidence/recovery-a/windows-package-verification.json`. Numerical parity remains UNVERIFIED; no Tasks7–10 started.
