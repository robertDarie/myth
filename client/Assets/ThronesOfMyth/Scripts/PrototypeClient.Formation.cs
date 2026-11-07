using System;
using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private readonly Dictionary<string, string> formationEntries = new Dictionary<string, string>();
        private UnitCounts formationUnits = new UnitCounts();
        private int formationMythic;
        private bool formationEditing;
        private string formationMarchId, formationHeroId, pendingFormationHero;
        private Vector2 formationHeroScroll, formationTroopScroll;
        private string TroopName(string id) => Array.Find(world.troopTypes, t => t.id == id)?.name ?? "Oathguard";
        private static string UnitSummary(UnitCounts units) => units == null ? "" : units.infantry + " infantry · " + units.archers + " archers · " + units.cavalry + " cavalry";
        private static int UnitsOf(UnitCounts units, string id) => units == null ? 0 : id == "infantry" ? units.infantry : id == "archers" ? units.archers : units.cavalry;
        private static void SetUnits(UnitCounts units, string id, int count) { if (id == "infantry") units.infantry = count; else if (id == "archers") units.archers = count; else units.cavalry = count; }
        private void PrepareCityMarch()
        {
            var ready = OwnMarches().Find(a => a.id == activeMarchId && !a.hasOrder && a.recovery <= 0 && Vector2.Distance(new Vector2(a.x, a.z), new Vector2(me.homeX, me.homeZ)) < 2)
                ?? OwnMarches().Find(a => !a.hasOrder && a.recovery <= 0 && Vector2.Distance(new Vector2(a.x, a.z), new Vector2(me.homeX, me.homeZ)) < 2);
            if (ready != null) activeMarchId = ready.id;
            BeginFormation(ready != null);
        }
        private void BeginFormation(bool edit)
        {
            formationEditing = edit; formationMarchId = edit ? ActiveArmy.id : "";
            formationHeroId = edit ? ActiveArmy.commanderId : null;
            formationUnits = edit && ActiveArmy.units != null ? ActiveArmy.units.Copy() : new UnitCounts();
            formationMythic = edit ? ActiveArmy.mythic : 0;
            formationEntries.Clear();
            formationHeroScroll = formationTroopScroll = Vector2.zero;
            OpenInterface(InterfacePage.Formation);
        }
        private int QuantityRow(Rect row, string title, string description, string icon, int count, int available)
        {
            theme.Panel(row, false, true);
            theme.Icon(new Rect(row.x + 13, row.y + 13, 30, 30), icon, count > 0 ? MythInterfaceTheme.Gold : MythInterfaceTheme.Muted);
            theme.Text(new Rect(row.x + 57, row.y + 8, row.width - 210, 27), title, theme.Heading);
            theme.Text(new Rect(row.x + 57, row.y + 37, row.width - 74, 23), description + " · Ready " + available, theme.Small);
            if (!formationEntries.TryGetValue(icon, out var entry)) entry = count.ToString();
            GUI.SetNextControlName("formation-" + icon);
            entry = GUI.TextField(new Rect(row.xMax - 136, row.y + 10, 76, 33), entry, 6);
            if (string.IsNullOrEmpty(entry)) count = 0;
            else if (int.TryParse(entry, out var parsed)) { count = Mathf.Clamp(parsed, 0, available); if (count != parsed) entry = count.ToString(); }
            else entry = count.ToString();
            if (theme.Button(new Rect(row.xMax - 53, row.y + 10, 43, 33), "MAX")) { count = available; entry = count.ToString(); GUIUtility.keyboardControl = 0; }
            int slider = Mathf.Clamp(Mathf.RoundToInt(GUI.HorizontalSlider(new Rect(row.x + 17, row.y + 68, row.width - 34, 16), count, 0, Mathf.Max(1, available))), 0, available);
            if (slider != count) { count = slider; entry = count.ToString(); }
            formationEntries[icon] = entry;
            return count;
        }
        private void RenderFormationWindow(Rect r)
        {
            var current = formationEditing ? Array.Find(world.armies, a => a.id == formationMarchId && a.ownerId == playerId) : null;
            var ready = me.reserveUnits.Copy();
            if (current != null) { ready.infantry += current.units.infantry; ready.archers += current.units.archers; ready.cavalry += current.units.cavalry; }
            int readyMythic = me.reserveMythic + (current?.mythic ?? 0);
            var left = new Rect(r.x, r.y, 286, r.height); var right = new Rect(r.x + 302, r.y, r.width - 302, r.height);
            theme.Panel(left, false, true); theme.Panel(right, false, true);
            theme.Text(new Rect(left.x + 18, left.y + 12, left.width - 36, 25), "CHOOSE YOUR COMMANDER", theme.Eyebrow);
            foreach (var id in me.ownedCommanders)
                if (string.IsNullOrEmpty(formationHeroId) && !Array.Exists(world.armies, a => a.ownerId == playerId && a.id != formationMarchId && a.commanderId == id)) formationHeroId = id;
            var hero = Array.Find(world.commanders, h => h.id == formationHeroId);
            float portraitHeight = Mathf.Clamp(left.height * 0.34f, 120, 200);
            if (hero != null)
            {
                theme.PortraitCard(new Rect(left.center.x - portraitHeight * 0.375f, left.y + 49, portraitHeight * 0.75f, portraitHeight), hero.id, RarityColor(hero.color));
                theme.Text(new Rect(left.x + 10, left.y + portraitHeight + 58, left.width - 20, 30), hero.name, theme.Center);
            }
            var roster = new Rect(left.x + 10, left.y + portraitHeight + 98, left.width - 20, left.height - portraitHeight - 108);
            formationHeroScroll = GUI.BeginScrollView(roster, formationHeroScroll, new Rect(0, 0, roster.width - 16, me.ownedCommanders.Length * 60));
            for (int i = 0; i < me.ownedCommanders.Length; i++)
            {
                string id = me.ownedCommanders[i]; var definition = Array.Find(world.commanders, h => h.id == id);
                bool assigned = Array.Exists(world.armies, a => a.ownerId == playerId && a.id != formationMarchId && a.commanderId == id);
                var cell = new Rect(2, i * 60, roster.width - 20, 54); theme.Panel(cell, id == formationHeroId);
                theme.Portrait(new Rect(8, cell.y + 8, 38, 38), id, RarityColor(definition.color));
                theme.Text(new Rect(56, cell.y + 5, cell.width - 65, 26), definition.name, theme.Body);
                theme.Text(new Rect(56, cell.y + 29, cell.width - 65, 20), assigned ? "LEADING ANOTHER MARCH" : definition.rarity.ToUpperInvariant(), theme.Small);
                if (!assigned && GUI.Button(cell, GUIContent.none, GUIStyle.none)) formationHeroId = id;
            }
            GUI.EndScrollView();
            theme.Text(new Rect(right.x + 18, right.y + 12, right.width - 36, 26), formationEditing ? "REFORM AT YOUR CITY" : "TROOPS LEAVING YOUR CITY", theme.Eyebrow);
            theme.Text(new Rect(right.x + 18, right.y + 42, right.width - 36, 38), "Choose each troop type and exact count. Unselected units stay home.", theme.Small);
            var viewport = new Rect(right.x + 10, right.y + 85, right.width - 20, right.height - 187);
            formationTroopScroll = GUI.BeginScrollView(viewport, formationTroopScroll, new Rect(0, 0, viewport.width - 16, 4 * 98));
            for (int i = 0; i < world.troopTypes.Length; i++)
            {
                var type = world.troopTypes[i]; int available = UnitsOf(ready, type.id);
                SetUnits(formationUnits, type.id, QuantityRow(new Rect(2, i * 98, viewport.width - 22, 92), type.name, type.role, type.id, Mathf.Min(UnitsOf(formationUnits, type.id), available), available));
            }
            string mythicName = Array.Find(world.civilizations, c => c.id == me.civilization)?.mythic ?? "Mythic guardian";
            formationMythic = QuantityRow(new Rect(2, 294, viewport.width - 22, 92), mythicName, "Mythic escort", "aether", Mathf.Min(formationMythic, readyMythic), readyMythic);
            GUI.EndScrollView();
            var footer = new Rect(right.x + 18, right.yMax - 96, right.width - 36, 84);
            theme.Text(new Rect(footer.x, footer.y, footer.width - 200, 25), formationUnits.Total + " mortal · " + formationMythic + " mythic selected", theme.Heading);
            if (theme.Button(new Rect(footer.xMax - 190, footer.y, 90, 27), "CLEAR")) { formationUnits = new UnitCounts(); formationMythic = 0; formationEntries.Clear(); GUIUtility.keyboardControl = 0; }
            if (theme.Button(new Rect(footer.xMax - 92, footer.y, 92, 27), "ALL READY")) { formationUnits = ready.Copy(); formationMythic = readyMythic; formationEntries.Clear(); GUIUtility.keyboardControl = 0; }
            bool home = current != null && Vector2.Distance(new Vector2(current.x, current.z), new Vector2(me.homeX, me.homeZ)) < 2 && !current.hasOrder && current.recovery <= 0 && current.health >= current.maxHealth;
            bool room = formationEditing ? home : OwnMarches().Count < me.marchSlots;
            bool commanderAvailable = hero != null && !Array.Exists(world.armies, a => a.ownerId == playerId && a.id != formationMarchId && a.commanderId == formationHeroId);
            string reason = formationEditing && !home ? "Return and recover fully before changing this formation." : !room ? "Reach the next age for another march slot." : !commanderAvailable ? "Choose a recruited, unassigned commander first." : formationUnits.Total + formationMythic == 0 ? "Choose at least one unit." : "";
            if (theme.Button(new Rect(footer.x, footer.y + 37, footer.width * 0.48f, 42), formationEditing ? "CONFIRM FORMATION" : "ASSEMBLE MARCH", true, room && commanderAvailable && formationUnits.Total + formationMythic > 0 && !processing))
            {
                if (formationEditing) activeMarchId = formationMarchId;
                Send(new GameCommand { type = formationEditing ? "configure-march" : "deploy-march", targetId = formationHeroId, units = formationUnits.Copy(), troops = formationUnits.Total, mythic = formationMythic });
            }
            theme.Text(new Rect(footer.x + footer.width * 0.51f, footer.y + 36, footer.width * 0.49f, 46), string.IsNullOrEmpty(reason) ? "March slots " + OwnMarches().Count + " / " + me.marchSlots + " · Choose a map destination after assembling." : reason, theme.Small);
        }
    }
}
