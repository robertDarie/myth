using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private void DrawKingdomStages()
        {
            if (world.kingdom == null) return;
            GUILayout.Label("THE AWAKENING OF THE REALM", theme.Eyebrow);
            GUILayout.Label("Kingdom chronicle", theme.Heading);
            GUILayout.Label(world.kingdom.preset + " · UTC calendar time continues while the server is closed.", noteStyle);
            GUILayout.Label("Your contribution score · " + world.kingdom.score, sectionStyle);
            GUILayout.Label("Gathering, training, camp/stronghold victories, development, scouting and assistance contribute. Reward eligibility is recorded when each stage completes; later arrivals cannot collect earlier rewards.", noteStyle);
            foreach (var stage in world.kingdom.stages)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(stage.name, sectionStyle); GUILayout.Label(stage.description, noteStyle);
                string state = stage.completed ? stage.legacy ? "PREVIOUS ACCESS PRESERVED" : "COMPLETED" : !stage.previousComplete ? "EARLIER STAGE REQUIRED" : stage.openInSeconds > 0 ? "EARLIEST OPENING IN " + ActivityResetText(stage.openInSeconds) : "PREPARATION REQUIRED";
                GUILayout.Label(state, theme.Eyebrow);
                foreach (var goal in stage.goals)
                {
                    GUILayout.Label(goal.name + " · " + goal.progress + "/" + goal.goal, theme.Small);
                    theme.Bar(GUILayoutUtility.GetRect(80, 6, GUILayout.ExpandWidth(true)), (float)goal.progress / Mathf.Max(1, goal.goal), MythInterfaceTheme.Teal);
                }
                GUILayout.Label("Reward · " + JourneyRewardText(stage.reward), theme.Small);
                GUILayout.Label("Contribution required before completion · " + stage.minScore + " points", theme.Small);
                GUI.enabled = stage.canClaim && !processing;
                if (GUILayout.Button(stage.claimed ? "Reward claimed" : stage.canClaim ? "CLAIM REWARD" : stage.completed ? stage.legacy ? "No retroactive reward" : "Not eligible at completion" : "Stage in progress", theme.Primary)) Send("kingdom-claim", stage.id);
                GUI.enabled = true; GUILayout.EndVertical();
            }
            GUILayout.Label("This is the short local playtest schedule. Production-length kingdom seasons and KvK are separate future systems.", noteStyle);
        }
    }
}
