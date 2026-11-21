using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private int activityTab;
        private Vector2 activityNavScroll;
        private string ActivityResetText(int serverSeconds)
        {
            int remaining = Mathf.Max(0, Mathf.CeilToInt(serverSeconds - (Time.unscaledTime - lastSnapshotAt)));
            return (remaining >= 86400 ? remaining / 86400 + "d " : "") + remaining / 3600 % 24 + "h " + remaining / 60 % 60 + "m " + remaining % 60 + "s";
        }
        private void OpenActivity(bool alliance = false) { activityTab = alliance ? 1 : 0; GuidePage(InterfacePage.Activity); }
        private void DrawActivity(float width)
        {
            if (world.activity == null) return;
            GUILayout.Label("OFFERINGS OF THE MORTAL REALM", theme.Eyebrow);
            int nextTab = theme.Tabs(activityTab, new[] { "Daily activity", "Alliance weekly goals", "Seven-day rewards", "Event hub" }, width);
            if (nextTab != activityTab) { activityTab = nextTab; contentScroll = Vector2.zero; }
            GUILayout.Space(10);
            if (activityTab == 1) { DrawAllianceActivity(); return; }
            if (activityTab == 2) { DrawLoginRewards(); return; }
            if (activityTab == 3) { DrawEventHub(); return; }
            var daily = world.activity.daily;
            GUILayout.Label("Day " + daily.period + " · Resets at 00:00 UTC in " + ActivityResetText(daily.resetSeconds), noteStyle);
            GUILayout.Label(daily.points + " activity points · Final chest at " + daily.maxChestPoints, sectionStyle);
            theme.Bar(GUILayoutUtility.GetRect(80, 10, GUILayout.ExpandWidth(true)), (float)daily.points / daily.maxChestPoints, MythInterfaceTheme.Gold);
            GUILayout.Label("Complete tasks, claim their points, then open unlocked chests. Points are not spent; solo activities can reach the final chest.", noteStyle);
            int chestColumns = InterfaceLayout.FlowColumns(width, daily.chests.Length, 168);
            for (int i = 0; i < daily.chests.Length; i++)
            {
                if (i % chestColumns == 0) GUILayout.BeginHorizontal(GUILayout.MinWidth(Mathf.Max(168, width - 24)));
                var chest = daily.chests[i];
                GUILayout.BeginVertical(GUI.skin.box, GUILayout.MinWidth(168), GUILayout.ExpandWidth(true));
                GUILayout.Label(chest.points + " POINTS", theme.Eyebrow);
                GUILayout.Label(JourneyRewardText(chest.reward).Replace(" · ", "\n"), theme.Small);
                string chestReason = processing ? "Sending your order…" : chest.claimed ? "This chest is already open." : chest.canClaim ? "" : "Reach " + chest.points + " activity points first.";
                if (theme.Action(chest.claimed ? "Opened" : chest.canClaim ? "Open chest" : "Locked", chest.canClaim && !processing, chestReason)) Send(new GameCommand { type = "activity-chest", targetId = chest.id, period = daily.period });
                GUILayout.EndVertical();
                if (i % chestColumns == chestColumns - 1 || i == daily.chests.Length - 1) GUILayout.EndHorizontal();
            }
            GUILayout.Space(12);
            foreach (var task in daily.tasks)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(task.title + " · " + task.progress + "/" + task.goal + " · +" + task.points + " points", sectionStyle);
                GUILayout.Label(task.description, noteStyle);
                theme.Bar(GUILayoutUtility.GetRect(80, 6, GUILayout.ExpandWidth(true)), (float)task.progress / task.goal, MythInterfaceTheme.Teal);
                GUILayout.Label("Task reward · " + JourneyRewardText(task.reward), theme.Small);
                GUILayout.BeginHorizontal();
                string taskReason = processing ? "Sending your order…" : task.claimed ? "This task reward was already claimed." : task.canClaim ? "" : "Finish this task before claiming its points.";
                if (theme.Action(task.claimed ? "Claimed" : task.canClaim ? "Claim task" : "In progress", task.canClaim && !processing, taskReason)) Send(new GameCommand { type = "daily-claim", targetId = task.id, period = daily.period });
                GUI.enabled = !processing;
                if (!task.claimed && GUILayout.Button("GO", GUILayout.Width(100))) GuideObjective(new JourneyTask { id = task.id, guide = task.guide, targetId = task.targetId });
                GUI.enabled = true; GUILayout.EndHorizontal(); GUILayout.EndVertical();
            }
        }
        private void DrawAllianceActivity()
        {
            var alliance = world.activity.alliance;
            if (alliance == null)
            {
                GUILayout.Label("Join an alliance to work toward weekly shared goals.", noteStyle);
                if (GUILayout.Button("Open alliance hall", theme.Primary)) GuidePage(InterfacePage.Alliance);
                return;
            }
            GUILayout.Label(alliance.name, new GUIStyle(sectionStyle) { richText = false });
            GUILayout.Label("Week of " + alliance.period + " · Resets Monday 00:00 UTC in " + ActivityResetText(alliance.resetSeconds), noteStyle);
            GUILayout.Label("Help reach each shared goal and meet your personal contribution requirement. Rewards are per eligible city, once per goal per week across all alliances. Leaving and rejoining does not reset your claims.", noteStyle);
            foreach (var goal in alliance.goals)
            {
                GUILayout.BeginVertical(GUI.skin.box); GUILayout.Label(goal.title, sectionStyle); GUILayout.Label(goal.description, noteStyle);
                GUILayout.Label("Shared " + goal.progress + "/" + goal.goal + " · Your contribution " + goal.personalProgress + "/" + goal.personal, theme.Small);
                theme.Bar(GUILayoutUtility.GetRect(80, 7, GUILayout.ExpandWidth(true)), (float)goal.progress / goal.goal, MythInterfaceTheme.Gold);
                GUILayout.Label("YOUR ELIGIBLE REWARD · " + JourneyRewardText(goal.reward), theme.Small);
                GUILayout.BeginHorizontal();
                string goalReason = processing ? "Sending your order…" : goal.claimed ? "This weekly reward was already claimed." : goal.canClaim ? "" : "The shared goal and your personal contribution both have to be met.";
                if (theme.Action(goal.claimed ? "Weekly reward claimed" : goal.canClaim ? "Claim" : "Requirements pending", goal.canClaim && !processing, goalReason)) Send(new GameCommand { type = "alliance-goal-claim", targetId = goal.id, period = alliance.period, allianceId = alliance.id });
                GUI.enabled = !processing;
                if (GUILayout.Button("GO", GUILayout.Width(100))) GuideObjective(new JourneyTask { id = goal.id, guide = goal.guide, targetId = goal.targetId });
                GUI.enabled = true; GUILayout.EndHorizontal(); GUILayout.EndVertical();
            }
            GUILayout.Space(12); GUILayout.Label("Weekly contributions", sectionStyle);
            GUILayout.Label("Gathering and assistance count where they happen. A shared stronghold victory counts once, with personal credit for each qualifying contributor. Contributions from former members stay with this alliance for the week.", noteStyle);
            foreach (var member in alliance.members)
                GUILayout.Label(member.name + (member.current ? "" : " · former member") + "\n" + member.gather + " resources · " + member.helps + " assists · " + member.strongholds + " stronghold credits", new GUIStyle(noteStyle) { richText = false });
        }
        private void DrawLoginRewards()
        {
            var login = world.activity.login;
            if (login == null || login.days == null)
            {
                GUILayout.Label("Seven-day rewards are not available from this server.", noteStyle);
                return;
            }
            GUILayout.Label("SEVEN-DAY OFFERINGS", theme.Eyebrow);
            GUILayout.Label("Streak " + login.streak + " · Eligible day " + login.eligibleDay + " · " + (login.canClaim ? "Available now" : "Next eligibility " + login.nextUtc + " UTC"), noteStyle);
            GUILayout.Label(login.missed ? "A missed UTC day reset this streak to Day 1. Skipped days are not paid." : "Claim once each UTC day. Missing a day returns the streak to Day 1. After Day 7, the next day starts again at Day 1.", noteStyle);
            foreach (var entry in login.days)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label("Day " + entry.day + (entry.claimed ? " · Claimed" : entry.canClaim ? " · Ready" : entry.current ? " · Next" : ""), sectionStyle);
                GUILayout.Label(JourneyRewardText(entry.reward), theme.Small);
                GUILayout.EndVertical();
            }
            string loginReason = processing ? "Sending your order…" : login.canClaim ? "" : "Already claimed for this UTC day.";
            if (theme.Action(login.canClaim ? "Claim day " + login.eligibleDay : "Already claimed today", login.canClaim && !processing, loginReason))
                Send(new GameCommand { type = "login-claim", day = login.eligibleDay, targetId = "day-" + login.eligibleDay });
        }
        private void DrawEventHub()
        {
            var events = world.activity.events;
            if (events == null || events.Length == 0)
            {
                GUILayout.Label("The event hub is not available from this server.", noteStyle);
                return;
            }
            GUILayout.Label("EVENT HUB", theme.Eyebrow);
            GUILayout.Label("These offerings follow the server UTC calendar. Daily activity, alliance goals, and seven-day rewards stay on their own screens. A family marked Not scheduled has no score and no reward.", noteStyle);
            foreach (var entry in events)
            {
                var scheduled = entry.status == "active" || entry.status == "upcoming";
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(entry.name + " · " + (entry.status == "active" ? "Active" : entry.status == "upcoming" ? "Upcoming" : entry.status == "ended" ? "Ended" : "Not scheduled"), sectionStyle);
                GUILayout.Label(entry.description, noteStyle);
                if (scheduled) GUILayout.Label((entry.status == "active" ? "Ends " : "Opens ") + (entry.status == "active" ? entry.endsUtc : entry.startsUtc) + " · " + ActivityResetText(entry.remainingSeconds), theme.Small);
                if (entry.objectives != null) foreach (var objective in entry.objectives)
                {
                    GUILayout.BeginHorizontal();
                    GUILayout.Label(objective.label + " " + objective.progress + "/" + objective.goal, theme.Small);
                    GUI.enabled = !processing && !string.IsNullOrEmpty(objective.guide);
                    if (GUILayout.Button("GO", GUILayout.Width(72))) GuideObjective(new JourneyTask { id = objective.id, guide = objective.guide, targetId = objective.targetId });
                    GUI.enabled = true;
                    GUILayout.EndHorizontal();
                }
                if (scheduled) GUILayout.Label(JourneyRewardText(entry.reward), theme.Small);
                if (!scheduled && !string.IsNullOrEmpty(entry.lockedReason)) GUILayout.Label(entry.lockedReason, noteStyle);
                if (scheduled)
                {
                    string eventReason = processing ? "Sending your order…" : !string.IsNullOrEmpty(entry.lockedReason) ? entry.lockedReason : entry.canClaim ? "" : "Not ready.";
                    if (theme.Action(entry.claimed ? "Claimed" : entry.canClaim ? "Claim reward" : "Not ready", entry.canClaim && !processing, eventReason))
                        Send(new GameCommand { type = "event-claim", targetId = entry.id, period = entry.period });
                }
                if (entry.history != null) foreach (var past in entry.history)
                {
                    GUILayout.Label("Ended " + past.period + " · " + (past.claimed ? "Claimed" : "Unclaimed"), theme.Small);
                    if (past.objectives != null) foreach (var objective in past.objectives) GUILayout.Label(objective.label + " " + objective.progress + "/" + objective.goal, theme.Small);
                    if (!string.IsNullOrEmpty(past.lockedReason)) GUILayout.Label(past.lockedReason, noteStyle);
                }
                GUILayout.EndVertical();
            }
        }
    }
}
