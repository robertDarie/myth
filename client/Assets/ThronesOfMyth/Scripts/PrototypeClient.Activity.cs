using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private bool activityAllianceTab;
        private Vector2 activityNavScroll;
        private string ActivityResetText(int serverSeconds)
        {
            int remaining = Mathf.Max(0, Mathf.CeilToInt(serverSeconds - (Time.unscaledTime - lastSnapshotAt)));
            return (remaining >= 86400 ? remaining / 86400 + "d " : "") + remaining / 3600 % 24 + "h " + remaining / 60 % 60 + "m " + remaining % 60 + "s";
        }
        private void OpenActivity(bool alliance = false) { activityAllianceTab = alliance; GuidePage(InterfacePage.Activity); }
        private void DrawActivity()
        {
            if (world.activity == null) return;
            GUILayout.Label("OFFERINGS OF THE MORTAL REALM", theme.Eyebrow);
            GUILayout.BeginHorizontal();
            if (GUILayout.Toggle(!activityAllianceTab, "Daily activity", theme.Tab) && activityAllianceTab) { activityAllianceTab = false; contentScroll = Vector2.zero; }
            if (GUILayout.Toggle(activityAllianceTab, "Alliance weekly goals", theme.Tab) && !activityAllianceTab) { activityAllianceTab = true; contentScroll = Vector2.zero; }
            GUILayout.EndHorizontal(); GUILayout.Space(10);
            if (activityAllianceTab) { DrawAllianceActivity(); return; }
            var daily = world.activity.daily;
            GUILayout.Label("Day " + daily.period + " · Resets at 00:00 UTC in " + ActivityResetText(daily.resetSeconds), noteStyle);
            GUILayout.Label(daily.points + " activity points · Final chest at " + daily.maxChestPoints, sectionStyle);
            theme.Bar(GUILayoutUtility.GetRect(80, 10, GUILayout.ExpandWidth(true)), (float)daily.points / daily.maxChestPoints, MythInterfaceTheme.Gold);
            GUILayout.Label("Complete tasks, claim their points, then open unlocked chests. Points are not spent; solo activities can reach the final chest.", noteStyle);
            GUILayout.BeginHorizontal();
            foreach (var chest in daily.chests)
            {
                GUILayout.BeginVertical(GUI.skin.box, GUILayout.MinWidth(90), GUILayout.ExpandWidth(true));
                GUILayout.Label(chest.points + " POINTS", theme.Eyebrow);
                GUILayout.Label(JourneyRewardText(chest.reward).Replace(" · ", "\n"), theme.Small);
                GUI.enabled = chest.canClaim && !processing;
                if (GUILayout.Button(chest.claimed ? "Opened" : chest.canClaim ? "OPEN" : "Locked", theme.Primary)) Send(new GameCommand { type = "activity-chest", targetId = chest.id, period = daily.period });
                GUI.enabled = true; GUILayout.EndVertical();
            }
            GUILayout.EndHorizontal(); GUILayout.Space(12);
            foreach (var task in daily.tasks)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(task.title + " · " + task.progress + "/" + task.goal + " · +" + task.points + " points", sectionStyle);
                GUILayout.Label(task.description, noteStyle);
                theme.Bar(GUILayoutUtility.GetRect(80, 6, GUILayout.ExpandWidth(true)), (float)task.progress / task.goal, MythInterfaceTheme.Teal);
                GUILayout.Label("Task reward · " + JourneyRewardText(task.reward), theme.Small);
                GUILayout.BeginHorizontal(); GUI.enabled = task.canClaim && !processing;
                if (GUILayout.Button(task.claimed ? "Claimed" : task.canClaim ? "CLAIM TASK" : "In progress", theme.Primary)) Send(new GameCommand { type = "daily-claim", targetId = task.id, period = daily.period });
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
                GUILayout.BeginHorizontal(); GUI.enabled = goal.canClaim && !processing;
                if (GUILayout.Button(goal.claimed ? "Weekly reward claimed" : goal.canClaim ? "CLAIM" : "Requirements pending", theme.Primary)) Send(new GameCommand { type = "alliance-goal-claim", targetId = goal.id, period = alliance.period, allianceId = alliance.id });
                GUI.enabled = !processing;
                if (GUILayout.Button("GO", GUILayout.Width(100))) GuideObjective(new JourneyTask { id = goal.id, guide = goal.guide, targetId = goal.targetId });
                GUI.enabled = true; GUILayout.EndHorizontal(); GUILayout.EndVertical();
            }
            GUILayout.Space(12); GUILayout.Label("Weekly contributions", sectionStyle);
            GUILayout.Label("Gathering and assistance count where they happen. A shared stronghold victory counts once, with personal credit for each qualifying contributor. Contributions from former members stay with this alliance for the week.", noteStyle);
            foreach (var member in alliance.members)
                GUILayout.Label(member.name + (member.current ? "" : " · former member") + "\n" + member.gather + " resources · " + member.helps + " assists · " + member.strongholds + " stronghold credits", new GUIStyle(noteStyle) { richText = false });
        }
    }
}
