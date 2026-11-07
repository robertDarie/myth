using System;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private UnitCounts healingDraft = new UnitCounts();
        private int healingMythic, chatChannel;
        private string chatDraft = "", markerName = "Regroup here", pendingAllianceAction;
        private float confirmAllianceUntil;
        private int HospitalQuantity(string label, int value, int maximum)
        {
            GUILayout.BeginHorizontal(); GUILayout.Label(label + " · " + maximum + " wounded", noteStyle, GUILayout.Width(250));
            value = Mathf.Clamp(Mathf.RoundToInt(GUILayout.HorizontalSlider(value, 0, Mathf.Max(1, maximum))), 0, maximum);
            string text = GUILayout.TextField(value.ToString(), 6, GUILayout.Width(74));
            if (int.TryParse(text, out int number)) value = Mathf.Clamp(number, 0, maximum);
            if (GUILayout.Button("Max", GUILayout.Width(55))) value = maximum;
            GUILayout.EndHorizontal(); return value;
        }
        private void DrawHospital()
        {
            GUILayout.Label("HOUSE OF RENEWAL", theme.Eyebrow);
            GUILayout.Label("Recover your wounded", sectionStyle);
            GUILayout.Label("Field defeats send a portion of your troops here. Waiting patients are retained even when beds are full. Beds limit one treatment batch; mythic units need five beds each.", noteStyle);
            GUILayout.Label("Healing beds " + me.hospitalCapacity + " · Total patients " + me.hospitalTroops + " mortal / " + me.hospitalMythic + " mythic", sectionStyle);
            if (me.healing != null && !string.IsNullOrEmpty(me.healing.id))
            {
                var job = me.healing; GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label("TREATMENT IN PROGRESS", theme.Eyebrow);
                GUILayout.Label(UnitSummary(job.units) + " · " + job.mythic + " mythic", noteStyle);
                theme.Bar(GUILayoutUtility.GetRect(80, 10, GUILayout.ExpandWidth(true)), 1 - job.remaining / job.duration, MythInterfaceTheme.Teal);
                GUILayout.Label(Mathf.CeilToInt(job.remaining) + " seconds remaining · Completes into city reserves", noteStyle);
                GUI.enabled = !processing;
                if (GUILayout.Button("Cancel treatment · refund " + Cost(job.cost))) Send("hospital-cancel", job.id);
                GUI.enabled = true; GUILayout.EndVertical();
            }
            else
            {
                healingDraft.infantry = HospitalQuantity("Oathguard", healingDraft.infantry, me.wounded.infantry);
                healingDraft.archers = HospitalQuantity("Dawn Archers", healingDraft.archers, me.wounded.archers);
                healingDraft.cavalry = HospitalQuantity("Dawn Riders", healingDraft.cavalry, me.wounded.cavalry);
                healingMythic = HospitalQuantity("Mythic guardians", healingMythic, me.woundedMythic);
                if (GUILayout.Button("Fill available beds"))
                {
                    int beds = me.hospitalCapacity; healingDraft = new UnitCounts();
                    foreach (var type in new[] { "infantry", "archers", "cavalry" }) { int count = Mathf.Min(beds, UnitsOf(me.wounded, type)); SetUnits(healingDraft, type, count); beds -= count; }
                    healingMythic = Mathf.Min(me.woundedMythic, beds / 5);
                }
                int used = healingDraft.Total + healingMythic * 5;
                var cost = new ResourceAmounts { food = healingDraft.Total * 2 + healingMythic * 20, gold = healingDraft.Total + healingMythic * 15 };
                GUILayout.Label("Selected " + used + " / " + me.hospitalCapacity + " beds · " + Cost(cost), noteStyle);
                GUI.enabled = BuildingLevel("infirmary") > 0 && used > 0 && used <= me.hospitalCapacity && Afford(cost) && !processing;
                if (GUILayout.Button("Begin treatment", theme.Primary, GUILayout.Height(44))) Send(new GameCommand { type = "hospital-heal", units = healingDraft.Copy(), mythic = healingMythic });
                GUI.enabled = true;
            }
            GUILayout.Space(12); GUILayout.Label("Treatment runs independently of construction, training and your field armies. Healed units join reserves; choose their next march at home. Upgrade this institution in the City screen for more beds and faster treatment.", noteStyle);
        }
        private void DrawBattleReports()
        {
            GUILayout.Label("WAR ARCHIVE", theme.Eyebrow); GUILayout.Label("Your field battles", sectionStyle);
            GUILayout.Label("Reports include live engagements and your latest 30 completed battles. Damage totals count actual health removed; shield absorption is separate. This field-war version has no permanent troop deaths or plunder rewards.", noteStyle);
            if (me.battleReports.Length == 0) GUILayout.Label("No field engagements yet. First-age cities and armies at their own city are protected.", noteStyle);
            foreach (var report in me.battleReports)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(report.outcome + " · " + report.rounds + " rounds", sectionStyle);
                GUILayout.Label(report.sides[0].playerName + " vs " + report.sides[1].playerName, new GUIStyle(noteStyle) { richText = false });
                foreach (var side in report.sides)
                {
                    GUILayout.Label((side.playerId == playerId ? "YOUR MARCH · " : "OPPOSING MARCH · ") + HeroName(side.commanderId), theme.Eyebrow);
                    GUILayout.Label($"Damage dealt {side.damageDealt:F1} · Received {side.damageTaken:F1} · Healing {side.healed:F1}\nShield created {side.shieldCreated:F1} · Absorbed {side.absorbed:F1}", noteStyle);
                    GUILayout.Label("Before: " + UnitSummary(side.unitsBefore) + " · " + side.mythicBefore + " mythic\nAfter: " + UnitSummary(side.unitsAfter) + " · " + side.mythicAfter + " mythic\nSent to hospital: " + UnitSummary(side.wounded) + " · " + side.woundedMythic + " mythic", noteStyle);
                }
                GUILayout.EndVertical();
            }
        }
        private void DrawChat()
        {
            GUILayout.Label("MESSENGERS' HALL", theme.Eyebrow);
            chatChannel = GUILayout.Toolbar(chatChannel, new[] { "Kingdom", "Alliance" });
            bool available = chatChannel == 0 || !string.IsNullOrEmpty(me.allianceId);
            if (!available) GUILayout.Label("Join an alliance to use its private channel.", noteStyle);
            chatDraft = GUILayout.TextField(chatDraft, 240, GUILayout.Height(48));
            GUI.enabled = available && !string.IsNullOrWhiteSpace(chatDraft) && !processing;
            if (GUILayout.Button("Send message", theme.Primary)) Send(new GameCommand { type = "chat-send", targetId = chatChannel == 0 ? "kingdom" : "alliance", name = chatDraft });
            GUI.enabled = true;
            GUILayout.Label("Newest messages first · Maximum 240 characters", theme.Small);
            var style = new GUIStyle(noteStyle) { richText = false, wordWrap = true };
            foreach (var message in world.chatMessages)
            {
                if (message.channel != (chatChannel == 0 ? "kingdom" : "alliance")) continue;
                GUILayout.BeginVertical(GUI.skin.box); GUILayout.Label(message.author, style); GUILayout.Label(message.text, style); GUILayout.EndVertical();
            }
        }
        private void AllianceAction(string label, string type, string target)
        {
            string key = type + ":" + target; bool confirm = pendingAllianceAction == key && Time.unscaledTime < confirmAllianceUntil;
            if (GUILayout.Button(confirm ? "Confirm " + label + "?" : label))
            {
                if (confirm) { Send(type, target); pendingAllianceAction = null; }
                else { pendingAllianceAction = key; confirmAllianceUntil = Time.unscaledTime + 5; }
            }
        }
        private void DrawAllianceMembers()
        {
            bool leader = me.allianceRole == "Leader", officer = leader || me.allianceRole == "Officer";
            GUILayout.Label("Members and command", sectionStyle);
            foreach (var member in world.players)
            {
                if (member.allianceId != me.allianceId) continue;
                GUILayout.BeginVertical(GUI.skin.box); GUILayout.Label(member.name + " · " + member.allianceRole, new GUIStyle(noteStyle) { richText = false });
                if (member.id != playerId)
                {
                    GUI.enabled = !processing;
                    if (leader)
                    {
                        if (GUILayout.Button(member.allianceRole == "Officer" ? "Demote to member" : "Promote to officer")) Send(member.allianceRole == "Officer" ? "alliance-demote" : "alliance-promote", member.id);
                        AllianceAction("transfer leadership", "alliance-transfer", member.id);
                    }
                    if (officer && member.allianceRole != "Leader" && (leader || member.allianceRole == "Member")) AllianceAction("remove member", "alliance-kick", member.id);
                    GUI.enabled = true;
                }
                GUILayout.EndVertical();
            }
            GUI.enabled = !processing; AllianceAction("leave alliance", "alliance-leave", ""); GUI.enabled = true;
            GUILayout.Label("Shared map markers", sectionStyle);
            if (officer)
            {
                markerName = GUILayout.TextField(markerName, 40);
                GUI.enabled = !processing && !string.IsNullOrWhiteSpace(markerName);
                if (GUILayout.Button("Place 10-minute marker at selected march")) Send(new GameCommand { type = "marker-place", name = markerName, x = ActiveArmy.x, z = ActiveArmy.z });
                GUI.enabled = true;
            }
            foreach (var pin in world.markers)
            {
                if (GUILayout.Button(pin.name + " · " + Mathf.CeilToInt(pin.expires - world.time) + "s")) { cameraControl?.Focus(pin.x, pin.z); interfacePage = InterfacePage.World; Select(pin.id, "marker"); }
                if (officer && GUILayout.Button("Remove marker")) Send("marker-remove", pin.id);
            }
        }
    }
}
