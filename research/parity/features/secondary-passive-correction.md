# Recovery C — secondary passive/level correction subset

<!-- parity
{
  "id": "RECOVERY-C-SECONDARY-PASSIVES",
  "description": "Restore advertised learned secondary passives; remove unearned level and secondary equipment stats",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN mechanics binding; iOS US listing1.1.13.79 observed separately on2026-11-16",
  "checked": "2026-11-16",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://rokbuilder.com/guides/leveling-commanders/", "checked": "2026-11-16", "classification": "CORROBORATED"},
    {"url": "https://riseofkingdoms.fandom.com/wiki/Commander_Guide", "checked": "2026-11-16", "classification": "CORROBORATED"},
    {"url": "https://rokhub.app/faq/commanders", "checked": "2026-11-16", "classification": "CORROBORATED"},
    {"url": "https://www.reddit.com/r/RiseofKingdoms/comments/w7k7wj/", "checked": "2026-11-16", "classification": "CONFLICTING"},
    {"url": "https://www.reddit.com/r/RiseofKingdoms/comments/ga7nax/", "checked": "2026-11-16", "classification": "CONFLICTING"}
  ],
  "numeric_references": [
    {"quantity": "Secondary passive coefficients and stacking", "reference": "Existing advertised local skillInfo/skillModifiers in server/progression.mjs; exact original-character RoK counterpart absent", "classification": "UNKNOWN", "treatment": "Restore existing advertised local factors using the existing multiplicative engine convention; retain as partial parity, never source-verified numerical RoK behavior"},
    {"quantity": "Secondary active timing", "reference": "Independent player accounts report one turn vs two turns; exact current rule not measured", "classification": "CONFLICTING", "treatment": "Outside this subset; do not implement a guessed exact timer or certify full Recovery C"}
  ],
  "numeric_fixtures": [{"path": "research/parity/fixtures/secondary-passive-correction.json", "checks": ["secondary learned passives, primary-only bonuses and level invariance"]}],
  "deviations": [{"decision": "Retain existing original-character passive coefficients and current factor composition", "reason": "Owner explicitly requires advertised passive ranks to work; unrelated numerical redesign is not authorized by this repair", "impact": "Restored local effects are testable; exact reference skill coefficients/stacking and secondary active casts remain parity gaps", "authority": "Owner Critical Recovery C requires real secondary skill effects and removal of arbitrary level scaling while preserving original commander identities"}],
  "essential_unknowns": [],
  "acceptance_checks": ["secondary learned passives, primary-only bonuses and level invariance"],
  "covers": ["server/world.mjs", "server/progression.mjs", "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Progression.cs", "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Screens.cs"],
  "coverage_ids": ["TM-057"]
}
-->

## Feature and RoK equivalent

Primary commander contributes its supported skills, talents, equipment and leadership. Secondary contributes learned supported skills, without an unconditional level/gear/talent stat grant. This is a narrowly scoped restoration of existing original-character passive descriptions, not a complete combat/parity rewrite.

## Reference version and sources

All URLs checked2026-11-16. Independent builder/wiki/FAQ material agrees on secondary skills and primary-only talent/equipment/level leadership. Sources are community descriptions, not official current-client measurements; shared upstream data may reduce independence. Apple US listing independently displayed1.1.13.79, but historical mechanics tables are not automatically version-bound to it. Active timing player observations conflict; no convenient source selected as exact. See metadata and broader Task3 source inventory.

## Verified mechanics and prerequisites

Explicit owner requirements: learned secondary passive rank must affect appropriate stats; changing only companion level must not supply flat combat power; talents/equipment are primary-only. Recruitment, star unlocks, material costs and duplicate-assignment restrictions remain production rules. Fixtures may prepare owned commanders/stars/materials but must be labeled.

## Numeric reference

Existing local descriptions: offense damage4%/rank, PvE3%/rank, health2%/rank; gather gathering5%/rank, speed2%/rank, health2%/rank; defense health4%/rank, gathering2%/rank, mitigation2%/rank; support health3%/rank, recovery4%/rank, mitigation2%/rank. These are **local prototype inputs**, not verified RoK numeric targets. No coefficient changed here. Full reference counterpart/stacking remains UNKNOWN. Active timing remains CONFLICTING.

## Formulas and modifiers

Reuse existing `skillModifiers` with talents explicitly excluded for secondary. Apply each secondary learned factor once using the current engine factor composition; combine damage reductions via remaining-damage factors. No base civilization/commander traits, equipment, talents, level multiplier or march capacity is added for secondary. Wukong offensive rank1→2 changes local secondary factor1.04→1.08: relative damage ratio1.08/1.04, not an unexplained flat+4% relative to rank1. Level1→60 at unchanged skills yields identical stats. Zero/unlearned ranks give factor1 or mitigation0. Exact RoK stacking is not claimed.

## Known uncertainties

Secondary active damage/heal/shield sequencing/timing is not implemented by this subset. Full Recovery C remains incomplete. No claimed hidden combat equation, expertise timing or native visual parity. Keeping existing original skill factors is a repair under the user's explicit instruction, not approval that those numbers equal RoK.

## Current Thrones of Myth behavior

At192a3ca, stats use only primary skillModifiers; secondary receives1+.01×level damage/health and equipment factors, but learned passive ranks do nothing. This reproduces the independent Wukong failure. Native comparison/companion descriptions advertise the incorrect level rule.

## Planned Thrones of Myth behavior

Add deterministic red tests before implementation. Share primary skill math with a talents-disabled secondary path, apply supported factors exactly once, remove flat companion level/equipment contributions, update misleading UI text. Test each local passive family in both roles, actual skill-upgrade/pair/unpair commands, level invariance/capacity, no secondary talents/gear, actual first-round PvP damage, save/reload and duplicate-assignment regressions. Preserve primary-only numerical results and175 recorded single-commander Forsaken battles.

## Differences and project decisions

Only the explicit repair scope is authorized. Existing local factor composition is disclosed, remains a numerical parity gap and must not be presented as a newly verified reference design. No timer guess for the blocked active-skill requirement. No proposed new reference deviation is silently approved.

## Systems affected

Server stats, learned passive context, march comparison/native explanatory text, primary-only armaments and persistence of derived health. Active combat event code is unchanged in this subset.

## Save migration

Keep schema27/protocol17, ownership, units, wounded units, reserves, XP, ranks, talents, equipment inventory and positions. On loading, cap only derived current HP to the corrected maximum, consistently with existing equipment-removal behavior; never delete troops or heal/increase absolute HP. This cap is idempotent and requires regression proof with an old boosted-HP fixture. No live save touched, no age/progression conversion. Active-skill save state unchanged.

## Acceptance tests

`node --test server/secondary-passive-correction.test.mjs`; record red before editing then same scenarios green. Preserve primary-only results, concrete rank ratios, all supported passive families, troop/save conservation and assignment constraints. Full server, existing175-battle fixture, portable C# and Unity compilation/build checks required. Native post-fix effects NOTTESTED unless actually observed.

## Implementation status

IMPLEMENTED passive/level subset: original six regressions0PASS/6FAIL before patch, then same six6PASS/0FAIL. Added primary-family regression afterward. Full C remains incomplete because active sequencing and exact reference numerical behavior are unresolved. Later Tasks6–11 are not claimed complete.
