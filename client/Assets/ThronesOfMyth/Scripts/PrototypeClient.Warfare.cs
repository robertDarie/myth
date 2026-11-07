using System;
using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private string warfareTargetId;
        private int rallyAssemblyIndex;
        private bool WarOfficer => me.allianceRole == "Leader" || me.allianceRole == "Officer";
        private bool MarchAvailable => me.cityLevel >= 2 && ActiveArmy.recovery <= 0 && !ActiveArmy.hasOrder && ActiveArmy.health > 0 && string.IsNullOrEmpty(ActiveArmy.assignmentKind);
        private bool ContributionReady => MarchAvailable && ActiveArmy.health >= ActiveArmy.maxHealth;
        private string WarTargetName(string id)
        {
            var stronghold = KnownStronghold(id); if (stronghold != null) return stronghold.name + " · Tier " + stronghold.tier + " PvE";
            var site = Array.Find(world.sites, s => s.id == id); if (site != null) return site.name;
            var beacon = Array.Find(world.flags, f => f.id == id); return beacon == null ? "Scouted alliance structure" : beacon.isRoot ? "Alliance Fort" : "Alliance Beacon";
        }
        private StrongholdData KnownStronghold(string id)
        {
            var known = Array.Find(world.strongholds, t => t.id == id); if (known != null) return known;
            if (world.exploration != null) foreach (var report in world.exploration.reports)
                if (report.strongholds != null) { known = Array.Find(report.strongholds, t => t.id == id); if (known != null) return known; }
            return null;
        }
        private void OpenWarfare(string id)
        {
            warfareTargetId = id;
            if (interfacePage != InterfacePage.Warfare) OpenInterface(InterfacePage.Warfare);
        }
        private void DrawWarRoster(string[] ids, string leaderArmyId = null)
        {
            foreach (var id in ids)
            {
                var army = Array.Find(world.armies, a => a.id == id); if (army == null) continue;
                GUILayout.Label((id == leaderArmyId ? "COMMAND · " : "") + army.name + " · " + HeroName(army.commanderId), new GUIStyle(noteStyle) { richText = false });
                GUILayout.Label(UnitSummary(army.units) + " · " + army.mythic + " mythic · " + army.health + "/" + army.maxHealth + " HP · " + army.state, theme.Small);
                if (army.ownerId == playerId && GUILayout.Button(ActiveArmy.id == id ? "Selected contribution" : "Select this march")) activeMarchId = id;
                GUI.enabled = WarOfficer && !processing;
                if (WarOfficer) AllianceAction(id == leaderArmyId ? "withdraw entire rally" : "recall " + HeroName(army.commanderId), "campaign-recall", id);
                GUI.enabled = true;
            }
        }
        private void DrawWarfare()
        {
            GUILayout.Label("OATHBOUND WAR COUNCIL", theme.Eyebrow);
            if (string.IsNullOrEmpty(me.allianceId))
            {
                GUILayout.Label("Join an alliance to assemble rallies or defend structures.", noteStyle);
                if (GUILayout.Button("Open alliance hall", theme.Primary)) OpenInterface(InterfacePage.Alliance);
                return;
            }
            GUILayout.Label("Selected march · " + HeroName(ActiveArmy.commanderId), sectionStyle);
            GUILayout.Label(UnitSummary(ActiveArmy.units) + " · " + ActiveArmy.mythic + " mythic · " + ActiveArmy.state, noteStyle);
            GUILayout.Label("Contribute an existing march with the troops you prepared. It stays yours and occupies its march slot. Return/withdraw releases the assignment; it does not copy troops into another army.", noteStyle);
            if (!string.IsNullOrEmpty(ActiveArmy.assignmentKind))
            {
                GUI.enabled = !processing;
                if (GUILayout.Button("Withdraw selected assignment (rally leaders withdraw the whole rally)")) Send(ActiveArmy.assignmentKind == "rally" ? "rally-leave" : "garrison-leave");
                GUI.enabled = true;
            }
            GUILayout.Space(12); GUILayout.Label("Start a rally", sectionStyle);
            var targets = new List<string>();
            foreach (var stronghold in world.strongholds) if (stronghold.respawn <= 0) targets.Add(stronghold.id);
            foreach (var site in world.sites) if (!string.IsNullOrEmpty(site.allianceId) && site.allianceId != me.allianceId) targets.Add(site.id);
            foreach (var flag in world.flags) if (flag.allianceId != me.allianceId) targets.Add(flag.id);
            if (world.exploration != null) foreach (var report in world.exploration.reports)
            {
                foreach (var site in report.sites)
                    if (!string.IsNullOrEmpty(site.allianceId) && site.allianceId != me.allianceId && !targets.Contains(site.id) && !Array.Exists(world.sites, s => s.id == site.id && s.allianceId == me.allianceId)) targets.Add(site.id);
                if (report.strongholds != null) foreach (var t in report.strongholds) if (t.respawn <= 0 && !targets.Contains(t.id) && !Array.Exists(world.strongholds, current => current.id == t.id && current.respawn > 0)) targets.Add(t.id);
                foreach (var flag in report.flags) if (flag.allianceId != me.allianceId && !targets.Contains(flag.id)) targets.Add(flag.id);
            }
            if (!targets.Contains(warfareTargetId)) warfareTargetId = targets.Count > 0 ? targets[0] : null;
            GUILayout.Label("Scouted objectives may have changed since the report. The server rechecks ownership, supply and access when assembling.", theme.Small);
            foreach (var id in targets) if (GUILayout.Toggle(warfareTargetId == id, WarTargetName(id), theme.Tab)) warfareTargetId = id;
            if (targets.Count == 0) GUILayout.Label("No known enemy structures or ready strongholds yet. Scout the frontier. Neutral sacred sites use the normal capture action.", noteStyle);
            var boss = KnownStronghold(warfareTargetId);
            if (boss != null)
            {
                GUILayout.Label("GODBREAKER STRONGHOLD · TIER " + boss.tier, theme.Eyebrow);
                GUILayout.Label(Mathf.CeilToInt(boss.guardHealth) + "/" + Mathf.CeilToInt(boss.maxGuardHealth) + " defender HP · " + Mathf.CeilToInt(boss.health) + "/" + Mathf.CeilToInt(boss.maxHealth) + " wall HP", noteStyle);
                GUILayout.Label("Defenders · " + UnitSummary(boss.units) + " · Base retaliation " + boss.guardDamage.ToString("F0"), theme.Small);
                GUILayout.Label("At least " + world.strongholdRules.minMarches + " assembled marches. Defeat the guards, then the walls. " + world.strongholdRules.roundLimit + " combat-round limit; no beacon supply required.", noteStyle);
                GUILayout.Label("TOTAL SHARED REWARD POOL · " + JourneyRewardText(boss.reward) + " · " + boss.xp + " commander XP", theme.Small);
                GUILayout.Label("The pool is divided by actual guard/wall damage, aggregated per city. Additional marches do not multiply rewards. Survivors return home automatically.", theme.Small);
            }
            foreach (var fallen in world.strongholds) if (fallen.respawn > 0) GUILayout.Label(fallen.name + " · Reforms in " + Mathf.CeilToInt(fallen.respawn) + "s", theme.Small);
            rallyAssemblyIndex = GUILayout.Toolbar(rallyAssemblyIndex, new[] { "10s assembly", "30s assembly", "60s assembly" });
            GUILayout.Label("Up to " + world.campaignLimits.rallyMarches + " marches / " + world.campaignLimits.rallyLoad + " load. A mortal uses one load; a mythic uses five. Contributions must reach the leader's city before assembly ends.", theme.Small);
            bool createReady = (WarOfficer || boss != null) && BuildingLevel("oathhall") > 0 && ContributionReady && CanEditArmy && warfareTargetId != null;
            GUI.enabled = createReady && !processing;
            if (GUILayout.Button("ASSEMBLE RALLY · " + (warfareTargetId == null ? "Choose a target" : WarTargetName(warfareTargetId)), theme.Primary, GUILayout.Height(44)))
                Send(new GameCommand { type = "rally-create", targetId = warfareTargetId, count = new[] { 10, 30, 60 }[rallyAssemblyIndex] });
            GUI.enabled = true;
            if (!createReady) GUILayout.Label("Leading requires Citadel 2, an Oathbound Hall and an idle, fully recovered march at home. PvE rallies accept any alliance member; PvP leadership needs leader/officer rank. PvP targets need connected beacon supply within 12 units; Godbreaker strongholds do not.", noteStyle);
            GUILayout.Space(16); GUILayout.Label("Alliance rallies", sectionStyle);
            if (world.rallies.Length == 0) GUILayout.Label("No rally is currently assembling or marching.", theme.Small);
            foreach (var rally in world.rallies)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(WarTargetName(rally.targetId) + " · " + rally.phase, sectionStyle);
                GUILayout.Label(rally.armyIds.Length + "/" + world.campaignLimits.rallyMarches + " marches · " + rally.troopLoad + "/" + world.campaignLimits.rallyLoad + " load" + (rally.phase == "Assembling" ? " · Departs in " + Mathf.Max(0, Mathf.CeilToInt(rally.assemblyEnds - world.time)) + "s" : ""), noteStyle);
                bool member = Array.IndexOf(rally.armyIds, ActiveArmy.id) >= 0;
                if (!member && rally.phase == "Assembling")
                {
                    GUI.enabled = ContributionReady && CanEditArmy && !processing;
                    if (GUILayout.Button("Join with selected march", theme.Primary)) Send("rally-join", rally.id);
                    GUI.enabled = true;
                }
                DrawWarRoster(rally.armyIds, rally.leaderArmyId); GUILayout.EndVertical();
            }
            GUILayout.Space(16); GUILayout.Label("Garrisons and reinforcements", sectionStyle);
            GUILayout.Label("Send an idle, non-recovering march to a completed allied structure. Current health is retained; it contributes only after arrival. Up to " + world.campaignLimits.garrisonMarches + " marches / " + world.campaignLimits.garrisonLoad + " load; a march may enter each siege once.", noteStyle);
            foreach (var site in world.sites) if (site.allianceId == me.allianceId) DrawGarrisonTarget(site.id, site.health, site.maxHealth, 0);
            foreach (var flag in world.flags) if (flag.allianceId == me.allianceId) DrawGarrisonTarget(flag.id, flag.health, flag.maxHealth, flag.buildRemaining);
        }
        private void DrawGarrisonTarget(string id, float health, float maximum, float construction)
        {
            GUILayout.BeginVertical(GUI.skin.box); GUILayout.Label(WarTargetName(id), sectionStyle);
            var siege = Array.Find(world.sieges, s => s.targetId == id);
            GUILayout.Label(Mathf.CeilToInt(health) + "/" + Mathf.CeilToInt(maximum) + " structure HP" + (construction > 0 ? " · Building " + Mathf.CeilToInt(construction) + "s" : siege != null ? " · UNDER SIEGE · Round " + siege.rounds : ""), noteStyle);
            theme.Bar(GUILayoutUtility.GetRect(80, 8, GUILayout.ExpandWidth(true)), health / Mathf.Max(1, maximum), MythInterfaceTheme.Teal);
            GUI.enabled = construction <= 0 && MarchAvailable && !processing;
            if (GUILayout.Button(siege != null ? "Reinforce with selected march" : "Garrison selected march")) Send("garrison-join", id);
            GUI.enabled = true;
            var garrison = Array.Find(world.garrisons, g => g.targetId == id);
            if (garrison != null) { GUILayout.Label(garrison.armyIds.Length + " marches · " + garrison.troopLoad + " load", theme.Small); DrawWarRoster(garrison.armyIds); }
            var flag = Array.Find(world.flags, f => f.id == id);
            if (flag != null && WarOfficer)
            {
                GUILayout.Label(flag.connected ? "Connected supply" : "No connected supply yet", theme.Small);
                GUI.enabled = !processing && siege == null;
                AllianceAction("dismantle structure (no refund)", "beacon-dismantle", id); GUI.enabled = true;
            }
            GUILayout.EndVertical();
        }
        private void DrawGroupReports()
        {
            GUILayout.Label("ALLIANCE BATTLES", sectionStyle);
            GUILayout.Label("Active sieges and the latest 20 completed group reports. Each contribution keeps its own damage, wounds and owner. Structure damage is separate from damage to defending troops.", noteStyle);
            foreach (var report in me.groupReports)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(report.targetName + " · " + report.outcome, sectionStyle);
                GUILayout.Label(report.rounds + " rounds · Structure damage " + report.structureDamage.ToString("F1"), noteStyle);
                if (report.kind == "stronghold")
                {
                    GUILayout.Label("Tier " + report.tier + " · Guards " + report.guardHealthBefore.ToString("F0") + " → " + report.guardHealthAfter.ToString("F0") + " HP · Walls " + report.wallHealthBefore.ToString("F0") + " → " + report.wallHealthAfter.ToString("F0") + " HP", theme.Small);
                    GUILayout.Label("Defender damage taken " + report.npcDamageTaken.ToString("F1") + " · Defender damage dealt " + report.npcDamageDealt.ToString("F1"), theme.Small);
                    if (report.rewards != null) foreach (var reward in report.rewards) if (reward.playerId == playerId)
                        GUILayout.Label("YOUR REWARD · " + JourneyRewardText(reward.resources) + " · " + reward.xp + " commander XP", noteStyle);
                }
                foreach (var team in new[] { "Attackers", "Defenders" })
                {
                    GUILayout.Label(team.ToUpperInvariant(), theme.Eyebrow);
                    foreach (var entry in report.participants)
                    {
                        if (entry.team != team) continue;
                        GUILayout.Label(entry.playerName + " · " + HeroName(entry.commanderId) + " · " + entry.result, new GUIStyle(noteStyle) { richText = false });
                        GUILayout.Label($"Damage {entry.damageDealt:F1} · Taken {entry.damageTaken:F1} · Healing {entry.healed:F1} · Absorbed {entry.absorbed:F1}\nStructure damage {entry.structureDamage:F1} · Shield created {entry.shieldCreated:F1}", theme.Small);
                        GUILayout.Label("Before: " + UnitSummary(entry.unitsBefore) + " / " + entry.mythicBefore + " mythic\nAfter: " + UnitSummary(entry.unitsAfter) + " / " + entry.mythicAfter + " mythic\nSent to hospital: " + UnitSummary(entry.wounded) + " / " + entry.woundedMythic + " mythic", theme.Small);
                    }
                }
                GUILayout.EndVertical();
            }
        }
    }
}
