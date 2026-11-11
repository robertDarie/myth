"""Build the read-only master roadmap workbook from the main-tree audit.

This script records source findings. It does not change the game.
"""
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import PieChart, Reference
from openpyxl.chart.series import DataPoint
from openpyxl.chart.shapes import GraphicalProperties
from copy import copy

OUT = Path(__file__).resolve().parent
MAIN = "main b20ac5c518fea0bb0a0ea7815b53327a7975d195"
CAPTAIN = "feature/captain-3d 47fcbc9 only; absent from main"
TESTS = "File is in the main tree. This audit did not re-run the suite."
NATIVE = "No native player session in this audit."
SERVER = "Server authoritative"
BOTH = "Server decides; client displays"

HEADER_FILL = PatternFill("solid", fgColor="1F3A34")
HEADER_FONT = Font(color="F4E7C5", bold=True, name="Calibri")
TITLE_FONT = Font(bold=True, size=16, color="1F3A34", name="Calibri")
WRAP = Alignment(wrap_text=True, vertical="top")
THIN = Border(
    left=Side(style="thin", color="D9D0C1"),
    right=Side(style="thin", color="D9D0C1"),
    top=Side(style="thin", color="D9D0C1"),
    bottom=Side(style="thin", color="D9D0C1"),
)
STATUS_FILL = {
    "Verified Implemented": PatternFill("solid", fgColor="D9EAD3"),
    "Partial": PatternFill("solid", fgColor="FFF2CC"),
    "Missing": PatternFill("solid", fgColor="F4CCCC"),
    "Defective": PatternFill("solid", fgColor="E6B8AF"),
    "Code-Verified Only": PatternFill("solid", fgColor="D0E2F3"),
    "Unknown": PatternFill("solid", fgColor="E6E6E6"),
    "Proposed": PatternFill("solid", fgColor="FCE5CD"),
    "Held": PatternFill("solid", fgColor="EAD1DC"),
}


def style_sheet(ws, headers, rows, widths, status_column=None):
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{max(1, len(rows) + 1)}"
    ws.row_dimensions[1].height = 22
    for col, header in enumerate(headers, 1):
        cell = ws.cell(1, col, header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center")
    for r, row in enumerate(rows, 2):
        ws.row_dimensions[r].height = 48
        for c, value in enumerate(row, 1):
            cell = ws.cell(r, c, value)
            cell.alignment = WRAP
            cell.border = THIN
            cell.font = Font(name="Calibri", size=10)
            if status_column and c == status_column and value in STATUS_FILL:
                cell.fill = STATUS_FILL[value]
    for index, width in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(index)].width = width
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.page_setup.paperSize = ws.PAPERSIZE_TABLOID
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.oddHeader.left.text = "Thrones of Myth master roadmap v2"
    ws.oddFooter.right.text = "Page &P of &N"
    ws.print_title_rows = "1:1"
    ws.page_setup.horizontalCentered = True
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 110
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{max(1, len(rows) + 1)}"


def feature(fid, cat, sub, behavior, status, source, branch=MAIN, authority=SERVER, tests=TESTS, native=NATIVE, defects="", deps="", target="", priority="P2"):
    return [fid, cat, sub, behavior, status, source, branch, authority, tests, native, defects or "None confirmed in this audit.", deps, target, priority]


