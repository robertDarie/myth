using System;

namespace ThronesOfMyth
{
    [Serializable] public sealed class JoinRequest { public string name; public string civilization; public string resumeToken; }
    [Serializable] public sealed class JoinResponse { public string token; public string playerId; }
    [Serializable] public sealed class ErrorResponse { public string error; }
    [Serializable] public sealed class GameCommand { public string type; public float x; public float z; public string targetId; public string name, marchId; public int count, troops, mythic, skillIndex; }
    [Serializable] public sealed class ArmyData
    {
        public string id, ownerId, name, civilization, commanderId, allianceId, state, targetId, ageName, lastSkill;
        public float x, z, homeX, homeZ, targetX, targetZ, recovery, damage, speed, heal, gather, trainingDuration, recruitDuration;
        public int health, maxHealth, gold, wood, food, troops, mythic, cityLevel, level, kills;
        public float xp;
        public int rage, shield, skillCasts, attackSequence, marchSlots, constructionSlots, deployedTroops, deployedMythic;
        public bool questClaimed, hasOrder, offline;
        public int reserveTroops, reserveMythic, stone, aether, sigils, troopCapacity, mythicCapacity, passiveLimit, epicPity, legendaryPity, offeringAmount;
        public bool offeringAvailable;
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
    [Serializable] public sealed class SiteData { public string id, name, kind, description, allianceId, challengerId; public float x, z, progress; }
    [Serializable] public sealed class FlagData { public string id, allianceId; public float x, z; }
    [Serializable] public sealed class AllianceData { public string id, name, leaderId; public int members; }
    [Serializable] public sealed class CommanderData { public string id, name, rarity, color, description; public int cost; }
    [Serializable] public sealed class CivilizationData { public string id, name, specialty, mythic; }
    [Serializable] public sealed class EventData { public float time; public string message; }
    [Serializable] public sealed class WorldSnapshot
    {
        public int version, size;
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
