using UnityEngine;

namespace ThronesOfMyth
{
    public static class TerritoryReach
    {
        public static float Radius(WorldSnapshot world) => world?.territoryRules != null && world.territoryRules.supplyRadius > 0 ? world.territoryRules.supplyRadius : 0f;

        public static bool Live(FlagData flag) => flag != null && !flag.lastKnown && flag.connected && flag.buildRemaining <= 0 && flag.health > 0;

        public static bool Covers(FlagData flag, float x, float z, float radius) => Live(flag) && radius > 0 && Vector2.Distance(new Vector2(flag.x, flag.z), new Vector2(x, z)) <= radius;

        public static bool AllianceCovers(WorldSnapshot world, string allianceId, float x, float z)
        {
            if (world?.flags == null || string.IsNullOrEmpty(allianceId)) return false;
            float radius = Radius(world);
            foreach (var flag in world.flags) if (flag.allianceId == allianceId && Covers(flag, x, z, radius)) return true;
            return false;
        }
    }
}
