using System;

namespace ThronesOfMyth
{
    [Serializable] public sealed class JoinRequest { public string name; public string civilization; public string resumeToken; public string joinCode; }
    [Serializable] public sealed class JoinResponse { public string token; public string playerId; }
    [Serializable] public sealed class ErrorResponse { public string error; }
    [Serializable] public sealed class GameCommand { public string type; public float x; public float z; public string targetId; public string name, marchId, period, allianceId, jobId; public int count, troops, mythic, skillIndex, day; public bool enabled; public UnitCounts units; }
    [Serializable] public sealed class InventoryItem { public string id,name,kind,resource,scope,description,category; public int amount,seconds,count; }
    [Serializable] public sealed class InventoryJob { public string id,lane,type,targetId; public float remaining; }
    [Serializable] public sealed class InventoryData { public bool suppliesAvailable; public InventoryItem[] items; public InventoryJob[] jobs; }
    [Serializable] public sealed class PowerData { public int city,research,heroes,ready,deployed,total; }
    [Serializable] public sealed class RankingEntry { public string id,name,civilization,allianceId; public int power; }
    [Serializable] public sealed class RankingData { public RankingEntry[] players,alliances; public string policy; }
    [Serializable] public sealed class UnitCounts
    {
        public int infantry,archers,cavalry,veteranInfantry,veteranArchers,veteranCavalry;
        public int columnInfantry,columnArchers,columnCavalry,bulwarkInfantry,bulwarkArchers,bulwarkCavalry,titanInfantry,titanArchers,titanCavalry;
        public int Infantry => infantry+veteranInfantry+columnInfantry+bulwarkInfantry+titanInfantry;
        public int Archers => archers+veteranArchers+columnArchers+bulwarkArchers+titanArchers;
        public int Cavalry => cavalry+veteranCavalry+columnCavalry+bulwarkCavalry+titanCavalry;
        public int Veterans => veteranInfantry+veteranArchers+veteranCavalry;
        public int Total => Infantry+Archers+Cavalry;
        public int TierWeight => infantry+archers+cavalry+2*Veterans+3*(columnInfantry+columnArchers+columnCavalry)+4*(bulwarkInfantry+bulwarkArchers+bulwarkCavalry)+5*(titanInfantry+titanArchers+titanCavalry);
        public int HealingWeight => TierWeight;
        public int Advanced(string role) => role=="Archers"?Archers-archers:role=="Cavalry"?Cavalry-cavalry:Infantry-infantry;
        public int Get(string id)
        {
            switch(id)
            {
                case "infantry":return infantry;case "archers":return archers;case "cavalry":return cavalry;
                case "veteranInfantry":return veteranInfantry;case "veteranArchers":return veteranArchers;case "veteranCavalry":return veteranCavalry;
                case "columnInfantry":return columnInfantry;case "columnArchers":return columnArchers;case "columnCavalry":return columnCavalry;
                case "bulwarkInfantry":return bulwarkInfantry;case "bulwarkArchers":return bulwarkArchers;case "bulwarkCavalry":return bulwarkCavalry;
                case "titanInfantry":return titanInfantry;case "titanArchers":return titanArchers;case "titanCavalry":return titanCavalry;
                default:return 0;
            }
        }
        public void Set(string id,int value)
        {
            switch(id)
            {
                case "infantry":infantry=value;break;case "archers":archers=value;break;case "cavalry":cavalry=value;break;
                case "veteranInfantry":veteranInfantry=value;break;case "veteranArchers":veteranArchers=value;break;case "veteranCavalry":veteranCavalry=value;break;
                case "columnInfantry":columnInfantry=value;break;case "columnArchers":columnArchers=value;break;case "columnCavalry":columnCavalry=value;break;
                case "bulwarkInfantry":bulwarkInfantry=value;break;case "bulwarkArchers":bulwarkArchers=value;break;case "bulwarkCavalry":bulwarkCavalry=value;break;
                case "titanInfantry":titanInfantry=value;break;case "titanArchers":titanArchers=value;break;case "titanCavalry":titanCavalry=value;break;
            }
        }
        public UnitCounts Copy() => new UnitCounts{infantry=infantry,archers=archers,cavalry=cavalry,veteranInfantry=veteranInfantry,veteranArchers=veteranArchers,veteranCavalry=veteranCavalry,columnInfantry=columnInfantry,columnArchers=columnArchers,columnCavalry=columnCavalry,bulwarkInfantry=bulwarkInfantry,bulwarkArchers=bulwarkArchers,bulwarkCavalry=bulwarkCavalry,titanInfantry=titanInfantry,titanArchers=titanArchers,titanCavalry=titanCavalry};
        public string Summary()
        {
            string[] ids={"infantry","veteranInfantry","columnInfantry","bulwarkInfantry","titanInfantry","archers","veteranArchers","columnArchers","bulwarkArchers","titanArchers","cavalry","veteranCavalry","columnCavalry","bulwarkCavalry","titanCavalry"};
            string[] names={"Oathguard","Veteran Oathguard","Bronze Column","Oath Bulwark","Titan Guard","Dawn Archers","Veteran Dawn Archers","Ashen Bows","Far Marks","Echo Marks","Dawn Riders","Veteran Dawn Riders","Dawn Lancers","Storm Couriers","Horizon Lancers"};
            var parts=new System.Collections.Generic.List<string>();
            for(int i=0;i<ids.Length;i++)if(Get(ids[i])>0)parts.Add(Get(ids[i])+" "+names[i]);
            return parts.Count==0?"No mortal troops":string.Join(" · ",parts);
        }
    }
    [Serializable] public sealed class TroopTypeData { public string id, name, role, description; public float health, damage, speed, duration, orderSeconds, promotionSeconds; public int cityLevel,tier,sourceAvailable,orderAmount; public string baseId,sourceId,lockedReason; public ResourceAmounts cost,orderCost,promotionCost; }
    [Serializable] public sealed class ArmyData
    {
        public string id, ownerId, name, civilization, commanderId, secondaryCommanderId, allianceId, state, targetId, ageName, lastSkill, skillKind, allianceRole, assignmentKind, assignmentId;
        public bool deployed, mapVisible, lastKnown, protectedField; public float observedAt; public int activeMarches, carryCapacity; public ResourceAmounts cargo; public ArmyData[] homeFormations; public CoreReport[] reports;
        public EconomyData economy; public int aether;
        public InventoryData inventory; public PowerData powerBreakdown;
        public TroopTypeData[] trainingOptions;
        public RoutePoint[] route;
        public float x, z, homeX, homeZ, targetX, targetZ, attackX, attackZ, recovery, damage, speed, heal, gather, trainingDuration, recruitDuration;
        public int trainingBatch; public bool terrainExplored;
        public int health, maxHealth, gold, wood, food, troops, mythic, cityLevel, level, kills;
        public float xp;
        public int rage, shield, skillCasts, attackSequence, marchSlots, constructionSlots, deployedTroops, deployedMythic, assignedTroops, assignedMythic;
        public bool questClaimed, hasOrder, offline;
        public int reserveTroops, reserveMythic, stone, mana, sigils, troopCapacity, marchTroopCap, mythicCapacity, passiveLimit, epicPity, legendaryPity, offeringAmount;
        public bool offeringAvailable;
        public UnitCounts units, reserveUnits, wounded;
        public int woundedMythic, hospitalCapacity, hospitalTroops, hospitalMythic;
        public HealingJob healing;
        public BattleReport[] battleReports;
        public GroupBattleReport[] groupReports;
        public JourneyCampaign journeyCampaign;
        public string equippedRelic, formationName;
        public bool formationActive;
        public string[] ownedRelics, ownedArmaments;
        public ArmamentLoadout[] armamentLoadout;
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
    [Serializable] public sealed class FormationRule { public string id, name; public int minimumPercent; public float health; }
    [Serializable] public sealed class ArmamentLoadout { public string commanderId, weapon, armor, banner; }
    [Serializable] public sealed class ArmamentData { public string id, name, slot, description; public float duration, damage, health, speed; public ResourceAmounts cost; }
    [Serializable] public sealed class QueueJob { public string id, type; public float remaining, duration; public int amount; public string targetId,sourceId; public ResourceAmounts cost; }
    [Serializable] public sealed class ResourceAmounts { public int food, wood, stone, gold, mana, aether; }
    [Serializable] public sealed class RequirementCard {public string kind,id,name;public int level,current;public bool met;}
    [Serializable] public sealed class ComparisonStats {public float maxHealth,damage,speed,gather,heal,mitigation,level;}
    [Serializable] public sealed class CommanderComparison {public string marchId,candidateId,currentId;public bool available;public ComparisonStats current,candidate;}
    [Serializable] public sealed class ScoutCampCard { public int scouts, nextScouts, autoSectors, nextAutoSectors; public float speed, nextSpeed, radius, nextRadius, surveySeconds, nextSurveySeconds; public bool hasNext; }
    [Serializable] public sealed class BuildingCard { public RequirementCard[] prerequisites;public ScoutCampCard scoutCamp; public string id, name, category, description, lockedReason, resource; public int level, maxLevel; public bool canUpgrade; public float productionPerFive; public ResourceAmounts nextCost; public float nextDuration; }
    [Serializable] public sealed class ResearchCard { public RequirementCard[] prerequisites; public string id, name, branch, description, lockedReason, prerequisite, effect; public int level, maxLevel, percent, currentBonus, nextBonus; public bool canResearch; public ResourceAmounts cost; public float duration; }
    [Serializable] public sealed class TalentNode { public string id, name, requires, effect, lockedReason; public int max, rank; public bool available; }
    [Serializable] public sealed class TalentTree { public string id, name; public TalentNode[] nodes; }
    [Serializable] public sealed class HeroProgress { public string id, expertiseDescription, respecLockedReason; public int rank, shards, nextShards, nextGold, heroLevel, stars, talentPoints, talentPointsSpent, respecMana; public float xp; public bool expertise; public HeroSkill[] skills; public TalentTree[] talents; }
    [Serializable] public sealed class HeroSkill { public int index, level, unlockStar; public string name, kind, description; }
    [Serializable] public sealed class DrawResult { public string id, commanderId, rarity; public bool duplicate; public int shards, number; }
    [Serializable] public sealed class RelicData { public string id, name, description; public ResourceAmounts cost; public float duration, damage, health; }
    [Serializable] public sealed class TradeData { public string id, name; public ResourceAmounts cost, reward; }
    [Serializable] public sealed class SummonRules { public float common, rare, epic, legendary; public int epicPity, legendaryPity; }
    [Serializable] public sealed class SaveStatus { public bool enabled; public string lastSaved, error, backend; }
    [Serializable] public sealed class CoreReport { public string id,type,title,detail,outcome,armyId,commanderId,reason,sourceId,currencyNote; public float time,started; public ResourceAmounts resources,lost; public CargoSource[] sources; }
    [Serializable] public sealed class CargoSource { public string nodeId,name,resource; public float x,z; public int amount; }
    [Serializable] public sealed class CampData { public bool lastKnown, terrainExplored; public float observedAt; public string id, name; public int level, health, maxHealth, respawn; public float x, z; }
    [Serializable] public sealed class NodeData { public bool lastKnown, terrainExplored; public float observedAt; public string id, name, resource; public float x, z; public int remaining, capacity; }
    [Serializable] public sealed class SiteData { public bool lastKnown, terrainExplored; public float observedAt; public bool unknown, locked; public string id, name, kind, description, allianceId, challengerId; public float x, z, progress, health, maxHealth; }
    [Serializable] public sealed class FlagData { public bool lastKnown, terrainExplored; public float observedAt; public string id, allianceId; public float x, z, health, maxHealth, buildRemaining; public bool isRoot, connected; }
    [Serializable] public sealed class AllianceData { public string id, name, leaderId; public int members; public string[] officers; }
    [Serializable] public sealed class CommanderData { public string id, name, rarity, color, description, skillKind; }
    [Serializable] public sealed class CivilizationData { public string id, name, specialty, mythic; }
    [Serializable] public sealed class EventData { public float time; public string message; }
    [Serializable] public sealed class HealingJob { public string id; public UnitCounts units; public int mythic; public float remaining, duration; public ResourceAmounts cost; }
    [Serializable] public sealed class BattleSide { public string playerId, playerName, armyId, commanderId, team, result; public UnitCounts unitsBefore, unitsAfter, wounded; public int mythicBefore, mythicAfter, woundedMythic; public int experience; public float damageDealt, damageTaken, healed, absorbed, shieldCreated, structureDamage; }
    [Serializable] public sealed class BattleReport { public string id, outcome; public float started, ended; public int rounds; public BattleSide[] sides; }
    [Serializable] public sealed class ChatMessage { public string id, channel, allianceId, authorId, author, text; public float time; }
    [Serializable] public sealed class AllianceMarker { public string id, allianceId, authorId, name; public float x, z, expires; }
    [Serializable] public sealed class RallyData { public string id, allianceId, defendingAllianceId, leaderId, leaderArmyId, targetId, phase; public string[] armyIds; public float assemblyEnds, meetX, meetZ, x, z; public int troopLoad; }
    [Serializable] public sealed class GarrisonData { public string targetId, allianceId; public string[] armyIds; public int troopLoad; }
    [Serializable] public sealed class SiegeData { public string id, targetId; public int rounds; public float started; }
    [Serializable] public sealed class CampaignLimits { public int rallyMarches, rallyLoad, garrisonMarches, garrisonLoad, reportEntries; }
    [Serializable] public sealed class GroupBattleReport { public string kind; public int tier, targetCycle; public bool settled; public float guardHealthBefore, guardHealthAfter, wallHealthBefore, wallHealthAfter, npcDamageDealt, npcDamageTaken; public StrongholdReward[] rewards; public string id, targetId, targetName, attackingAllianceId, defendingAllianceId, outcome; public float started, ended, structureDamage; public int rounds; public BattleSide[] participants; }
    [Serializable] public sealed class RoutePoint { public float x, z; }
    [Serializable] public sealed class ScoutData { public string id, ownerId, phase, reconKind; public float x, z, targetX, targetZ, eta, progress; public bool auto; }
    [Serializable] public sealed class ReconTypeLine { public string id, name; public int tier, count; }
    [Serializable] public sealed class ReconForce { public string id, role, commanderId, commanderName; public int troops, mythic; public ReconTypeLine[] types; }
    [Serializable] public sealed class ReconStores { public int food, wood, stone, gold, mana; }
    [Serializable] public sealed class ReconReport { public string id, kind, targetId, outcome, subjectName, civilization, strength, staleNote, scoutId, commanderId, commanderName, bonuses; public float time, x, z, health; public int depth, cityLevel; public bool showsForces, showsResources, showsCommand; public ReconForce[] forces; public ReconStores resources; }
    [Serializable] public sealed class ReconNotice { public string id, scoutPlayerId, scoutName, targetName; public float time; }
    [Serializable] public sealed class ReconCard { public int depth, seconds, research; }
    [Serializable] public sealed class ScoutEnemy { public string id, ownerId, name, commanderId; public int troops, mythic, health; public float x, z; }
    [Serializable] public sealed class ScoutGarrison { public string targetId; public int marches, troops, mythic; }
    [Serializable] public sealed class ScoutReport { public StrongholdData[] strongholds; public string id; public float x, z, time; public ScoutEnemy[] armies; public CampData[] camps; public SiteData[] sites; public FlagData[] flags; public ScoutGarrison[] garrisons; }
    [Serializable] public sealed class FindingItem { public string id, name; public int count; }
    [Serializable] public sealed class FindingReward { public int food, wood, stone, gold, mana, xp; public FindingItem[] items; }
    [Serializable] public sealed class FindingData { public string id, name, category, culture, description, preview, state; public float x, z, seconds, progress, eta; public bool known, requiresInvestigation, claimed; public FindingReward reward; }
    [Serializable] public sealed class FindingCounts { public int settlement, cavern, ruin; }
    [Serializable] public sealed class FindingMilestone { public string id, name; public bool reached; }
    [Serializable] public sealed class DiscoveryJournalData { public int discovered, investigated, claimed, unclaimed, remaining; public FindingCounts byType; public FindingMilestone[] milestones; public string nextUnclaimedId; }
    [Serializable] public sealed class ExplorationData { public int cellSize, width; public float exploredPercent; public bool autoExplore; public ScoutCampCard scoutCamp; public int[] explored, visible; public ScoutData[] scouts; public ScoutReport[] reports; public FindingData[] findings; public DiscoveryJournalData journal; public ReconCard recon; public ReconReport[] reconReports; public ReconNotice[] reconNotices; }
    [Serializable] public sealed class JourneyRewards { public int wood, food, gold, stone, mana, aether, sigils; public RewardGrant[] itemRewards; }
    [Serializable] public sealed class JourneyTask { public string id, title, description, guide, targetId; public int goal, progress; public bool claimed, canClaim; public JourneyRewards reward; }
    [Serializable] public sealed class JourneyChapter { public string id, title, story, commanderReward; public bool claimed, locked, canClaim; public JourneyTask[] tasks; public JourneyRewards reward; }
    [Serializable] public sealed class JourneyCampaign { public string activeId; public bool complete; public JourneyChapter[] chapters; }
    [Serializable] public sealed class StrongholdData { public bool lastKnown, terrainExplored; public float observedAt; public string id, name, kind; public int tier, cycle, xp; public float x, z, health, maxHealth, guardHealth, maxGuardHealth, guardDamage, respawn; public UnitCounts units; public JourneyRewards reward; }
    [Serializable] public sealed class StrongholdRules { public int minMarches, roundLimit, respawnSeconds; }
    [Serializable] public sealed class StrongholdReward { public string playerId; public float contribution; public int xp; public JourneyRewards resources; }
    [Serializable] public sealed class ActivityTaskCard { public string id, title, description, guide, targetId; public int goal, progress, points; public bool claimed, canClaim; public JourneyRewards reward; }
    [Serializable] public sealed class ActivityChest { public string id; public int points; public bool claimed, canClaim; public JourneyRewards reward; }
    [Serializable] public sealed class DailyActivityState { public string period; public int resetSeconds, points, maxChestPoints; public ActivityTaskCard[] tasks; public ActivityChest[] chests; }
    [Serializable] public sealed class AllianceGoalCard { public string id, title, description, guide, targetId; public int goal, progress, personal, personalProgress; public bool claimed, canClaim; public JourneyRewards reward; }
    [Serializable] public sealed class ActivityMember { public string id, name; public bool current; public int gather, helps, strongholds; }
    [Serializable] public sealed class WeeklyAllianceActivity { public string id, name, period; public int resetSeconds; public AllianceGoalCard[] goals; public ActivityMember[] members; }
    [Serializable] public sealed class LoginRewardDay { public int day; public bool claimed, current, canClaim; public JourneyRewards reward; }
    [Serializable] public sealed class LoginRewardState { public int eligibleDay, streak, resetSeconds; public bool canClaim, missed; public string nextUtc; public LoginRewardDay[] days; }
    [Serializable] public sealed class EventObjective { public string id, label; public int goal, progress; }
    [Serializable] public sealed class EventCard { public string id, name, description, status, period, startsUtc, endsUtc, lockedReason; public int remainingSeconds; public bool canClaim, claimed; public JourneyRewards reward; public EventObjective[] objectives; }
    [Serializable] public sealed class ActivityState { public DailyActivityState daily; public WeeklyAllianceActivity alliance; public LoginRewardState login; public EventCard[] events; }
    [Serializable] public sealed class KingdomGoal { public string name; public int progress, goal; }
    [Serializable] public sealed class KingdomStage { public string id, name, description; public int afterSeconds, minScore, openInSeconds; public bool completed, legacy, previousComplete, eligible, claimed, canClaim; public KingdomGoal[] goals; public JourneyRewards reward; }
    [Serializable] public sealed class KingdomChronicle { public string preset; public int score; public KingdomStage[] stages; }

    [Serializable] public sealed class EconomyRules { public int apCap,campAP,strongholdAP,tradeDailyLimit,buffSeconds,shardRecruit; public float tradeTax,buffPercent; }
    [Serializable] public sealed class EconomyMember { public string id,name; }
    [Serializable] public sealed class EconomyBuff { public string kind; public float percent; public int remaining; }
    [Serializable] public sealed class EconomyData { public int ap,apCap,nextAPSeconds,fullAPSeconds,tradeRemaining,tradeResetSeconds,nextTransfer; public EconomyRules rules; public EconomyMember[] members; public EconomyBuff[] buffs; }
    [Serializable] public sealed class RewardGrant { public string id,name; public int count; }
    [Serializable] public sealed class AllianceJobCard {public string id,type;public float remaining,duration;public bool canHelp;}
    [Serializable] public sealed class AllianceMemberCard {public string id,name,role;public AllianceJobCard[] jobs;}
    [Serializable] public sealed class TerritoryRules { public float supplyRadius, linkRadius, placeRadius, rootRadius, enemyGap, beaconSpacing; public int beaconLimit; }
    [Serializable] public sealed class WorldSnapshot
    {
        public AllianceMemberCard[] allianceRoster;
        public int version, size;
        public KingdomChronicle kingdom;
        public ActivityState activity;
        public StrongholdData[] strongholds;
        public StrongholdRules strongholdRules;
        public ExplorationData exploration;
        public CampaignLimits campaignLimits;
        public RallyData[] rallies;
        public GarrisonData[] garrisons;
        public SiegeData[] sieges;
        public ChatMessage[] chatMessages;
        public AllianceMarker[] markers;
        public TroopTypeData[] troopTypes;
        public FormationRule formation;
        public float time;
        public SaveStatus persistence;
        public RankingData rankings;
        public RelicData[] relics;
        public ArmamentData[] armaments;
        public TradeData[] trades;
        public SummonRules summonRules;
        public ArmyData[] players, armies;
        public CampData[] camps;
        public NodeData[] nodes;
        public SiteData[] sites;
        public FlagData[] flags;
        public TerritoryRules territoryRules;
        public AllianceData[] alliances;
        public CommanderData[] commanders;
        public CivilizationData[] civilizations;
        public EventData[] events;
    }
}
