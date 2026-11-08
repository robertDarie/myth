#!/usr/bin/env python3
"""Create a traceable Thrones of Myth plan; never import reference numbers as balance.
Requires openpyxl for this documentation tool only. No runtime dependency.
Usage: python tools/adapt_reference_workbook.py INPUT.xlsx [OUTPUT_DIRECTORY]
"""
import csv
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

EPICS = {
    'E01': ('Readable world and original art', 'R0', 'Client/art', 'Original Dawnstone art: ivory stone, bronze, terracotta and divine aether. Readable HUD, formation silhouettes, selected-first labels and soft visual fog.', 'Native captures at 1280×720, 1920×1080 and 2560×1440 with UI scaling; no displaced icons, clipped actions or overlapping priority labels.'),
    'E02': ('City, ages and permanent research', 'R2', 'Gameplay/content', 'Citadel of Mortals and Athenaeum of Ages govern our five ages, two earned crews, institution levels and up to five marches; retain original costs and dependencies.', 'Versioned content DAG validates; each unlock has an affordable legal path; costs, cancellation and completion survive restart without duplicate settlement.'),
    'E03': ('Economy, inventory and logistics', 'R2', 'Economy/backend', 'Food/wood/stone/gold/aether plus earned Oracle Sigils. Add pack inventory, gathering cargo returned home once, taxed allied caravans and explicit sinks.', 'Resource/cargo/item conservation under interruption, full nodes, cancellations, crash recovery and concurrent spend; multi-day simulation exposes bottlenecks.'),
    'E04': ('Troop tiers and tactical warfare', 'R3', 'Combat/backend', 'Keep infantry/cavalry/archer counters and culturally distinct mythics. Add tiered ledgers and promotion before siege engineering, ranges and city warfare.', 'Every troop is in one reserve, queue, march, cargo assignment, hospital or loss ledger; counters, wounds, overflow and legal targeting have fixtures.'),
    'E05': ('Heroes, talents and divine relics', 'R3', 'Heroes/content', 'Mythological heroes retain green/blue/purple/gold rarity, XP, stars, four skills and mastery. Add primary talents, an Oath Companion and scoped relic equipment.', 'Primary/companion restrictions, skill scope, respec cost and equip conflicts are authoritative; no commander can serve two committed marches.'),
    'E06': ('Exploration, navigation and world geography', 'R2', 'World/client', 'One shared realm; Divine Gates connect regions, scouts reveal the Veil, Ancient Remnants reward exploration. Roads and terrain must match server traversal.', 'Ground routes respect obstacles and gate ownership; hidden entities are never sent by presentation smoothing or target search.'),
    'E07': ('Alliances, territory and social tools', 'R4', 'Alliance/backend', 'Oathbound alliances expand connected Forts/Beacons, help jobs and coordinate rallies. Add applications, contributions, treasury, shared research, notices and moderation.', 'Outsiders cannot view/spend private alliance state; rank changes, disconnected supply and member departures reconcile all assignments and rewards.'),
    'E08': ('Forsaken enemies and Titan raids', 'R4', 'PvE/art', 'Forsaken camps and Godbreaker Strongholds lead to learnable Titan encounters with staged telegraphs. Alliance-bound Titans are distinct from personal mythic troops.', 'One encounter teaches three visible mechanics; interrupted groups conserve troops, fixed reward pools reconcile and boss casts are server-owned.'),
    'E09': ('Kingdom chronicles, events and governance', 'R5', 'Live operations', 'Expand existing opening chapters, daily tasks, weekly alliance goals and scheduled gates into Chronicles of Ascension, power rankings and earned sanctuary governance.', 'Confirmed actions score once in UTC windows; cutoff/ties/eligibility/reward snapshots survive restart, late joins and repeated claims.'),
    'E10': ('Identity, durability and operations', 'R1', 'Backend/operations', 'Extend the SQLite private-kingdom foundation with recoverable accounts, character/realm identity, retained retry keys, revision checks, audit ledgers, off-site backups and measured hosting.', 'Two devices recover one city; lost responses never double-charge; restore rehearsal, token revocation, privacy and capacity/load checks pass.'),
    'E11': ('Onboarding, accessibility and Android', 'R6', 'Client/QA', 'A playable first session teaches city→research→march→gather/fight→alliance. Add touch controls, safe areas, localization-ready text and return-user guidance.', 'New testers finish unassisted; desktop resolutions and representative Android devices pass readability, touch, reconnect and performance checks.'),
    'E12': ('Later cross-kingdom campaigns', 'R7', 'Seasonal/backend', 'War of the Fallen Thrones is a later separate campaign world. Home cities/heroes remain permanent; campaign territory and temporary blessings reset explicitly.', 'Carry-over matrix, eligibility, migration, cutoff rewards and return-home conservation are tested before any seasonal campaign opens.'),
    'E13': ('Commerce and collection extensions', 'R8', 'Product/commerce', 'Keep current summons earned-only with disclosed odds and pity. Schedule cosmetics, a complete catalog and platform commerce later; do not add cash purchases, VIP queues or paid randomized power in this pass.', 'When shipping, server receipt validation, restore/refund/replay protection, spending confirmation and clearly separated permanent entitlements are required.'),
    'E14': ('Content tools, balance and quality gates', 'R1', 'Tools/QA', 'Version original definitions, validate dependencies and modifiers, maintain asset provenance and test migrations, economy curves, combat outcomes and load.', 'A content change validates before activation, preserves running-job contracts and has rollback plus regression/performance evidence.'),
}

