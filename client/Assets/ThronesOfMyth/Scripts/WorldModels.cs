using System;

namespace ThronesOfMyth
{
    [Serializable] public sealed class JoinRequest { public string name; public string civilization; public string resumeToken; }
    [Serializable] public sealed class JoinResponse { public string token; public string playerId; }
    [Serializable] public sealed class ErrorResponse { public string error; }
    [Serializable] public sealed class GameCommand { public string type; public float x; public float z; public string targetId; public string name, marchId; public int count, troops, mythic, skillIndex; public UnitCounts units; }
    [Serializable] public sealed class UnitCounts { public int infantry, archers, cavalry; public int Total => infantry + archers + cavalry; public UnitCounts Copy() => new UnitCounts { infantry = infantry, archers = archers, cavalry = cavalry }; }
    [Serializable] public sealed class TroopTypeData { public string id, name, role, description; public float health, damage, speed, duration; public int cityLevel; public ResourceAmounts cost; }
    [Serializable] public sealed class ArmyData
    {
        public string id, ownerId, name, civilization, commanderId, allianceId, state, targetId, ageName, lastSkill, skillKind, allianceRole, assignmentKind, assignmentId;
        public RoutePoint[] route;
        public float x, z, homeX, homeZ, targetX, targetZ, attackX, attackZ, recovery, damage, speed, heal, gather, trainingDuration, recruitDuration;
        public int health, maxHealth, gold, wood, food, troops, mythic, cityLevel, level, kills;
        public float xp;
        public int rage, shield, skillCasts, attackSequence, marchSlots, constructionSlots, deployedTroops, deployedMythic;
        public bool questClaimed, hasOrder, offline;
        public int reserveTroops, reserveMythic, stone, aether, sigils, troopCapacity, mythicCapacity, passiveLimit, epicPity, legendaryPity, offeringAmount;
        public bool offeringAvailable;
        public UnitCounts units, reserveUnits, wounded;
        public int woundedMythic, hospitalCapacity, hospitalTroops, hospitalMythic;
        public HealingJob healing;
        public BattleReport[] battleReports;
        public GroupBattleReport[] groupReports;
        public string equippedRelic;
        public string[] ownedRelics;
        public QueueJob research, crafting;
        public BuildingCard[] cityBuildings;
        public ResearchCard[] researchOptions;
        public HeroProgress[] heroProgress;
        public DrawResult[] summonHistory;
        public ResourceAmounts sealCost;
        public QueueJob construction, secondConstruction;
        public QueueJob[] trainingQueue;
        public string[] ownedCommanders;
    }
    [Serializable] public sealed class QueueJob { public string id, type; public float remaining, duration; public int amount; public string targetId; public ResourceAmounts cost; }
    [Serializable] public sealed class ResourceAmounts { public int food, wood, stone, gold, aether; }
    [Serializable] public sealed class BuildingCard { public string id, name, category, description, lockedReason; public int level, maxLevel; public bool canUpgrade; public ResourceAmounts nextCost; public float nextDuration; }
    [Serializable] public sealed class ResearchCard { public string id, name, branch, description, lockedReason, prerequisite; public int level, maxLevel; public bool canResearch; public ResourceAmounts cost; public float duration; }
    [Serializable] public sealed class HeroProgress { public string id, expertiseDescription; public int rank, shards, nextShards, nextGold, heroLevel, stars; public float xp; public bool expertise; public HeroSkill[] skills; }
    [Serializable] public sealed class HeroSkill { public int index, level, unlockStar; public string name, kind, description; }
    [Serializable] public sealed class DrawResult { public string id, commanderId, rarity; public bool duplicate; public int shards, number; }
    [Serializable] public sealed class RelicData { public string id, name, description; public ResourceAmounts cost; public float duration; }
    [Serializable] public sealed class TradeData { public string id, name; public ResourceAmounts cost, reward; }
    [Serializable] public sealed class SummonRules { public float common, rare, epic, legendary; public int epicPity, legendaryPity; }
    [Serializable] public sealed class SaveStatus { public bool enabled; public string lastSaved, error; }
    [Serializable] public sealed class CampData { public string id, name; public int level, health, maxHealth, respawn; public float x, z; }
    [Serializable] public sealed class NodeData { public string id, name, resource; public float x, z; public int remaining, capacity; }
    [Serializable] public sealed class SiteData { public bool unknown; public string id, name, kind, description, allianceId, challengerId; public float x, z, progress, health, maxHealth; }
    [Serializable] public sealed class FlagData { public string id, allianceId; public float x, z, health, maxHealth, buildRemaining; public bool isRoot, connected; }
    [Serializable] public sealed class AllianceData { public string id, name, leaderId; public int members; public string[] officers; }
    [Serializable] public sealed class CommanderData { public string id, name, rarity, color, description, skillKind; public int cost; }
    [Serializable] public sealed class CivilizationData { public string id, name, specialty, mythic; }
    [Serializable] public sealed class EventData { public float time; public string message; }
    [Serializable] public sealed class HealingJob { public string id; public UnitCounts units; public int mythic; public float remaining, duration; public ResourceAmounts cost; }
    [Serializable] public sealed class BattleSide { public string playerId, playerName, armyId, commanderId, team, result; public UnitCounts unitsBefore, unitsAfter, wounded; public int mythicBefore, mythicAfter, woundedMythic; public float damageDealt, damageTaken, healed, absorbed, shieldCreated, structureDamage; }
    [Serializable] public sealed class BattleReport { public string id, outcome; public float started, ended; public int rounds; public BattleSide[] sides; }
    [Serializable] public sealed class ChatMessage { public string id, channel, allianceId, authorId, author, text; public float time; }
    [Serializable] public sealed class AllianceMarker { public string id, allianceId, authorId, name; public float x, z, expires; }
    [Serializable] public sealed class RallyData { public string id, allianceId, defendingAllianceId, leaderId, leaderArmyId, targetId, phase; public string[] armyIds; public float assemblyEnds, meetX, meetZ, x, z; public int troopLoad; }
    [Serializable] public sealed class GarrisonData { public string targetId, allianceId; public string[] armyIds; public int troopLoad; }
    [Serializable] public sealed class SiegeData { public string id, targetId; public int rounds; public float started; }
    [Serializable] public sealed class CampaignLimits { public int rallyMarches, rallyLoad, garrisonMarches, garrisonLoad, reportEntries; }
    [Serializable] public sealed class GroupBattleReport { public string id, targetId, targetName, attackingAllianceId, defendingAllianceId, outcome; public float started, ended, structureDamage; public int rounds; public BattleSide[] participants; }
    [Serializable] public sealed class RoutePoint { public float x, z; }
    [Serializable] public sealed class ScoutData { public string id, ownerId, phase; public float x, z, targetX, targetZ; }
    [Serializable] public sealed class ScoutEnemy { public string id, ownerId, name, commanderId; public int troops, mythic, health; public float x, z; }
    [Serializable] public sealed class ScoutGarrison { public string targetId; public int marches, troops, mythic; }
    [Serializable] public sealed class ScoutReport { public string id; public float x, z, time; public ScoutEnemy[] armies; public CampData[] camps; public SiteData[] sites; public FlagData[] flags; public ScoutGarrison[] garrisons; }
    [Serializable] public sealed class ExplorationData { public int cellSize, width; public int[] explored, visible; public ScoutData[] scouts; public ScoutReport[] reports; }
    [Serializable] public sealed class WorldSnapshot
    {
        public int version, size;
        public ExplorationData exploration;
        public CampaignLimits campaignLimits;
        public RallyData[] rallies;
        public GarrisonData[] garrisons;
        public SiegeData[] sieges;
        public ChatMessage[] chatMessages;
        public AllianceMarker[] markers;
        public TroopTypeData[] troopTypes;
        public float time;
        public SaveStatus persistence;
        public RelicData[] relics;
        public TradeData[] trades;
        public SummonRules summonRules;
        public ArmyData[] players, armies;
        public CampData[] camps;
        public NodeData[] nodes;
        public SiteData[] sites;
        public FlagData[] flags;
        public AllianceData[] alliances;
        public CommanderData[] commanders;
        public CivilizationData[] civilizations;
        public EventData[] events;
    }
}
