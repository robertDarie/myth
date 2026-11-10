using System.Collections.Generic;
namespace ThronesOfMyth
{
    public static class DiscoveryJournal
    {
        public static string NextUnclaimed(FindingData[] rows)
        {
            if (rows == null) return "";
            foreach (var row in rows)
            {
                if (row == null || !row.known || row.claimed) continue;
                if (row.requiresInvestigation && row.state != "completed") continue;
                return row.id ?? "";
            }
            return "";
        }
        public static int Hidden(FindingData[] rows)
        {
            int hidden = 0;
            if (rows == null) return 0;
            foreach (var row in rows) if (row != null && !row.known) hidden++;
            return hidden;
        }
        public static string RewardLine(FindingReward reward)
        {
            if (reward == null) return "";
            var parts = new List<string>();
            if (reward.food > 0) parts.Add(reward.food + " food");
            if (reward.wood > 0) parts.Add(reward.wood + " wood");
            if (reward.stone > 0) parts.Add(reward.stone + " stone");
            if (reward.gold > 0) parts.Add(reward.gold + " gold");
            if (reward.mana > 0) parts.Add(reward.mana + " mana");
            if (reward.xp > 0) parts.Add(reward.xp + " commander experience");
            if (reward.items != null) foreach (var item in reward.items) if (item != null && item.count > 0) parts.Add(item.count + " " + (string.IsNullOrEmpty(item.name) ? item.id : item.name));
            return string.Join(", ", parts);
        }
    }
}
