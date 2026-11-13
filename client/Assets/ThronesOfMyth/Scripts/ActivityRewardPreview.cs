using System;
namespace ThronesOfMyth
{
    public static class ActivityRewardPreview
    {
        public static JourneyRewards Find(GameCommand c,ActivityState state)
        {
            var daily=state?.daily;var weekly=state?.alliance;
            if(c.type=="daily-claim"&&daily!=null&&c.period==daily.period)return Array.Find(daily.tasks,t=>t.id==c.targetId&&t.canClaim)?.reward;
            if(c.type=="activity-chest"&&daily!=null&&c.period==daily.period)return Array.Find(daily.chests,t=>t.id==c.targetId&&t.canClaim)?.reward;
            if(c.type=="alliance-goal-claim"&&weekly!=null&&c.period==weekly.period&&c.allianceId==weekly.id)return Array.Find(weekly.goals,t=>t.id==c.targetId&&t.canClaim)?.reward;
            if(c.type=="login-claim"&&state?.login!=null)return Array.Find(state.login.days,t=>t.day==c.day&&t.canClaim)?.reward;
            return null;
        }
    }
}
