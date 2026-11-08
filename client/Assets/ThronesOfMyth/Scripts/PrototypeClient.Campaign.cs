using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private string selectedChapterId, lastActiveChapter;
        private JourneyChapter CurrentChapter => me.journeyCampaign == null ? null : Array.Find(me.journeyCampaign.chapters, c => c.id == me.journeyCampaign.activeId);
        private JourneyTask NextTask(JourneyChapter c) => c == null ? null : Array.Find(c.tasks, t => t.canClaim) ?? Array.Find(c.tasks, t => !t.claimed);
        private string JourneyRewardText(JourneyRewards r)
        {
            if(r==null)return "Not currently observed";
            var text = "";
            foreach (var pair in new[] { new { name = "wood", value = r.wood }, new { name = "food", value = r.food }, new { name = "gold", value = r.gold }, new { name = "stone", value = r.stone }, new { name = "mana", value = r.mana }, new { name = "sigils", value = r.sigils } })
                if (pair.value > 0) text += (text.Length > 0 ? " · " : "") + pair.value + " " + pair.name;
            if(r.aether>0)text+=(text.Length>0?" · ":"")+r.aether+" premium Aether";
            if(r.itemRewards!=null)foreach(var item in r.itemRewards)text+=" · "+item.count+" "+item.name+" (stored)";
            return text;
        }
        private void GuidePage(InterfacePage page) { if (interfacePage != page) OpenInterface(page); }
        private void GuideObjective(JourneyTask task)
        {
            switch (task.guide)
            {
                case "city": selectedBuilding = Mathf.Max(0, Array.FindIndex(me.cityBuildings, b => b.id == task.targetId)); GuidePage(InterfacePage.City); break;
                case "training": GuidePage(InterfacePage.Training); break;
                case "temple": GuidePage(InterfacePage.Temple); break;
                case "exploration": GuidePage(InterfacePage.Exploration); break;
                case "research":
                    if (BuildingLevel("academy") < 1) { selectedBuilding = Mathf.Max(0, Array.FindIndex(me.cityBuildings, b => b.id == "academy")); GuidePage(InterfacePage.City); }
                    else { GuidePage(InterfacePage.Research); inspectedTechnology = Mathf.Max(0, Array.FindIndex(me.researchOptions, t => t.id == task.targetId)); rosterScroll.y = task.targetId == "drill" ? 360 : 240; }
                    break;
                case "heroes": GuidePage(InterfacePage.Heroes); inspectedHeroId = ActiveArmy.commanderId; break;
                case "marches": GuidePage(InterfacePage.Marches); break;
                case "alliance": GuidePage(InterfacePage.Alliance); break;
                case "warfare": GuidePage(InterfacePage.Warfare); break;
                case "territory":
                    var shrine = Array.Find(world.sites, s => s.kind == "shrine" && s.x <= 40 && s.z <= 40);
                    if (shrine != null) { interfacePage = InterfacePage.World; Select(shrine.id, "site"); cameraControl?.Focus(shrine.x, shrine.z); }
                    break;
                case "gather":
                    NodeData node = null; float closest = float.MaxValue;
                    foreach (var n in world.nodes) if (n.resource == task.targetId && n.remaining > 0)
                    { float d = Vector2.Distance(new Vector2(ActiveArmy.x, ActiveArmy.z), new Vector2(n.x, n.z)); if (d < closest) { closest = d; node = n; } }
                    if (node != null) { interfacePage = InterfacePage.World; Select(node.id, "node"); cameraControl?.Focus(node.x, node.z); }
                    else { GuidePage(InterfacePage.Exploration); status = "Scout nearby land to reveal a " + task.targetId + " gathering site."; }
                    break;
                case "patrol": interfacePage = InterfacePage.World; cameraControl?.Focus(ActiveArmy.x, ActiveArmy.z); status = "Right-click accessible ground to march. Scout travel and forced retreats do not count as army patrol distance."; break;
                case "combat":
                    CampData camp = null; float distance = float.MaxValue;
                    foreach (var c in world.camps) if (c.health > 0 && c.x <= 40 && c.z <= 40 && (task.targetId!="opening-level-one"||c.level==1))
                    { float d = c.level * 100 + Vector2.Distance(new Vector2(ActiveArmy.x, ActiveArmy.z), new Vector2(c.x, c.z)); if (d < distance) { distance = d; camp = c; } }
                    if (camp != null) { interfacePage = InterfacePage.World; Select(camp.id, "camp"); cameraControl?.Focus(camp.x, camp.z); }
                    else { GuidePage(InterfacePage.Exploration); status = "Send a scout toward the frontier to reveal a Forsaken camp."; }
                    break;
            }
        }
        private void DrawCampaign()
        {
            var campaign = me.journeyCampaign;
            if (campaign == null) return;
            if (lastActiveChapter != campaign.activeId) { selectedChapterId = campaign.activeId; lastActiveChapter = campaign.activeId; }
            GUILayout.Label("CHRONICLES OF THE FALLEN GODS", theme.Eyebrow);
            GUILayout.Label(campaign.complete ? "Opening campaign complete" : "Your path through the fallen world", theme.Heading);
            GUILayout.Label("Tasks track your actions even before their chapter unlocks. Claim each objective, then its chapter reward. City work continues while armies and scouts are away.", noteStyle);
            foreach (var c in campaign.chapters)
                if (GUILayout.Toggle(selectedChapterId == c.id, c.title + (c.claimed ? " · COMPLETE" : c.locked ? " · LOCKED" : " · CURRENT"), theme.Tab)) selectedChapterId = c.id;
            var chapter = Array.Find(campaign.chapters, c => c.id == selectedChapterId) ?? CurrentChapter ?? campaign.chapters[campaign.chapters.Length - 1];
            GUILayout.Space(12); GUILayout.Label(chapter.title, sectionStyle); GUILayout.Label(chapter.story, noteStyle);
            if (chapter.locked) GUILayout.Label("Finish and claim earlier chapters to unlock these rewards. Progress made early is remembered.", theme.Small);
            foreach (var task in chapter.tasks)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label((task.claimed ? "✓ " : "") + task.title + " · " + task.progress + "/" + task.goal, sectionStyle);
                GUILayout.Label(task.description, noteStyle);
                theme.Bar(GUILayoutUtility.GetRect(80, 7, GUILayout.ExpandWidth(true)), (float)task.progress / Mathf.Max(1, task.goal), MythInterfaceTheme.Gold);
                GUILayout.Label("Reward · " + JourneyRewardText(task.reward), theme.Small);
                GUILayout.BeginHorizontal(); GUI.enabled = task.canClaim && !processing;
                if (GUILayout.Button(task.claimed ? "Claimed" : task.canClaim ? "CLAIM" : task.progress >= task.goal ? "Complete · chapter locked" : "In progress", theme.Primary)) Send("journey-claim", task.id);
                GUI.enabled = !processing;
                if (!task.claimed && GUILayout.Button("GO", GUILayout.Width(100))) GuideObjective(task);
                GUI.enabled = true; GUILayout.EndHorizontal(); GUILayout.EndVertical();
            }
            GUILayout.Space(12); GUILayout.Label("CHAPTER REWARD", theme.Eyebrow);
            GUILayout.Label(JourneyRewardText(chapter.reward) + (string.IsNullOrEmpty(chapter.commanderReward) ? "" : " · Guaranteed Epic Atalanta"), noteStyle);
            GUI.enabled = chapter.canClaim && !processing;
            if (GUILayout.Button(chapter.claimed ? "Chapter reward claimed" : "CLAIM CHAPTER REWARD", theme.Primary, GUILayout.Height(44))) Send("chapter-claim", chapter.id);
            GUI.enabled = true;
            if (campaign.complete) GUILayout.Label("Your opening chronicle is complete. Continue building your alliance, holding sacred sites and developing your commanders. Later kingdom chapters are still in development.", noteStyle);
        }
    }
}