def inventory():
    rows = []
    buildings = [
        ("citadel", "Citadel of Mortals", "City level 1–5. Sets age, march slots, and the troop-capacity base. Cost factor is the current level, not the 1.4 power used by other buildings."),
        ("barracks", "Hall of Spears", "Starts at 1. Each level after the first adds 5 troop capacity and 10% training speed. Batch size is 5, 5, 10, 20, 40."),
        ("infirmary", "House of Renewal", "Starts at 1. Beds = 25 + 15 × level. Also +15% home recovery and healing speed per extra level."),
        ("scoutcamp", "Outlook of the Horizon", "Starts at 1. Scouts 1/1/2/2/3, speeds 7/8.5/10/11.5/13, radii 9/10/12/13/15."),
        ("farm", "Blessed Fields", "Starts at 1. Passive food every 5 seconds, 2 × level before the harvest bonus."),
        ("lumber", "Sacred Grove", "Starts at 1. Passive wood, same tick as food."),
        ("vault", "Vault of Ages", "Starts at 1. Raises the passive ceiling. It does not delete gathered resources."),
        ("quarry", "Titan Stoneworks", "Starts at 0. Passive stone."),
        ("oracle", "Temple of Echoes", "Summon with sigils. One free offering per UTC day. Levels 3 and 5 improve the offering size, not the odds."),
        ("academy", "Athenaeum of Ages", "Unlocks at Citadel 2. One research lane. Level limits research rank."),
        ("menagerie", "Sanctuary of Beasts", "Mythic recruitment. Each level after the first adds one mythic capacity and 10% recruit speed."),
        ("mint", "Treasury of Crowns", "Passive gold."),
        ("well", "Mana Well", "Passive Mana, 1 × level per tick before bonuses. Mana is not Aether."),
        ("market", "Agora of Fates", "Alliance resource transfers. 10% tax, 3000 sent per day. Self-exchange is closed."),
        ("oathhall", "Oathbound Hall", "Alliance help and the building required to lead rallies."),
        ("forge", "Forge of Dawn", "Crafts two relics. Equip only while the army is home."),
        ("builders", "Lodge of the First Builders", "One-time unlock of a second construction crew. The two crews cannot upgrade the same structure."),
    ]
    for index, (bid, name, behavior) in enumerate(buildings, 1):
        status = "Verified Implemented" if bid in {"citadel", "barracks", "infirmary", "scoutcamp", "farm", "well", "market", "oracle", "builders"} else "Code-Verified Only"
        rows.append(feature(
            f"BLD-{index:03d}", "City", name, behavior, status,
            f"server/city-content.mjs BUILDINGS id {bid}; costs and locks in server/city.mjs buildingCard",
            tests="server/city.test.mjs exists. Suite not re-run." if status == "Verified Implemented" else TESTS,
            priority="P1" if bid in {"citadel", "barracks"} else "P2",
            target="Keep the original names. Raise visual stages per level before adding more building types.",
        ))
    rows.append(feature(
        "BLD-018", "City", "Construction crews and help",
        "One crew, or two after the Lodge. Citadel duration is 20 × current level seconds. Other buildings are 12 × next level. Titan Masonry adds 5% speed per rank. Alliance help removes max(2 seconds, 10% of duration), remaining floored at 0.1. Help count is min(5, 1 + Oathbound Hall).",
        "Verified Implemented", "server/city.mjs buildingCard and alliance-help; server/progression.mjs crews",
        tests="server/city.test.mjs. Suite not re-run.", priority="P1",
        target="Show crew occupancy and help count in the city. Do not change the formula in the first pass.",
    ))
    rows.append(feature(
        "BLD-019", "City", "Building placement",
        "Buildings occupy fixed civic slots. There is no player placement grid.",
        "Code-Verified Only", "server/city.mjs has no coordinate placement command. Client city is a district view.",
        authority=BOTH, priority="P2",
        target="Decide whether fixed districts stay. A placement grid would be a new system, not a port of the reference layout.",
    ))

    resources = [
        ("food", "Blessed Fields and gathering"),
        ("wood", "Sacred Grove and gathering"),
        ("stone", "Titan Stoneworks and gathering"),
        ("gold", "Treasury of Crowns"),
        ("mana", "Mana Well. Ordinary resource."),
    ]
    for index, (rid, origin) in enumerate(resources, 1):
        rows.append(feature(
            f"ECO-{index:03d}", "Economy", rid, f"Ordinary resource. Passive source: {origin}. Ceiling is shared: 500 + vault×250 + cityLevel×50. Production pauses at the ceiling.",
            "Verified Implemented" if rid in {"food", "mana"} else "Code-Verified Only",
            "server/city-content.mjs RESOURCES; server/city.mjs tickCity",
            priority="P1", target="Keep Mana ordinary. Do not merge it with Aether.",
        ))
    rows.append(feature(
        "ECO-006", "Economy", "Aether",
        "Premium balance, initialized at 0. Separate from Mana. Spent on premium sigils at 10 Aether. Chapter rewards can grant small amounts.",
        "Verified Implemented", "server/economy.mjs initializeEconomy; server/city.mjs sealCost",
        tests="server/economy.test.mjs. Suite not re-run.", priority="P1",
        target="Keep the split. Do not add an Aether node that pays like a farm.",
    ))
    rows.append(feature(
        "ECO-007", "Economy", "Action points",
        "Cap 100. One point per 60,000 ms, with a remainder so restarts do not drop fractions. Camps cost 5. Strongholds cost 10.",
        "Verified Implemented", "server/economy.mjs ECONOMY and refreshEconomy",
        tests="server/economy.test.mjs. Suite not re-run.", priority="P1",
        target="Keep 100 / 1 per minute until a pacing review is approved.",
    ))
    rows.append(feature(
        "ECO-008", "Economy", "Gathering",
        "Cargo per second is ceil(8 × gather stat), limited by carry room and node remaining. Credit happens when cargo is delivered home. Infantry carry 16, archers 12, cavalry 24, mythic 80, then × (1 + 0.08 × Pilgrim Logistics).",
        "Verified Implemented", "server/field-logistics.mjs carryCapacity and gatherCargo",
        tests="server/chapters.test.mjs checks delivered wood. Suite not re-run.", priority="P1",
        target="Keep delivery-only credit. Node art and risk can improve without changing the credit rule.",
    ))

    troops = [
        ("TRP-001", "Oathguard", "Infantry. Health 5, damage 0.75, train 8s per 5, Citadel 1. Cost 50 food, 20 gold."),
        ("TRP-002", "Dawn Archers", "Archers. Health 4, damage 0.95, train 10s per 5, Citadel 1. Cost 55 food, 25 gold."),
        ("TRP-003", "Dawn Riders", "Cavalry. Health 5, damage 0.85, speed 1.2 if the whole mortal march is cavalry. Citadel 2. Cost 70 food, 30 gold."),
        ("TRP-004", "Veteran tier", "Same three classes at tier II. Requires Hall 2 and Veteran Oaths. +40% health, +35% damage, 1.6× time, extra stone. Promotion converts exactly 5 and does not create soldiers."),
    ]
    for fid, name, behavior in troops:
        rows.append(feature(fid, "Military", name, behavior, "Verified Implemented", "server/troops.mjs TROOP_TYPES and promotionCost", tests="server/troops.test.mjs and server/veterans.test.mjs. Suite not re-run.", priority="P1", target="Keep three classes and the fixed promotion of 5 until a tier plan is approved."))
    rows.append(feature(
        "TRP-005", "Military", "City troop capacity",
        "Base by Citadel level: 40, 80, 140, 220, 340. Hall of Spears adds 5 per level after the first. Matching pairs are 40, 85, 150, 235, 360. Field, reserves, wounded, and queued training all count. There is no separate per-march soldier cap.",
        "Verified Implemented", "server/city.mjs CITADEL_TROOP_CAPACITY and capacity; train check in server/world.mjs; no cap in server/marches.mjs",
        tests="server/gameplay-parity.test.mjs and server/veterans.test.mjs. Suite not re-run.", priority="P0",
        target="Explain the five counts in the existing city and march screens. Do not import a reference-game unit-capacity stat.",
    ))
    rows.append(feature(
        "TRP-006", "Military", "March slots",
        "Age of Embers through Age of Ascension grant 1, 2, 3, 4, 5 marches. Home armies do not occupy a slot until deployed. Saved extra marches cannot exceed 4.",
        "Verified Implemented", "server/progression.mjs AGES; deployment check in server/world.mjs command",
        tests="server/progression.test.mjs. Suite not re-run.", priority="P1",
        target="Keep slots tied to the Citadel. Show used and unlocked slots beside soldier counts.",
    ))
    rows.append(feature(
        "TRP-007", "Military", "Training queue",
        "Three orders. Time scales with batch/5 and falls 10% per Hall level after the first. A larger batch does not discount the cost per soldier.",
        "Verified Implemented", "server/troops.mjs trainingOptions; queue limit in server/world.mjs",
        tests="server/gameplay-parity.test.mjs asserts batches 5 and 40. Suite not re-run.", priority="P1",
        target="Correct any UI that still says Hall 2 trains 10.",
    ))
    rows.append(feature(
        "TRP-008", "Military", "Tier III and beyond",
        "No third troop tier exists.",
        "Missing", "server/troops.mjs stops at tier 2", tests="No tier-III test.", priority="P2",
        target="Design an original tier only after Citadel 1–5 pacing is understood. Do not copy a reference curve.",
    ))
    rows.append(feature(
        "TRP-009", "Military", "Hospital",
        "Healing batch beds are mortal troops plus mythic × 5, limited by 25 + 15 × infirmary. Wounded still occupy city troop capacity. Cancel restores the wounded and the spent resources.",
        "Verified Implemented", "server/war.mjs hospitalCapacity and hospital-heal",
        tests="server/war.test.mjs bed and cancel cases. Suite not re-run.", priority="P1",
        target="Show beds and city-capacity usage as two numbers.",
    ))

    rows.append(feature("CMB-001", "Combat", "PvE camps", "Field attacks resolve against camps. Rage builds in combat and skills fire at 1000 rage.", "Code-Verified Only", "server/marches.mjs attack; server/strongholds.mjs and server/war.mjs", tests="server/strongholds.test.mjs and server/war.test.mjs. Suite not re-run.", priority="P1", target="A readable battle, not a new formula."))
    rows.append(feature("CMB-002", "Combat", "PvP", "Both cities must be Citadel 2 or higher. Home armies and alliance members are protected. One engagement at a time.", "Verified Implemented", "server/war.mjs attackReason", tests="server/war.test.mjs. Suite not re-run.", native=NATIVE, priority="P1", target="Keep the Age of Oaths protection. Presentation is still aggregate."))
    rows.append(feature("CMB-003", "Combat", "Class counters", "Up to ±15% from the mix of infantry, cavalry, and archers. Pure counter is 1.15 and 0.85. Veterans use the same classes.", "Verified Implemented", "server/war.mjs counterMultiplier", tests="server/war.test.mjs and server/veterans.test.mjs. Suite not re-run.", priority="P1", target="Keep ±15% until a combat review is approved."))
    rows.append(feature("CMB-004", "Combat", "Battle reports", "Each side stores up to 30 reports with HP, damage, healing, and shields. Core mail stores up to 100.", "Code-Verified Only", "server/war.mjs finishBattle; server/field-logistics.mjs coreReport", tests="server/war.test.mjs. Suite not re-run.", priority="P1", target="Make casualties and wounded legible. Do not add a copied mail layout."))
    rows.append(feature("CMB-005", "Combat", "Mass rendering", "Troops are aggregate stats plus a limited presentation. There is no crowd of individual soldiers.", "Partial", "client/Assets/ThronesOfMyth/Scripts/WorldArtFactory.Units.cs and AuthoredUnit.cs", authority=BOTH, priority="P1", target="Readable class silhouettes before any crowd system."))
    rows.append(feature("CMB-006", "Combat", "Plunder and city siege", "Field PvP exists. A city-raid resource plunder loop was not found. The vault text says plunder protection awaits PvP.", "Missing", "server/city-content.mjs vault description; no plunder command in server/war.mjs", priority="P2", target="Design an original raid that cannot delete passive stores by accident."))

    commanders = [
        ("captain", "Frontier Captain", "Common"),
        ("warden", "Sanctuary Warden", "Common"),
        ("scout", "Pathfinder", "Rare"),
        ("rune-seer", "Rune Seer", "Rare"),
        ("mulan", "Hua Mulan", "Epic"),
        ("tomoe", "Tomoe Gozen", "Epic"),
        ("horus-champion", "Champion of Horus", "Epic"),
        ("atalanta", "Atalanta", "Epic"),
        ("sigurd", "Sigurd", "Legendary"),
        ("wukong", "Sun Wukong", "Legendary"),
        ("heracles", "Heracles", "Legendary"),
    ]
    for index, (cid, name, rarity) in enumerate(commanders, 1):
        branch = CAPTAIN if cid == "captain" else MAIN
        status = "Partial" if cid == "captain" else "Code-Verified Only"
        native = "Hall stills and captain-motion.mp4 exist for the equipped mesh. They are not on main. Attack is not a level thrust." if cid == "captain" else NATIVE
        rows.append(feature(
            f"HERO-{index:03d}", "Commanders", f"{name} ({rarity})",
            "Roster data, one active skill profile, four skill slots, stars 1–6, level cap stars×10 up to 60. Only the Frontier Captain has a rigged 3D presentation, and that presentation is not on main.",
            status, f"server/content.mjs id {cid}; server/progression.mjs PROFILES and heroLevel",
            branch=branch, authority=BOTH, tests="server/progression.test.mjs covers the level cap. Suite not re-run.",
            native=native, priority="P1" if cid == "captain" else "P2",
            defects="Attack drops the spear across the body. Grip is a bind-pose curl. Court is primitive." if cid == "captain" else "None confirmed in this audit.",
            target="One shared skeleton and an original stage per culture. Do not merge the captain branch until the thrust is accepted.",
        ))
    rows.append(feature("HERO-012", "Commanders", "Talents", "Warhost, Provision, and Sanctuary. Three nodes each, three ranks. A point every 5 levels. Respec costs 15 Mana × spent ranks.", "Verified Implemented", "server/progression.mjs TALENT_TREES and talent-respec", tests="server/progression.test.mjs. Suite not re-run.", priority="P1", target="Replace the long scroller with a graph. Keep the nine nodes until a design pass adds more."))
    rows.append(feature("HERO-013", "Commanders", "Summoning", "Odds 40/35/20/5. Epic pity 10. Legendary pity 50. Duplicates pay shards. Free daily offering is 1, 2, or 3 sigils by temple level.", "Verified Implemented", "server/city-content.mjs SUMMON_RULES; server/city.mjs summon", tests="server/city.test.mjs. Suite not re-run.", priority="P1", target="Keep published odds. Do not raise them with temple level."))
    rows.append(feature("HERO-014", "Commanders", "Relics", "Bronze Aegis (+10% health, 15s) and Ember Spear (+10% damage, 18s). No armament slots, set bonuses, or commander pairing.", "Partial", "server/city-content.mjs RELICS", priority="P2", target="An original relic set with a visible equip moment. Pairing is a later system."))
    rows.append(feature("HERO-015", "Commanders", "3D captain on main", "Main has the captain's rules and a 2D hall. It does not contain CaptainPresentation, the equipped FBX, or the stone court.", "Missing", "git diff main...feature/captain-3d shows CaptainPresentation.cs and the FBX only on the feature branch", branch=MAIN, authority="Client presentation", tests="No gameplay test. Review harness exists only on the feature branch.", native="Native evidence is on the feature branch, not on main.", priority="P1", target="Finish the thrust on the feature branch. Merge only after a visual review."))

    civs = [("greek", "Formation: +12% damage", "Minotaur"), ("egyptian", "Sacred rites: +35% recovery", "Sphinx Guardian"), ("norse", "Endurance: +15% health", "Frost Giant"), ("chinese", "Harmony: +25% gathering", "Qilin Guardian"), ("japanese", "Spirit paths: +15% march speed", "Tengu")]
    for index, (cid, bonus, mythic) in enumerate(civs, 1):
        rows.append(feature(f"CIV-{index:03d}", "Civilizations", cid, f"{bonus}. Mythic creature: {mythic}.", "Code-Verified Only", "server/content.mjs CIVILIZATIONS", priority="P1", target="Keep five cultures. Show the bonus before the player commits."))
    techs = ["Veteran Oaths", "Blessings of Plenty", "Titan Masonry", "Runic Scriptoria", "Pilgrim Logistics", "Heroic Formations", "Oaths of Endurance", "Paths of Hermes", "Pacts of the First Beasts", "Reading of the Veil"]
    for index, name in enumerate(techs, 1):
        rows.append(feature(f"RSH-{index:03d}", "Research", name, "Present in TECHNOLOGIES. Duration is 12 × next rank / (1 + 0.05 × Runic Scriptoria). Cost scales by next². Most ranks cap at 3. Veteran Oaths caps at 1. Reading of the Veil caps at 2.", "Code-Verified Only" if name not in {"Veteran Oaths", "Reading of the Veil"} else "Verified Implemented", "server/city-content.mjs TECHNOLOGIES; server/city.mjs technologyCard", tests="server/city.test.mjs and server/recon.test.mjs. Suite not re-run.", priority="P1", target="A readable prerequisite graph using these names. Do not paste a reference tech tree."))

    rows.append(feature("MAP-001", "World", "Map bounds", "Coordinates 1–79. Prototype refuses a 33rd player.", "Verified Implemented", "server/world.mjs players.size >= 32; point checks in server/marches.mjs", tests="server/identity.test.mjs and server/world.test.mjs. Suite not re-run.", priority="P0", target="Call this a 32-player prototype. Do not describe it as an MMO shard."))
    rows.append(feature("MAP-002", "World", "Fog and memory", "Scouts and marches reveal sectors. Personal discovery persists. Allied vision is live and is removed on leave. Static landmarks can stay without live military intel.", "Code-Verified Only", "server/exploration.mjs; client/WorldView.Fog.cs", tests="server/exploration.test.mjs and server/scouting.test.mjs. Suite not re-run.", priority="P1", defects="Rectangular veil edges are a prior visual report. Not recaptured here.", target="Two gameplay states, with a softer edge that does not reveal extra data."))
    rows.append(feature("MAP-003", "World", "Discoveries", "Five settlements, five caverns, and five ruins, one set flavored per culture. Investigation times were not re-measured in this pass.", "Code-Verified Only", "server/findings.mjs FINDINGS", tests="server/findings.test.mjs. Suite not re-run.", priority="P2", target="Keep the named sites. Add variety only with new original places."))
    rows.append(feature("MAP-004", "World", "Strongholds and gates", "Five Godbreaker sites. Eastern and Northern Divine Gates and the First Sanctuary gate the provinces.", "Code-Verified Only", "server/strongholds.mjs DEFINITIONS; server/content.mjs sites", tests="server/strongholds.test.mjs and server/kingdom.test.mjs. Suite not re-run.", priority="P1", target="Explain which gate opens which province inside the game."))
    rows.append(feature("MAP-005", "World", "Territory upkeep", "Alliances can hold shrines, gates, forts, and beacons. There is no tile-upkeep or colored province overlay with a maintenance cost.", "Partial", "server/campaign.mjs rally and garrison; no upkeep field found in server/kingdom.mjs", priority="P2", target="An original oath-territory rule. Not a copied border map."))
    rows.append(feature("MAP-006", "World", "Seasons and migration", "No kingdom season lifecycle and no immigration command.", "Missing", "No season or migration command in server/kingdom.mjs", priority="P3", target="Leave this until the 32-player prototype is fun for one session."))

    rows.append(feature("ALL-001", "Alliance", "Roster, roles, chat, markers", "Create, join, leave, kick, promote, demote, transfer. Chat and expiring map markers.", "Code-Verified Only", "server/social.mjs", tests="server/social.test.mjs. Suite not re-run.", priority="P1", target="Keep roles explicit in the roster UI."))
    rows.append(feature("ALL-002", "Alliance", "Rallies and garrisons", "Rally create/join/leave and garrison join/leave. A committed army cannot be personally attacked; the structure is the target.", "Code-Verified Only", "server/campaign.mjs", tests="server/campaign.test.mjs. Suite not re-run.", priority="P1", target="Show capacity, timing, and who owns the rally."))
    rows.append(feature("ALL-003", "Alliance", "Diplomacy and coalitions", "No coalition, NAP, or war-declaration command was found.", "Missing", "server/social.mjs roles stop at alliance officers", priority="P3", target="Not part of the first milestones."))
    rows.append(feature("ALL-004", "Alliance", "Resource gifts", "Agora transfers to members, 10% tax, 3000 per day. Help is a separate free time cut.", "Verified Implemented", "server/economy.mjs ECONOMY; server/city.mjs alliance-help", tests="server/economy.test.mjs. Suite not re-run.", priority="P2", target="Label help and taxed gifts as different acts."))

    rows.append(feature("JRN-001", "Onboarding", "Six chapters", "From the Embers through An Oath at Dawn. Objectives read server counters. Rewards are granted by the server.", "Verified Implemented", "server/chapters.mjs CHAPTERS", tests="server/chapters.test.mjs and server/first-session.test.mjs. Suite not re-run.", priority="P0", defects="A reported 7/8 to 6/8 restart drop was not reproduced.", target="Reproduce the restart report before changing claim logic."))
    rows.append(feature("JRN-002", "Onboarding", "Daily tasks", "Ten daily tasks and point chests. Counters ignore canceled training and undelivered cargo.", "Code-Verified Only", "server/activity.mjs DAILY_TASKS", tests="server/activity.test.mjs. Suite not re-run.", priority="P1", target="One obvious daily loop on the first screen."))
    rows.append(feature("JRN-003", "Onboarding", "Guide restart defect", "No test in this pass shows journey progress falling after a restart.", "Unknown", "server/chapters.test.mjs rejects bad claimed lists. It does not assert 7/8 persistence.", tests="Not covered.", priority="P0", defects="Unconfirmed. Do not patch from the rumor.", target="A failing test that saves at 7/8, reloads, and expects 7/8."))

    rows.append(feature("NET-001", "Multiplayer", "Authority and sessions", "The client sends commands. The server applies them and is the source of troops, fog intel, and rewards. Health reports protocol 16.", "Verified Implemented", "server/world.mjs command; server/http.mjs /health version 16", tests="server/multiplayer-readiness.test.mjs and server/core-corrections.test.mjs. Suite not re-run.", priority="P0", target="Keep the server authoritative."))
    rows.append(feature("NET-002", "Persistence", "World schema 18", "toSave writes schema 18. fromSave accepts schemas 1 through 18 and migrates each step.", "Verified Implemented", "server/world.mjs toSave and fromSave", tests="server/persistence.test.mjs. Suite not re-run.", priority="P0", target="Do not bump the schema for a label or UI change."))
    rows.append(feature("NET-003", "Accounts", "Identity", "Scrypt password hashes and a five-device cap are implemented in the account module.", "Code-Verified Only", "server/identity.mjs", tests="server/identity.test.mjs. Suite not re-run.", priority="P1", target="Keep credentials out of telemetry."))
    rows.append(feature("NET-004", "Operations", "Backups and telemetry", "SQLite accounts, JSON world saves, and a telemetry file that tests say must not contain tokens or player names.", "Code-Verified Only", "server/database.mjs, server/backup.mjs, server/telemetry.mjs", tests="server/storage.test.mjs and server/multiplayer-readiness.test.mjs. Suite not re-run.", priority="P1", target="Keep names and tokens out of metrics."))

    rows.append(feature("VIS-001", "Presentation", "Rendering pipeline on main", "Unity 6000.3.0f1 project. Color space is Gamma (m_ActiveColorSpace 0). Cities and units are largely procedural, with some authored culture meshes.", "Code-Verified Only", "client/ProjectSettings/ProjectSettings.asset; client/WorldArtFactory*.cs", authority="Client", priority="P1", target="Authored kits per culture. Do not switch color space casually."))
    rows.append(feature("VIS-002", "Presentation", "Frontier Captain mesh", "68,000 triangles on the feature branch: body 48,000, shield 12,000, spear 8,000. SpearGrip bone. Stone court of cubes and cylinders. Not merged.", "Defective", "CaptainPresentation.cs and FrontierCaptainPresentation.fbx on feature/captain-3d; PROVENANCE.txt", branch=CAPTAIN, authority="Client", tests="Review harness only. No gameplay assertion.", native="GTX 1080 stills and captain-motion.mp4, 1280×800, about 5.3 seconds. The 358 ms figure is capture cost, not frame time.", defects="Thrust is not level. Grip is not finger bones. One body atlas. Pale court.", priority="P1", target="Fix the thrust on the feature branch before any merge."))
    rows.append(feature("VIS-003", "Presentation", "Audio and VFX", "BattlefieldAudio, CommanderSkillVfx, and RallyingCryTimeline exist. This audit did not listen to a build or judge intensity.", "Unknown", "client scripts BattlefieldAudio.cs, CommanderSkillVfx.cs, RallyingCryTimeline.cs", authority="Client", tests="No audio assertion re-read.", native="Not heard in this audit.", priority="P2", target="A short native recording of one camp fight and Rallying Cry."))
    rows.append(feature("UX-001", "Interface", "Page inventory", "World, City, Training, Research, Temple, Heroes, Alliance, Chronicle, Forge, Market, Marches, Formation, Hospital, Reports, Chat, Warfare, Exploration, Campaign, Activity, Kingdom, Settings, Account, Inventory, Rankings, Menu.", "Code-Verified Only", "client/GameNavigation.cs InterfacePage", authority="Client", priority="P1", defects="Clipping at 1024×768 was reported earlier and was not retested.", target="One navigation pass at 1024×768 and 1920×1080 before new screens."))
    rows.append(feature("UX-002", "Interface", "Reduced motion and settings", "A settings page exists. Reduced-motion support was reported in the older workbook and was not re-read control by control.", "Unknown", "client/PrototypeClient settings path. Not line-audited here.", authority="Client", priority="P2", target="Confirm the toggle changes animation, not only a label."))
    return rows


