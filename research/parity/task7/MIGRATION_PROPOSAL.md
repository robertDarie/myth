# Task7 migration decision proposal —2026-11-18

Status: **OPTION1 OWNER APPROVED2026-11-18; no conversion authorized or executed**. The owner chose to preserve existing five-level cities/rules temporarily, continue complete verified25-level progression for NEW cities, and later migrate by equivalent earned progress/entitlements, never literal level matching. New-city activation still requires complete verified numerical/prerequisite data. Mixed-city combat/alliance/research/capacity tests are mandatory. This is a transition toward one unified system, not a permanent fork. No real save is read or rewritten. Existing schema28 cities have five levels,17combined institutions and17prototype technologies. An old Citadel5 is a completed prototype age, not evidence of RoK CityHall25. Old all-resource harvest and combined military buildings do not map one-to-one to new resource/class-specific technologies/buildings.

## Recommended staging decision

Preserve every existing city's exact legacy progression/effects in an explicitly versioned legacy representation until complete target dependencies and a separate conversion are approved. No automatic old-age→CH5/10/15/20/25 mapping; no compensation grants; no invented material conversion. Fresh-city reference activation also waits for complete prerequisite/version-bound evidence. This stage does not redefine earned levels, enable new reference numerics or certify legacy parity.

Alternative for later explicit approval: preserve literal old levels1–5 as newCityHall1–5, retain all owned troops/research/equipment/alliances/positions/inventory/reports, and keep completed achievements plus paid pending jobs in a legacy ledger. This materially reduces relative progress and may leave armies above the newly calculated capacity; no units may be destroyed. Do not execute until the owner approves exact handling of over-cap existing armies, old all-resource research and combined-building progress. No unsupported automatic split of one barracks into four training buildings.

## Invariants and transactional rollout

Archive original bytes before any eventual persisted migration. Keep resources, typed units, wounded/reserves, XP/skills, equipment, ownership, world coordinates, reports and inventory exactly conserved. Paid pending construction/research/training/healing/crafting retain original payment, remaining duration and effect semantics; do not recalculate a20second paid job from a new300second table. Add profile/target metadata only where semantics are established. Migrate on a copied synthetic archive first, prove idempotency and rollback, then require a successful atomic write before replacing a persisted file. Unknown/conflicting reference rows must never become zero-cost/instant defaults.

## This checkpoint's safe source work

Extract the current building maximum, quote and prerequisite policy into a production module, preserving all existing outputs, validation, payments and jobs. No25-level profile is activated and no schema rewrite occurs. Tests compare quotes/requirements through all existing levels and verify a fresh actual command path plus save/reload. The new module can represent explicit per-level tables without interpolating absent levels; future activation remains gated by evidence and this migration decision. This is infrastructure groundwork, not completion of checkpointB or numerical parity.

Owner decision received: preserve legacy progress until a separately reviewed, thoroughly tested entitlement-based migration. Do not ask again for this staging decision. New city reference rules must be complete/verified before activation; no invented numeric substitute is authorized.
