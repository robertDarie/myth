using System;
using System.Text.Json;
using ThronesOfMyth;
static class ProgressionContracts
{
 public static int Run(){int n=0;void Check(bool b,string why){n++;if(!b)throw new Exception(why);}var json=new JsonSerializerOptions{IncludeFields=true};
 var building=JsonSerializer.Deserialize<BuildingCard>("{\"id\":\"citadel\",\"prerequisites\":[{\"kind\":\"building\",\"id\":\"academy\",\"name\":\"Athenaeum\",\"level\":1,\"current\":0,\"met\":false}]}",json);Check(building.prerequisites[0].id=="academy"&&!building.prerequisites[0].met,"Typed prerequisites must survive the DTO");
 var c=JsonSerializer.Deserialize<CommanderComparison>("{\"marchId\":\"own\",\"candidateId\":\"scout\",\"available\":true,\"current\":{\"damage\":12},\"candidate\":{\"damage\":14.5}}",json);Check(c.available&&c.candidate.damage==14.5f,"Server comparison DTO");
 var reward=new JourneyRewards{gold=30,itemRewards=new[]{new RewardGrant{id="pack",count=1}}};var state=new ActivityState{daily=new DailyActivityState{period="today",tasks=new[]{new ActivityTaskCard{id="train",canClaim=true,reward=reward}},chests=Array.Empty<ActivityChest>()},alliance=new WeeklyAllianceActivity{id="allies",period="week",goals=new[]{new AllianceGoalCard{id="help",canClaim=true,reward=reward}}}};
 var order=new GameCommand{type="daily-claim",targetId="train",period="today"};Check(ReferenceEquals(ActivityRewardPreview.Find(order,state),reward),"Exact daily reward preview");order.period="yesterday";Check(ActivityRewardPreview.Find(order,state)==null,"Stale day cannot present a reward");order=new GameCommand{type="alliance-goal-claim",targetId="help",period="week",allianceId="other"};Check(ActivityRewardPreview.Find(order,state)==null,"Other alliance cannot present a reward");order.allianceId="allies";Check(ReferenceEquals(ActivityRewardPreview.Find(order,state),reward),"Exact eligible weekly reward preview");
 Console.WriteLine("Progression contracts: "+n+" passed.");return n;}
}