INVENTORY_HEADERS = ["Feature ID", "Category", "Subsystem", "Current behavior", "Implementation status", "Source evidence", "Branch", "Server/client authority", "Tests", "Native verification", "Known defects", "Dependencies", "Recommended target", "Priority"]


def parity_rows():
    return [
        ["PAR-001", "City storage versus march size", "The player must know how many soldiers the city can support and how many armies can leave.", "One capacity covers field, reserves, wounded, and training. March slots limit armies, not soldiers in an army.", "Partial", "Explain five counts. Add a per-march soldier cap only after an approved original formula.", "P0"],
        ["PAR-002", "Training scale", "Orders should grow with the hall without making early training noisy.", "Batches 5, 5, 10, 20, 40. Hall 2 stays at 5. Cost per soldier does not fall.", "Verified Implemented", "Keep the curve. Fix any UI that skips the second 5.", "P1"],
        ["PAR-003", "Healing", "Losses should hurt and still be recoverable.", "Beds are separate. Wounded still fill the city cap.", "Partial", "Show both limits. Do not copy a reference hospital curve.", "P1"],
        ["PAR-004", "Army composition", "Class choice should be visible before the fight.", "Three classes, one counter circle at ±15%, presets exist as a page.", "Partial", "Make the counter readable in the march screen.", "P1"],
        ["PAR-005", "Progression pacing", "The first hour should finish a city, a train, a scout, and a fight.", "Citadel 1–5, six chapters, dailies. Times are seconds to minutes, not hours.", "Partial", "Play one uninterrupted first session and write down where it stalls. Do not lengthen timers to match another game.", "P0"],
        ["PAR-006", "Commander growth", "A hero should become legible: level, stars, skills, talents.", "Rules exist through level 60. The talent UI is a list. Only one hero has 3D, off main.", "Partial", "Graph the nine talents. Keep the captain off main until the thrust is fixed.", "P1"],
        ["PAR-007", "Multiplayer battle", "Two players should understand a field fight.", "PvP rules are tested in code. No native two-client fight was recorded in this audit.", "Code-Verified Only", "Record one Age of Oaths duel on the Windows player.", "P1"],
        ["PAR-008", "Alliance action", "Help, a gift, and a rally should feel different.", "Help cuts time. Gifts are taxed. Rallies exist.", "Partial", "Three labels and one native pass of each button.", "P1"],
        ["PAR-009", "Scout fantasy", "Unexplored land should hide information and then remember geography.", "Binary reveal exists. Edge quality was not recaptured.", "Code-Verified Only", "Soften the edge without leaking intel.", "P1"],
        ["PAR-010", "Kingdom scale", "A strategy game can be excellent at 32 players without seasons.", "32-player cap is enforced. Seasons and migration are absent.", "Missing", "Do not build migration next.", "P3"],
        ["PAR-011", "Civilization choice", "The pick should change play and architecture.", "Five bonuses and mythic names exist. Preview quality was not recaptured.", "Code-Verified Only", "Show the bonus and a culture city before lock-in.", "P1"],
        ["PAR-012", "Premium fairness", "Premium currency must not be required to finish the opening.", "Aether is separate. Chapters grant small Aether. Odds do not rise with the temple.", "Verified Implemented", "Keep Mana and Aether apart.", "P1"],
    ]


