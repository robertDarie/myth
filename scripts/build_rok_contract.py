"""Rebuild the discovered reference contract from public research and local probes.

The catalogue is an OPEN scope inventory, not proof of complete RoK coverage.
No private workbook, live save or external service is read by this generator.
"""
import argparse
import csv
import hashlib
import io
import json
import subprocess
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'research/parity/audits/full-rok-audit'
DEST = ROOT / 'research/parity'
VERSION = 'iOS US store1.1.13.79 observed2026-11-16; table bindings UNKNOWN'
STORE = 'https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888'

# Owner-requested/discovered scopes. A name is not proof of reference completeness
# or production implementation. Unknown scopes remain in the denominator.
GROUPS = {
 'ACCOUNT': ('server/identity.mjs;server/realms.mjs;server/spawning.mjs', 'BASELINE', '''guest-creation|Create and resume a fresh governor without duplicate identity
protected-accounts|Register/login/recover protected accounts with authorization
kingdom-selection|Choose eligible kingdoms and keep identities/state isolated
civilizations|Cover all applicable civilization mechanical profiles with original identity
tutorial|Guide legitimate first construction, training, march, scout and battle
power-rankings|Compute reference power categories from actual owned progression'''),
 'CITY': ('server/city.mjs;server/city-content.mjs;server/progression.mjs', 'BASELINE', '''levels-1-25|Complete City Hall1–25 prerequisites, unlocks and subordinate limits
independent-buildings|Preserve independent reference building roles and upgrade chains
construction-slots|Apply legitimate queue/builder unlocks and occupancy
construction-speed|Apply verified permanent/temporary construction modifiers and rounding
alliance-help|Apply help eligibility, count, remaining-time reductions and minimums
speedups|Consume correct speedup category and duration without double completion
cancel-refund|Apply reference cancellation/refund rules and conservation
offline-jobs|Complete paid jobs/production exactly once across logout and restart'''),
 'ECONOMY': ('server/economy.mjs;server/city.mjs;server/field-logistics.mjs', 'CITY', '''four-resources|Represent food, wood, stone and gold independently
production|Match every production building output, count and accumulation limit
gathering-nodes|Match node levels, stocks, respawn and ownership behavior
gathering-speed|Apply troop/commander/technology/VIP/item gathering modifiers correctly
gathering-load|Compute troop load and cargo return from real deployed units
resource-packages|Keep item resources separate from exposed balances until use
protection|Apply storehouse/resource protection by level and battle context
trade|Enforce transfer eligibility, amount, tax, capacity and private ownership
alliance-resource-center|Construct, gather and settle alliance resource structures
temporary-buffs|Apply resource/time-limited buffs and expiration without stacking exploits
shops-merchants|Match relevant merchant/shop refresh, exchange and purchase limits'''),
 'RESEARCH': ('server/city-content.mjs;server/city.mjs', 'CITY;ECONOMY', '''economic-tree|Cover every applicable economic technology and rank
military-tree|Cover every applicable military technology and rank
prerequisites|Enforce the complete Academy/building/technology prerequisite DAG
costs-timers|Charge each rank and calculate research time with exact modifiers
t5-unlock|Require the complete reference T5 research chain beyond City Hall25
seasonal-research|Keep crystal/season-specific research and eligibility separate'''),
 'COMMANDER': ('server/progression.mjs;server/world.mjs;server/city.mjs', 'CITY;RESEARCH', '''roster-archetypes|Cover reference commander mechanical effects through original identities
acquisition|Apply rarity-specific recruitment, sculptures, keys and event eligibility
xp-levels|Match every rarity/level1–60 XP requirement and cap
stars|Match six-star progression, materials, chances and skill unlocks
skills|Match learned skill ranks, costs, priority/locking and expertise rules
talent-awards|Match every level/star talent award, including the verified endpoint
talent-trees|Cover applicable branches, prerequisites, effects and reset rules
primary-leadership|Apply primary skills, talents, equipment and capacity correctly
secondary-passives|Apply supported learned secondary passive effects exactly once
secondary-actives|Activate supported secondary damage/heal/shield skills with verified timing
secondary-exclusions|Exclude secondary level/talents/equipment leadership bonuses
pairing-restrictions|Reject duplicate/unowned/ineligible commander assignments
equipment|Cover slots, rarity, materials, crafting, stats and set effects
formations-armaments|Cover formations, armaments, inscriptions and attribute interactions
museum-enhancements|Cover applicable museum/relic/late-game commander enhancements'''),
 'MILITARY': ('server/troops.mjs;server/progression.mjs;server/marches.mjs', 'CITY;RESEARCH;ECONOMY;COMMANDER', '''owned-unit-accounting|Conserve owned/deployed/reserve/wounded/dead troop quantities
training|Match four training roles, batch capacities, queues, costs and times
promotion|Upgrade eligible adjacent tiers with exact delta costs/times
march-slots|Unlock the reference number of independent marches at correct milestones
march-capacity|Apply primary capacity, city, research, army-size and other modifiers in order
formations|Compose legal typed armies and apply verified formation effects
rally-capacity|Apply rally leader/structure/technology capacity without duplicating troops
reinforcement-limits|Enforce garrison/reinforcement limits and source ownership
civilization-special-units|Include applicable special units and their real stat differences
engineering-special-units|Investigate current engineering/ranged/shifter mechanics without omitting them'''),
 'COMBAT': ('server/world.mjs;server/war.mjs;server/campaign.mjs;server/forsaken.mjs', 'MILITARY;COMMANDER', '''normal-attacks|Reproduce observable normal attack outcomes and timing
damage-defense-health|Separate base stats, buffs, defense, health and damage factors
counters|Apply class counters and mixed-army interactions correctly
rage|Match rage generation, requirements, triggers and limits
active-timing|Match primary/secondary activation order, delays and cooldowns
aoe|Apply area shapes, target count and damage reductions correctly
healing-shields|Apply active/passive heal/shield duration, caps and stacking
buffs-debuffs|Apply conditions, duration, stacking and removal correctly
pursuit-retreat|Validate moving targets, disengagement, retreat and defeat
wounds-deaths|Match battle/mode-specific wounded, deaths and overflow
hospital|Match capacity, treatment cost/time/help and simultaneous casualties
reports|Reconcile damage, units, skills, wounds, rewards and report privacy
city-battles|Implement city walls/watchtower/garrison, plunder and protection
structure-battles|Implement pass/alliance structure siege and reinforcement
rally-garrison-battles|Apply combined-force leadership, joins, withdrawals and settlement'''),
 'EXPLORATION': ('server/exploration.mjs;server/findings.mjs;server/recon.mjs;server/navigation.mjs', 'BASELINE;WORLD', '''permanent-fog|Persist legal terrain discovery while keeping current military sight separate
scout-capacity-speed|Match every Scout Camp capacity/speed/queued-area requirement
scout-passage|Allow scout physical passage independently of military ownership
send-redirect-recall|Dispatch, redirect and recall private owned scout missions
automatic-areas|Match reference queued-area selection and automatic continuation rules
full-map|Allow legal complete exploration without assigning discovered cells
caves-villages|Discover, investigate and claim each applicable place type once
reconnaissance|Time and protect city/march/garrison reconnaissance by actual eligibility
map-items|Apply kingdom-map items, conversion and exploration rewards correctly
minimap-camera|Expose usable accurate map/fog/navigation without hidden military leaks'''),
 'WORLD': ('server/world-map.mjs;server/navigation.mjs;server/kingdom.mjs;server/campaign.mjs', 'BASELINE;MILITARY', '''zone-graph|Provide starting/intermediate/central regions joined by physical passes
military-access|Validate every intermediate military boundary across all order types
pass-objectives|Provide actual capturable passes for every strategic crossing
pass-tiers-opening|Match mode-specific protection/opening conditions and pass tiers
pass-defenders|Match verified defender troops/combat/capture requirements
pass-ownership|Apply alliance ownership, garrisons and access revocation
safe-recall|Preserve stranded armies and constrained home recall without arbitrary bypass
holy-sites|Match eligible sacred-site/guardian/capture/bonus mechanics
central-objective|Provide meaningful reference-compatible central kingdom objectives
kingdom-timeline|Match monuments/openings/contribution eligibility and rewards
teleports|Apply item, territory, combat and pass-related teleport restrictions'''),
 'ALLIANCE': ('server/social.mjs;server/campaign.mjs;server/diplomacy.mjs;server/coalition.mjs', 'BASELINE;WORLD;ECONOMY', '''membership|Create/join/leave/invite/disband with correct membership limits
roles|Enforce ranks, officer powers and leadership transfer
chat|Provide private authorized chat and applicable translation/map coordination
help|Apply correct construction/research/healing help and limits
technology|Implement alliance research, prerequisites, effects and progression
donations-credits|Apply donations, credits, limits and eligibility
gifts|Distribute alliance chests/gifts and prevent duplicate claims
territory|Build connected territory, flags/fortresses and eligible resource effects
structures|Match independent alliance structure roles, costs, timers and limits
rallies|Create/join/assemble/launch/withdraw rallies with correct authority
garrisons|Join/reinforce/withdraw shared defense with true ownership/accounting
diplomacy-coalitions|Determine exact reference diplomatic/camp/coalition semantics by mode
objectives-ranking|Apply alliance objectives, scores, rewards and membership transitions'''),
 'PVE': ('server/forsaken.mjs;server/forsaken-population.mjs;server/strongholds.mjs', 'MILITARY;COMBAT;WORLD', '''home-ordinary|Cover every applicable home-kingdom ordinary enemy level and unlock
kvk-ordinary|Keep Lost Kingdom ordinary enemy levels/stats/rewards mode-specific
population|Spawn/search/patrol/respawn encounters with observable reference behavior
ap|Match AP costs, reductions, regeneration, cap, overflow and refunds
xp|Apply commander XP, experience modifiers and pair allocation
rewards-drops|Match fixed rewards/eligibility and disclose unknown random probabilities
chaining|Implement applicable AoE/chaining/admission/reward interactions
forts|Provide real rally-only fort mechanics, participants, casualties and rewards
camps-keeps|Provide distinct multi-stage camp/keep encounters
guardians|Provide holy-site guardian spawn/combat/reward rules
bosses|Provide applicable special boss mechanics rather than ordinary camp aliases
event-enemies|Match event-specific encounter eligibility, AP and rewards
marauders|Provide pre-KvK marauders and related structures'''),
 'EVENT': ('server/events.mjs;server/activity.mjs;server/login.mjs;server/season.mjs', 'BASELINE;PVE;ECONOMY', '''daily|Match daily reset, activities, objective points and claim thresholds
weekly|Match applicable weekly objectives and eligibility
login|Match login schedules, streak/reset and entitlements
achievements|Provide eligible achievements and one-time rewards
power-growth|Match building/training/research power event scoring
training-gathering|Match troop/gathering event score rates and settlement
commander-events|Match recruitment/commander-event eligibility and cycles
alliance-events|Provide cooperative alliance event mechanics and rewards
ranked-events|Apply ranking, ties, participation and reward settlement correctly
limited-time|Keep current seasonal/limited-time schedules and modes explicit
arms-training|Provide escalating training encounter conditions and rewards
patch-event-discovery|Retain newly discovered current event categories for detailed research'''),
 'ITEM': ('server/inventory.mjs;server/economy.mjs;server/city.mjs', 'BASELINE;ECONOMY;COMMANDER', '''vip|Match every applicable VIP level, points, bonuses and daily rewards
premium-currency|Preserve original premium naming with correct earning/spending semantics
resource-packs|Use correct resource quantities and protection behavior
speedups|Match generic/category timers and partial consumption rules
ap-items|Apply correct AP quantities, overflow and consumption
commander-materials|Separate recruitment/skill/star/equipment material types and use
teleport-shields|Implement eligible teleport/peace-shield items and restrictions
boosts-expiration|Apply temporary bonuses, stacking, replacement and expiry
shops-limits|Match merchant/VIP/shop costs, refresh and entitlement limits
payment-entitlements|Test non-payment entitlement semantics safely; real billing remains external'''),
 'MIGRATION': ('server/identity.mjs;server/realms.mjs;server/social.mjs', 'ACCOUNT;WORLD;ITEM', '''kingdom-access|Apply kingdom age/season/power/access restrictions
immigration|Match migration requirements, items, cooldown and safe transfer
beginner-migration|Keep beginner migration rules and eligibility distinct
cross-kingdom-state|Conserve identity, progression, units and inventory across supported travel
save-content-migration|Conserve old worlds with explicit content/schema conversion and rollback'''),
 'KVK': ('server/season.mjs;server/realms.mjs;server/kingdom.mjs', 'WORLD;MILITARY;ALLIANCE;MIGRATION;EVENT', '''preparation|Match pre-KvK preparation, scoring and eligibility
matching|Match kingdom selection/registration/matching rules where observable
lost-kingdom-access|Authorize actual cross-kingdom travel and shared Lost Kingdom state
kvk1|Keep KvK1 progression/pass/objective/reward rules separate
kvk2|Keep KvK2 progression/pass/objective/reward rules separate
kvk3|Keep KvK3 progression/pass/objective/reward rules separate
season-of-conquest|Keep each SoC story eligibility/technology/pass/rules separate
campaign-objectives|Match kingdom/camp territorial objectives and victory conditions
honor-rankings|Apply relevant personal/alliance/kingdom scores and rewards
completion-return|Settle seasons once and return/migrate units and accounts safely
next-season|Carry permitted progression and enforce next-season access'''),
 'RANKING': ('server/power.mjs;server/activity.mjs;server/season.mjs', 'CITY;MILITARY;EVENT', '''power-components|Calculate actual troop/building/research/commander power independently
kill-death-scores|Match real battle score definitions and eligibility
leaderboards|Apply ranking scopes, privacy, ties and updates
objective-rewards|Distribute reference objectives/rewards without duplicates''')
}


