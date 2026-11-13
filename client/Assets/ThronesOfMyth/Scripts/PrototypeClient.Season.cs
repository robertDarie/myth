using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private void DrawSeason()
        {
            var season = world.season;
            if (season == null)
            {
                GUILayout.Label("The season has not arrived from the kingdom yet.", noteStyle);
                return;
            }
            GUILayout.Label("SEASON " + season.index + " · " + season.title, theme.Eyebrow);
            GUILayout.Label("Phase " + season.phaseIndex + " · " + season.phaseName + " · Day " + season.dayNumber + " of " + season.length, sectionStyle);
            GUILayout.Label(season.startsUtc + " to " + season.endsUtc + " · " + ActivityResetText(season.remainingSeconds) + " remaining", noteStyle);
            GUILayout.Label("This phase ends " + season.phaseEndsUtc + " · " + ActivityResetText(season.phaseRemainingSeconds), theme.Small);
            GUILayout.Label(season.settled ? "This season is closed. New actions wait for the next season." : "Scores come from finished work only. Queued, canceled, and passive production do not count.", noteStyle);
            GUILayout.Label("Your score " + season.score + (season.rank > 0 ? " · Rank " + season.rank : " · Unranked"), sectionStyle);
            if (!string.IsNullOrEmpty(season.allianceId)) GUILayout.Label(season.allianceName + " · " + season.allianceScore + (season.allianceRank > 0 ? " · Alliance rank " + season.allianceRank : ""), noteStyle);
            else GUILayout.Label("Personal objectives do not require an alliance. Alliance score starts when you are a member.", noteStyle);
            if (season.objectives != null) foreach (var objective in season.objectives)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(objective.phaseName + " · " + objective.progress + "/" + objective.goal + (objective.complete ? " · Complete" : ""), sectionStyle);
                GUILayout.Label(objective.label, noteStyle);
                if (!string.IsNullOrEmpty(objective.lockedReason)) GUILayout.Label(objective.lockedReason, theme.Small);
                GUILayout.EndVertical();
            }
            if (season.contributions != null) foreach (var row in season.contributions)
                if (row.points > 0 || row.raw > 0) GUILayout.Label(row.label + " · " + row.points + "/" + row.cap, noteStyle);
            GUILayout.Label("Current personal standings", sectionStyle);
            if (season.personal != null) foreach (var row in season.personal) GUILayout.Label(row.rank + ". " + row.name + " · " + row.points, theme.Small);
            if (season.milestones != null) foreach (var milestone in season.milestones)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(milestone.points + " season points", sectionStyle);
                if (!string.IsNullOrEmpty(milestone.lockedReason)) GUILayout.Label(milestone.lockedReason, theme.Small);
                GUI.enabled = milestone.canClaim && !processing;
                if (GUILayout.Button(milestone.claimed ? "Milestone claimed" : "Claim milestone", theme.Primary)) Send(new GameCommand { type = milestone.id != null && milestone.id.Contains(":") ? "season-reward" : "season-milestone", targetId = milestone.id });
                GUI.enabled = true;
                GUILayout.EndVertical();
            }
            if (season.claims != null) foreach (var claim in season.claims)
            {
                if (claim.label != null && claim.label.StartsWith("milestone-")) continue;
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(claim.label + " · expires " + claim.expiresUtc, sectionStyle);
                if (!string.IsNullOrEmpty(claim.lockedReason)) GUILayout.Label(claim.lockedReason, theme.Small);
                GUI.enabled = claim.canClaim && !processing;
                if (GUILayout.Button(claim.claimed ? "Reward claimed" : "Claim season reward", theme.Primary)) Send(new GameCommand { type = "season-reward", targetId = claim.id });
                GUI.enabled = true;
                GUILayout.EndVertical();
            }
            GUILayout.Label("Current alliance standings", sectionStyle);
            if (season.allianceBoard != null && season.allianceBoard.Length > 0) foreach (var row in season.allianceBoard) GUILayout.Label(row.rank + ". " + row.name + " · " + row.points + " · " + row.contributors + " contributors", theme.Small);
            else GUILayout.Label("No alliance has scored in this season.", noteStyle);
            if (season.history != null && season.history.Length > 0)
            {
                GUILayout.Label("Previous seasons", sectionStyle);
                foreach (var entry in season.history)
                {
                    GUILayout.Label("Season " + entry.index + " · " + entry.startsUtc + " to " + entry.endsUtc, noteStyle);
                    if (entry.personal != null && entry.personal.Length > 0) GUILayout.Label("Leading city · " + entry.personal[0].name + " · " + entry.personal[0].points, theme.Small);
                }
            }
        }
    }
}