def visual_rows():
    return [
        ["VIS-C01", "Frontier Captain", "Original rig plus generated equipment textures", "feature/captain-3d 47fcbc9", "Defective", "Fingers close on the shaft in a bind pose. Spear attack travels down across the body. Shield is parented to the left forearm.", "Front, side, rear, idle, ready, attack, victory stills plus a rotating clip at 1280×800, and stills at 1024 and 1920.", "Existing polish stills and captain-motion.mp4. Not on main."],
        ["VIS-C02", "Commander stage", "Unity primitives, not the Greek temple FBX", CAPTAIN, "Partial", "Black rectangle is gone. Columns are cubes. Marble is brighter than the armor.", "A hall screenshot where the floor, columns, and character share one light.", "polish hall stills."],
        ["VIS-C03", "Other commanders", "Data and portraits on main. No shared 3D rig.", MAIN, "Missing", "Ten commanders have no rig.", "At least one second hero using the captain skeleton, or an explicit painted-only decision.", NATIVE],
        ["VIS-C04", "City buildings", "Procedural kits plus Greek FBX sources in Resources on the captain tree", MAIN, "Partial", "Level changes are not a strong architectural evolution.", "Citadel 1 and Citadel 5, same civilization, same camera distance.", NATIVE],
        ["VIS-C05", "World terrain", "Procedural relief and some tree meshes", MAIN, "Unknown", "Black vegetation was reported earlier and not recaptured.", "Windows hardware frames with shadows on and off.", NATIVE],
        ["VIS-C06", "Fog", "Sector mask", MAIN, "Partial", "Gameplay state is binary. The edge is reported as rectangular.", "Scout reveal, then reconnect, same camera.", NATIVE],
        ["VIS-C07", "Armies", "Aggregate presentation", MAIN, "Partial", "Class identity at march scale is weak.", "One march of each class at the same zoom.", NATIVE],
        ["VIS-C08", "Combat VFX", "Bounded skill effects, including Rallying Cry", MAIN, "Unknown", "Not judged this audit.", "Native clip of Rallying Cry and one other skill.", NATIVE],
        ["VIS-C09", "Lighting", "Gamma color space", MAIN, "Code-Verified Only", "A color-space change would regrade every texture.", "Do not change it inside a content pass.", "ProjectSettings m_ActiveColorSpace 0."],
        ["VIS-C10", "HUD", "Immediate-mode prototype UI", MAIN, "Unknown", "Density and clipping were not retested.", "1024×768 and 1920×1080 of City, Marches, Heroes, Exploration.", NATIVE],
    ]


