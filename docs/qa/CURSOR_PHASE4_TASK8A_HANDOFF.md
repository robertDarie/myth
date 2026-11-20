# Phase 4 task 8A handoff

Base: published `87b687355d05b1e445dc1dba98ceae6fa3703ea9`. This commit is local only.

## What changed

Training and promotion accept an optional request id. The same id does not spend resources or open another batch, including after reload. A different order on that id is refused. Siege is visible as closed and cannot be trained. The fifteen infantry, archer and cavalry tiers keep their prototype costs and stats.

## What did not change

Combat formulas, hospital rates, batch sizes, the shared Hall of Spears, City Hall reference profiles, `city-policy.mjs`, and `reference-city.mjs`. No Windows package was rebuilt.

## Integration

Cherry-pick this commit onto a clean checkout after any unpublished inventory work is settled. Expected overlap: `server/world.mjs`, `server/city.mjs`, `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs`, `client/Assets/ThronesOfMyth/Scripts/WorldModels.cs`, `research/parity/publication_scope.json`, and the coverage register. Keep the training receipt and the closed siege roster together with any newer inventory request ids. Re-run `node --test server/military-roster.test.mjs server/veterans.test.mjs server/troops.test.mjs`.

## Still blocked

Siege T1–T5, separate training facilities, verified Rise of Kingdoms costs and combat stats, and a wounded / severely wounded / dead split. Do not fill those with synthetic numbers.
