using System;
using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private int inspectedTechnology;
        private CityDiorama cityDiorama;
        private readonly CityProgressFeedback cityProgress=new CityProgressFeedback();
        private bool cityModelView = true;
        private CommanderPreview commanderPreview;
        private bool showCommanderModel;
        private void RenderCityWindow(Rect r)
        {
            string[] labels = { "Training", "Hospital", "Athenaeum", "Temple", "Forge", "Market" };
            InterfacePage[] destinations = { InterfacePage.Training, InterfacePage.Hospital, InterfacePage.Research, InterfacePage.Temple, InterfacePage.Forge, InterfacePage.Market };
            float shortcutWidth = (r.width - (labels.Length - 1) * 8) / labels.Length;
            for (int i = 0; i < labels.Length; i++) if (theme.Button(new Rect(r.x + i * (shortcutWidth + 8), r.y, shortcutWidth, 40), labels[i])) OpenInterface(destinations[i]);
            var grid = new Rect(r.x, r.y + 56, r.width - 368, r.height - 56);
            var detail = new Rect(r.xMax - 348, r.y + 56, 348, r.height - 56);
            theme.Panel(grid, false, true); theme.Panel(detail, false, true);
            if(theme.Button(new Rect(grid.x+10,grid.y+8,150,28),"Living city",cityModelView))cityModelView=true;
            if(theme.Button(new Rect(grid.x+168,grid.y+8,150,28),"District list",!cityModelView))cityModelView=false;
            if(cityModelView)
            {
                if(cityDiorama==null)cityDiorama=new CityDiorama();
                int before=selectedBuilding;selectedBuilding=cityDiorama.Draw(new Rect(grid.x,grid.y+42,grid.width,grid.height-42),me,selectedBuilding,theme,reducedMotion,cityProgress);
                if(before!=selectedBuilding)contentScroll=Vector2.zero;
            }
            else
            {
                int columns = grid.width < 650 ? 3 : 4;
                float width = (grid.width - 34) / columns;
                float contentHeight = Mathf.Ceil(me.cityBuildings.Length / (float)columns) * 132 + 14;
                rosterScroll = GUI.BeginScrollView(new Rect(grid.x + 8, grid.y + 44, grid.width - 16, grid.height - 52), rosterScroll, new Rect(0, 0, grid.width - 30, contentHeight));
                for (int i = 0; i < me.cityBuildings.Length; i++)
                {
                    var building = me.cityBuildings[i];
                    var cell = new Rect(8 + (i % columns) * width, 6 + (i / columns) * 132, width - 10, 120);
                    theme.Panel(cell, selectedBuilding == i);
                    Color color = building.level > 0 ? MythInterfaceTheme.Gold : MythInterfaceTheme.Muted;
                    theme.Icon(new Rect(cell.center.x - 17, cell.y + 12, 34, 34), building.id, color);
                    var name = new GUIStyle(theme.Center) { fontSize = 14 };
                    theme.Text(new Rect(cell.x + 7, cell.y + 52, cell.width - 14, 40), building.name, name);
                    theme.Text(new Rect(cell.x + 8, cell.y + 93, cell.width - 16, 22), building.level > 0 ? "LEVEL " + building.level + " / " + building.maxLevel : "FOUNDATION", theme.Eyebrow);
                    if (GUI.Button(cell, new GUIContent("", building.description), GUIStyle.none)) { selectedBuilding = i; contentScroll = Vector2.zero; }
                }
                GUI.EndScrollView();
            }
            selectedBuilding = Mathf.Clamp(selectedBuilding, 0, me.cityBuildings.Length - 1);
            var selected = me.cityBuildings[selectedBuilding];
            GUILayout.BeginArea(new Rect(detail.x + 18, detail.y + 14, detail.width - 36, detail.height - 28));
            contentScroll = GUILayout.BeginScrollView(contentScroll);
            GUILayout.Label(selected.category.ToUpperInvariant(), theme.Eyebrow);
            GUILayout.Label(selected.name, theme.Title);
            GUILayout.Label("Level " + selected.level + " / " + selected.maxLevel, theme.Heading);
            GUILayout.Space(10); GUILayout.Label(selected.description, theme.Body);
            if (selected.level < selected.maxLevel)
            {
                GUILayout.Space(16); GUILayout.Label("NEXT DEVELOPMENT", theme.Eyebrow);
                GUILayout.Label(Cost(selected.nextCost), theme.Body);
                GUILayout.Label("Build time · " + Mathf.CeilToInt(selected.nextDuration) + " seconds", theme.Small);
                GUI.enabled = selected.canUpgrade && !processing;
                if (GUILayout.Button(selected.level == 0 ? "Lay the foundation" : "Upgrade to level " + (selected.level + 1), theme.Primary, GUILayout.Height(44))) Send("building-upgrade", selected.id);
                GUI.enabled = true;
                if (!selected.canUpgrade) GUILayout.Label(selected.lockedReason, theme.Small);
            }
            GUILayout.Space(18); DrawConstructionJobs();
            GUILayout.Space(12); GUILayout.Label("Production rests at " + me.passiveLimit.ToString("N0") + " of each resource. Gathering and rewards can exceed this limit.", theme.Small);
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        private void RenderHeroesWindow(Rect r)
        {
            var roster = new Rect(r.x, r.y, 348, r.height); var detail = new Rect(r.x + 366, r.y, r.width - 366, r.height);
            theme.Panel(roster, false, true); theme.Panel(detail, false, true);
            heroSearch = GUI.TextField(new Rect(roster.x + 14, roster.y + 14, roster.width - 28, 38), heroSearch, 32);
            if (string.IsNullOrEmpty(heroSearch)) theme.Text(new Rect(roster.x + 27, roster.y + 22, roster.width - 52, 24), "Search commanders…", theme.Small);
            string[] filters = { "ALL", "COMMON", "RARE", "EPIC", "LEGEND" };
            for (int i = 0; i < filters.Length; i++)
                if (GUI.Toggle(new Rect(roster.x + 12 + i * 64, roster.y + 62, 60, 30), heroFilter == i, filters[i], theme.Tab) && heroFilter != i) { heroFilter = i; rosterScroll = Vector2.zero; }
            onlyOwnedHeroes = GUI.Toggle(new Rect(roster.x + 15, roster.y + 103, 300, 27), onlyOwnedHeroes, "Recruited commanders only");
            var heroes = new List<CommanderData>();
            foreach (var hero in world.commanders)
            {
                bool owned = Array.IndexOf(me.ownedCommanders, hero.id) >= 0;
                if (onlyOwnedHeroes && !owned) continue;
                if (!string.IsNullOrEmpty(heroSearch) && hero.name.IndexOf(heroSearch, StringComparison.OrdinalIgnoreCase) < 0) continue;
                if (heroFilter != 0 && hero.rarity != new[] { "", "Common", "Rare", "Epic", "Legendary" }[heroFilter]) continue;
                heroes.Add(hero);
            }
            var list = new Rect(roster.x + 10, roster.y + 140, roster.width - 20, roster.height - 150);
            rosterScroll = GUI.BeginScrollView(list, rosterScroll, new Rect(0, 0, list.width - 15, Mathf.Ceil(heroes.Count / 2f) * 164 + 8));
            for (int i = 0; i < heroes.Count; i++)
            {
                var hero = heroes[i]; var cell = new Rect(5 + (i % 2) * 153, (i / 2) * 164, 143, 154);
                bool owned = Array.IndexOf(me.ownedCommanders, hero.id) >= 0;
                theme.Panel(cell, inspectedHeroId == hero.id);
                theme.Portrait(new Rect(cell.center.x - 30, cell.y + 12, 60, 60), hero.id, RarityColor(hero.color));
                theme.Text(new Rect(cell.x + 6, cell.y + 78, cell.width - 12, 46), hero.name, theme.Center);
                theme.Text(new Rect(cell.x + 9, cell.y + 130, cell.width - 18, 20), owned ? hero.rarity.ToUpperInvariant() : "NOT RECRUITED", theme.Eyebrow);
                if (GUI.Button(cell, GUIContent.none, GUIStyle.none)) { inspectedHeroId = hero.id; contentScroll = Vector2.zero; }
            }
            GUI.EndScrollView();
            var selected = Array.Find(world.commanders, h => h.id == inspectedHeroId) ?? world.commanders[0];
            var progress = Array.Find(me.heroProgress, h => h.id == selected.id);
            bool recruited = Array.IndexOf(me.ownedCommanders, selected.id) >= 0;
            var portrait = new Rect(detail.x + 24, detail.y + 22, 156, 208);
            if (showCommanderModel)
            {
                if (commanderPreview == null) commanderPreview = new CommanderPreview();
                commanderPreview.Draw(portrait, selected, theme, reducedMotion);
            }
            else theme.PortraitCard(portrait, selected.id, RarityColor(selected.color));
            if (theme.Button(new Rect(detail.x + 24, detail.y + 237, 156, 27), showCommanderModel ? "Painted portrait" : "Animation preview")) showCommanderModel = !showCommanderModel;
            theme.Text(new Rect(detail.x + 205, detail.y + 20, detail.width - 229, 22), selected.rarity.ToUpperInvariant() + " COMMANDER", theme.Eyebrow);
            theme.Text(new Rect(detail.x + 205, detail.y + 50, detail.width - 229, 42), selected.name, theme.Title);
            theme.Text(new Rect(detail.x + 205, detail.y + 98, detail.width - 229, 54), selected.description, theme.Body);
            if (progress != null)
            {
                theme.Text(new Rect(detail.x + 205, detail.y + 159, detail.width - 229, 25), recruited ? "STARS  " + progress.stars + "    ·    ASCENSION  " + progress.rank : "A legend waiting to be remembered", theme.Eyebrow);
            }
            var actions = new Rect(detail.x + 205, detail.y + 191, detail.width - 229, 42);
            if (!recruited)
            {
                if (theme.Button(actions, "Recruit · " + selected.cost.ToString("N0") + " gold", true, me.gold >= selected.cost && !processing)) Send("unlock-commander", selected.id);
            }
            else
            {
                string action = ActiveArmy.commanderId == selected.id ? "Leading selected march" : AssignedElsewhere(selected.id) ? "Assigned to another march" : CanEditArmy ? "Assign to selected march" : "Return selected march home to assign";
                if (theme.Button(actions, action, true, CanEditArmy && ActiveArmy.commanderId != selected.id && !AssignedElsewhere(selected.id) && !processing)) Send("commander", selected.id);
            }
            GUILayout.BeginArea(new Rect(detail.x + 24, detail.y + 278, detail.width - 48, detail.height - 293));
            contentScroll = GUILayout.BeginScrollView(contentScroll);
            if (recruited && progress != null)
            {
                DrawHeroSkills(selected, progress);
                GUILayout.Space(18); GUILayout.Label("ASCENSION · RANK " + progress.rank + " / 5", theme.Eyebrow);
                GUILayout.Label("Each ascension rank adds 3% damage and 2% maximum health. Ascension is separate from stars and skills.", theme.Small);
                GUI.enabled = progress.rank < 5 && progress.shards >= progress.nextShards && me.gold >= progress.nextGold && !processing;
                if (GUILayout.Button("Ascend · " + progress.nextShards + " Echo Shards / " + progress.nextGold + " gold", theme.Primary)) Send("upgrade-commander", selected.id);
                GUI.enabled = true;
            }
            else
            {
                GUILayout.Label("SIGNATURE & PASSIVES", theme.Eyebrow);
                if (progress != null) foreach (var skill in progress.skills) { GUILayout.Label(skill.name, theme.Heading); GUILayout.Label(skill.description, theme.Body); }
                GUILayout.Space(12); GUILayout.Label("Recruit this commander to develop its individual experience, stars and skills.", theme.Small);
            }
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        private void RenderTempleWindow(Rect r)
        {
            var stage = new Rect(r.x, r.y, r.width - 474, r.height); var information = new Rect(r.xMax - 454, r.y, 454, r.height);
            theme.Panel(stage, true);
            theme.Backdrop(new Rect(stage.x + 4, stage.y + 4, stage.width - 8, stage.height - 8), 0.48f);
            MythInterfaceTheme.Fill(new Rect(stage.x + 4, stage.y + 4, stage.width - 8, stage.height - 8), new Color(0.02f, 0.06f, 0.09f, 0.48f));
            theme.Panel(information, false, true);
            theme.Text(new Rect(stage.x + 24, stage.y + 19, stage.width - 48, 22), "WHERE LEGENDS ANSWER", theme.Eyebrow);
            theme.Text(new Rect(stage.x + 24, stage.y + 50, stage.width - 48, 48), "Invoke a remembered hero", theme.Title);
            DrawResult latest = me.summonHistory.Length > 0 ? me.summonHistory[0] : null;
            float size = Mathf.Clamp(stage.height - 350, 80, 250);
            var orbit = new Rect(stage.center.x - size / 2, stage.y + 118, size, size);
            theme.Circle(new Rect(orbit.x - 15, orbit.y - 15, size + 30, size + 30), new Color(0.32f, 0.28f, 0.18f));
            theme.Circle(new Rect(orbit.x - 12, orbit.y - 12, size + 24, size + 24), new Color(0.055f, 0.11f, 0.15f));
            bool revealing = !reducedMotion && Time.unscaledTime < revealUntil;
            for (int i = 0; i < 8; i++)
            {
                float angle = (i * 45 + (revealing ? Time.unscaledTime * 35 : 0)) * Mathf.Deg2Rad;
                var position = orbit.center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * (size / 2 + 19);
                theme.Diamond(new Rect(position.x - 5, position.y - 5, 10, 10), MythInterfaceTheme.Gold);
            }
            if (latest != null && !revealing)
            {
                var definition = Array.Find(world.commanders, h => h.id == latest.commanderId);
                theme.Portrait(orbit, definition.id, RarityColor(definition.color));
            }
            else theme.Icon(new Rect(orbit.x + size * 0.2f, orbit.y + size * 0.2f, size * 0.6f, size * 0.6f), "temple", MythInterfaceTheme.Gold);
            string resultName = revealing ? "The veil parts…" : latest == null ? "A legend awaits" : HeroName(latest.commanderId);
            theme.Text(new Rect(stage.x + 20, orbit.yMax + 26, stage.width - 40, 38), resultName, theme.Center);
            theme.Text(new Rect(stage.x + 20, orbit.yMax + 65, stage.width - 40, 38), revealing ? "An echo crosses the threshold" : latest == null ? "Use Oracle Sigils earned in your kingdom" : latest.rarity + (latest.duplicate ? " · +" + latest.shards + " commander Echo Shards" : " · NEW COMMANDER"), theme.Small);
            bool ready = BuildingLevel("oracle") > 0 && !processing && !revealing;
            float buttonWidth = (stage.width - 62) / 2;
            if (theme.Button(new Rect(stage.x + 24, stage.yMax - 105, buttonWidth, 52), "INVOKE ONE\n1 Oracle Sigil", true, ready && me.sigils >= 1)) Send(new GameCommand { type = "summon", count = 1 });
            if (theme.Button(new Rect(stage.x + 38 + buttonWidth, stage.yMax - 105, buttonWidth, 52), "INVOKE TEN\n10 Oracle Sigils", true, ready && me.sigils >= 10)) Send(new GameCommand { type = "summon", count = 10 });
            theme.Text(new Rect(stage.x + 24, stage.yMax - 42, stage.width - 48, 28), "ORACLE SIGILS  " + me.sigils + "   ·   Base odds and guarantees shown alongside", theme.Small);
            GUILayout.BeginArea(new Rect(information.x + 20, information.y + 14, information.width - 40, information.height - 28));
            contentScroll = GUILayout.BeginScrollView(contentScroll);
            GUILayout.Label("THE ORACLE'S COVENANT", theme.Eyebrow);
            if (BuildingLevel("oracle") == 0)
            {
                GUILayout.Label("Build the Temple of Echoes in your city before invoking a hero.", theme.Body);
                if (GUILayout.Button("Go to city foundations", theme.Primary)) OpenInterface(InterfacePage.City);
            }
            GUILayout.Label("Epic or better within " + (world.summonRules.epicPity - me.epicPity) + " invocations", theme.Heading);
            GUILayout.Label("Legendary within " + (world.summonRules.legendaryPity - me.legendaryPity), theme.Heading);
            GUILayout.Label("Qualifying results reset the relevant counter. Guarantees carry across ten-pulls and game restarts.", theme.Small);
            GUILayout.Space(14); GUILayout.Label("BASE SUMMON ODDS", theme.Eyebrow);
            GUILayout.Label($"Common {world.summonRules.common:P0}   ·   Rare {world.summonRules.rare:P0}\nEpic {world.summonRules.epic:P0}   ·   Legendary {world.summonRules.legendary:P0}", theme.Body);
            GUILayout.Label($"Commanders are equally likely within a rarity. At the Epic guarantee: {1 - world.summonRules.legendary:P0} Epic / {world.summonRules.legendary:P0} Legendary. Legendary guarantee: 100% Legendary. Temple levels do not alter odds.", theme.Small);
            GUILayout.Space(12); GUI.enabled = ready && me.offeringAvailable;
            if (GUILayout.Button("Free offering · " + me.offeringAmount + " sigil(s)", theme.Primary)) Send("temple-offering");
            GUI.enabled = ready && Afford(me.sealCost);
            if (GUILayout.Button("Exchange for 1 sigil · " + Cost(me.sealCost))) Send("buy-sigil");
            GUI.enabled = true;
            GUILayout.Label("Free offering resets at 00:00 UTC. Invoking never converts your gold automatically.", theme.Small);
            GUILayout.Space(16); GUILayout.Label("RECENT ECHOES", theme.Eyebrow);
            foreach (var draw in me.summonHistory)
                GUILayout.Label("#" + draw.number + " · " + HeroName(draw.commanderId) + (draw.duplicate ? " · +" + draw.shards + " shards" : " · new commander"), theme.Small);
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        private void RenderResearchWindow(Rect r)
        {
            var diagram = new Rect(r.x, r.y, r.width - 370, r.height); var detail = new Rect(r.xMax - 350, r.y, 350, r.height);
            theme.Panel(diagram, false, true); theme.Panel(detail, false, true);
            theme.Text(new Rect(diagram.x + 20, diagram.y + 12, diagram.width - 40, 26), "ATHENAEUM OF AGES", theme.Eyebrow);
            var positions = new Dictionary<string, Vector2Int> { { "harvest", new Vector2Int(0, 0) }, { "masonry", new Vector2Int(1, 0) }, { "writing", new Vector2Int(1, 1) }, { "logistics", new Vector2Int(0, 2) }, { "march", new Vector2Int(1, 2) }, { "drill", new Vector2Int(0, 3) }, { "vitality", new Vector2Int(1, 3) }, { "beastlore", new Vector2Int(2, 3) }, { "veterans",new Vector2Int(0,4) } };
            float step = (diagram.width - 34) / 3, cardWidth = step - 18;
            var viewport = new Rect(diagram.x + 12, diagram.y + 48, diagram.width - 24, diagram.height - 60);
            rosterScroll = GUI.BeginScrollView(viewport, rosterScroll, new Rect(0, 0, diagram.width - 42, 610));
            foreach (var technology in me.researchOptions)
            {
                if (string.IsNullOrEmpty(technology.prerequisite) || !positions.ContainsKey(technology.prerequisite) || !positions.ContainsKey(technology.id)) continue;
                var parent = positions[technology.prerequisite]; var child = positions[technology.id];
                MythInterfaceTheme.Line(new Vector2(parent.x * step + cardWidth, parent.y * 120 + 52), new Vector2(child.x * step, child.y * 120 + 52), 2, new Color(0.4f, 0.44f, 0.34f));
            }
            for (int i = 0; i < me.researchOptions.Length; i++)
            {
                var technology = me.researchOptions[i]; var position = positions.ContainsKey(technology.id) ? positions[technology.id] : new Vector2Int(i % 3, i / 3);
                var cell = new Rect(position.x * step + 2, position.y * 120 + 3, cardWidth, 104);
                theme.Panel(cell, i == inspectedTechnology);
                theme.Text(new Rect(cell.x + 10, cell.y + 7, cell.width - 20, 20), technology.branch.ToUpperInvariant(), theme.Eyebrow);
                theme.Text(new Rect(cell.x + 10, cell.y + 30, cell.width - 20, 43), technology.name, theme.Body);
                theme.Text(new Rect(cell.x + 10, cell.y + 77, cell.width - 20, 20), technology.level + " / " + technology.maxLevel + (technology.canResearch ? " · READY" : ""), theme.Small);
                if (GUI.Button(cell, GUIContent.none, GUIStyle.none)) { inspectedTechnology = i; contentScroll = Vector2.zero; }
            }
            GUI.EndScrollView();
            inspectedTechnology = Mathf.Clamp(inspectedTechnology, 0, me.researchOptions.Length - 1); var selected = me.researchOptions[inspectedTechnology];
            GUILayout.BeginArea(new Rect(detail.x + 20, detail.y + 16, detail.width - 40, detail.height - 32));
            contentScroll = GUILayout.BeginScrollView(contentScroll);
            GUILayout.Label(selected.branch.ToUpperInvariant(), theme.Eyebrow); GUILayout.Label(selected.name, theme.Title);
            GUILayout.Label("Rank " + selected.level + " / " + selected.maxLevel, theme.Heading); GUILayout.Space(12);
            GUILayout.Label(selected.description, theme.Body); GUILayout.Space(16);
            if (selected.level < selected.maxLevel)
            {
                GUILayout.Label(Cost(selected.cost), theme.Body); GUILayout.Label(Mathf.CeilToInt(selected.duration) + " seconds", theme.Small);
                GUI.enabled = selected.canResearch && !processing;
                if (GUILayout.Button("Research next rank", theme.Primary, GUILayout.Height(46))) Send("research", selected.id);
                GUI.enabled = true; if (!selected.canResearch) GUILayout.Label(selected.lockedReason, theme.Small);
            }
            if (HasJob(me.research)) { GUILayout.Space(18); DrawJob(me.research, JobName(me.research), false); }
            GUILayout.Label("Research continues independently of city construction and troop training.", theme.Small);
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        private void RenderSettingsWindow(Rect r)
        {
            GUILayout.BeginArea(new Rect(r.x + 34, r.y + 20, Mathf.Min(720, r.width - 68), r.height - 40));
            contentScroll = GUILayout.BeginScrollView(contentScroll);
            GUILayout.Label("INTERFACE", theme.Eyebrow); GUILayout.Label("Make the realm yours", theme.Title);
            GUILayout.Space(18); GUILayout.Label("Interface size · " + Mathf.RoundToInt(interfaceScalePreference * 100) + "%", theme.Heading);
            float scale = GUILayout.HorizontalSlider(interfaceScalePreference, 0.85f, 1.15f, GUILayout.Width(400));
            if (Mathf.Abs(scale - interfaceScalePreference) > 0.005f) { interfaceScalePreference = scale; PlayerPrefs.SetFloat("ThronesOfMyth.uiScale", scale); }
            labelsEnabled = GUILayout.Toggle(labelsEnabled, "Show world names and health bars");
            PlayerPrefs.SetInt("ThronesOfMyth.labels", labelsEnabled ? 1 : 0);
            reducedMotion = GUILayout.Toggle(reducedMotion, "Reduced motion · still portraits, banners and troop poses");
            PlayerPrefs.SetInt("ThronesOfMyth.reducedMotion", reducedMotion ? 1 : 0);
            BattlefieldFeedback.Enabled=GUILayout.Toggle(BattlefieldFeedback.Enabled,"Battlefield particles · impacts, dust and skill accents");
            bool ambient=GUILayout.Toggle(PlayerPrefs.GetInt("ThronesOfMyth.cityAmbience",1)==1,"City ambience");PlayerPrefs.SetInt("ThronesOfMyth.cityAmbience",ambient?1:0);
            GUILayout.Label("Battlefield sound effects · " + Mathf.RoundToInt(BattlefieldAudio.Volume * 100) + "%", theme.Small);
            BattlefieldAudio.Volume = GUILayout.HorizontalSlider(BattlefieldAudio.Volume, 0, 1, GUILayout.Width(400));
            GUILayout.Space(20);
            if(pendingOrder!=null&&string.IsNullOrEmpty(pendingOrder.key))
            {
                GUILayout.Label("Check your city and queues before clearing the unreadable last-order record. Clearing it cannot undo an accepted order.",theme.Small);
                if(GUILayout.Button("I checked my city · clear unreadable record",GUILayout.Height(36)))ClearPendingOrder(pendingOrder);
            }
            if(GUILayout.Button("Account and recovery",GUILayout.Height(36)))OpenAccount();
            if(GUILayout.Button("Kingdom power rankings",GUILayout.Height(36)))OpenInterface(InterfacePage.Rankings);
            GUILayout.Label("COMMAND YOUR KINGDOM", theme.Eyebrow);
            GUILayout.Label("WASD / arrows · Pan the map\nMouse wheel · Zoom\nMiddle mouse drag · Pan\nLeft-click · Inspect or select\nRight-click · March or act on a target\n1–5 · Select your march\nC · City    K · Commanders    L · Alliance\nH · Focus home    Space · Focus selected march\nR · Return selected march    Esc · Close / cancel", theme.Body);
            GUILayout.Space(18); GUILayout.Label("Connected to " + serverUrl, theme.Small);
            GUILayout.Label(world.persistence != null && world.persistence.enabled ? world.persistence.backend=="sqlite"?"SQLite kingdom · progress saves on the server; downtime job recovery is enabled.":"Local JSON kingdom · progress saves on this PC." : "This server is not saving world progress.", theme.Small);
            if (GUILayout.Button("Restore interface defaults", GUILayout.Width(300))) { interfaceScalePreference = 1; labelsEnabled = true; reducedMotion = false; PlayerPrefs.SetInt("ThronesOfMyth.reducedMotion", 0); PlayerPrefs.SetFloat("ThronesOfMyth.uiScale", 1); PlayerPrefs.SetInt("ThronesOfMyth.labels", 1); }
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        private void DrawContextActions()
        {
            if (string.IsNullOrEmpty(selectedId)) return;
            var r = ContextRect; string title = "", subtitle = "", action = "", emblem = "army"; float health = -1;
            Action perform = null; bool enabled = !processing;
            var boss = Array.Find(world.strongholds, t => t.id == selectedId);
            var camp = Array.Find(world.camps, c => c.id == selectedId);
            var node = Array.Find(world.nodes, n => n.id == selectedId);
            var site = Array.Find(world.sites, s => s.id == selectedId);
            var army = Array.Find(world.armies, a => a.id == selectedId);
            var beacon = Array.Find(world.flags, f => f.id == selectedId);
            var pin = Array.Find(world.markers, m => m.id == selectedId);
            var city = Array.Find(world.players, p => "city-" + p.id == selectedId);
            if (boss != null)
            {
                title = boss.name + " · Tier " + boss.tier; subtitle = boss.respawn > 0 ? "REFORMS IN " + Mathf.CeilToInt(boss.respawn) + "s" : "RALLY ONLY · " + Mathf.CeilToInt(boss.guardHealth) + " DEFENDER HP · " + Mathf.CeilToInt(boss.health) + " WALL HP";
                health = boss.health / Mathf.Max(1, boss.maxHealth); action = boss.respawn > 0 ? "Reforming" : "Plan alliance rally"; enabled &= boss.respawn <= 0; perform = () => OpenWarfare(boss.id);
            }
            else if (camp != null)
            {
                title = camp.name; subtitle = "LEVEL " + camp.level + " · " + camp.health + " / " + camp.maxHealth + " HEALTH"; health = (float)camp.health / camp.maxHealth;
                action = camp.health > 0 ? "March & attack" : "Returns in " + camp.respawn + "s"; enabled &= camp.health > 0;
                perform = () => Send("attack", camp.id);
            }
            else if (node != null)
            {
                title = node.name; subtitle = node.remaining.ToString("N0") + " " + node.resource.ToUpperInvariant() + " AVAILABLE"; emblem = node.resource;
                action = node.remaining > 0 ? "March & gather" : "Replenishing"; enabled &= node.remaining > 0; perform = () => Send("gather", node.id);
            }
            else if (site != null)
            {
                title = site.name; subtitle = "HELD BY · " + AllianceName(site.allianceId); emblem = "temple";
                bool routeOpen = (site.x <= 40 || Array.Exists(world.sites, s => s.id == "gate-east" && !string.IsNullOrEmpty(me.allianceId) && s.allianceId == me.allianceId)) && (site.z <= 40 || Array.Exists(world.sites, s => s.id == "gate-north" && !string.IsNullOrEmpty(me.allianceId) && s.allianceId == me.allianceId));
                bool connected = Array.Exists(world.flags, f => f.allianceId == me.allianceId && f.connected && f.buildRemaining <= 0 && Vector2.Distance(new Vector2(f.x, f.z), new Vector2(site.x, site.z)) <= 12);
                health = site.health / Mathf.Max(1, site.maxHealth);
                bool own = !string.IsNullOrEmpty(me.allianceId) && site.allianceId == me.allianceId;
                bool hostile = !string.IsNullOrEmpty(site.allianceId) && !own;
                action = string.IsNullOrEmpty(me.allianceId) ? "Join an alliance" : hostile ? "Plan rally" : own ? "Garrison / defend" : !routeOpen ? "Plan a route" : !connected ? "Extend territory" : "March & capture";
                perform = () => { if (string.IsNullOrEmpty(me.allianceId) || (!hostile && !own && (!connected || !routeOpen))) OpenInterface(InterfacePage.Alliance); else if (hostile || own) OpenWarfare(site.id); else Send("capture", site.id); };
                if (site.unknown) { subtitle = "UNSURVEYED LANDMARK · SEND A SCOUT"; action = "Scout this area"; perform = () => ScoutAt(site.x, site.z); health = -1; }
                if (site.locked) { subtitle = "SEALED BY THE KINGDOM CHRONICLE"; action = "View opening milestone"; perform = () => GuidePage(InterfacePage.Kingdom); health = -1; }
            }
            else if (beacon != null)
            {
                title = beacon.isRoot ? "Alliance Fort" : "Alliance Beacon"; emblem = "alliance"; health = beacon.health / Mathf.Max(1, beacon.maxHealth);
                subtitle = AllianceName(beacon.allianceId) + (beacon.buildRemaining > 0 ? " · BUILDING " + Mathf.CeilToInt(beacon.buildRemaining) + "s" : beacon.connected ? " · CONNECTED" : " · DISCONNECTED");
                action = beacon.allianceId == me.allianceId ? "Garrison / manage" : "Plan rally"; perform = () => OpenWarfare(beacon.id);
            }
            else if (army != null)
            {
                title = HeroName(army.commanderId); subtitle = army.name + " · " + army.state + " · " + army.troops + " TROOPS"; health = (float)army.health / Mathf.Max(1, army.maxHealth);
                bool allied = !string.IsNullOrEmpty(me.allianceId) && army.allianceId == me.allianceId;
                var owner = Array.Find(world.players, p => p.id == army.ownerId);
                bool ownCity = Vector2.Distance(new Vector2(ActiveArmy.x, ActiveArmy.z), new Vector2(me.homeX, me.homeZ)) < 2;
                bool protectedArmy = ownCity || owner == null || owner.cityLevel < 2 || me.cityLevel < 2 || army.recovery > 0 || Vector2.Distance(new Vector2(army.x, army.z), new Vector2(army.homeX, army.homeZ)) < 2;
                action = army.ownerId == playerId ? "Return home" : allied ? "Alliance army" : ownCity ? "Leave city first" : protectedArmy ? "Protected army" : "Attack player";
                enabled &= army.ownerId == playerId || (!allied && !protectedArmy);
                perform = () => { if (army.ownerId == playerId) Send("return"); else Send("attack-player", army.id); };
            }
            else if (city != null)
            {
                title = city.name + "'s city"; subtitle = city.ageName + " · CITADEL " + city.cityLevel; emblem = "city";
                action = city.id == playerId ? "Enter city" : "Focus city"; perform = () => { if (city.id == playerId) OpenInterface(InterfacePage.City); else cameraControl?.Focus(city.homeX, city.homeZ); };
            }
            else if (pin != null) { title = pin.name; subtitle = "ALLIANCE MARKER · " + Mathf.CeilToInt(pin.expires - world.time) + "s"; action = "Focus marker"; perform = () => cameraControl?.Focus(pin.x, pin.z); }
            else { selectedId = ""; return; }
            theme.Panel(r); theme.Icon(new Rect(r.x + 18, r.y + 23, 34, 34), emblem, MythInterfaceTheme.Gold);
            theme.OneLine(new Rect(r.x + 68, r.y + 12, r.width-116, 27), title, theme.Heading);
            theme.OneLine(new Rect(r.x + 68, r.y + 46, r.width-92, 23), subtitle, theme.Small);
            if (health >= 0) theme.Bar(new Rect(r.x + 68, r.y + 78, 220, 5), health, camp != null ? MythInterfaceTheme.Red : MythInterfaceTheme.Teal);
            if (city == null || city.id != playerId) theme.OneLine(new Rect(r.x + 18, r.y + 100, 370, 24), "SELECTED MARCH · " + HeroName(ActiveArmy.commanderId), theme.Small);
            if (theme.Button(new Rect(r.xMax - 38, r.y + 7, 28, 27), "×")) { selectedId = ""; map.selectedId = ""; }
            if (city != null && city.id == playerId)
            {
                if (theme.Button(new Rect(r.x + 18, r.y + 94, 140, 32), "Prepare march")) PrepareCityMarch();
            }
            if (theme.Button(new Rect(r.xMax - 208, r.y + 91, 190, 35), action, true, enabled)) perform?.Invoke();
        }
    }
}