def ui_rows():
    pages = ["World", "City", "Training", "Research", "Temple", "Heroes", "Alliance", "Chronicle", "Forge", "Market", "Marches", "Formation", "Hospital", "Reports", "Chat", "Warfare", "Exploration", "Campaign", "Activity", "Kingdom", "Settings", "Account", "Inventory", "Rankings", "Menu"]
    rows = []
    for index, page in enumerate(pages, 1):
        rows.append([f"UI-{index:03d}", page, "Enum value exists. Draw path was not exercised in a player.", "Unknown", "Navigation, empty state, and 1024×768 clipping are unverified.", "client/GameNavigation.cs", NATIVE])
    rows.append(["UI-026", "Heroes on captain branch", "Skill medallions, gold tab underline, and a living captain when the mesh loads.", "Partial", "Layout improved on the feature branch only. Gameplay commands were not retuned.", "PrototypeClient.Screens.cs on 47fcbc9", "Hall stills on that branch."])
    rows.append(["UI-027", "Capacity language", "troopCapacity, marchSlots, wounded, and reserves are separate server fields.", "Partial", "The player can still read them as one army size. This label pass is not approved to build yet.", "server/city.mjs citySnapshot", NATIVE])
    return rows


def tech_rows():
    return [
        ["TEC-001", "Authority", "Commands mutate the world only on the server. The client is a view and a command sender.", "Demonstrated by command handlers and tests. Not by a new multi-client play.", "server/world.mjs command"],
        ["TEC-002", "Protocol", "GET /health returns version 16. Linux and Windows package checks call that the protocol.", "Code and package tests. Suite not re-run.", "server/http.mjs"],
        ["TEC-003", "Schema", "Current save schema is 18, with migrations from 1.", "Loader code. A full old-save replay was not run in this audit.", "server/world.mjs fromSave"],
        ["TEC-004", "Capacity", "Join fails at 32 players. This is the demonstrated cap.", "A 32-player load was not run here.", "server/world.mjs"],
        ["TEC-005", "Map", "Playable coordinates are 1–79.", "Code.", "server/marches.mjs"],
        ["TEC-006", "Interest management", "Vision checks exist for scouting and PvP. There is no shard interest manager for thousands of armies.", "Do not describe the prototype as MMO-scale.", "server/exploration.mjs visible checks"],
        ["TEC-007", "Persistence", "JSON world plus SQLite accounts. Telemetry must omit tokens and names.", "Tests exist. Not re-run.", "server/database.mjs server/telemetry.mjs"],
        ["TEC-008", "Client", "Unity 6000.3.0f1, Built-in, Gamma. A second editor, 6000.6.8f1, is installed and is not the project editor.", "ProjectSettings. The player was not rebuilt on main for this audit.", "client/ProjectSettings/ProjectSettings.asset"],
        ["TEC-009", "Tests", "30 server test files are on main. Passing tests would still not prove screens, lighting, or animation.", "Suite not re-run in this audit.", "server/*.test.mjs"],
        ["TEC-010", "Branches", "main and integration/visual-gameplay are b20ac5c. gameplay-parity 70e3db9 is an ancestor of main. Captain work is four commits ahead of main.", "git rev-parse and git log main..feature/captain-3d.", "git"],
    ]


def economy_rows():
    return [
        ["FORM-001", "City troop capacity", "base[cityLevel] + max(0, barracks-1)*5", "bases 0,40,80,140,220,340", "Citadel 1 Hall 1 = 40; Citadel 5 Hall 5 = 360", "Field + reserves + wounded + queued training count. No per-march cap.", "server/city.mjs capacity", "Implemented", "None"],
        ["FORM-002", "March slots", "AGES[cityLevel-1].marches", "1,2,3,4,5", "Citadel 3 has 3 slots", "Slots limit deployed armies.", "server/progression.mjs AGES", "Implemented", "None"],
        ["FORM-003", "Training batch", "{1:5,2:5,3:10,4:20,5:40}[clamp(barracks,1,5)]", "Hall 2 is 5", "Hall 5 orders 40", "The older matrix line 5/10/20/40 is wrong.", "server/troops.mjs TRAINING_BATCHES", "Implemented", "None"],
        ["FORM-004", "Train seconds", "unit.duration * (batch/5) / (1+0.1*(barracks-1))", "Oathguard duration 8", "Hall 1: 8s; Hall 5: 8*8/1.4 ≈ 45.7s", "Larger orders do not discount per soldier.", "server/troops.mjs trainingOptions", "Implemented", "None"],
        ["FORM-005", "Promotion", "amount = 5; cost = tierII cost minus tierI cost", "Always 5", "Five Oathguard become five veterans", "Does not create soldiers.", "server/world.mjs promote; server/troops.mjs promotionCost", "Implemented", "None"],
        ["FORM-006", "Hospital beds", "25 + 15*infirmary", "Level 1 = 40 beds", "A 41-troop batch is rejected at level 1", "Wounded still use city capacity. Mythic counts as 5 beds.", "server/war.mjs", "Implemented", "None"],
        ["FORM-007", "Healing seconds", "max(2, (weight*1.2 + mythic*8) / (1+0.15*(infirmary-1)))", "Minimum 2 seconds", "Not recomputed for a sample batch here", "Speed is separate from beds.", "server/war.mjs hospital-heal", "Implemented", "None"],
        ["FORM-008", "Action points", "cap 100; +1 per 60000 ms; remainder kept", "0 to 100 takes 100 minutes", "Camp 5, stronghold 10", "PvP in the economy test did not spend AP.", "server/economy.mjs", "Implemented", "None"],
        ["FORM-009", "Passive production", "every 5s; (mana?1:2)*level*(1+0.15*harvest)", "Food level 1, harvest 0: 2 per 5s", "Cap = 500+vault*250+cityLevel*50", "Gathered resources are not deleted at the cap.", "server/city.mjs tickCity", "Implemented", "None"],
        ["FORM-010", "Construction seconds", "citadel: 20*currentLevel; else 12*next; / (1+0.05*masonry)", "Citadel 1→2 is 20s before masonry", "Other level-1 builds are 24s before masonry", "Cost: citadel × current level; others × next^1.4", "server/city.mjs buildingCard", "Implemented", "None"],
        ["FORM-011", "Research seconds", "12*next/(1+0.05*writing); cost = base*next*next", "Rank 1 is 12s", "Most techs max at 3", "Athenaeum level gates the rank.", "server/city.mjs technologyCard", "Implemented", "None"],
        ["FORM-012", "Alliance help", "remaining -= max(2, duration*0.1); floor 0.1", "Each ally once", "Cap min(5, 1+oathhall)", "Help is not the taxed gift.", "server/city.mjs alliance-help", "Implemented", "None"],
        ["FORM-013", "Carry and gather", "inf*16+arch*12+cav*24+mythic*80, then ×(1+0.08*logistics)", "10 infantry carry 160", "Take ceil(8*gather) per second", "Only delivered cargo completes the chapter.", "server/field-logistics.mjs", "Implemented", "None"],
        ["FORM-014", "Commander level", "min(stars*10, 1+floor(xp/100))", "0 XP is level 1", "Six stars cap at 60", "Promote requires level >= stars*10.", "server/progression.mjs heroLevel", "Implemented", "None"],
        ["FORM-015", "Mentor and stars", "Mentor +100 XP for 40 gold and 20 food. Star costs 100*stars gold and 10*stars mana.", "Star 1→2 costs 100 gold and 10 mana", "New skill slot opens through star 4", "XP cap is (stars*10-1)*100.", "server/progression.mjs progressionCommand", "Implemented", "None"],
        ["FORM-016", "Talents and skills", "Point per 5 levels. Respec 15 mana × ranks. Skill shard cost 5*(level+1).", "One spent rank refunds for 15 mana", "Skill levels 1–5", "Nine nodes, not a large tree.", "server/progression.mjs", "Implemented", "None"],
        ["FORM-017", "Counters", "1+0.15*classDot/(a.troops*b.troops)", "Pure infantry vs cavalry = 1.15", "Reverse = 0.85", "Mixed marches scale down.", "server/war.mjs counterMultiplier", "Implemented", "None"],
        ["FORM-018", "Summon odds", "0.40 / 0.35 / 0.20 / 0.05; epic pity 10; legendary pity 50", "Temple level does not change odds", "Offering is 1, 2, or 3 sigils", "Premium sigil is 10 Aether.", "server/city-content.mjs SUMMON_RULES", "Implemented", "None"],
        ["FORM-019", "Mythic capacity", "cityLevel + max(0, menagerie-1)", "Citadel 2, menagerie 1 = 2", "Recruit time 20/(1+0.1*(menagerie-1))", "Separate from mortal capacity.", "server/city.mjs mythicCapacity", "Implemented", "None"],
        ["FORM-020", "Trade", "tax 0.1; daily send cap 3000", "Self-exchange throws", "Alliance members only", "Not a player auction.", "server/economy.mjs ECONOMY", "Implemented", "None"],
    ]