BUILDINGS = {
    'City Hall': 'Citadel of Mortals', 'Hall of Order': 'Citadel of Mortals',
    'Wall': 'Aegis Rampart (planned city-defense system, not the decorative city edge)',
    'Farm': 'Blessed Fields', 'Lumber Mill': 'Sacred Grove', 'Quarry': 'Titan Stoneworks', 'Goldmine': 'Treasury of Crowns',
    'Academy': 'Athenaeum of Ages', 'College of Order': 'Athenaeum of Ages',
    'Storehouse': 'Vault of Ages (production cap exists; plunder protection is planned)',
    'Alliance Center': 'Oathbound Hall', 'Builder Hut': 'Lodge of the First Builders (earned second crew)',
    'Trading Post': 'Agora of Fates (fixed exchange exists; caravans are planned)', 'Bazaar': 'Agora of Fates',
    'Shop': 'Quartermaster of the Dawn (planned earned-item catalog)', 'Courier Station': 'Wandering Oracle (scheduled later merchant)',
    'Tavern': 'Temple of Echoes', 'Scout Camp': 'Wayfinder Lodge (planned institution; scouts already function)',
    'Barracks': 'Hall of Spears', 'Archery Range': 'Courtyard of Bows (planned specialization)', 'Stable': 'Courtyard of Reins (planned specialization)',
    'Siege Workshop': 'Titanwright Workshop (planned siege/engineering)', 'Hospital': 'House of Renewal',
    'Monument': 'Chronicle Obelisk (existing Kingdom screen, future physical access point)', 'Castle': 'Oathbound Hall rally capacity branch (planned)',
    'Watchtower': 'Sentinel of the Aegis (planned)', 'Blacksmith': 'Forge of Dawn',
    'Lyceum of Wisdom': 'Hall of Legends (scheduled lore challenges)', 'Mana Refinery': 'Aether Well',
    'Gold production building': 'Treasury of Crowns', 'Wood production building': 'Sacred Grove', 'Ore production building': 'Titan Stoneworks',
    'College of Order': 'Athenaeum of Ages', 'Knight Camp': 'Courtyard of Reins / future caravan workers', 'Swordsmen Camp': 'Hall of Spears',
    'Marksman training building': 'Courtyard of Bows', 'Magic troop training building': 'Sanctuary of Beasts and later culture-specific divine lines',
    'Celestial Temple': 'Optional later flying mythic branch; not an automatic extra combat class',
    'Rally Beacon': 'Oathbound Hall dispatch plus Fort/Beacon field network',
    'Alliance research interface': 'Oathbound Hall shared research (planned)', 'Beast Pen / companion hub': 'Sanctuary of Beasts; personal companions later',
}

