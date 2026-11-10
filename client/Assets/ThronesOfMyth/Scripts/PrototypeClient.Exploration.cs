using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private bool chooseScoutDestination;
        private string redirectScoutId = "";
        private string scoutX = "20", scoutZ = "20";
        private string lastScoutReportId;
        private void CancelScoutAim() { chooseScoutDestination = false; redirectScoutId = ""; }
        private void ScoutAt(float x, float z)
        {
            if (!string.IsNullOrEmpty(redirectScoutId)) Send(new GameCommand { type = "scout-redirect", targetId = redirectScoutId, x = x, z = z });
            else Send(new GameCommand { type = "scout-send", x = x, z = z });
            CancelScoutAim();
        }
        private void NoteScoutReports()
        {
            var reports = world?.exploration?.reports;
            string id = reports != null && reports.Length > 0 ? reports[0].id : "";
            if (lastScoutReportId == null) { lastScoutReportId = id; return; }
            if (id.Length > 0 && id != lastScoutReportId)
            {
                var report = reports[0];
                status = "Scout survey complete · " + report.x.ToString("0") + ", " + report.z.ToString("0") + ".";
                toastUntil = Time.unscaledTime + 6f;
            }
            lastScoutReportId = id;
        }
        private void DrawScoutCampPanel(ScoutCampCard camp)
        {
            if (camp == null) return;
            GUILayout.Label("CURRENT SCOUTS", theme.Eyebrow);
            GUILayout.Label(ScoutInterfaceCopy.Line(camp.scouts, camp.speed, camp.radius, camp.surveySeconds, camp.autoSectors), theme.Body);
            if (!camp.hasNext) { GUILayout.Label("The Outlook of the Horizon is fully raised.", theme.Small); return; }
            GUILayout.Space(8);
            GUILayout.Label("NEXT UPGRADE", theme.Eyebrow);
            GUILayout.Label(ScoutInterfaceCopy.Line(camp.nextScouts, camp.nextSpeed, camp.nextRadius, camp.nextSurveySeconds, camp.nextAutoSectors), theme.Body);
            GUILayout.Label(ScoutInterfaceCopy.Delta(camp), theme.Small);
        }
        private void DrawExploration()
        {
            var fog = world.exploration;
            GUILayout.Label("THE VEIL OF THE GODS", theme.Eyebrow);
            GUILayout.Label("Scouts & exploration", theme.Heading);
            if (fog == null || fog.explored == null) { GUILayout.Label("Waiting for the kingdom map.", noteStyle); return; }
            int found = fog.explored.Length;
            GUILayout.Label("Explored land stays clear. " + found + " / 400 sectors · " + (found / 4f).ToString("0.0") + "%", sectionStyle);
            theme.Bar(GUILayoutUtility.GetRect(80, 14, GUILayout.ExpandWidth(true)), found / 400f, MythInterfaceTheme.Teal);
            GUILayout.Label("Military sight is separate. Enemy troop counts, cargo and defenses stay hidden unless a scout or allied army can currently see them. A private survey is a snapshot, not live tracking.", noteStyle);
            GUILayout.Label((fog.visible == null ? 0 : fog.visible.Length) + " sectors are in current allied sight.", theme.Small);
            if (fog.scoutCamp != null)
            {
                GUILayout.Space(8);
                DrawScoutCampPanel(fog.scoutCamp);
                if (theme.Action("Open the Outlook", !processing, "Sending your order…")) { selectedBuilding = CitySelection.Find(me.cityBuildings, "scoutcamp", selectedBuilding); OpenInterface(InterfacePage.City); }
            }
            GUILayout.Space(8);
            bool auto = fog.autoExplore;
            if (theme.Action(auto ? "Stop auto explore" : "Auto explore nearby fog", !processing && pendingOrder == null, pendingOrder != null ? "Confirm your previous order first." : "Sending your order…"))
                Send(new GameCommand { type = "scout-auto", enabled = !auto });
            GUILayout.Label(auto ? "Idle scouts survey nearby unexplored land, then continue until that local range is clear." : "Auto explore sends spare scouts to nearby fog and chains the next sector without returning home.", noteStyle);
            GUILayout.Space(10);
            GUILayout.Label("SCOUTS", theme.Eyebrow);
            var scouts = fog.scouts ?? Array.Empty<ScoutData>();
            int shown = 0;
            foreach (var scout in scouts) if (scout.ownerId == playerId)
            {
                shown++;
                GUILayout.BeginVertical(GUI.skin.box);
                string where = scout.phase == "Idle" ? "At the Outlook" : ScoutInterfaceCopy.Phase(scout.phase) + " · " + scout.x.ToString("0") + ", " + scout.z.ToString("0");
                string eta = scout.phase != "Idle" && scout.eta > 0.05f ? " · ETA " + Mathf.CeilToInt(scout.eta) + "s" : "";
                GUILayout.Label("Scout " + shown + " · " + where + eta, sectionStyle);
                if (scout.phase != "Idle") GUILayout.Label("Destination " + scout.targetX.ToString("0") + ", " + scout.targetZ.ToString("0"), noteStyle);
                if (scout.phase == "Exploring")
                {
                    GUILayout.Label("Survey " + Mathf.RoundToInt(Mathf.Clamp01(scout.progress) * 100f) + "%", theme.Small);
                    theme.Bar(GUILayoutUtility.GetRect(80, 12, GUILayout.ExpandWidth(true)), Mathf.Clamp01(scout.progress), MythInterfaceTheme.Gold);
                }
                if (scout.phase != "Idle" && !scout.id.StartsWith("idle:", StringComparison.Ordinal))
                {
                    GUILayout.BeginHorizontal();
                    if (theme.Action("Recall", !processing && pendingOrder == null, pendingOrder != null ? "Confirm your previous order first." : "")) Send("scout-recall", scout.id);
                    if (theme.Action("Redirect on map", !processing && pendingOrder == null, pendingOrder != null ? "Confirm your previous order first." : ""))
                    {
                        redirectScoutId = scout.id; chooseScoutDestination = true; ShowKingdomForTarget();
                        status = "Left-click a new destination. The scout turns without going home. Esc cancels.";
                    }
                    GUILayout.EndHorizontal();
                }
                GUILayout.EndVertical();
            }
            if (shown == 0) GUILayout.Label("Raise the Outlook of the Horizon to train a scout.", noteStyle);
            GUILayout.Space(8);
            if (Opening?.Guide == "combat" && !Array.Exists(world.camps, c => c.level == 1 && c.health > 0) && theme.Action("Survey the nearby frontier", !processing && pendingOrder == null, "Confirm your pending order first.")) ScoutAt(20, 20);
            GUILayout.Label("Scouts use no army slot and no troops. Gate corridors are still required.", noteStyle);
            GUILayout.BeginHorizontal();
            GUILayout.Label("X", GUILayout.Width(24)); scoutX = GUILayout.TextField(scoutX, 4, GUILayout.Height(36));
            GUILayout.Label("Z", GUILayout.Width(24)); scoutZ = GUILayout.TextField(scoutZ, 4, GUILayout.Height(36));
            GUILayout.EndHorizontal();
            if (theme.Action(string.IsNullOrEmpty(redirectScoutId) ? "Choose destination on the map" : "Choose a new destination on the map", !processing, "Sending your order…"))
            {
                if (string.IsNullOrEmpty(redirectScoutId)) CancelScoutAim();
                ShowKingdomForTarget(); chooseScoutDestination = true;
                status = string.IsNullOrEmpty(redirectScoutId) ? "Left-click a map location to send a free scout. Esc cancels." : "Left-click a new destination. Esc cancels.";
            }
            bool validX = float.TryParse(scoutX, out float x); bool validZ = float.TryParse(scoutZ, out float z);
            if (theme.Action(string.IsNullOrEmpty(redirectScoutId) ? "Send scout to coordinates" : "Redirect scout to coordinates", validX && validZ && !processing && pendingOrder == null, !validX || !validZ ? "Enter a map coordinate from 1 to 79." : pendingOrder != null ? "Confirm your previous order first." : "")) ScoutAt(x, z);
            GUILayout.Space(18); GUILayout.Label("Scouting reports", sectionStyle);
            GUILayout.Label("Arrival-time observations, saved privately. Alliance members share current sight, not this history.", noteStyle);
            foreach (var report in fog.reports ?? Array.Empty<ScoutReport>())
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label("Survey " + report.x.ToString("0") + ", " + report.z.ToString("0") + " · " + Mathf.Max(0, Mathf.FloorToInt(world.time - report.time)) + "s ago", sectionStyle);
                GUILayout.Label((report.armies == null ? 0 : report.armies.Length) + " enemy marches · " + (report.camps == null ? 0 : report.camps.Length) + " camps · " + (report.sites == null ? 0 : report.sites.Length) + " sacred sites · " + (report.flags == null ? 0 : report.flags.Length) + " beacons/forts", noteStyle);
                if (report.strongholds != null) foreach (var fort in report.strongholds) GUILayout.Label(fort.name + " · Tier " + fort.tier + " · " + Mathf.CeilToInt(fort.guardHealth) + " defender HP · " + Mathf.CeilToInt(fort.health) + " wall HP" + (fort.respawn > 0 ? " · Defeated when surveyed" : ""), theme.Small);
                if (report.armies != null) foreach (var enemy in report.armies) GUILayout.Label(enemy.name + " · " + enemy.troops + " mortals / " + enemy.mythic + " mythic · " + enemy.health + " HP", new GUIStyle(noteStyle) { richText = false });
                if (report.sites != null) foreach (var site in report.sites) GUILayout.Label(site.name + " · " + AllianceName(site.allianceId) + " · " + Mathf.CeilToInt(site.health) + " structure HP", theme.Small);
                if (report.garrisons != null) foreach (var g in report.garrisons) GUILayout.Label(WarTargetName(g.targetId) + " garrison · " + g.marches + " marches / " + g.troops + " mortals / " + g.mythic + " mythic", theme.Small);
                if (theme.Action("Focus surveyed area", true, "")) { cameraControl?.SetView(new Vector3(report.x, 0, report.z), 10); ShowKingdomForTarget(); }
                GUILayout.EndVertical();
            }
        }
    }
}