def rows(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def csv_text(values):
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=list(values[0]), lineterminator='\n')
    writer.writeheader(); writer.writerows(values)
    return stream.getvalue()


def build():
    probe = ROOT / 'work/task6/contract-source'
    subprocess.run(['node', 'scripts/parity-audit-baseline.mjs', str(probe)], cwd=ROOT, check=True, capture_output=True)
    local = rows(probe / 'parity-matrix.csv')
    building_rows = rows(AUDIT / 'building-reference.csv')
    features = []
    def feature(fid, group, behavior, paths, dependencies, status='REFERENCE UNVERIFIED', source=STORE):
        features.append(dict(feature_id=fid, subsystem=group, reference_mode='UNRESOLVED; distinguish home/pre-KvK/KvK1/2/3/SoC/events/civilization/VIP', reference_version=VERSION,
            source_url=source, checked='2026-11-17', evidence_class='UNKNOWN', expected_behavior=behavior,
            tom_implementation=paths or 'NONE IDENTIFIED; reference mapping requires review', parity_status=status,
            dependencies=dependencies, acceptance_scenarios=behavior+'; legal production command, exact quote/outcome, negative/boundary, save/restart, native and multiplayer as applicable',
            acceptance_checks='', migration_impact='Preserve relevant resources, units, ownership, queues, XP, inventory and reports; no migration implemented by this contract',
            priority='P0' if group in {'WORLD','COMMANDER','COMBAT'} else 'P1', essential_unknowns='Version/mode-bound complete expected rules and numeric/modifier coverage; acceptance completion',
            reference_complete='false', numeric_complete='false', deviation_status='GAP; no newly approved deviation', scope_note='Discovered/owner-required scope; not proof the complete live reference denominator is known'))
    aliases={'city-hall':'citadel','academy':'academy','barracks':'barracks','farm':'farm','goldmine':'mint','hospital':'infirmary','lumber-mill':'lumber','quarry':'quarry','scout-camp':'scoutcamp','storehouse':'vault','trading-post':'market'}
    for name in sorted({r['building'] for r in building_rows}):
        feature('ROK-BLD-'+name.upper(),'BUILDING','All applicable levels, prerequisites, independent role/actions, costs/time/power/output/capacity of '+name,
                'server/city.mjs;server/city-content.mjs'+(' (related local '+aliases[name]+'; only prototype depth)' if name in aliases else ' (no independent complete equivalent established)'),
                'CITY;RESEARCH;ECONOMY','MISMATCH' if name in aliases else 'REFERENCE UNVERIFIED','https://app.rokstats.online/buildings/'+name)
    for group,(paths,deps,descriptions) in GROUPS.items():
        for line in descriptions.splitlines():
            slug,behavior=line.split('|',1)
            # Related module names are trace links, never an implementation PASS.
            actual=';'.join(p for p in paths.split(';') if (ROOT/p).exists())
            status='REFERENCE UNVERIFIED'
            if (group,slug) in {('CITY','levels-1-25'),('COMMANDER','talent-awards'),('COMMANDER','secondary-actives')}:
                status='MISMATCH'
            if (group=='KVK' and slug in {'lost-kingdom-access','kvk1','kvk2','kvk3','season-of-conquest'}) or (group=='ITEM' and slug=='vip'):
                status='MISSING'
            if group=='WORLD' and slug in {'zone-graph','military-access','pass-objectives','pass-ownership','safe-recall'}:
                status='PARTIAL PARITY'
            feature('ROK-'+group+'-'+slug.upper(),group,behavior,actual+' (related local modules only; full equivalent not established)',deps,status)
            if status=='PARTIAL PARITY':
                features[-1]['scope_note']='RecoveryA functional infrastructure implemented; explicit owner-approved original Divine Gate numerical compatibility, NOT full reference parity. See features/recovery-a-functional-passes.md'
                features[-1]['deviation_status']='OWNER-APPROVED bounded compatibility; exact reference numerics remain UNVERIFIED'
    for kind in ['infantry','archers','cavalry','siege']:
        for tier in range(1,6):
            feature(f'ROK-TROOP-{kind.upper()}-T{tier}','TROOP',f'{kind}T{tier}: exact unlock/building/training/promotion/combat/load/healing/power behavior',
                    'server/troops.mjs;server/numerics.mjs'+(' (class absent)' if kind=='siege' else ' (local original unit exists; exact full reference chain unverified)'),
                    'CITY;RESEARCH;MILITARY;COMBAT','MISSING' if kind=='siege' else 'REFERENCE UNVERIFIED','https://gacha-data.com/rise-of-kingdoms/troops/')
    numeric=[]
    def number(rid,fid,parameter,level,value='',classification='UNKNOWN',source='',unit='UNRESOLVED',fixture='',tom='',notes='Essential reference not established'):
        difference=''
        if value!='' and tom!='':difference=str(Decimal(tom)-Decimal(str(value)))
        numeric.append(dict(reference_id=rid,feature_id=fid,parameter=parameter,level=str(level),reference_value=str(value),unit=unit,
            evidence_class=classification,source_url=source,checked='2026-11-16' if fixture else '2026-11-17',reference_version='UNKNOWN; target '+VERSION,
            reference_mode='UNRESOLVED; do not merge incompatible modes',version_binding='UNKNOWN',source_fixture=fixture,current_tom_value=tom,
            difference=difference,uncertainty=notes,essential='true'))
    local_map={r['audit_id']:r for r in local}
    for r in building_rows:
        fid='ROK-BLD-'+r['building'].upper()
        for key in ['food','wood','stone','gold','base_seconds']:
            local_key=f"building.{aliases.get(r['building'],'UNMAPPED')}.{r['level']}."+('seconds' if key=='base_seconds' else key)
            tom=local_map.get(local_key,{}).get('tom_value','')
            number(f"BLD.{r['building']}.{r['level']}.{key}",fid,key,r['level'],r[key],r['reference_class'],r['source_url'],'seconds' if key=='base_seconds' else key,
                   f"research/parity/audits/full-rok-audit/building-reference.csv#{r['building']}/{r['level']}/{key}",tom,
                   'Direct published secondary observation; current version, mode, upgrade-from/to labels and modifiers not independently verified')
        for key in ['prerequisite_chain','power_gain','special_materials']:
            number(f"BLD.{r['building']}.{r['level']}.{key}",fid,key,r['level'])
    # Every local numeric observation stays visible; UNKNOWN is never filled from
    # a prototype constant and then called a reference rule.
    for r in local:
        if r['subsystem']=='Troops':
            unit=r['mechanic'].lower();kind='infantry' if unit.endswith('infantry') else 'archers' if unit.endswith('archers') else 'cavalry'
            fid=f"ROK-TROOP-{kind.upper()}-T{r['level']}"
        elif r['subsystem']=='Commanders':fid='ROK-COMMANDER-XP-LEVELS' if r['parameter']=='cumulative XP' else 'ROK-COMMANDER-TALENT-AWARDS'
        elif r['subsystem']=='Marches':fid='ROK-MILITARY-MARCH-CAPACITY'
        elif r['subsystem']=='Scouting':fid='ROK-EXPLORATION-SCOUT-CAPACITY-SPEED'
        elif r['subsystem']=='Research':fid='ROK-RESEARCH-COSTS-TIMERS'
        else:fid='ROK-CITY-COSTS-TIMERS' # corrected below to existing aggregate
        if fid=='ROK-CITY-COSTS-TIMERS':fid='ROK-CITY-LEVELS-1-25'
        number('LOCAL.'+r['audit_id'],fid,r['parameter'],r['level'],r['rok_value'],r['evidence_class'],r['source_url'],r['unit'],
               'Local source evaluation via scripts/parity-audit-baseline.mjs',r['tom_value'],r['conditions']+'; exact current reference/version binding remains unverified')
    extra={'city-hall':['subordinate_level_limit','march_slots','base_troop_capacity'],
           'barracks':['training_capacity'],'archery-range':['training_capacity'],'stable':['training_capacity'],'siege-workshop':['training_capacity'],
           'hospital':['hospital_capacity'],'castle':['rally_capacity'],'alliance-center':['help_limit'],'trading-post':['tax','transfer_capacity'],
           'scout-camp':['scout_count','scout_speed','queued_exploration_area'], 'farm':['production_rate','accumulation_cap'],
           'lumber-mill':['production_rate','accumulation_cap'],'goldmine':['production_rate','accumulation_cap'],'quarry':['production_rate','accumulation_cap']}
    for name,parameters in extra.items():
        for level in range(1,26):
            for parameter in parameters:number(f'EXTRA.{name}.{level}.{parameter}','ROK-BLD-'+name.upper(),parameter,level)
    for tier in range(1,6):
        for parameter in ['attack','defense','health','speed','load','training_food','training_wood','training_stone','training_gold','training_seconds','power','research_unlock']:
            number(f'SIEGE.{tier}.{parameter}',f'ROK-TROOP-SIEGE-T{tier}',parameter,tier)
    for rarity in ['Common','Rare','Epic','Legendary']:
        for star in range(1,7):
            for parameter in ['star_xp','materials','upgrade_probability']:
                number(f'STAR.{rarity}.{star}.{parameter}','ROK-COMMANDER-STARS',rarity+' '+parameter,star)
    for parameter in ['unbuffed_cap','base_regeneration_seconds','consumable_overflow','refund_cap','commander_reduction','vip_modifier']:
        number('AP.'+parameter,'ROK-PVE-AP',parameter,'all applicable modes',classification='CONFLICTING' if parameter in {'unbuffed_cap','base_regeneration_seconds'} else 'UNKNOWN',
               source='https://prokingdoms.com/blog/mastering-barbarian-chaining-in-rise-of-kingdoms-the-ultimate-ap-efficiency-guide;https://riseofkingdoms.fandom.com/wiki/Resources;https://riseofkingdomsguides.com/faq/',
               notes='1000/45 vs1500/36 published baselines; actual version/VIP/overflow/refund context unresolved; never choose the convenient local value')
    for mode in ['home','pre-kvk','kvk1','kvk2','kvk3','soc']:
        for parameter in ['ordinary_max_level','ordinary_level_stats_rewards','fort_tiers_stats_rewards','pass_opening_tiers_defenders','event_schedule_rewards']:
            fid='ROK-PVE-HOME-ORDINARY' if mode=='home' else 'ROK-PVE-KVK-ORDINARY'
            number(f'MODE.{mode}.{parameter}',fid,parameter,mode)
    # Keep new observations source-specific. Never overwrite older conflicting
    # observations or turn a crawl date into a live client-version binding.
    supplement = json.loads((DEST/'task7/observations.json').read_text(encoding='utf-8'))
    fields=set(numeric[0])
    for observation in supplement['rows']:
        numeric.append({key: str(observation.get(key,'')) for key in numeric[0]})
    for feature in features:
        if any(row['feature_id']==feature['feature_id'] for row in supplement['rows']):
            feature['scope_note'] += '; Task7 source-specific observations/conflicts: research/parity/task7/observations.json; not implementation-ready live parity'
    return features,numeric


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    features,numeric=build()
    outputs={'ROK_COMPLETE_FEATURE_CONTRACT.csv':csv_text(features),'ROK_NUMERICAL_REFERENCE.csv':csv_text(numeric)}
    for name,content in outputs.items():
        path=DEST/name
        if args.check:
            if not path.exists() or path.read_text(encoding='utf-8')!=content:raise SystemExit(name+': regenerate the discovered contract; do not silently edit generated rows')
        else:path.write_text(content,encoding='utf-8',newline='\n')
    print(json.dumps({'discovered_required_scopes':len(features),'numeric_rows':len(numeric),'published_source_value_rows':sum(r['reference_value']!='' for r in numeric),'current_version_bound_rows':0,'complete_reference_denominator':'UNKNOWN; open discovery, not a full live-game completeness claim'}))


if __name__=='__main__':main()