def choose_epic(sheet, r):
    n = int(sheet[:2]); title = r[3].lower(); text = (r[2] + ' ' + r[3] + ' ' + r[4]).lower()
    if n == 17: return 'E14'
    if n == 16:
        ids = ['E01','E10','E14','E10','E01','E03','E10','E02','E04','E06','E03','E04','E11','E02','E04','E06','E04','E05','E06','E08','E07','E11','E09','E14','E01','E07','E07','E12','E09','E03','E05','E12','E10','E13','E14','E06','E08','E08','E13','E01','E12','E07','E11','E14','E10']
        return ids[int(r[0][-3:])-1]
    if n == 15:
        if any(k in title for k in ['season','migration']): return 'E12'
        if any(k in title for k in ['store','billing','purchase']): return 'E13'
        if any(k in title for k in ['invariant','testing','tests','telemetry','content','balance','feature flag','versioned','localization']): return 'E14'
        if any(k in title for k in ['alliance','territory','chat','rallies']): return 'E07'
        if any(k in title for k in ['inventory','resource','gather','production']): return 'E03'
        if any(k in title for k in ['building','technology']): return 'E02'
        if any(k in title for k in ['leader','artifact','pet']): return 'E05'
        if any(k in title for k in ['combat','troop','hospital','ability']): return 'E04'
        if any(k in title for k in ['world spatial','march','pathfinding','spawn']): return 'E06'
        if 'event' in title or 'ranking' in title: return 'E09'
        return 'E10'
    if n == 14: return 'E13'
    if n == 13:
        return 'E12' if any(k in title for k in ['season','kvk','lost kingdom','crusade','strife','migration','cohorts','matchmaking','conquest']) else 'E09'
    if n == 12:
        if any(k in title for k in ['season','enrollment']): return 'E12'
        if any(k in title for k in ['merchant','shop','vip','pet']): return 'E13'
        if any(k in title for k in ['daily','event','reward claim','reset boundaries']): return 'E09'
        if any(k in title for k in ['alliance','rally','garrison']): return 'E07'
        if any(k in title for k in ['research','construction','builder']): return 'E02'
        if any(k in title for k in ['training','promotion','healing','battle','combat','shield']): return 'E04'
        if any(k in title for k in ['march','scout','npc','fort/pass']): return 'E06'
        if any(k in title for k in ['gather','resource','speedup']): return 'E03'
        return 'E10'
    if n == 11: return 'E08' if any(k in title for k in ['behemoth','raid']) else 'E07'
    if n == 10:
        if any(k in title for k in ['behemoth','darkling','dark creatures','barbarian']): return 'E08'
        if any(k in title for k in ['season']): return 'E12'
        if any(k in title for k in ['alliance','territory']): return 'E07'
        return 'E06'
    if n == 9: return 'E13' if 'pet' in title else 'E08' if 'behemoth' in title else 'E05'
    if n == 8: return 'E08' if any(k in title for k in ['behemoth','boss','threat','barbarian fort']) else 'E04'
    if n == 7: return 'E12' if 'season' in title or 'reset' in title else 'E07' if 'alliance' in title else 'E02'
    if n == 6: return 'E02'
    if n == 5: return 'E13' if any(k in title for k in ['gem','vip','premium','pet']) else 'E03'
    if n == 4:
        if any(k in title for k in ['season']): return 'E12'
        if any(k in title for k in ['spender']): return 'E13'
        if any(k in title for k in ['alliance','diplomacy','social']): return 'E07'
        if any(k in title for k in ['cross-platform','offline']): return 'E10'
        return 'E11'
    if n == 3: return 'E01'
    if n == 2:
        if any(k in title for k in ['vip','store purchase','war pet']): return 'E13'
        if any(k in title for k in ['season','lost kingdom']): return 'E12'
        if any(k in title for k in ['account','realm','login','reconnect']): return 'E10'
        if any(k in title for k in ['alliance','rally','garrison','chat','mail']): return 'E07'
        if any(k in title for k in ['behemoth','pve target']): return 'E08'
        if any(k in title for k in ['commander','hero','leader','artifact','blacksmith']): return 'E05'
        if any(k in title for k in ['inventory','bag']): return 'E03'
        if any(k in title for k in ['tutorial','onboarding','accessibility','localization','mobile']): return 'E11'
        return 'E01'
    raise ValueError(sheet)

