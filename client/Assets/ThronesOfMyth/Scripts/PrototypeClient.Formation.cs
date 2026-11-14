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
        private static string UnitSummary(UnitCounts units) => units == null ? "" : units.Summary();
        private static int UnitsOf(UnitCounts units,string id) => units==null?0:units.Get(id);
        private static void SetUnits(UnitCounts units,string id,int count) { units.Set(id,count); }
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
        private int QuantityRow(Rect row, string title, string description, string key, int count, int available, string icon = null)
        {
            icon ??= key;
            theme.Panel(row, false, true);
            theme.Icon(new Rect(row.x + 13, row.y + 13, 30, 30), icon, count > 0 ? MythInterfaceTheme.Gold : MythInterfaceTheme.Muted);
            theme.OneLine(new Rect(row.x + 57, row.y + 8, InterfaceLayout.TroopTitleWidth(row.width), 27), title, theme.Heading);theme.Hint(new Rect(row.x+57,row.y+8,row.width-74,27),title);
            theme.OneLine(new Rect(row.x + 57, row.y + 37, row.width - 210, 23), description + " · Ready " + available, theme.Small);
            if (!formationEntries.TryGetValue(key, out var entry)) entry = count.ToString();
            GUI.SetNextControlName("formation-" + key);
            entry = GUI.TextField(new Rect(row.xMax - 136, row.y + 37, 76, 33), entry, 6);
            if (string.IsNullOrEmpty(entry)) count = 0;
            else if (int.TryParse(entry, out var parsed)) { count = Mathf.Clamp(parsed, 0, available); if (count != parsed) entry = count.ToString(); }
            else entry = count.ToString();
            if (theme.Button(new Rect(row.xMax - 53, row.y + 37, 43, 33), "MAX")) { count = available; entry = count.ToString(); GUIUtility.keyboardControl = 0; }
            int slider = Mathf.Clamp(Mathf.RoundToInt(GUI.HorizontalSlider(new Rect(row.x + 17, row.y + 83, row.width - 34, 16), count, 0, Mathf.Max(1, available))), 0, available);
            if (slider != count) { count = slider; entry = count.ToString(); }
            formationEntries[key] = entry;
            return count;
        }
        private void RenderFormationWindow(Rect r)
        {
            var current = formationEditing ? OwnMarches().Find(a => a.id == formationMarchId) : null;
            var ready = me.reserveUnits.Copy();
            if (current != null) foreach(var type in world.troopTypes) ready.Set(type.id,ready.Get(type.id)+current.units.Get(type.id));
            int readyMythic = me.reserveMythic + (current?.mythic ?? 0);
            float rosterWidth=InterfaceLayout.FormationRosterWidth(r.width);
            var left = new Rect(r.x, r.y, rosterWidth, r.height); var right = new Rect(r.x + rosterWidth+16, r.y, r.width - rosterWidth-16, r.height);
            theme.Panel(left, false, true); theme.Panel(right, false, true);
            theme.OneLine(new Rect(left.x + 18, left.y + 12, left.width - 36, 25), "COMMANDER", theme.Eyebrow);
            foreach (var id in me.ownedCommanders)
                if (string.IsNullOrEmpty(formationHeroId) && !OwnMarches().Exists(a => a.id != formationMarchId && a.commanderId == id)) formationHeroId = id;
            var hero = Array.Find(world.commanders, h => h.id == formationHeroId);
            float portraitHeight = Mathf.Clamp(left.height * 0.34f, 120, 200);
            if (hero != null)
            {
                theme.PortraitCard(new Rect(left.center.x - portraitHeight * 0.375f, left.y + 49, portraitHeight * 0.75f, portraitHeight), hero.id, RarityColor(hero.color));
                theme.OneLine(new Rect(left.x + 10, left.y + portraitHeight + 58, left.width - 20, 30), hero.name, theme.Center);
            }
            var roster = new Rect(left.x + 10, left.y + portraitHeight + 98, left.width - 20, left.height - portraitHeight - 108);
            formationHeroScroll = GUI.BeginScrollView(roster, formationHeroScroll, new Rect(0, 0, roster.width - 16, me.ownedCommanders.Length * 60));
            for (int i = 0; i < me.ownedCommanders.Length; i++)
            {
                string id = me.ownedCommanders[i]; var definition = Array.Find(world.commanders, h => h.id == id);
                bool assigned = OwnMarches().Exists(a => a.id != formationMarchId && a.commanderId == id);
                var cell = new Rect(2, i * 60, roster.width - 20, 54); theme.Panel(cell, id == formationHeroId);
                theme.Portrait(new Rect(8, cell.y + 8, 38, 38), id, RarityColor(definition.color));
                theme.OneLine(new Rect(56, cell.y + 5, cell.width - 65, 26), definition.name, theme.Body);
                theme.OneLine(new Rect(56, cell.y + 29, cell.width - 65, 20), assigned ? "Assigned to a march" : definition.rarity.ToUpperInvariant(), theme.Small);
                if (!assigned && GUI.Button(cell, GUIContent.none, GUIStyle.none)) formationHeroId = id;
            }
            GUI.EndScrollView();
            theme.Text(new Rect(right.x + 18, right.y + 12, right.width - 36, 26), formationEditing ? "REFORM AT YOUR CITY" : "TROOPS LEAVING YOUR CITY", theme.Eyebrow);
            var selectedHero=Array.Find(me.heroProgress,h=>h.id==formationHeroId);
            int marchShare = selectedHero!=null&&selectedHero.marchTroopCap>0?selectedHero.marchTroopCap:me.marchTroopCap;
            theme.Text(new Rect(right.x + 18, right.y + 42, right.width - 36, 38), marchShare > 0 ? "This march can take " + marchShare + " mortal troops. The city store is " + me.troopCapacity + ". Unselected units stay home." : "Choose a patrol or set exact counts. Unselected units stay home.", theme.Small);
            bool captainFree=Array.IndexOf(me.ownedCommanders,"captain")>=0&&!OwnMarches().Exists(a=>a.id!=formationMarchId&&a.commanderId=="captain");
            int patrolInfantry=me.numericVersion==1?900:15,patrolArchers=me.numericVersion==1?0:5;
            bool patrolReady=captainFree&&ready.Get("infantry")>=patrolInfantry&&ready.Get("archers")>=patrolArchers;
            if(theme.Button(new Rect(right.x+18,right.y+80,right.width-36,34),"Captain · "+patrolInfantry+" infantry"+(patrolArchers>0?" + "+patrolArchers+" archers":""),false,patrolReady,"Needs the Captain and "+patrolInfantry+" ready infantry"+(patrolArchers>0?" plus "+patrolArchers+" archers.":". Heal wounded troops or train reserves if needed.")))
            {formationHeroId="captain";formationUnits=new UnitCounts();formationUnits.Set("infantry",patrolInfantry);formationUnits.Set("archers",patrolArchers);formationMythic=0;formationEntries.Clear();GUIUtility.keyboardControl=0;}
            theme.Text(new Rect(right.x + 18, right.y + 118, right.width - 36, 62), FormationPreview(formationUnits), theme.Small);
            var viewport = new Rect(right.x + 10, right.y + 184, right.width - 20, right.height - 286);
            formationTroopScroll = GUI.BeginScrollView(viewport, formationTroopScroll, new Rect(0, 0, viewport.width - 16, (world.troopTypes.Length+1) * InterfaceLayout.TroopRowStep));
            for (int i = 0; i < world.troopTypes.Length; i++)
            {
                var type = world.troopTypes[i]; int available = UnitsOf(ready, type.id);
                string icon = type.role == "Archers" ? "archers" : type.role == "Cavalry" ? "cavalry" : "infantry";
                SetUnits(formationUnits, type.id, QuantityRow(new Rect(2, i * InterfaceLayout.TroopRowStep, viewport.width - 22, InterfaceLayout.TroopRowHeight), type.name+" · T"+type.tier, type.role, type.id, Mathf.Min(UnitsOf(formationUnits, type.id), available), available, icon));
            }
            string mythicName = Array.Find(world.civilizations, c => c.id == me.civilization)?.mythic ?? "Mythic guardian";
            formationMythic = QuantityRow(new Rect(2, world.troopTypes.Length*InterfaceLayout.TroopRowStep, viewport.width - 22, InterfaceLayout.TroopRowHeight), mythicName, "Mythic escort", "mana", Mathf.Min(formationMythic, readyMythic), readyMythic);
            GUI.EndScrollView();
            var footer = new Rect(right.x + 18, right.yMax - 96, right.width - 36, 84);
            theme.OneLine(new Rect(footer.x, footer.y, footer.width - 200, 25), formationUnits.Total + " mortal · " + formationMythic + " mythic", theme.Body);
            if (theme.Button(new Rect(footer.xMax - 190, footer.y, 90, 27), "CLEAR")) { formationUnits = new UnitCounts(); formationMythic = 0; formationEntries.Clear(); GUIUtility.keyboardControl = 0; }
            if (theme.Button(new Rect(footer.xMax - 92, footer.y, 92, 27), "ALL READY"))
            {
                formationUnits = ready.Copy(); formationMythic = readyMythic;
                if (marchShare > 0 && formationUnits.Total > marchShare)
                {
                    int over = formationUnits.Total - marchShare;
                    for (int i = world.troopTypes.Length - 1; i >= 0 && over > 0; i--)
                    {
                        int have = formationUnits.Get(world.troopTypes[i].id);
                        int drop = Math.Min(have, over);
                        formationUnits.Set(world.troopTypes[i].id, have - drop);
                        over -= drop;
                    }
                }
                formationEntries.Clear(); GUIUtility.keyboardControl = 0;
            }
            bool home = current != null && Vector2.Distance(new Vector2(current.x, current.z), new Vector2(me.homeX, me.homeZ)) < 2 && !current.hasOrder && current.recovery <= 0 && current.health >= current.maxHealth;
            bool room = formationEditing ? home : OwnMarches().Count < 5;
            bool commanderAvailable = hero != null && !OwnMarches().Exists(a => a.id != formationMarchId && a.commanderId == formationHeroId);
            bool overShare = marchShare > 0 && formationUnits.Total > marchShare;
            string reason = overShare ? "This march can hold " + marchShare + " mortal troops. Leave the rest in the city." : formationEditing && !home ? "Return and recover fully before changing this formation." : !room ? "Five home formations already prepared. Edit or disband one." : !commanderAvailable ? "Choose a recruited, unassigned commander first." : formationUnits.Total + formationMythic == 0 ? "Choose at least one unit." : "";
            if (theme.Button(new Rect(footer.x, footer.y + 37, footer.width * 0.48f, 42), formationEditing ? "CONFIRM FORMATION" : "ASSEMBLE MARCH", true, room && commanderAvailable && formationUnits.Total + formationMythic > 0 && !overShare && !processing))
            {
                if (formationEditing) activeMarchId = formationMarchId;
                Send(new GameCommand { type = formationEditing ? "configure-march" : "deploy-march", targetId = formationHeroId, units = formationUnits.Copy(), troops = formationUnits.Total, mythic = formationMythic });
            }
            theme.Text(new Rect(footer.x + footer.width * 0.51f, footer.y + 36, footer.width * 0.49f, 46), string.IsNullOrEmpty(reason) ? "Deployed slots " + me.activeMarches + " / " + me.marchSlots + " · Choose a map destination after assembling." : reason, theme.Small);
        }
        private string FormationPreview(UnitCounts units)
        {
            var rule = world.formation;
            if (rule == null) return "";
            int mortal = units.Total, infantry = units.Infantry, archers = units.Archers, cavalry = units.Cavalry;
            bool Meets(int count) => mortal > 0 && count * 100 >= mortal * rule.minimumPercent;
            bool qualifies = Meets(infantry) && Meets(archers) && Meets(cavalry);
            int bonus = Mathf.RoundToInt((rule.health - 1f) * 100f);
            string Share(int count) => mortal == 0 ? "0.0%" : (count * 100f / mortal).ToString("0.0") + "%";
            string missing = (Meets(infantry) ? "" : "Infantry is short. ") + (Meets(archers) ? "" : "Archers are short. ") + (Meets(cavalry) ? "" : "Cavalry is short. ");
            return rule.name + " · each class at least " + rule.minimumPercent + "% of mortal troops · mythic escorts excluded · +" + bonus + "% maximum health\n"
                + "Infantry " + Share(infantry) + " · Archers " + Share(archers) + " · Cavalry " + Share(cavalry) + "\n"
                + (qualifies ? "This composition qualifies. The confirmed march shows the higher maximum health." : missing + "No maximum-health bonus until all three classes qualify.");
        }
    }
}
