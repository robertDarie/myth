using System;
using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private enum InterfacePage { World, City, Training, Research, Temple, Heroes, Alliance, Chronicle, Forge, Market, Marches, Settings }
        private InterfacePage interfacePage;
        private MythInterfaceTheme theme;
        private float interfaceScalePreference = 1, toastUntil, lastSnapshotAt;
        private bool compactHud, labelsEnabled = true, advancedConnection, reducedMotion;
        private string previousToast = "";
        private Vector2 contentScroll, rosterScroll;
        private int heroFilter;
        private bool onlyOwnedHeroes;
        private string heroSearch = "";
        private float InterfaceScale => Mathf.Min(Mathf.Min(Screen.width / 1600f, Screen.height / 900f) * interfaceScalePreference, Mathf.Min(Screen.width / 1280f, Screen.height / 720f));
        private float ViewWidth => Screen.width / Mathf.Max(0.01f, InterfaceScale);
        private float ViewHeight => Screen.height / Mathf.Max(0.01f, InterfaceScale);
        private Rect WindowRect => new Rect((ViewWidth - Mathf.Min(1320, ViewWidth - 72)) / 2, 104, Mathf.Min(1320, ViewWidth - 72), ViewHeight - 216);
        private Rect MinimapRect => new Rect(ViewWidth - 238, ViewHeight - 278, 218, 174);
        private Rect ContextRect => new Rect((ViewWidth - 640) / 2, ViewHeight - 272, 640, 166);
        private List<ArmyData> OwnMarches()
        {
            var list = new List<ArmyData>();
            if (world != null) foreach (var march in world.armies) if (march.ownerId == playerId) list.Add(march);
            return list;
        }
        private void InitializeInterface()
        {
            interfaceScalePreference = Mathf.Clamp(PlayerPrefs.GetFloat("ThronesOfMyth.uiScale", 1), 0.85f, 1.15f);
            reducedMotion = PlayerPrefs.GetInt("ThronesOfMyth.reducedMotion", 0) == 1;
            labelsEnabled = PlayerPrefs.GetInt("ThronesOfMyth.labels", 1) == 1;
        }
        private void OpenInterface(InterfacePage page)
        {
            placeBeacon = false;
            interfacePage = interfacePage == page ? InterfacePage.World : page;
            contentScroll = Vector2.zero; rosterScroll = Vector2.zero;
            GUIUtility.keyboardControl = 0;
            if (interfacePage == InterfacePage.World) PlayerPrefs.Save();
        }
        private void CloseInterface()
        {
            GUIUtility.keyboardControl = 0;
            if (interfacePage != InterfacePage.World) { interfacePage = InterfacePage.World; PlayerPrefs.Save(); }
            else if (placeBeacon) placeBeacon = false;
            else { selectedId = ""; map.selectedId = ""; }
        }
        private bool InterfaceBlocksPoint(Vector3 screenPoint)
        {
            if (string.IsNullOrEmpty(token) || interfacePage != InterfacePage.World) return true;
            var p = new Vector2(screenPoint.x / InterfaceScale, (Screen.height - screenPoint.y) / InterfaceScale);
            if (p.y < 112 || p.y > ViewHeight - 94) return true;
            if (new Rect(20, 132, 282, 32).Contains(p)) return true;
            if (!compactHud)
            {
                if (new Rect(20, 172, 282, 164).Contains(p)) return true;
                int jobs = (HasJob(me?.construction) ? 1 : 0) + (HasJob(me?.secondConstruction) ? 1 : 0) + (HasJob(me?.research) ? 1 : 0);
                float step = Mathf.Min(65, Mathf.Max(46, (ViewHeight - 550) / 3)) + 8;
                if (jobs > 0 && new Rect(20, 350, 282, jobs * step - 8).Contains(p)) return true;
            }
            if (new Rect(ViewWidth - 202, 126, 182, 475).Contains(p) || MinimapRect.Contains(p)) return true;
            if (!string.IsNullOrEmpty(selectedId) && ContextRect.Contains(p)) return true;
            return new Rect(20, ViewHeight - 176, 116, 74).Contains(p);
        }
        private bool HandleInterfaceKeys()
        {
            if (interfacePage != InterfacePage.World) return false;
            if (Input.GetKeyDown(KeyCode.C)) { OpenInterface(InterfacePage.City); return true; }
            if (Input.GetKeyDown(KeyCode.K)) { OpenInterface(InterfacePage.Heroes); return true; }
            if (Input.GetKeyDown(KeyCode.L)) { OpenInterface(InterfacePage.Alliance); return true; }
            var own = OwnMarches();
            for (int i = 0; i < own.Count; i++)
                if (Input.GetKeyDown((KeyCode)((int)KeyCode.Alpha1 + i)))
                { activeMarchId = own[i].id; Select(own[i].id, "army"); cameraControl?.Focus(own[i].x, own[i].z); return true; }
            return false;
        }
        private string OrderFeedback(GameCommand command)
        {
            switch (command.type)
            {
                case "move": return "Your march is on its way.";
                case "attack": return "Your march advances into battle.";
                case "gather": return "Your march is heading to gather resources.";
                case "return": return "Your march is returning home.";
                case "stop": return "Your march awaits new orders.";
                case "building-upgrade": case "upgrade": return "Your builders have begun their work.";
                case "train": case "recruit": return "Recruitment has begun. New units will await you in city reserves.";
                case "cancel-job": return "Work canceled. Resources returned to your treasury.";
                case "reinforce": return "Your march has received its reinforcements.";
                case "deploy-march": return "A new march awaits your command.";
                case "disband-march": return "Your troops have returned to city reserves.";
                case "research": return "The Athenaeum has begun its studies.";
                case "summon": return "The Oracle has heard your invocation.";
                case "temple-offering": return "The Temple has granted your offering.";
                case "buy-sigil": return "An Oracle Sigil has been added to your collection.";
                case "unlock-commander": return HeroName(command.targetId) + " has joined your cause.";
                case "commander": return "Your commander is ready to lead the selected march.";
                case "mentor-commander": return "Your commander has gained experience.";
                case "promote-commander": return "Your commander has earned a new star.";
                case "upgrade-skill": return "Your commander's skill has grown stronger.";
                case "upgrade-commander": return "Your commander has ascended.";
                case "quest": return "Chapter rewards have been claimed.";
                case "craft": return "The Forge of Dawn has begun its work.";
                case "equip-relic": case "unequip-relic": return "Your march's relic loadout has been updated.";
                case "alliance-create": case "alliance-join": return "Your oath has been sworn.";
                case "alliance-help": return "Your aid has reached your ally.";
                case "flag": return "An Oath Beacon extends your alliance's reach.";
                case "capture": return "Your march advances to hold the sacred site.";
                case "trade": return "The exchange is complete.";
                default: return "Your orders have been received.";
            }
        }
        private void RenderStrategyInterface()
        {
            if (theme == null)
            {
                theme = new MythInterfaceTheme(GUI.skin);
                titleStyle = theme.Title; sectionStyle = theme.Heading; noteStyle = theme.Body;
            }
            var skinBefore = GUI.skin; var matrixBefore = GUI.matrix; var colorBefore = GUI.color;
            GUI.skin = theme.Skin;
            theme.ReducedMotion = reducedMotion;
            if (map != null) map.reducedMotion = reducedMotion;
            if (world != null && interfacePage == InterfacePage.World) { DrawMarchRoute(); map.labelScale = InterfaceScale; if (labelsEnabled) map.DrawLabels(Camera.main); }
            GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(InterfaceScale, InterfaceScale, 1));
            GUI.color = Color.white;
            if (string.IsNullOrEmpty(token)) RenderKingdomEntry();
            else
            {
                DrawTopHud();
                if (me != null)
                {
                    if (interfacePage == InterfacePage.World)
                    {
                        DrawQuestHud(); DrawMarchHud(); DrawKingdomMinimap(); DrawContextActions();
                        if (theme.Button(new Rect(20, ViewHeight - 176, 116, 74), "ENTER CITY\n[C]", true)) OpenInterface(InterfacePage.City);
                        theme.Text(new Rect(154, ViewHeight - 132, 250, 24), "KINGDOM OF THE FALLEN", theme.Eyebrow);
                    }
                    else DrawInterfaceWindow();
                    DrawBottomNavigation();
                    DrawInterfaceToast();
                }
                else theme.Text(new Rect(ViewWidth / 2 - 180, ViewHeight / 2, 360, 50), "Entering your kingdom…", theme.Center);
            }
            if (!string.IsNullOrEmpty(GUI.tooltip))
            {
                var point = Event.current.mousePosition;
                float tipHeight = Mathf.Clamp(theme.Small.CalcHeight(new GUIContent(GUI.tooltip), 274) + 18, 42, 160);
                var tip = new Rect(Mathf.Clamp(point.x + 16, 8, ViewWidth - 306), Mathf.Clamp(point.y + 18, 8, ViewHeight - tipHeight - 8), 298, tipHeight);
                theme.Panel(tip); theme.Text(new Rect(tip.x + 12, tip.y + 8, tip.width - 24, tip.height - 16), GUI.tooltip, theme.Small);
            }
            GUI.color = colorBefore; GUI.matrix = matrixBefore; GUI.skin = skinBefore;
        }
        private void RenderKingdomEntry()
        {
            theme.Backdrop(new Rect(0, 0, ViewWidth, ViewHeight));
            MythInterfaceTheme.Fill(new Rect(0, 0, ViewWidth, ViewHeight), new Color(0.025f, 0.06f, 0.09f, 0.48f));
            float centerY = ViewHeight / 2;
            theme.Icon(new Rect(120, centerY - 245, 180, 180), "temple", MythInterfaceTheme.Gold);
            theme.Text(new Rect(120, centerY - 30, 620, 38), "THE GODS HAVE FALLEN SILENT", theme.Eyebrow);
            var brand = new GUIStyle(theme.Title) { fontSize = 58 };
            theme.Text(new Rect(116, centerY + 8, 650, 140), "THRONES\nOF MYTH", brand);
            theme.Text(new Rect(120, centerY + 170, 480, 100), "Raise a civilization. Command heroes and beasts.\nReclaim the thrones of the gods.", theme.Heading);
            var panel = new Rect(ViewWidth - 594, Mathf.Max(50, centerY - 340), 514, 680);
            theme.Panel(panel);
            GUILayout.BeginArea(new Rect(panel.x + 30, panel.y + 24, panel.width - 60, panel.height - 48));
            GUILayout.Label("YOUR LEGEND BEGINS", theme.Eyebrow);
            GUILayout.Label("Enter your kingdom", theme.Title);
            GUILayout.Space(16); GUILayout.Label("Commander name", theme.Small);
            playerName = GUILayout.TextField(playerName, 24, GUILayout.Height(44));
            GUILayout.Space(16); GUILayout.Label("CHOOSE YOUR CIVILIZATION", theme.Eyebrow);
            civilization = GUILayout.SelectionGrid(civilization, civilizationNames, 3, GUILayout.Height(90));
            GUILayout.Space(10); GUILayout.Label(specialties[civilization], theme.Heading);
            GUILayout.Label("Civilizations share the same world and can join the same alliance.", theme.Body);
            GUILayout.Space(20); GUI.enabled = !joining && !string.IsNullOrWhiteSpace(playerName);
            if (GUILayout.Button(joining ? "Opening the gates…" : "Enter your kingdom", theme.Primary, GUILayout.Height(54))) StartCoroutine(Join());
            GUI.enabled = true;
            GUILayout.Label("Your saved local profile resumes your existing city.", theme.Small);
            GUILayout.Space(18); advancedConnection = GUILayout.Toggle(advancedConnection, "Connection settings");
            if (advancedConnection) { GUILayout.Label("Server address", theme.Small); serverUrl = GUILayout.TextField(serverUrl, 160, GUILayout.Height(38)); }
            if (status != previousToast || !string.IsNullOrEmpty(status)) GUILayout.Label(status, theme.Small);
            GUILayout.EndArea();
            theme.Text(new Rect(120, ViewHeight - 55, 600, 25), "WINDOWS PLAYTEST 0.6  ·  LOCAL KINGDOM SAVES", theme.Eyebrow);
        }
        private static string ShortNumber(int value) => value >= 1000000 ? (value / 1000000f).ToString("0.##") + "M" : value >= 10000 ? (value / 1000f).ToString("0.#") + "K" : value.ToString("N0");
        private void DrawTopHud()
        {
            var profile = new Rect(20, 18, 280, 88); theme.Panel(profile);
            theme.Circle(new Rect(31, 28, 64, 64), MythInterfaceTheme.Gold);
            theme.Circle(new Rect(34, 31, 58, 58), new Color(0.09f, 0.17f, 0.2f)); theme.Icon(new Rect(48, 44, 30, 30), "citadel", MythInterfaceTheme.Cream);
            if (me != null)
            {
                theme.Text(new Rect(108, 29, 180, 26), me.name, theme.Heading);
                theme.Text(new Rect(108, 57, 180, 38), me.ageName + " · Citadel " + me.cityLevel, theme.Small);
            }
            else theme.Text(new Rect(108, 36, 160, 40), "THRONES OF MYTH", theme.Heading);
            if (me != null)
            {
                string[] ids = { "food", "wood", "stone", "gold", "aether", "sigil" };
                string[] names = { "FOOD", "WOOD", "STONE", "GOLD", "AETHER", "SIGILS" };
                int[] values = { me.food, me.wood, me.stone, me.gold, me.aether, me.sigils };
                float width = Mathf.Min(144, (ViewWidth - 574) / 6 - 8);
                for (int i = 0; i < 6; i++)
                {
                    var rect = new Rect(318 + i * (width + 8), 25, width, 70); theme.Panel(rect, false, true);
                    theme.Icon(new Rect(rect.x + 10, rect.y + 21, 24, 24), ids[i], i == 4 ? new Color(0.7f, 0.6f, 0.95f) : MythInterfaceTheme.Gold);
                    theme.Text(new Rect(rect.x + 43, rect.y + 6, width - 47, 20), names[i], theme.Eyebrow);
                    theme.Text(new Rect(rect.x + 43, rect.y + 29, width - 47, 32), ShortNumber(values[i]), theme.Number);
                    if (GUI.Button(rect, new GUIContent("", values[i].ToString("N0") + " " + names[i].ToLowerInvariant()), GUIStyle.none))
                        OpenInterface(i == 5 ? InterfacePage.Temple : InterfacePage.Market);
                }
            }
            bool stale = Time.unscaledTime - lastSnapshotAt > 6;
            theme.Circle(new Rect(ViewWidth - 208, 39, 8, 8), stale ? MythInterfaceTheme.Red : MythInterfaceTheme.Teal);
            theme.Text(new Rect(ViewWidth - 191, 33, 120, 24), stale ? "RECONNECTING" : "KINGDOM ONLINE", theme.Small);
            if (theme.Button(new Rect(ViewWidth - 67, 31, 47, 46), "•••")) OpenInterface(InterfacePage.Settings);
        }
        private void DrawQuestHud()
        {
            if (theme.Button(new Rect(20, 132, 282, 32), compactHud ? "Show kingdom activity  +" : "KINGDOM ACTIVITY  −")) compactHud = !compactHud;
            if (compactHud) return;
            var panel = new Rect(20, 172, 282, 164); theme.Panel(panel);
            theme.Text(new Rect(36, 185, 240, 20), "CHAPTER I · A FOOTHOLD", theme.Eyebrow);
            theme.Text(new Rect(36, 213, 240, 28), me.questClaimed ? "A hero answers your call" : "Defeat the Forsaken", theme.Heading);
            theme.Text(new Rect(36, 246, 240, 27), me.questClaimed ? "Continue your city's restoration." : "Defeat 3 camps · " + Mathf.Min(3, me.kills) + "/3", theme.Small);
            theme.Bar(new Rect(36, 279, 154, 8), Mathf.Min(3, me.kills) / 3f, MythInterfaceTheme.Gold);
            if (theme.Button(new Rect(204, 274, 82, 38), me.questClaimed ? "Journal" : me.kills >= 3 ? "Claim" : "View", me.kills >= 3 && !me.questClaimed))
            {
                if (me.kills >= 3 && !me.questClaimed) Send("quest"); else OpenInterface(InterfacePage.Chronicle);
            }
            float y = 350;
            float jobHeight = Mathf.Min(65, Mathf.Max(46, (ViewHeight - 550) / 3));
            foreach (var job in new[] { me.construction, me.secondConstruction, me.research })
            {
                if (!HasJob(job)) continue;
                var r = new Rect(20, y, 282, jobHeight); theme.Panel(r, false, true);
                theme.Icon(new Rect(r.x + 12, r.y + 15, 26, 26), job.type == "research" ? "research" : "builders", MythInterfaceTheme.Gold);
                theme.Text(new Rect(r.x + 49, r.y + 7, 190, 23), JobName(job), theme.Small);
                theme.Bar(new Rect(r.x + 49, r.y + 39, 154, 6), 1 - job.remaining / job.duration, MythInterfaceTheme.Teal);
                theme.Text(new Rect(r.x + 211, r.y + 30, 55, 24), Mathf.CeilToInt(job.remaining) + "s", theme.Small);
                if (GUI.Button(r, GUIContent.none, GUIStyle.none)) OpenInterface(job.type == "research" ? InterfacePage.Research : InterfacePage.City);
                y += jobHeight + 8;
            }
        }
        private void DrawMarchHud()
        {
            var own = OwnMarches(); float x = ViewWidth - 202;
            float step = Mathf.Min(84, (ViewHeight - 450) / 5);
            theme.Text(new Rect(x, 128, 182, 24), "MARCHES  " + own.Count + "/" + me.marchSlots, theme.Eyebrow);
            for (int i = 0; i < 5; i++)
            {
                var r = new Rect(x, 160 + i * step, 182, step - 8);
                if (i < own.Count)
                {
                    var army = own[i]; theme.Panel(r, army.id == ActiveArmy.id);
                    var definition = Array.Find(world.commanders, h => h.id == army.commanderId);
                    theme.Portrait(new Rect(x + 10, r.y + 8, Mathf.Min(44, r.height - 16), Mathf.Min(44, r.height - 16)), army.commanderId, RarityColor(definition.color));
                    theme.Text(new Rect(x + 63, r.y + 7, 112, 22), HeroName(army.commanderId), theme.Small);
                    if (r.height > 60) theme.Text(new Rect(x + 63, r.y + 27, 112, 20), army.state, theme.Small);
                    theme.Bar(new Rect(x + 63, r.yMax - 18, 108, 5), (float)army.health / Mathf.Max(1, army.maxHealth), MythInterfaceTheme.Teal);
                    theme.Bar(new Rect(x + 63, r.yMax - 8, 108, 3), army.rage / 1000f, MythInterfaceTheme.Gold);
                    if (GUI.Button(r, new GUIContent("", "Select and focus " + HeroName(army.commanderId)), GUIStyle.none))
                    { activeMarchId = army.id; Select(army.id, "army"); cameraControl?.Focus(army.x, army.z); }
                }
                else
                {
                    bool unlocked = i < me.marchSlots; theme.Panel(r, false, true);
                    theme.Icon(new Rect(x + 15, r.y + (r.height - 25) / 2, 25, 25), unlocked ? "army" : "lock", unlocked ? MythInterfaceTheme.Gold : MythInterfaceTheme.Muted);
                    theme.Text(new Rect(x + 57, r.y + 5, 115, r.height - 10), unlocked ? "+ Deploy march\nReady reserves" : "March " + (i + 1) + "\nUnlock in Age " + (i + 1), theme.Small);
                    if (GUI.Button(r, GUIContent.none, GUIStyle.none)) OpenInterface(unlocked ? InterfacePage.Marches : InterfacePage.City);
                }
            }
        }
        private void DrawKingdomMinimap()
        {
            var r = MinimapRect; theme.Panel(r);
            theme.Text(new Rect(r.x + 14, r.y + 8, 184, 22), "THE MORTAL REALM", theme.Eyebrow);
            var mapArea = new Rect(r.x + 12, r.y + 35, r.width - 24, r.height - 49);
            MythInterfaceTheme.Fill(mapArea, new Color(0.23f, 0.33f, 0.29f));
            MythInterfaceTheme.Line(new Vector2(mapArea.center.x, mapArea.y), new Vector2(mapArea.center.x, mapArea.yMax), 1, new Color(0.7f, 0.6f, 0.35f, 0.55f));
            MythInterfaceTheme.Line(new Vector2(mapArea.x, mapArea.center.y), new Vector2(mapArea.xMax, mapArea.center.y), 1, new Color(0.7f, 0.6f, 0.35f, 0.55f));
            foreach (var site in world.sites) Dot(mapArea, site.x, site.z, new Color(0.85f, 0.72f, 0.95f), 5);
            foreach (var army in world.armies) Dot(mapArea, army.x, army.z, army.ownerId == playerId ? MythInterfaceTheme.Teal : MythInterfaceTheme.Gold, army.id == ActiveArmy.id ? 6 : 3);
            Dot(mapArea, me.homeX, me.homeZ, Color.white, 5);
            if (Event.current.type == EventType.MouseDown && mapArea.Contains(Event.current.mousePosition))
            { cameraControl?.Focus((Event.current.mousePosition.x - mapArea.x) / mapArea.width * 80, (1 - (Event.current.mousePosition.y - mapArea.y) / mapArea.height) * 80); Event.current.Use(); }
        }
        private void DrawBottomNavigation()
        {
            string[] labels = { "CITY", "COMMANDERS", "ALLIANCE", "TEMPLE", "CHRONICLE" };
            string[] icons = { "city", "heroes", "alliance", "temple", "chronicle" };
            InterfacePage[] pages = { InterfacePage.City, InterfacePage.Heroes, InterfacePage.Alliance, InterfacePage.Temple, InterfacePage.Chronicle };
            float width = 123, start = ViewWidth / 2 - (width * 5 + 8 * 4) / 2;
            for (int i = 0; i < labels.Length; i++)
            {
                var r = new Rect(start + i * (width + 8), ViewHeight - 88, width, 70); theme.Panel(r, interfacePage == pages[i]);
                theme.Icon(new Rect(r.center.x - 12, r.y + 10, 24, 24), icons[i], interfacePage == pages[i] ? MythInterfaceTheme.Cream : MythInterfaceTheme.Gold);
                theme.Text(new Rect(r.x + 2, r.y + 41, width - 4, 23), labels[i], theme.Center);
                if (GUI.Button(r, GUIContent.none, GUIStyle.none)) { if (interfacePage != pages[i]) OpenInterface(pages[i]); }
            }
            if (interfacePage == InterfacePage.World) theme.Text(new Rect(20, ViewHeight - 44, 380, 26), "WASD pan · Wheel zoom · Right-click orders", theme.Small);
        }
        private void DrawInterfaceToast()
        {
            if (status != previousToast) { previousToast = status; toastUntil = Time.unscaledTime + 5; }
            string message = world.persistence != null && !string.IsNullOrEmpty(world.persistence.error) ? world.persistence.error
                : Time.unscaledTime - lastSnapshotAt > 6 ? "Connection interrupted. Retrying your kingdom server…"
                : placeBeacon ? "PLACE BEACON · Click near the selected march. Esc cancels." : Time.unscaledTime < toastUntil ? status : "";
            if (string.IsNullOrEmpty(message)) return;
            var r = new Rect((ViewWidth - 660) / 2, 112, 660, 46); theme.Panel(r);
            theme.Text(new Rect(r.x + 16, r.y + 9, r.width - 32, 30), message, theme.Center);
        }
        private void DrawInterfaceWindow()
        {
            MythInterfaceTheme.Fill(new Rect(0, 112, ViewWidth, ViewHeight - 212), new Color(0.015f, 0.03f, 0.045f, 0.72f));
            var r = WindowRect; theme.Panel(r);
            string title = interfacePage == InterfacePage.City ? "Your civilization" : interfacePage == InterfacePage.Heroes ? "Hall of Commanders" : interfacePage == InterfacePage.Temple ? "Temple of Echoes" : interfacePage == InterfacePage.Marches ? "March command" : interfacePage.ToString();
            theme.Text(new Rect(r.x + 25, r.y + 16, 650, 38), title, theme.Title);
            theme.Text(new Rect(r.xMax - 300, r.y + 26, 220, 22), "Your kingdom continues in real time", theme.Small);
            if (theme.Button(new Rect(r.xMax - 57, r.y + 14, 38, 38), "×")) { CloseInterface(); return; }
            var inner = new Rect(r.x + 20, r.y + 70, r.width - 40, r.height - 90);
            if (interfacePage == InterfacePage.City) RenderCityWindow(inner);
            else if (interfacePage == InterfacePage.Heroes) RenderHeroesWindow(inner);
            else if (interfacePage == InterfacePage.Temple) RenderTempleWindow(inner);
            else if (interfacePage == InterfacePage.Research) RenderResearchWindow(inner);
            else if (interfacePage == InterfacePage.Settings) RenderSettingsWindow(inner);
            else RenderActivityWindow(inner);
            if (placeBeacon) interfacePage = InterfacePage.World;
        }
        private void RenderActivityWindow(Rect r)
        {
            var left = new Rect(r.x, r.y, 202, r.height), main = new Rect(r.x + 222, r.y, r.width - 222, r.height);
            theme.Panel(left, false, true);
            var pages = new[] { InterfacePage.Marches, InterfacePage.Training, InterfacePage.Research, InterfacePage.Forge, InterfacePage.Market, InterfacePage.Alliance, InterfacePage.Chronicle };
            for (int i = 0; i < pages.Length; i++)
                if (theme.Button(new Rect(left.x + 12, left.y + 16 + i * 51, left.width - 24, 42), pages[i] == InterfacePage.Marches ? "Marches & reserves" : pages[i].ToString(), interfacePage == pages[i])) { if (interfacePage != pages[i]) OpenInterface(pages[i]); }
            theme.Panel(main, false, true);
            GUILayout.BeginArea(new Rect(main.x + 20, main.y + 12, main.width - 40, main.height - 24));
            contentScroll = GUILayout.BeginScrollView(contentScroll);
            if (interfacePage == InterfacePage.Marches) DrawArmy();
            if (interfacePage == InterfacePage.Training) DrawTraining();
            if (interfacePage == InterfacePage.Forge) DrawForge();
            if (interfacePage == InterfacePage.Market) DrawMarket();
            if (interfacePage == InterfacePage.Alliance) DrawAlliance();
            if (interfacePage == InterfacePage.Chronicle) DrawJournal();
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        private void DrawMarchRoute()
        {
            if (ActiveArmy == null || !ActiveArmy.hasOrder || Camera.main == null) return;
            var from = Camera.main.WorldToScreenPoint(new Vector3(ActiveArmy.x, 0.3f, ActiveArmy.z));
            var to = Camera.main.WorldToScreenPoint(new Vector3(ActiveArmy.targetX, 0.3f, ActiveArmy.targetZ));
            if (from.z <= 0 || to.z <= 0 || Vector2.Distance(new Vector2(from.x, from.y), new Vector2(to.x, to.y)) < 4) return;
            MythInterfaceTheme.Line(new Vector2(from.x, Screen.height - from.y), new Vector2(to.x, Screen.height - to.y), 2, new Color(0.92f, 0.78f, 0.39f, 0.7f));
        }
    }
}
