# Project context for the reviewer

Repository: https://github.com/robertDarie/myth

Current integration branch: `feature/captain-3d`. Do not push or merge to `main` during the pilot.

`main` contains the gameplay prototype plus the roadmap documents. The equipped Frontier Captain mesh, SpearGrip, stone court, and hall presentation are only on `feature/captain-3d`. Do not treat that presentation as released on `main`.

Research worktree: `C:\Users\rober\Documents\GitHub\myth-rok-audit`, branch `research/rok-parity-audit`. Its committed game tree is the captain branch before the roadmap commit. The verified workbook on this branch is `docs/roadmap/Thrones_of_Myth_Master_Development_Roadmap_v2.xlsx`. The ignored `work/` research folder is local only.

Invariants:

- Server is authoritative. World schema is 18. `GET /health` version is 16.
- City troop capacity is Citadel base 40, 80, 140, 220, 340 plus 5 for each Hall of Spears level after the first.
- Training batches are 5, 5, 10, 20, 40. Promotion converts exactly 5 troops.
- There is no per-march soldier cap. March slots are 1 through 5 by Citadel level.
- Hospital beds are 25 plus 15 times the House of Renewal level. Wounded also count toward city capacity.
- Action points are 100, regenerating one per minute.
- Class counters are at most plus or minus 15 percent.
- Mana is ordinary. Aether is premium.
- Five civilizations stay distinct. Player-facing names stay Citadel of Mortals, Hall of Spears, Temple of Echoes, and Outlook of the Horizon.
- Custom 3D, animation, and decorative environments are deferred. Functional UI is not deferred.
- A march's mortal share is ceil(city troop capacity / unlocked march slots). Schema stays 18. Protocol stays 16.
- Live GPT review is off because it can cost extra money. Local handoffs wait for a person.
- Unity visuals are not validated by this loop. A playtest is required before any visual claim.
- The 44-minute audio guide was not transcribed. Do not cite it as advice.

The server test suite had not been re-run at the time of the v2 audit. A named test file is not a passing run.
