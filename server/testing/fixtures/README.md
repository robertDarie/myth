# Economy migration fixture

`economy-schema14.json` was generated using the actual v0.28.0 server from
`4742df4`. It contains synthetic test identities only, not a real player's data.
It deliberately includes earned Aether, a sealed Aether pack, assigned legacy
commanders, cargo being returned, a delivery report, explored static observations,
paid construction/research/crafting/training jobs and existing progression.

The migration tests compare the untouched source with schema 15, assert conservation
across balances/cargo/refunds/items, retain the exact historical report original,
and test repeat loads, JSON archives and SQLite commit behavior. Combat/formation
unit tests use `roster-fixture.mjs` to author an owned roster explicitly instead of
calling the removed gold recruitment API. Actual acquisition and legal new-player
journeys use the production `World.command` path without that helper.