def bug_rows():
    return [
        ["BUG-001", "Confirmed", "High", "Spear attack is not a thrust", "feature/captain-3d 47fcbc9", "Native attack stills show the spear dropping across the body.", "Not on main, so main is not defective for this.", "A front and three-quarter clip where the tip travels forward and holds.", "M5"],
        ["BUG-002", "Confirmed", "Medium", "Grip is a posed curl, not fingers", CAPTAIN, "Close-ups meet the shaft. The rig has no finger bones. An earlier 319-vertex curl destroyed the wrist and was discarded.", "Do not rerun that curl.", "Close-up rotation without the shaft passing through the palm.", "M5"],
        ["BUG-003", "Confirmed", "Low", "Hall court reads as a block-out", CAPTAIN, "Cubes, cylinders, pale marble, one body atlas.", "Lighting is better than the old black frame.", "A still where stone, bronze, cloth, and skin are distinguishable.", "M5"],
        ["BUG-004", "Reported, not reproduced", "High", "Journey progress 7/8 becomes 6/8 after restart", MAIN, "Older research note only. chapters.test.mjs does not assert it.", "No save file demonstrating it was attached.", "A test that persists 7/8 and reloads 7/8.", "M0"],
        ["BUG-005", "Reported, not reproduced", "Medium", "Black vegetation fragments", MAIN, "Prior visual notes. Not recaptured on this pass.", "May already be fixed on b20ac5c. Unknown.", "Windows frames, shadows on and off, same camera.", "M0"],
        ["BUG-006", "Reported, not reproduced", "Medium", "1024×768 label clipping", MAIN, "Older UI notes. Captain stills at 1024 do not cover the city HUD.", "Unknown on current main.", "A 1024×768 pass of City, Marches, Heroes, Exploration.", "M1"],
        ["BUG-007", "Research error, not a game defect", "Low", "Training batch written as 5/10/20/40", "Workbook, not the server", "Source is 5, 5, 10, 20, 40.", "Numeric Anchors already had the repeated 5.", "Feature inventory TRP-007 matches troops.mjs.", "Closed"],
        ["BUG-008", "Research error, not a game defect", "Low", "Captain described as b12c303, 48k triangles, black frame, on main", "Workbook", "Head is 47fcbc9, 68k, stone court, not merged.", "main has neither the mesh nor the black-frame fix.", "Baseline sheet hashes.", "Closed"],
    ]


def gap_rows():
    return [
        ["GAP-001", "Per-march soldier cap", "Players cannot tell a full city from a full army.", "An original march burden, separate from city storage, after the labels exist.", "Needs approval", "P0"],
        ["GAP-002", "Tier III", "Late cities stop at veterans.", "A named third oath with its own cost, not a copied tier table.", "Later", "P2"],
        ["GAP-003", "Commander pairing", "One commander leads a march.", "A second oath-bearer with a small, visible bonus.", "Later", "P2"],
        ["GAP-004", "Talent graph", "The nine nodes work and look like a list.", "Draw the prerequisites that already exist.", "Ready to design", "P1"],
        ["GAP-005", "Territory upkeep", "Holding ground has little ongoing cost.", "An oath-fire or shrine supply, original rules.", "After alliances are readable", "P2"],
        ["GAP-006", "Seasons and migration", "Reference kingdoms advertise ages and moves between servers.", "Not required for a good 32-player prototype.", "Not next", "P3"],
        ["GAP-007", "Authored city kits", "Cities do not yet show age in the silhouette.", "Culture roofs and a visible Citadel 1 versus 5.", "Art milestone", "P1"],
        ["GAP-008", "Individual soldiers", "Fights are numbers plus a few actors.", "Class banners and a small formation before any crowd tech.", "Art and combat", "P1"],
        ["GAP-009", "City raid", "Field PvP does not become a base assault.", "A protected store and a declared raid window.", "After field PvP is readable", "P2"],
        ["GAP-010", "Anti-scout play", "Recon has depths and alerts in code.", "A ward the defender can see and improve.", "After recon is filmed", "P2"],
        ["GAP-011", "Event calendar", "Chapters and dailies exist. Seasons do not.", "One repeating civic festival with a start and an end.", "After the first session is solid", "P2"],
        ["GAP-012", "Finger bones", "The captain cannot make a fist.", "A grip pose that holds under attack, or a later finger rig.", "Captain branch", "P1"],
    ]


def roadmap_rows():
    return [
        ["M0-01", "M0", "Reproduce or retire the journey restart report", "Stops a false P0 from blocking real work", "P0", "None", "One save, one reload, one test", "S", "The bug may not exist", "A test fails before the fix and passes after, or the report is closed as unreproduced", "server/chapters.test.mjs", "The save file and the test name", "Proposed"],
        ["M0-02", "M0", "Native capture pass on main", "Shows what a new player actually sees", "P0", "Windows player of b20ac5c", "Play, do not retune", "M", "A local server and a GPU", "City 1 and 5, two zooms, scout reveal and reconnect, train, march, one PvE fight, alliance, chapter claim", "No new test required", "The frames and a note of build hash b20ac5c", "Proposed"],
        ["M0-03", "M0", "Re-run the server suite and record the result", "Separates known code from a green tree", "P0", "Node on this machine", "Run only", "S", "Flakes would need a second look", "Command, pass count, and commit hash in the roadmap notes", "All server/*.test.mjs", "The log path", "Proposed"],
        ["M1-01", "M1", "First-session script review", "Finds the stall between train, scout, and fight", "P0", "M0-02", "Notes, then a small copy pass if a step is unexplained", "M", "Copy can become a redesign if unbounded", "A new player can say what the next button does", "server/first-session.test.mjs", "A 1280×800 recording of the opening chapter", "Proposed"],
        ["M1-02", "M1", "Capacity language, held", "Would stop city storage being read as march size", "P0", "Approval after this audit", "Labels only. No formula and no schema change", "S", "The user has not approved this slice", "Five lines: capacity, reserves, wounded, field, march slots. Hall 2 still says batch 5", "gameplay-parity, war, veterans", "City panel and march panel at 1280×800", "Held"],
        ["M2-01", "M2", "Decide whether a march has its own soldier cap", "Changes tactics if approved", "P1", "M1-02 live for at least one playtest", "Design note before code", "M", "A copied RoK number would be rejected", "An original formula, examples at Citadel 1 and 5, and a migration note if saves change", "New march test plus old capacity tests", "March screen showing both caps", "Proposed"],
        ["M2-02", "M2", "Show training, healing, and help as three queues", "Makes the city readable", "P1", "M0-02", "Existing commands only", "M", "UI density at 1024", "Batch, beds, and help count are visible without opening the code", "city and war tests", "Three panels at 1024 and 1920", "Proposed"],
        ["M3-01", "M3", "Draw the existing talent graph", "The nine nodes become a choice instead of a list", "P1", "None", "Client presentation of current prerequisites", "M", "A new node would be scope creep", "Warhost, Provision, and Sanctuary show requires links, ranks, and the 15 Mana respec", "progression tests still pass", "1024 and 1280 talent stills", "Proposed"],
        ["M3-02", "M3", "Record one PvE and one PvP fight", "Proves combat feedback before new math", "P1", "M0-02", "No balance change", "S", "PvP needs two clients", "Both reports show casualties and the counter", "Existing war tests", "Two native clips", "Proposed"],
        ["M4-01", "M4", "Alliance help, gift, and rally labels", "Three cooperative acts stop sharing one vague button", "P1", "Two local clients", "Copy and empty states", "M", "Rally rules are easy to widen by accident", "Each action names its cost, cap, and result", "campaign, economy, city tests", "A two-client clip", "Proposed"],
        ["M4-02", "M4", "Leave seasons and migration unbuilt", "Protects the prototype from a false scale goal", "P3", "None", "No code", "S", "None", "The roadmap still says 32 players", "None", "None", "Proposed"],
        ["M5-01", "M5", "Repair the captain thrust on its branch", "The hero reads as a spear fighter", "P1", "Stay on feature/captain-3d", "Animation only", "L", "Earlier curls destroyed the wrist", "Tip moves forward, shield stays forward, recovery returns to ready", "Review harness", "New stills and a motion clip", "Proposed"],
        ["M5-02", "M5", "Citadel 1 and 5 silhouette", "Age is visible without reading a number", "P1", "M0-02 frames", "Art for one culture first", "L", "Five cultures at once will stall", "Greek Citadel 1 and 5 are distinguishable at map zoom", "No server change", "Paired screenshots", "Proposed"],
        ["M5-03", "M5", "Fog edge", "Exploration feels spatial", "P1", "Confirm intel does not leak", "Presentation of the existing binary grid", "M", "A soft edge can reveal a hidden tile", "Reconnect shows the same explored set", "exploration tests", "Reveal and reconnect clip", "Proposed"],
        ["M6-01", "M6", "One festival, not a season", "Gives a reason to return after the chapters", "P2", "M1 complete", "A dated objective using current counters", "L", "Reward duplication", "Start, end, and a server-granted reward", "activity tests", "The festival panel", "Proposed"],
        ["M7-01", "M7", "Performance note on the Windows player", "Separates capture cost from frame time", "P1", "A player build", "Measure, do not optimize blindly", "M", "The old 358 ms number is a screenshot loop", "A scene frame time without PNG writes", "None", "The counter log and the build hash", "Proposed"],
    ]


