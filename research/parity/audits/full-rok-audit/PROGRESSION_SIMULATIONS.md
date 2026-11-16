# Production-command progression observations

Audited gameplay: `384d023030fa42922f62ed56175147e48b75fb4e`, 2026-11-16. Reproduce with `node scripts/parity-audit-progression.mjs`. Results and every accepted purchase's before/after balances and job quote are in `progression-results.json`. The script never reads real saves.

## Clock and policy

A fresh Greek city is created by production `World.join`. Resources, XP, buildings, troop ledgers, coordinates and exploration are never assigned by the script. Founding supplies are claimed through their real command. The first hour uses 14,400 calls to `World.tick(.25)` with a matching injectable wall clock. Construction/research cards choose genuinely affordable available projects. Field orders select only visible reachable local nodes/camps. Infantry training attempts one actual paid order per tier, in ascending order, rather than creating reserve units directly.

After the first hour the army is recalled through its command. Five-minute reconnection intervals use production `advanceDowntime`, issuing purchases at each reconnection. This preserves the actual eight-hour per-outage production cap and queue completion logic. It represents repeated city logins and offline catch-up, **not an online month of field simulation**, and it generates no offline battle victories. This is one explicit strategy, not an optimal-progression proof. Comparing a different reconnect policy requires a separate run.

## Observed milestones

- Fresh: Citadel1, no commander XP, no kills.
- 30 minutes: Citadel3, two ordinary victories.
- One hour: Citadel4, two ordinary victories.
- One day: Citadel5, two ordinary victories; T2 training in progress.
- One week: Citadel5; T1 through T4 paid infantry training has completed.
- One month: Citadel5, every local building at its existing maximum, all 42 available technology ranks, and 2,000 T5 infantry in reserves. All six milestones round-trip through `World.fromSave` without changing the city level or deployed typed-unit ledger.

The five accepted training orders started at simulated seconds 0 / 73,801.75 / 177,000 / 384,000 / 935,700. Quantities were 100 / 2,000 / 2,000 / 2,000 / 2,000. Quoted durations were 1,500 / 38,265.30612244898 / 76,530.61224489796 / 102,040.8163265306 / 153,061.22448979592 seconds. The first order charged 5,000 food and 5,000 wood, and completion was observed before 30 minutes. Later durations include the then-earned training modifiers; they are not raw reference times.

Commander XP stopped at 200 because this policy does not farm after the first hour; that is a policy limitation, not proof that commanders cannot level. There is no comparable observed RoK player trajectory: every reference-trajectory field remains UNKNOWN. The absence of levels6–25 is an actual local functional cap, not a resource bottleneck.

## Requested scenario coverage and limits

1. First30minutes: command-driven online run above.
2. Firsthour: command-driven online run above.
3. Firstday: production offline catch-up/reconnect run; not native play.
4. Firstweek: same explicit reconnect model.
5. Mid-game: local Citadel3 milestone; no claim that this equals reference mid-game.
6. Late-game: local maximum5 by day1, with buildings/technology finishing afterward; no reference-era equivalence.
7. FullT5 progression: actual infantry T1–T5 unlocks and paid jobs observed. All15 classes/tier training paths are not organically demonstrated by this one policy; boundary/unit reference checks remain separate fixtures.
8. Repeated ordinaryPvE: two first-hour production-command victories. Full repeated farming pacing and 25-level organic campaign remain unproven. Existing `server/forsaken.test.mjs` has175 prepared engine battles; they are FIXTURE TESTED.
9. Fort rally participation: `server/strongholds.test.mjs` exercises real rally commands in prepared states, including contribution/restart behavior. It is FIXTURE TESTED, not part of this fresh account's journey.
10. Commander growth:200 earned XP; all-rarity level tables are extracted separately. Level60/six-star acquisition pacing remains unproven.
11. Construction/research: all local maximums legally reached under the explicit reconnect policy. This does not validate reference costs/tech tree.
12. Gathering/spending: real first-hour gathering orders plus exact purchase balances in the action ledger. Loot, gathered cargo and passive income are not falsely labeled as one independently measured production stream.
13. Healing: typed conservation and paid treatment are covered by prepared `server/war.test.mjs`; not organically reached in this winning first-hour scenario.
14. Multiple marches: deployment/redistribution/pairing tests in `server/formation.test.mjs`, `server/army-control.test.mjs`, `server/armament.test.mjs`; fixture scope. The fresh account here retains its founding march.
15. Alliance progression: authenticated role/help/trade/rally tests exist in server integration suites; full alliance technology/gifts/credit progression is missing. Do not infer it from membership100 or a prepared alliance.

Exact reference trajectories for all15 scenarios remain UNKNOWN. That evidence gap prevents a pacing-parity conclusion; fixture success cannot fill it.