PARTIAL = {
    '02-001','02-004','02-005','02-006','02-007','02-009','02-010','02-012','02-013','02-015','02-016','02-017','02-021','02-022','02-023','02-024','02-025','02-029','02-031','02-040','02-041','02-042','02-043','02-044','02-045','02-046','02-048','02-050','02-053','02-055','02-057','02-058','02-059','02-063','02-064','02-065','02-067','02-068',
    '03-001','03-002','03-003','03-004','03-005','03-006','03-007','03-008','03-009','03-010','03-011','03-012','03-013','03-014','03-015','03-017','03-019','03-020','03-021','03-022','03-023','03-024','03-025','03-026','03-028','03-029','03-030','03-031','03-032','03-033','03-035','03-036','03-037','03-038','03-039','03-040',
    '05-001','05-002','05-003','05-004','05-008','05-010','05-013','05-016','05-017','05-018','05-019','05-025','05-032','05-033','05-035','05-037',
    '06-001','06-003','06-004','06-005','06-006','06-007','06-008','06-009','06-010','06-011','06-014','06-015','06-016','06-017','06-018','06-020','06-021','06-022','06-024','06-026','06-028','06-029','06-030','06-031','06-032','06-033','06-034','06-035','06-036','06-037','06-038','06-040','06-041','06-042','06-044','06-046','06-047','06-048','06-049','06-051','06-052',
    '07-001','07-002','07-007','07-008','07-009','07-010','07-022','07-023','07-024','07-025','07-026','07-027',
    '08-001','08-002','08-003','08-005','08-006','08-013','08-014','08-016','08-017','08-018','08-020','08-021','08-022','08-023','08-027','08-039','08-042','08-043','08-044','08-045','08-046','08-047','08-048','08-050','08-051',
    '09-001','09-002','09-003','09-004','09-005','09-006','09-009','09-011','09-014','09-015','09-016','09-017','09-018','09-021','09-031','09-032','09-034','09-035','09-036',
    '10-002','10-003','10-004','10-005','10-006','10-007','10-009','10-010','10-011','10-013','10-014','10-018','10-019','10-023','10-027','10-031','10-032','10-033','10-034','10-035','10-037','10-038',
    '11-001','11-002','11-003','11-005','11-006','11-007','11-009','11-010','11-011','11-013','11-014','11-016','11-024','11-026','11-027','11-029','11-030','11-032',
    '12-001','12-002','12-003','12-005','12-006','12-007','12-008','12-009','12-012','12-013','12-014','12-015','12-016','12-017','12-018','12-019','12-022','12-025','12-027','12-040','12-042','12-043','12-045','12-046','12-047','12-049','12-050','12-051',
    '13-001','13-002','13-003','13-013','13-023','13-033','13-034','13-040','14-012','14-024','14-025',
    '15-005','15-006','15-008','15-009','15-010','15-011','15-012','15-014','15-016','15-017','15-018','15-019','15-020','15-021','15-022','15-024','15-030','15-031','15-032','15-033','15-035','15-036','15-037','15-038','15-039','15-040','15-041','15-047','15-048','15-049','15-050','15-051','15-053','15-056','15-057','15-058','15-060','15-066',
}
STARTED = {'02-006','02-007','02-017','02-040','02-057','02-068','03-003','03-006','03-007','03-008','03-010','03-021','03-031','03-032','03-035','03-036','03-037','10-039'}

def themed(text):
    replacements = [
        ('Barbarian Fort','Godbreaker Stronghold'),('Barbarian forts','Godbreaker Strongholds'),
        ('Mightiest Governor','Trials of Ascension'),('Strongest Lord','Contest of Crowns'),
        ('Eve of Crusade','Gathering of Oaths'),('Lost Kingdom','War of the Fallen Thrones'),
        ('Lost Temple','Throne of the First God'),('Augurstone','Chronicle of Dawn'),
        ('Behemoth','Titan'),('behemoth','Titan'),('Darklings','Forsaken'),('Dark Creatures','Godbreaker champions'),
        ('Barbarians','Forsaken warbands'),('Barbarian','Forsaken'),('barbarians','Forsaken warbands'),
        ('Hall of Order','Citadel of Mortals'),('City Hall','Citadel of Mortals'),
        ('College of Order','Athenaeum of Ages'),('Academy','Athenaeum of Ages'),
        ('Tavern','Temple of Echoes'),('War Pet','bonded companion'),('War pet','bonded companion'),
        ('war pet','bonded companion'),('Command Points','Resolve'),('Action Points','Resolve'),
        ('VIP','Renown of the Realm'),('Gems','Premium currency (scheduled later)'),
    ]
    for a,b in replacements:text=text.replace(a,b)
    return text