def queue_rows():
    return [
        ["CT-001", "M0-01", "Journey persistence", "server/chapters.mjs claim and metrics", "Progress that is legal before restart is legal after restart", "Do not change rewards. Do not bump schema.", "Add a reload assertion only if a failing case is found", "Test output or a written unreproduced note", "Proposed"],
        ["CT-002", "M0-02", "Native baseline", "Build of main b20ac5c", "Film the current game", "No content edits in the same change", "None", "Frame folder, resolutions, and commit hash", "Proposed"],
        ["CT-003", "M0-03", "Server suite", "server/*.test.mjs", "Record pass or failure", "Do not edit tests to make them pass in the same breath as the audit", "The existing suite", "Command log", "Proposed"],
        ["CT-004", "M1-02", "Capacity labels", "citySnapshot fields already exist", "Numbers stay on the current formulas", "Held. Do not start until approved. No schema, no new cap.", "gameplay-parity, war, veterans", "Two screenshots", "Held"],
        ["CT-005", "M2-01", "March-cap decision", "marches.mjs has no soldier cap", "Write the design before code", "Do not copy a screenshot number from the reference game", "Design note", "Examples at Citadel 1 and 5", "Proposed"],
        ["CT-006", "M3-01", "Talent graph", "TALENT_TREES prerequisites", "Same nine nodes and the same respec cost", "No new nodes", "progression tests", "1024 and 1280 stills", "Proposed"],
        ["CT-007", "M5-01", "Captain thrust", "feature/captain-3d presentation FBX", "Shield, spear, and server skills stay equipped and unchanged", "Do not merge to main in that task. Do not rerun the 319-vertex curl.", "Review harness", "Motion clip", "Proposed"],
        ["CT-008", "M5-03", "Fog presentation", "WorldView.Fog.cs and exploration state", "Explored set is unchanged", "Do not reveal extra sectors to sell a softer edge", "exploration and scouting tests", "Reveal plus reconnect", "Proposed"],
    ]


def classify_video(values):
    text = " ".join(str(v) for v in values if v is not None).lower()
    if "screenshot" in text or "display" in text or "visible" in text:
        return "UI values displayed in footage"
    if "guide" in text or "spoken" in text or "commentary" in text or "chisgule" in text:
        return "Commentary or advice. The 44-minute file was not transcribed."
    if "inference" in text or "unconfirmed" in text or "not confirmed" in text:
        return "Inference requiring verification"
    return "Workbook observation. Frame sheets were not supplied, so this is not a new frame-level confirmation."


def copy_evidence(wb):
    candidates = [
        Path(r"C:\Users\rober\Downloads\Thrones_of_Myth_RoK_Video_Research_v1.xlsx"),
        Path(r"C:\Users\rober\Documents\GitHub\myth-rok-audit\work\research\rok\Thrones_of_Myth_RoK_Video_Research_v1.xlsx"),
    ]
    source = next((path for path in candidates if path.exists()), None)
    ws = wb.create_sheet("RoK Video Evidence")
    note = "The 44m48s MP3 was not transcribed. No Chisgule recommendation is claimed. The 24 Hour file is an edited montage. The Top 3 file is sponsored. Contact sheets were not in the attachment set."
    if source is None:
        style_sheet(ws, ["Note"], [[note]], [120])
        return
    old = load_workbook(source, data_only=True)
    if "Video Evidence" not in old.sheetnames:
        style_sheet(ws, ["Note"], [[note + " Video Evidence sheet missing."]], [120])
        return
    src = old["Video Evidence"]
    headers = [src.cell(4, c).value for c in range(1, src.max_column + 1)]
    headers = [h for h in headers if h]
    width = len(headers)
    copied = []
    for row in range(5, src.max_row + 1):
        values = [src.cell(row, c).value for c in range(1, width + 1)]
        if not any(values):
            continue
        copied.append(values + [classify_video(values)])
    style_sheet(ws, headers + ["Evidence class"], copied, [18] * width + [42])
    ws.oddHeader.left.text = note
    audio = wb.create_sheet("Audio Guide Limit")
    audio_rows = []
    if "Audio Chapters" in old.sheetnames:
        chapter = old["Audio Chapters"]
        for row in range(1, chapter.max_row + 1):
            values = [chapter.cell(row, c).value for c in range(1, chapter.max_column + 1)]
            if any(values):
                padded = (list(values) + [None] * 6)[:6]
                audio_rows.append(padded + ["Not transcribed. Chapter title or timestamp only."])
    if not audio_rows:
        audio_rows = [["No Audio Chapters sheet was found.", "", "", "", "", "", "Not transcribed."]]
    style_sheet(audio, ["C1", "C2", "C3", "C4", "C5", "C6", "Audit limit"], audio_rows, [24, 24, 24, 24, 24, 36, 42])


def dashboard(wb, rows):
    ws = wb.active
    ws.title = "Executive Dashboard"
    counts = {}
    for row in rows:
        counts[row[4]] = counts.get(row[4], 0) + 1
    total = len(rows)
    verified = counts.get("Verified Implemented", 0)
    native_yes = sum(1 for row in rows if str(row[9]).startswith("Hall stills") or str(row[9]).startswith("GTX") or str(row[9]).startswith("Existing"))
    ws["A1"] = "Thrones of Myth — master audit v2"
    ws["A1"].font = TITLE_FONT
    ws.merge_cells("A1:F1")
    ws["A2"] = "Read-only audit of main b20ac5c. Captain presentation is feature/captain-3d 47fcbc9 and is not counted as being on main. Unit tests were not re-run. Native city, map, and battle footage was not recaptured."
    ws["A2"].alignment = WRAP
    ws.merge_cells("A2:F2")
    ws.row_dimensions[2].height = 36
    headers = ["Status", "Rows", "Share of inventoried rows"]
    ordered = ["Verified Implemented", "Partial", "Code-Verified Only", "Missing", "Defective", "Unknown"]
    for index, status in enumerate(ordered, 4):
        ws.cell(index, 1, status).fill = STATUS_FILL[status]
        ws.cell(index, 2, counts.get(status, 0))
        ws.cell(index, 3, counts.get(status, 0) / total)
        ws.cell(index, 3).number_format = "0.0%"
    ws["B3"] = "Rows"
    ws["A11"] = "Denominator"
    ws["B11"] = total
    ws["C11"] = "Feature inventory rows written in this audit. This is not a percentage of a finished commercial game."
    ws["A12"] = "Verified implemented share"
    ws["B12"] = verified / total
    ws["B12"].number_format = "0.0%"
    ws["C12"] = "Rows whose formula or rule was re-read in source and matched a known test file. Gameplay is still not native-verified."
    ws["A13"] = "Rows with native evidence"
    ws["B13"] = native_yes
    ws["C13"] = "Captain hall evidence only, and it is not on main."
    ws["A15"] = "Milestone scope, not a date"
    for index, line in enumerate([
        "M0 Stability: reproduce the journey rumor, film main, run the suite.",
        "M1 Onboarding: watch the first session. Capacity labels are written down and held.",
        "M2 Economy and army: queues and, only if approved, an original march cap.",
        "M3 Commanders and combat: talent graph and one recorded fight. No new math yet.",
        "M4 Alliance: help, gift, and rally made distinct. No seasons.",
        "M5 Art: captain thrust on its own branch, one culture's Citadel ages, fog edge.",
        "M6 Retention: one festival after the first session works.",
        "M7 Release: measure frame time without screenshot cost.",
    ], 16):
        ws.cell(index, 1, line)
        ws.merge_cells(start_row=index, start_column=1, end_row=index, end_column=6)
    ws.column_dimensions["A"].width = 42
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 88
    for col in "DEF":
        ws.column_dimensions[col].width = 18
    chart = PieChart()
    chart.title = "Inventory status"
    labels = Reference(ws, min_col=1, min_row=4, max_row=9)
    data = Reference(ws, min_col=2, min_row=3, max_row=9)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(labels)
    chart.dataLabels = None
    chart.width = 15
    chart.height = 8
    ws.add_chart(chart, "A26")
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.page_setup.paperSize = ws.PAPERSIZE_TABLOID
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.oddFooter.right.text = "Page &P of &N"
    ws.sheet_view.showGridLines = False
    ws.print_options.horizontalCentered = True
    ws.page_setup.horizontalCentered = True
    ws.sheet_view.zoomScale = 120


