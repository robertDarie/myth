# Morning report — 12 November 2026

Automation stopped after one functional slice. Live GPT review was not used.

## Why it stopped

The OpenAI API can cost money outside a ChatGPT subscription. Live review calls are now disabled in `.ai-loop/engine.py`. The workflow says not to start the next feature until a reviewer approves. There is no zero-cost reviewer available, so the loop did not continue.

Nothing was pushed. `main` was not merged.

## Completed

FUN-001's first gameplay gap: a march can no longer carry every soldier in the city once more than one march slot is open.

`marchTroopCap` is `ceil(city troop capacity / unlocked march slots)`.

- Citadel 1, Hall 1: share is 40, the same as the city store, so the first army is unchanged.
- Citadel 2 with one Hall level: city store 80, two slots, share 40.
- Mythic escorts do not use this share.
- Deploy, reform, and reinforce all obey it. Reinforce leaves the overflow in the city.
- A save that already has a larger march still loads. Schema stays 18. Health protocol stays 16.
- The formation screen states the share and will not send an oversized order. All Ready trims to the share.

## Partial

- The formation screen was not opened in a Unity player. Server tests cover the rule. The buttons are wired to the same command the server enforces.
- TM-038 march slots were not rewritten. An existing test that separates home formations from active march limits passed in this run. A fresh 1-through-5 assertion was not added.
- TM-095 was re-checked only for schema 18 and for loading an oversized march. The reported 7/8 journey restart bug was not reproduced.
- The rest of the coverage register is still `NOT AUDITED`.

## Tests

Passed, 0 failed:

`node --test server/gameplay-parity.test.mjs server/troops.test.mjs server/world.test.mjs server/kingdom.test.mjs server/veterans.test.mjs server/war.test.mjs server/core-corrections.test.mjs server/chapters.test.mjs`

96 passed.

`python .ai-loop/tests/test_hook_offline.py`

7 passed.

Unity playtest: not run.

## Coverage

`research/MYTH_feature_coverage_register.csv` now has evidence on TM-037, TM-038, and TM-095. GPT column says the API was not called. Player-verified says not run.

## Next task, after you review this slice

Reproduce or retire the journey restart report (TM-095 / the scope's TM-101 note). Do not start it until you accept the march share.

## Blockers

- No paid review. Local handoff is `.ai-loop/handoff.md` and this file.
- Unity client was not built or clicked.
- Do not treat this as approval to push `main`.
