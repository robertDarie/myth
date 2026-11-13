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
            GUILayout.Label("Current alliance standings", sectionStyle);
            if (season.allianceBoard != null && season.allianceBoard.Length > 0) foreach (var row in season.allianceBoard) GUILayout.Label(row.rank + ". " + row.name + " · " + row.points + " · " + row.contributors + " contributors", theme.Small);
            else GUILayout.Label("No alliance has scored in this season.", noteStyle);
        }
    }
}