def corrections():
    return [
        ["City capacity", "40 / 85 / 150 / 235 / 360 when Citadel and Hall match", "server/city.mjs", "Kept"],
        ["Training batches", "5, 5, 10, 20, 40 by Hall level", "server/troops.mjs", "Corrects 5/10/20/40"],
        ["Promotion", "Exactly 5. Converts. Does not create troops.", "server/world.mjs", "Kept"],
        ["March soldier cap", "None. One march can take the reserve.", "server/marches.mjs", "Kept"],
        ["March slots", "1 through 5 by Citadel", "server/progression.mjs", "Kept"],
        ["Hospital", "25 + 15 × infirmary. Wounded also fill city capacity.", "server/war.mjs", "Kept"],
        ["Action points", "100 cap, 1 per minute", "server/economy.mjs", "Kept"],
        ["Counters", "Up to ±15%", "server/war.mjs", "Kept"],
        ["Mana and Aether", "Separate", "server/city-content.mjs and server/economy.mjs", "Kept"],
        ["Schema and protocol", "Schema 18, health version 16", "server/world.mjs and server/http.mjs", "Kept"],
        ["Captain", "47fcbc9, 68k triangles, stone court, not on main", "feature/captain-3d", "Corrects b12c303 / 48k / black frame / main"],
    ]


def build():
    rows = inventory()
    wb = Workbook()
    dashboard(wb, rows)
    sheets = [
        ("Full Feature Inventory", INVENTORY_HEADERS, rows, [12, 16, 28, 55, 24, 42, 28, 22, 36, 36, 32, 28, 40, 10], 5),
        ("Gameplay Parity Matrix", ["ID", "Mechanic", "Player value", "Actual behavior", "Status", "Original direction", "Priority"], parity_rows(), [12, 28, 40, 42, 22, 42, 10], 5),
        ("Visual Quality Matrix", ["ID", "Subject", "Asset kind", "Branch", "Status", "Acceptance gap", "Evidence required", "Evidence now"], visual_rows(), [12, 24, 36, 28, 22, 42, 40, 36], 5),
        ("UI UX Audit", ["ID", "Screen or interaction", "What was confirmed", "Status", "Usability risk", "Source", "Native verification"], ui_rows(), [12, 28, 42, 22, 42, 36, 36], 4),
        ("Technical Architecture", ["ID", "Area", "Finding", "Limit of the claim", "Source"], tech_rows(), [12, 20, 55, 42, 36], None),
        ("Economy and Progression", ["ID", "System", "Formula", "Constraint", "Example", "Do not confuse with", "Source", "Implemented or proposed", "Proposed rebalance"], economy_rows(), [12, 24, 42, 28, 36, 36, 32, 22, 16], None),
        ("Bugs and Technical Debt", ["ID", "Evidence grade", "Severity", "Defect", "Branch", "Evidence", "Limit", "Validation", "Milestone"], bug_rows(), [12, 28, 12, 36, 28, 42, 36, 36, 12], None),
        ("Feature Gaps", ["ID", "Absent mechanic", "Why it matters", "Original direction", "Readiness", "Priority"], gap_rows(), [12, 28, 40, 42, 28, 12], None),
        ("Development Roadmap", ["Task ID", "Milestone", "Description", "Player impact", "Priority", "Dependencies", "Scope", "Complexity", "Risks", "Acceptance", "Tests", "Native evidence", "Status"], roadmap_rows(), [12, 12, 36, 28, 10, 24, 28, 12, 28, 36, 28, 28, 14], 13),
        ("Cursor Task Queue", ["Task", "Roadmap", "Subject", "Existing implementation", "Invariant", "Out of scope", "Tests", "Done when", "Status"], queue_rows(), [12, 12, 22, 36, 36, 36, 28, 36, 14], 9),
        ("Preserved Corrections", ["Claim", "Measured value", "Source", "Effect on the old workbook"], corrections(), [28, 55, 42, 42], None),
    ]
    for name, headers, data, widths, status_col in sheets:
        ws = wb.create_sheet(name)
        style_sheet(ws, headers, data, widths, status_col)
    copy_evidence(wb)
    base = wb.create_sheet("Baseline and Method", 1)
    notes = [
        ["Item", "Value"],
        ["Main", "b20ac5c518fea0bb0a0ea7815b53327a7975d195"],
        ["integration/visual-gameplay", "Same commit as main"],
        ["feature/gameplay-parity", "70e3db9, ancestor of main, no unique commits"],
        ["feature/captain-3d", "47fcbc9, four commits ahead of main: a71d23a, dc28e10, b12c303, 47fcbc9"],
        ["research/rok-parity-audit", "47fcbc9 worktree, audit only"],
        ["Not counted as main", "Captain mesh, SpearGrip, stone court, hall medallions, review harness"],
        ["Suite", "Not re-run. A named test file is not a pass."],
        ["Native", "No new city, map, scout, training, PvE, alliance, or quest capture."],
        ["Audio", "44m48s MP3 not transcribed."],
        ["Contact sheets", "Zip was not supplied. No frames invented."],
        ["Reference games", "Usability standard only. Formulas were not copied."],
        ["Troop-count UI", "Described and held. Not implemented."],
    ]
    style_sheet(base, notes[0], notes[1:], [36, 88], None)
    wb.properties.title = "Thrones of Myth Master Development Roadmap v2"
    wb.properties.creator = "Thrones of Myth source audit"
    wb.properties.subject = "Read-only audit of main b20ac5c"
    path = OUT / "Thrones_of_Myth_Master_Development_Roadmap_v2.xlsx"
    wb.save(path)
    summary = OUT / "MASTER_AUDIT_V2.md"
    counts = {}
    for row in rows:
        counts[row[4]] = counts.get(row[4], 0) + 1
    lines = [
        "# Thrones of Myth master audit v2",
        "",
        "Read-only. Main is `b20ac5c`. The equipped Frontier Captain is `feature/captain-3d` at `47fcbc9` and is not on main.",
        "",
        f"The feature inventory has {len(rows)} rows. That denominator is the systems this pass could name from source. It is not a completion percentage for a shipped game.",
        "",
    ]
    for status in ["Verified Implemented", "Partial", "Code-Verified Only", "Missing", "Defective", "Unknown"]:
        lines.append(f"- {status}: {counts.get(status, 0)}")
    lines += [
        "",
        "Verified rows are formulas and rules re-read in source. The server suite was not re-run. No native city, map, scout, training, battle, alliance, or quest session was captured. Captain hall stills exist only for the feature branch.",
        "",
        "The 44-minute audio guide was not transcribed. Contact sheets were not supplied.",
        "",
        "Preserved corrections: capacity 40/85/150/235/360, batches 5/5/10/20/40, promotion of 5, no per-march soldier cap, march slots 1–5, hospital 25+15×infirmary, AP 100 at 1 per minute, counters ±15%, Mana separate from Aether, schema 18, protocol 16, captain not on main.",
        "",
        "The troop-count label slice is in the queue as CT-004 / M1-02 and is marked Held. It was not built.",
        "",
        "Next work, if approved, is M0: reproduce or retire the journey restart note, film a player of main, and run the server suite. Dates are not estimated.",
        "",
    ]
    summary.write_text("\n".join(lines), encoding="utf-8")
    print(path)
    print(summary)
    print(counts)


if __name__ == "__main__":
    build()