def main():
    source = Path(sys.argv[1]); output = Path(sys.argv[2] if len(sys.argv)>2 else 'docs/reference'); output.mkdir(parents=True, exist_ok=True)
    original = openpyxl.load_workbook(source, data_only=True)
    records = []
    for sheet in original:
        for index, cells in enumerate(sheet.iter_rows(values_only=True), 1):
            row = [str(c) if c is not None else '' for c in cells]
            if not row or not re.fullmatch(r'\d\d-\d\d\d', row[0]): continue
            epic = choose_epic(sheet.title, row); name, milestone, owner, adaptation, acceptance = EPICS[epic]
            disposition = 'Adapt'; status = 'Planned'; baseline = 'No implemented feature claimed for this reference row.'
            if row[0] in PARTIAL: status='Prototype partial'; baseline='Related prototype exists; the complete reference behavior is not implemented. See current audit and milestone guide.'
            if row[0] in STARTED: status='Started 0.19; native review pending'
            if epic in ['E12','E13']: disposition='Defer'; status='Later / optional'; baseline='Not part of the present implementation. Existing earned summons remain available.'
            if sheet.title.startswith('17 '): disposition='Resolve with original design / evidence'; status='Open question'; baseline='Workbook uncertainty retained; no reference value is treated as verified game balance.'
            if sheet.title.startswith('16 '): baseline='Workbook acceptance benchmark; not a claim that this larger milestone is complete.'
            specific = BUILDINGS.get(row[3]) if sheet.title.startswith('06 ') else None
            if specific: adaptation = specific + '. ' + adaptation
            if 'action point' in row[3].lower() or 'command point' in row[3].lower(): disposition='Evaluate, not committed'; adaptation='A regenerating Resolve pool is an optional economy decision. Do not add energy friction until session/reward simulations justify it.'
            if 'vip' in row[3].lower(): disposition='Do not adopt paid queue gate'; adaptation='Keep our permanent second crew earned through the Lodge of the First Builders. No VIP queue requirement or VIP shop is committed.'
            if 'pet' in row[3].lower(): disposition='Optional later'; adaptation='Personal bonded companions are distinct from civilization mythic troops and alliance Titans. No pet RNG/content system is committed in this pass.'
            feature = themed(row[3])
            action = ('Validate baseline and fill remaining behavior: ' if row[0] in PARTIAL else 'Specify and implement: ') + feature + '. UI flow: ' + themed(row[5])
            if disposition != 'Adapt': action = 'Design review only (' + disposition + '): ' + feature + '. Do not ship automatically from the reference.'
            scope = 'Required adapted feature'
            if row[0] in {'02-001','02-002','02-008','02-011','02-019','02-026','02-062','05-007','05-014','05-029','09-033','12-024','12-044','14-002','14-003','14-004','14-005','15-001','15-005','15-006','15-007','15-043','15-047','15-049','15-053','15-054','15-057','16-004','16-006','16-007','16-030'}:
                status = 'Prototype partial 0.20; native review pending'
            if epic in ['E12','E13']:
                disposition = 'Scheduled later; required adapted feature'
                status = 'Scheduled later'
                adaptation = adaptation.replace('Optional', 'Scheduled').replace('optional', 'scheduled').replace('Evaluate', 'Plan')
                action = 'Scheduled implementation: ' + feature + '. Keep permanent home progress, earned builder access and server-verified entitlements.'
            if 'vip' in row[3].lower():
                disposition='Required adaptation: Renown';milestone='R5';epic='E09'
                name,_,owner,_,acceptance=EPICS[epic]
                adaptation='Renown of the Realm is an earned civic progression track with daily claims and a benefits catalog. Keep the second crew earned through the Lodge; add no paid queue requirement.'
                action='Implement an earned Renown track, deterministic daily claims and visible next-rank benefits; store integration is a later separate entitlement layer.'
                status='Planned'
            if 'action point' in row[3].lower() or 'command point' in row[3].lower():
                disposition='Required adaptation: Resolve';milestone='R2'
                adaptation='Implement a server-owned regenerating Resolve pool for selected PvE modes after session/reward tuning. Movement, city management and gathering remain available without energy.'
                action='Define Resolve cap/regeneration/cost policy and implement server-time accrual, explicit spend preview and replay-safe refill items.'
            if 'pet' in row[3].lower():
                disposition='Scheduled R8: bonded companions';status='Scheduled later';milestone='R8'
                adaptation='Implement personal bonded companions with capture, roster, development and scoped skills, separate from civilization mythic troops and alliance Titans.'
                action='Define companion ownership, capture outcomes, transfer rules and content budget, then implement that system after troop/hero ledgers.'
            if sheet.title.startswith('17 '):
                scope='Required research/design decision';status='Open question';disposition='Resolve original design / evidence'
            records.append([row[0],sheet.title,index,row[1],row[2],row[3],row[4],row[8],row[9],epic,name,milestone,owner,disposition,status,baseline,adaptation,acceptance,feature,action,scope])
    assert len(records)==679 and len({r[0] for r in records})==679
    headers=['Reference ID','Source sheet','Excel row','Reference game','Subsystem','Reference feature','Reference behavior','Workbook source IDs','Workbook evidence status','Epic','Thrones of Myth epic','Milestone','Discipline','Disposition','Implementation status','Baseline caveat','Thrones of Myth adaptation','Acceptance gate','Thrones of Myth feature','Next action','Scope commitment']
    with (output/'adaptation-register.csv').open('w',newline='') as handle:
        writer=csv.writer(handle,lineterminator='\n');writer.writerow(headers);writer.writerows(records)
    workbook=openpyxl.Workbook();overview=workbook.active;overview.title='Read first'
    for r in [
        ['Thrones of Myth — reference adaptation','2026-11-08'],
        ['Source',source.name],['Source SHA256',hashlib.sha256(source.read_bytes()).hexdigest()],
        ['Scope','679 reference feature records; 14 epics; R0–R8 milestones.'],
        ['Status','Prototype partial is not complete; Started requires native Unity review. Planned is not implemented.'],
        ['Evidence','Original workbook labels retained. No external source was independently reverified for this adaptation.'],
        ['Decisions','Original mythology; five cultures/ages; earned second crew; five marches; KvK later; no commerce added.'],
        ['Plan','See docs/reference-adaptation-plan.md and docs/visual-foundation-0.19.md.'],
        ['Current implementation','R0 visual foundation plus 0.20 account/retry/inventory/power foundations. Other mapped work remains backlog.'],
    ]:overview.append(r)
    overview.column_dimensions['A'].width=26;overview.column_dimensions['B'].width=110
    for row in overview:
        for c in row:c.alignment=Alignment(wrap_text=True,vertical='top')
    epic_sheet=workbook.create_sheet('Epics');epic_sheet.append(['ID','Epic','Milestone','Discipline','Adaptation','Acceptance'])
    for key,value in EPICS.items():epic_sheet.append([key,*value])
    register=workbook.create_sheet('679 feature mappings');register.append(headers)
    for r in records:register.append(r)
    sources=workbook.create_sheet('Source registry')
    for row in original['19 Sources'].iter_rows(values_only=True):sources.append(list(row))
    anchors=workbook.create_sheet('Reference numeric anchors')
    for row in original['18 Numeric Anchors'].iter_rows(values_only=True):anchors.append(list(row))
    for sheet in [epic_sheet,register,sources,anchors]:
        sheet.freeze_panes='A2';sheet.auto_filter.ref=sheet.dimensions
        for cell in sheet[1]:cell.font=Font(bold=True,color='FFFFFF');cell.fill=PatternFill('solid',fgColor='17333E')
        for col in sheet.columns:
            sheet.column_dimensions[col[0].column_letter].width=20 if col[0].column<=4 else 44
        for row in sheet.iter_rows(min_row=2):
            sheet.row_dimensions[row[0].row].height=60
            for cell in row:cell.alignment=Alignment(wrap_text=True,vertical='top')
    workbook.save(output/'Thrones_of_Myth_Adaptation_Plan.xlsx')
    manifest={'sourceFile':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'workbookSnapshot':'2026-11-08','independentlyReverifiedSources':False,'featureRecords':len(records),'epics':len(EPICS),'sheets':dict(Counter(r[1] for r in records)),'statuses':dict(Counter(r[14] for r in records)),'scopeCommitment':'All reference roles scheduled as adapted features; later is sequence, not exclusion; open questions remain research tasks.','generatedFiles':['adaptation-register.csv','Thrones_of_Myth_Adaptation_Plan.xlsx']}
    (output/'reference-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
