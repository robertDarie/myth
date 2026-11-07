using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private bool chooseScoutDestination;
        private string scoutX = "20", scoutZ = "20";
        private void ScoutAt(float x, float z) => Send(new GameCommand { type = "scout-send", x = x, z = z });
        private void DrawExploration()
        {
            var fog = world.exploration;
            GUILayout.Label("THE VEIL OF THE GODS", theme.Eyebrow);
            GUILayout.Label("Scouts & exploration", theme.Heading);
            GUILayout.Label("Discovered land stays remembered. Enemy marches and live resource information require current allied vision. Sacred sites and city locations are public landmarks; hidden sacred-site ownership is unknown.", noteStyle);
            GUILayout.Label(fog.explored.Length + " / 400 land sectors discovered · " + fog.visible.Length + " currently in sight", sectionStyle);
            theme.Bar(GUILayoutUtility.GetRect(80, 10, GUILayout.ExpandWidth(true)), fog.explored.Length / 400f, MythInterfaceTheme.Teal);
            GUILayout.Space(12);
            var own = Array.Find(fog.scouts, s => s.ownerId == playerId);
            if (own != null)
            {
                GUILayout.Label("Scout · " + own.phase + " · " + own.x.ToString("F1") + ", " + own.z.ToString("F1"), sectionStyle);
                GUILayout.Label("Destination " + own.targetX.ToString("F0") + ", " + own.targetZ.ToString("F0") + ". Reports are recorded on arrival, then the scout returns home.", noteStyle);
                GUI.enabled = !processing && own.phase != "Returning";
                if (GUILayout.Button("Recall scout")) Send("scout-recall", own.id);
                GUI.enabled = true;
            }
            else
            {
                GUILayout.Label("One dedicated scout per city · no army slot or troop cost · gate access required", noteStyle);
                GUILayout.BeginHorizontal();GUILayout.Label("X", GUILayout.Width(20));scoutX = GUILayout.TextField(scoutX, 4);GUILayout.Label("Z", GUILayout.Width(20));scoutZ = GUILayout.TextField(scoutZ, 4);GUILayout.EndHorizontal();
                GUI.enabled = !processing;
                if (GUILayout.Button("Choose destination on the map", theme.Primary)) { OpenInterface(InterfacePage.Exploration); chooseScoutDestination = true; status = "Left-click a map location to send your scout. Esc cancels."; }
                bool validX = float.TryParse(scoutX, out float x); bool validZ = float.TryParse(scoutZ, out float z);
                GUI.enabled = validX && validZ && !processing;
                if (GUILayout.Button("Send scout to coordinates")) ScoutAt(x, z);
                GUI.enabled = true;
            }
            GUILayout.Space(18);GUILayout.Label("Scouting reports", sectionStyle);
            GUILayout.Label("Arrival-time observations, not live tracking. Latest 20 reports are saved privately. Alliance members share current vision, not your report history.", noteStyle);
            foreach (var report in fog.reports)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label("Survey " + report.x.ToString("F0") + ", " + report.z.ToString("F0") + " · " + Mathf.Max(0, Mathf.FloorToInt(world.time - report.time)) + "s ago", sectionStyle);
                GUILayout.Label(report.armies.Length + " enemy marches · " + report.camps.Length + " camps · " + report.sites.Length + " sacred sites · " + report.flags.Length + " beacons/forts", noteStyle);
                foreach (var enemy in report.armies) GUILayout.Label(enemy.name + " · " + enemy.troops + " mortals / " + enemy.mythic + " mythic · " + enemy.health + " HP", new GUIStyle(noteStyle) { richText = false });
                foreach (var site in report.sites) GUILayout.Label(site.name + " · " + AllianceName(site.allianceId) + " · " + Mathf.CeilToInt(site.health) + " structure HP", theme.Small);
                foreach (var g in report.garrisons) GUILayout.Label(WarTargetName(g.targetId) + " garrison · " + g.marches + " marches / " + g.troops + " mortals / " + g.mythic + " mythic", theme.Small);
                if (GUILayout.Button("Focus surveyed area")) { cameraControl?.Focus(report.x, report.z); OpenInterface(InterfacePage.Exploration); }
                GUILayout.EndVertical();
            }
        }
    }
}
