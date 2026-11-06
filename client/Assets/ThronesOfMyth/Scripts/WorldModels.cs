using System;

namespace ThronesOfMyth
{
    [Serializable] public sealed class JoinRequest { public string name; public string civilization; public string resumeToken; }
    [Serializable] public sealed class JoinResponse { public string token; public string playerId; }
    [Serializable] public sealed class ErrorResponse { public string error; }
    [Serializable] public sealed class GameCommand { public string type; public float x; public float z; public string targetId; public string name; }
    [Serializable] public sealed class ArmyData
    {
        public string id, name, civilization, commanderId, allianceId, state, targetId;
        public float x, z, homeX, homeZ, targetX, targetZ, recovery, damage, speed, heal, gather;
        public int health, maxHealth, gold, wood, food, troops, mythic, cityLevel, xp, level, kills;
        public bool questClaimed;
        public string[] ownedCommanders;
    }
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
        public ArmyData[] players;
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
