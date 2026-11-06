using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace ThronesOfMyth
{
    public sealed class PrototypeClient : MonoBehaviour
    {
        public string serverUrl = "http://127.0.0.1:8080";
        private readonly string[] civilizationIds = { "greek", "egyptian", "norse", "chinese", "japanese" };
        private readonly string[] civilizationNames = { "Greek", "Egyptian", "Norse", "Chinese", "Japanese" };
        private readonly string[] specialties = { "+12% army damage · Minotaur", "+35% recovery · Sphinx Guardian", "+15% health · Frost Giant", "+25% gathering · Qilin Guardian", "+15% march speed · Tengu" };
        private string playerName, token, playerId, allianceName = "Dawnkeepers";
        private string status = "Start the local server, then establish your city.";
        private bool joining, processing, placeBeacon, focused;
        private int civilization, tab, cityTab, selectedBuilding, deployHeroIndex, deployTroopIndex;
        private bool deployMythic;
        private string activeMarchId, inspectedHeroId = "captain";
        private bool cityOverviewOpen;
        private string lastDrawId;
        private float revealUntil;
        private readonly string[] cityTabs = { "Districts", "Training", "Research", "Temple", "Forge", "Market" };
        private string selectedId = "", selectedKind = "";
        private Vector2 scroll;
        private WorldSnapshot world;
        private ArmyData me;
        private WorldView map;
        private StrategyCamera cameraControl;
        private readonly Queue<GameCommand> commands = new Queue<GameCommand>();
        private readonly string[] tabs = { "Army", "City", "Heroes", "Alliance", "Journal" };
        private GUIStyle titleStyle, sectionStyle, noteStyle;

        private ArmyData ActiveArmy => world == null || world.armies == null ? me : Array.Find(world.armies, a => a.id == activeMarchId) ?? me;
        private static bool HasJob(QueueJob job) => job != null && !string.IsNullOrEmpty(job.id);
        private string SessionKey => "ThronesOfMyth.session." + serverUrl.TrimEnd('/') + "." + playerName.Trim();
        private void Awake()
        {
            Application.runInBackground = true;
            playerName = PlayerPrefs.GetString("ThronesOfMyth.name", "Commander");
            map = gameObject.AddComponent<WorldView>();
            var camera = Camera.main;
            if (camera != null) cameraControl = camera.GetComponent<StrategyCamera>() ?? camera.gameObject.AddComponent<StrategyCamera>();
        }
        private void Update()
        {
            if (cameraControl != null) cameraControl.blockInput = string.IsNullOrEmpty(token) || PointerOverUI() || GUIUtility.keyboardControl != 0;
            if (me == null) return;
            if (Input.GetKeyDown(KeyCode.Escape)) { placeBeacon = false; selectedId = ""; cityOverviewOpen = false; }
            if (GUIUtility.keyboardControl == 0 && Input.GetKeyDown(KeyCode.H)) cameraControl?.Focus(me.homeX, me.homeZ);
            if (GUIUtility.keyboardControl == 0 && Input.GetKeyDown(KeyCode.Space)) cameraControl?.Focus(ActiveArmy.x, ActiveArmy.z);
            if (GUIUtility.keyboardControl == 0 && Input.GetKeyDown(KeyCode.R)) Send("return");
            if (PointerOverUI() || Camera.main == null) return;
            if (!Input.GetMouseButtonDown(0) && !Input.GetMouseButtonDown(1)) return;
            if (!Physics.Raycast(Camera.main.ScreenPointToRay(Input.mousePosition), out var hit, 300)) return;
            GUIUtility.keyboardControl = 0;
            var marker = hit.collider.GetComponentInParent<MapMarker>();
            if (placeBeacon && Input.GetMouseButtonDown(0))
            {
                Send(new GameCommand { type = "flag", x = hit.point.x, z = hit.point.z }); placeBeacon = false; return;
            }
            if (marker != null)
            {
                selectedId = marker.id; selectedKind = marker.kind; map.selectedId = selectedId;
                if (marker.kind == "army" && Array.Exists(world.armies, a => a.id == marker.id && a.ownerId == playerId)) activeMarchId = marker.id;
                if (Input.GetMouseButtonDown(1)) ActOnSelection();
            }
            else if (hit.collider.gameObject.name == "Ground")
            {
                if (Input.GetMouseButtonDown(1)) Send(new GameCommand { type = "move", x = hit.point.x, z = hit.point.z });
                else { selectedId = ""; map.selectedId = ""; }
            }
        }
        private bool PointerOverUI()
        {
            var p = new Vector2(Input.mousePosition.x, Screen.height - Input.mousePosition.y);
            return (cityOverviewOpen && tab == 1 && cityTab == 0) || p.x < 320 || p.y < 65 || p.y > Screen.height - 44 || (p.x > Screen.width - 220 && p.y > Screen.height - 250);
        }
        private void Styles()
        {
            if (titleStyle != null) return;
            titleStyle = new GUIStyle(GUI.skin.label) { fontSize = 21, fontStyle = FontStyle.Bold, wordWrap = true };
            titleStyle.normal.textColor = new Color(0.95f, 0.79f, 0.43f);
            sectionStyle = new GUIStyle(GUI.skin.label) { fontSize = 15, fontStyle = FontStyle.Bold, wordWrap = true };
            noteStyle = new GUIStyle(GUI.skin.label) { wordWrap = true, fontSize = 12 };
        }
        private void OnGUI()
        {
            Styles();
            if (world != null) map.DrawLabels(Camera.main);
            GUI.Box(new Rect(0, 0, Screen.width, 62), GUIContent.none);
            GUILayout.BeginArea(new Rect(14, 6, Screen.width - 28, 52));
            GUILayout.BeginHorizontal(); GUILayout.Label("THRONES OF MYTH", titleStyle, GUILayout.Width(285));
            if (me != null)
            {
                GUILayout.Label($"Gold {me.gold}    Wood {me.wood}    Food {me.food}    Stone {me.stone}    Aether {me.aether}    |    City {me.cityLevel}    |    {me.name}", sectionStyle);
                if (GUILayout.Button("Home [H]", GUILayout.Width(85))) cameraControl?.Focus(me.homeX, me.homeZ);
            }
            GUILayout.EndHorizontal(); GUILayout.EndArea();
            if (string.IsNullOrEmpty(token)) { DrawJoin(); DrawStatus(); return; }
            if (me == null) { DrawStatus(); return; }
            GUI.Box(new Rect(8, 70, 302, Mathf.Max(160, Screen.height - 120)), GUIContent.none);
            GUILayout.BeginArea(new Rect(18, 80, 282, Mathf.Max(140, Screen.height - 142)));
            GUILayout.Label(CivilizationName(me.civilization) + " · " + ActiveArmy.state, sectionStyle);
            GUILayout.Label($"Health {ActiveArmy.health}/{ActiveArmy.maxHealth}   |   Hero Lv {ActiveArmy.level}", noteStyle);
            int newTab = GUILayout.Toolbar(tab, tabs);
            if (newTab != tab) { tab = newTab; scroll = Vector2.zero; }
            scroll = GUILayout.BeginScrollView(scroll);
            if (tab == 0) DrawArmy();
            if (tab == 1) DrawCity();
            if (tab == 2) DrawCommanders();
            if (tab == 3) DrawAlliance();
            if (tab == 4) DrawJournal();
            GUILayout.Space(14); DrawSelection();
            GUILayout.EndScrollView(); GUILayout.EndArea();
            if (cityOverviewOpen && tab == 1 && cityTab == 0) DrawCityOverview();
            DrawMinimap(); DrawStatus();
        }
        private void DrawJoin()
        {
            float width = Mathf.Min(440, Screen.width - 30);
            GUILayout.BeginArea(new Rect((Screen.width - width) / 2, 110, width, 430), GUI.skin.box);
            GUILayout.Label("The gods have fallen silent.", titleStyle);
            GUILayout.Label("Found a city. Lead mortal and mythic armies. Restore the divine realm.", noteStyle);
            GUILayout.Space(14); GUILayout.Label("Local server"); serverUrl = GUILayout.TextField(serverUrl, 160);
            GUILayout.Label("Commander name (same name and local profile resume your saved city)"); playerName = GUILayout.TextField(playerName, 24);
            GUILayout.Space(10); civilization = GUILayout.SelectionGrid(civilization, civilizationNames, 3);
            GUILayout.Label(specialties[civilization], noteStyle);
            GUILayout.Space(12); GUI.enabled = !joining;
            if (GUILayout.Button(joining ? "Connecting…" : "Establish / Resume City", GUILayout.Height(36))) StartCoroutine(Join());
            GUI.enabled = true;
            GUILayout.Label("WASD / arrows: pan · wheel: zoom · middle drag: pan\nLeft-click: inspect · right-click: act / march\nH: home · Space: army · R: return · Esc: cancel", noteStyle);
            GUILayout.EndArea();
        }
        private void DrawArmy()
        {
            GUILayout.Label(me.ageName + " · " + world.armies.Length + " armies in kingdom", sectionStyle);
            foreach (var march in world.armies)
            {
                if (march.ownerId != playerId) continue;
                if (GUILayout.Button((march.id == ActiveArmy.id ? "▶ " : "") + HeroName(march.commanderId) + " · " + march.state)) activeMarchId = march.id;
            }
            GUILayout.Label("Selected march", sectionStyle);
            GUILayout.Label($"{ActiveArmy.troops} mortal troops · {ActiveArmy.mythic} mythic units\nDamage {ActiveArmy.damage:F1} · March {ActiveArmy.speed:F1}\nRage {ActiveArmy.rage}/1000 · Shield {ActiveArmy.shield}\nLast skill: {ActiveArmy.lastSkill}", noteStyle);
            if (GUILayout.Button("Focus army [Space]")) cameraControl?.Focus(ActiveArmy.x, ActiveArmy.z);
            if (GUILayout.Button("Return & recover [R]")) Send("return");
            if (GUILayout.Button("Stop current order")) Send("stop");
            GUILayout.Label($"City reserves: {me.reserveTroops} troops · {me.reserveMythic} mythic", noteStyle);
            DrawReinforce();
            GUI.enabled = CanEditArmy && ActiveArmy.id != playerId && ActiveArmy.health >= ActiveArmy.maxHealth;
            if (GUILayout.Button("Return selected march to reserves")) Send("disband-march");
            GUI.enabled = true;
            DrawDeployment();
            GUILayout.Space(8); GUILayout.Label("Nearby threats", sectionStyle);
            foreach (var camp in world.camps)
                if (GUILayout.Button($"Lv {camp.level} · {camp.name}")) { Select(camp.id, "camp"); cameraControl?.Focus(camp.x, camp.z); }
            GUILayout.Label("Inspect a camp before attacking. High-level camps may require stronger armies or help from another player.", noteStyle);
        }
        private bool CanEditArmy => me != null && Vector2.Distance(new Vector2(ActiveArmy.x, ActiveArmy.z), new Vector2(me.homeX, me.homeZ)) < 2 && !ActiveArmy.hasOrder && ActiveArmy.recovery <= 0;
        private void DrawReinforce()
        {
            GUI.enabled = CanEditArmy && (me.reserveTroops > 0 || me.reserveMythic > 0);
            if (GUILayout.Button("Add ready reserves to army (at home)")) Send("reinforce");
            GUI.enabled = true;
        }
        private void DrawCity()
        {
            cityTab = GUILayout.SelectionGrid(cityTab, cityTabs, 3);
            GUILayout.Space(6);
            if (cityTab == 0) DrawDistricts();
            if (cityTab == 1) DrawTraining();
            if (cityTab == 2) DrawResearch();
            if (cityTab == 3) DrawTemple();
            if (cityTab == 4) DrawForge();
            if (cityTab == 5) DrawMarket();
        }
        private void DrawTraining()
        {
            GUILayout.Label("City development", sectionStyle);
            GUILayout.Label("Your city works while armies march, gather or fight. New recruits wait in city reserves until you reinforce at home.", noteStyle);
            int queuedTroops = 0, queuedMythic = 0;
            foreach (var job in me.trainingQueue)
                if (job.type == "train") queuedTroops += job.amount; else queuedMythic += job.amount;
            int cap = me.troopCapacity;
            GUILayout.Label($"City {me.cityLevel}/5 · Troops {me.deployedTroops + me.reserveTroops + queuedTroops}/{cap} including reserves and queues", noteStyle);
            DrawConstructionJobs();
            GUILayout.Space(8); GUILayout.Label("Training ground", sectionStyle);
            GUI.enabled = me.trainingQueue.Length < 3 && me.deployedTroops + me.reserveTroops + queuedTroops + 5 <= cap && me.food >= 50 && me.gold >= 20;
            if (GUILayout.Button("Train 5 troops · " + Mathf.CeilToInt(me.trainingDuration) + "s · 50 food / 20 gold")) Send("train");
            GUI.enabled = true;
            string mythic = "Mythic guardian";
            foreach (var civ in world.civilizations) if (civ.id == me.civilization) mythic = civ.mythic;
            GUI.enabled = BuildingLevel("menagerie") > 0 && me.cityLevel >= 2 && me.trainingQueue.Length < 3 && me.deployedMythic + me.reserveMythic + queuedMythic < me.mythicCapacity && me.food >= 80 && me.gold >= 100;
            if (GUILayout.Button(mythic + " · " + Mathf.CeilToInt(me.recruitDuration) + "s · 80 food / 100 gold")) Send("recruit");
            GUI.enabled = true;
            GUILayout.Label($"One training lane · {me.trainingQueue.Length}/3 orders. Mythic recruitment needs Citadel 2 and Sanctuary of Beasts.", noteStyle);
            for (int i = 0; i < me.trainingQueue.Length; i++)
                DrawJob(me.trainingQueue[i], me.trainingQueue[i].type == "train" ? "5 mortal troops" : mythic, i > 0);
            GUILayout.Label($"Ready reserves: {me.reserveTroops} troops · {me.reserveMythic} mythic", sectionStyle);
            DrawReinforce();
            if (!CanEditArmy) GUILayout.Label("Keep working here while your army is away. Return only to reinforce, change commander, or recover.", noteStyle);
            GUILayout.Space(10); GUILayout.Label("Resource sites", sectionStyle);
            foreach (var node in world.nodes)
                if (GUILayout.Button(node.name + " · " + node.remaining)) { Select(node.id, "node"); cameraControl?.Focus(node.x, node.z); }
        }
        private void DrawJob(QueueJob job, string label, bool waiting)
        {
            GUILayout.BeginVertical(GUI.skin.box);
            GUILayout.Label(label + (waiting ? " · waiting" : " · " + Mathf.CeilToInt(job.remaining) + "s"), noteStyle);
            Rect bar = GUILayoutUtility.GetRect(20, 5, GUILayout.ExpandWidth(true));
            GUI.color = new Color(0.18f, 0.2f, 0.23f); GUI.DrawTexture(bar, Texture2D.whiteTexture);
            GUI.color = new Color(0.8f, 0.65f, 0.3f);
            GUI.DrawTexture(new Rect(bar.x, bar.y, bar.width * Mathf.Clamp01(1 - job.remaining / job.duration), bar.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUILayout.Label("Refund: " + Cost(job.cost), noteStyle);
            if (GUILayout.Button("Cancel & refund resources")) Send("cancel-job", job.id);
            GUILayout.EndVertical();
        }
        private static string Cost(ResourceAmounts cost)
        {
            if (cost == null) return "none";
            var parts = new List<string>();
            if (cost.food > 0) parts.Add(cost.food + " food");
            if (cost.wood > 0) parts.Add(cost.wood + " wood");
            if (cost.stone > 0) parts.Add(cost.stone + " stone");
            if (cost.gold > 0) parts.Add(cost.gold + " gold");
            if (cost.aether > 0) parts.Add(cost.aether + " aether");
            return string.Join(" / ", parts);
        }
        private bool Afford(ResourceAmounts c) => c != null && me.food >= c.food && me.wood >= c.wood && me.stone >= c.stone && me.gold >= c.gold && me.aether >= c.aether;
        private int BuildingLevel(string id)
        {
            foreach (var b in me.cityBuildings) if (b.id == id) return b.level;
            return 0;
        }
        private string JobName(QueueJob job)
        {
            if (job.type == "upgrade") return "Citadel level " + (me.cityLevel + 1);
            foreach (var b in me.cityBuildings) if (b.id == job.targetId) return b.name;
            foreach (var t in me.researchOptions) if (t.id == job.targetId) return t.name;
            foreach (var r in world.relics) if (r.id == job.targetId) return r.name;
            return job.type;
        }
        private void DrawDistricts()
        {
            GUILayout.Label("City of the fallen age", sectionStyle);
            if (GUILayout.Button(cityOverviewOpen ? "Close city overview" : "Open city overview")) cityOverviewOpen = !cityOverviewOpen;
            selectedBuilding = Mathf.Clamp(selectedBuilding, 0, me.cityBuildings.Length - 1);
            var selected = me.cityBuildings[selectedBuilding];
            GUILayout.Label(selected.name + " · " + selected.level + "/" + selected.maxLevel, sectionStyle);
            GUILayout.Label(selected.category + " · " + selected.description, noteStyle);
            if (selected.level < selected.maxLevel)
            {
                GUILayout.Label(Cost(selected.nextCost) + " · " + Mathf.CeilToInt(selected.nextDuration) + "s", noteStyle);
                GUI.enabled = selected.canUpgrade;
                if (GUILayout.Button(selected.level == 0 ? "Construct" : "Upgrade")) Send("building-upgrade", selected.id);
                GUI.enabled = true;
                if (!selected.canUpgrade) GUILayout.Label(selected.lockedReason, noteStyle);
            }
            DrawConstructionJobs();
            GUILayout.Label("Passive production limit: " + me.passiveLimit + " per resource. Gathering and rewards can exceed it.", noteStyle);
            foreach (var b in me.cityBuildings)
                if (GUILayout.Button(b.name + " · " + (b.level == 0 ? "Not built" : "Lv " + b.level))) selectedBuilding = Array.IndexOf(me.cityBuildings, b);
        }
        private void DrawCityOverview()
        {
            float width = Mathf.Max(300, Screen.width - 555), height = Mathf.Max(280, Screen.height - 150);
            var area = new Rect(325, 72, width, height);
            GUI.Box(area, GUIContent.none);
            GUILayout.BeginArea(new Rect(area.x + 12, area.y + 10, width - 24, height - 20));
            GUILayout.BeginHorizontal(); GUILayout.Label("YOUR CITY · " + me.name, titleStyle);
            if (GUILayout.Button("X", GUILayout.Width(32))) cityOverviewOpen = false;
            GUILayout.EndHorizontal();
            GUILayout.Label("Select an institution. Build and upgrade from the sidebar. Layout is a prototype overview, not free placement.", noteStyle);
            int rows = Mathf.CeilToInt(me.cityBuildings.Length / 3f);
            float cardHeight = Mathf.Max(36, (height - 95) / rows);
            for (int row = 0; row < rows; row++)
            {
                GUILayout.BeginHorizontal();
                for (int column = 0; column < 3; column++)
                {
                    int index = row * 3 + column;
                    if (index >= me.cityBuildings.Length) continue;
                    var building = me.cityBuildings[index];
                    GUI.backgroundColor = index == selectedBuilding ? new Color(0.95f, 0.75f, 0.35f) : building.level > 0 ? new Color(0.45f, 0.7f, 0.65f) : Color.gray;
                    if (GUILayout.Button(building.name + "\n" + building.category + " · " + (building.level > 0 ? "Level " + building.level : "Not constructed"), GUILayout.Height(cardHeight), GUILayout.Width((width - 40) / 3))) selectedBuilding = index;
                }
                GUI.backgroundColor = Color.white; GUILayout.EndHorizontal();
            }
            GUILayout.EndArea();
        }
        private void DrawResearch()
        {
            GUILayout.Label("Athenaeum of Ages", sectionStyle);
            if (me.research != null && !string.IsNullOrEmpty(me.research.id)) DrawJob(me.research, JobName(me.research), false);
            GUILayout.Label("Research uses its own lane and continues alongside city construction and training.", noteStyle);
            foreach (var tech in me.researchOptions)
            {
                GUILayout.Label(tech.name + " · " + tech.level + "/" + tech.maxLevel, sectionStyle);
                GUILayout.Label(tech.branch + " · " + tech.description, noteStyle);
                if (tech.level >= tech.maxLevel) continue;
                GUILayout.Label(Cost(tech.cost) + " · " + Mathf.CeilToInt(tech.duration) + "s", noteStyle);
                GUI.enabled = tech.canResearch;
                if (GUILayout.Button("Research")) Send("research", tech.id);
                GUI.enabled = true;
                if (!tech.canResearch) GUILayout.Label(tech.lockedReason, noteStyle);
            }
        }
        private string HeroName(string id)
        {
            foreach (var hero in world.commanders) if (hero.id == id) return hero.name;
            return id;
        }
        private void DrawTemple()
        {
            GUILayout.Label("Temple of Echoes", titleStyle);
            GUILayout.Label("Call the memory of a hero through the veil. Oracle Sigils are earned from camps and offerings, or exchanged with in-game resources.", noteStyle);
            GUILayout.Label("Oracle Sigils: " + me.sigils, sectionStyle);
            bool built = BuildingLevel("oracle") > 0;
            if (!built) GUILayout.Label("Construct the Temple in Districts first.", noteStyle);
            GUI.enabled = built && me.offeringAvailable && !processing;
            if (GUILayout.Button("Free offering · " + me.offeringAmount + " sigil(s)")) Send("temple-offering");
            GUI.enabled = built && Afford(me.sealCost) && !processing;
            if (GUILayout.Button("Exchange for 1 sigil · " + Cost(me.sealCost))) Send("buy-sigil");
            GUI.enabled = built && me.sigils >= 1 && !processing;
            if (GUILayout.Button("Invoke one echo · 1 sigil", GUILayout.Height(32))) Send(new GameCommand { type = "summon", count = 1 });
            GUI.enabled = built && me.sigils >= 10 && !processing;
            if (GUILayout.Button("Invoke ten echoes · 10 sigils", GUILayout.Height(32))) Send(new GameCommand { type = "summon", count = 10 });
            GUI.enabled = true;
            GUILayout.Label($"Base odds: Common {world.summonRules.common:P0}, Rare {world.summonRules.rare:P0}, Epic {world.summonRules.epic:P0}, Legendary {world.summonRules.legendary:P0}. Uniform within each rarity. No paid currency.", noteStyle);
            GUILayout.Label($"Epic or better within {world.summonRules.epicPity - me.epicPity} summons. Legendary within {world.summonRules.legendaryPity - me.legendaryPity}. Guarantees persist; qualifying results reset their counters.", noteStyle);
            GUILayout.Label($"At the Epic guarantee: {1 - world.summonRules.legendary:P0} Epic / {world.summonRules.legendary:P0} Legendary. At the Legendary guarantee: 100% Legendary. Temple level never changes odds. Free offering resets at 00:00 UTC.", noteStyle);
            if (me.summonHistory.Length > 0)
            {
                var latest = me.summonHistory[0];
                GUILayout.Space(10);
                if (Time.unscaledTime < revealUntil) GUILayout.Label("The veil parts…", titleStyle);
                else
                {
                    GUI.color = RarityColor(latest.rarity.ToLowerInvariant());
                    GUILayout.Label(HeroName(latest.commanderId), titleStyle); GUI.color = Color.white;
                    GUILayout.Label(latest.rarity + (latest.duplicate ? " · +" + latest.shards + " Echo Shards" : " · NEW COMMANDER"), sectionStyle);
                }
                GUILayout.Label("Recent echoes", sectionStyle);
                foreach (var draw in me.summonHistory) GUILayout.Label("#" + draw.number + " " + HeroName(draw.commanderId) + (draw.duplicate ? " · " + draw.shards + " shards" : " · new"), noteStyle);
            }
        }
        private void DrawForge()
        {
            GUILayout.Label("Forge of Dawn", sectionStyle);
            bool built = BuildingLevel("forge") > 0;
            if (!built) GUILayout.Label("Requires Citadel 3 and Titan Stoneworks 2. Construct it in Districts.", noteStyle);
            if (me.crafting != null && !string.IsNullOrEmpty(me.crafting.id)) DrawJob(me.crafting, JobName(me.crafting), false);
            foreach (var relic in world.relics)
            {
                bool owned = Array.IndexOf(me.ownedRelics, relic.id) >= 0;
                GUILayout.Label(relic.name, sectionStyle); GUILayout.Label(relic.description, noteStyle);
                if (!owned)
                {
                    GUILayout.Label(Cost(relic.cost), noteStyle);
                    GUI.enabled = built && (me.crafting == null || string.IsNullOrEmpty(me.crafting.id)) && Afford(relic.cost);
                    if (GUILayout.Button("Craft · " + relic.duration + "s")) Send("craft", relic.id);
                }
                else
                {
                    GUI.enabled = CanEditArmy;
                    if (GUILayout.Button(ActiveArmy.equippedRelic == relic.id ? "Unequip at home" : "Equip at home")) Send(ActiveArmy.equippedRelic == relic.id ? "unequip-relic" : "equip-relic", relic.id);
                }
                GUI.enabled = true;
            }
        }
        private void DrawMarket()
        {
            GUILayout.Label("Agora of Fates", sectionStyle);
            if (BuildingLevel("market") == 0) GUILayout.Label("Build the Agora in Districts to exchange resources.", noteStyle);
            foreach (var trade in world.trades)
            {
                GUI.enabled = BuildingLevel("market") > 0 && Afford(trade.cost);
                if (GUILayout.Button(trade.name)) Send("trade", trade.id);
                GUI.enabled = true;
            }
            GUILayout.Label("Rates are fixed and displayed before exchange. Resource trades cannot create profit loops.", noteStyle);
        }
        private void DrawCommanders()
        {
            GUILayout.Label("Commander roster", sectionStyle);
            GUILayout.Label("Recruit from anywhere with earned gold. Equip a commander when your army is idle at home.", noteStyle);
            foreach (var hero in world.commanders)
            {
                bool owned = Array.IndexOf(me.ownedCommanders, hero.id) >= 0;
                GUI.color = RarityColor(hero.color); GUILayout.Label(hero.name + " · " + hero.rarity, sectionStyle); GUI.color = Color.white;
                GUILayout.Label(hero.description, noteStyle);
                if (!owned)
                {
                    GUI.enabled = me.gold >= hero.cost;
                    if (GUILayout.Button("Recruit · " + hero.cost + " gold")) Send("unlock-commander", hero.id);
                }
                else
                {
                    GUI.enabled = CanEditArmy && ActiveArmy.commanderId != hero.id && !AssignedElsewhere(hero.id);
                    if (GUILayout.Button(ActiveArmy.commanderId == hero.id ? "Equipped" : "Equip at home")) Send("commander", hero.id);
                }
                GUI.enabled = true;
                var progress = Array.Find(me.heroProgress, h => h.id == hero.id);
                if (progress != null && owned)
                {
                    GUILayout.Label($"Rank {progress.rank}/5 · Echo Shards {progress.shards}. Each rank: +3% damage and +2% maximum health.", noteStyle);
                    GUI.enabled = progress.rank < 5 && progress.shards >= progress.nextShards && me.gold >= progress.nextGold;
                    if (GUILayout.Button("Ascend · " + progress.nextShards + " shards / " + progress.nextGold + " gold")) Send("upgrade-commander", hero.id);
                    GUI.enabled = true;
                }
                if (owned && progress != null)
                {
                    if (GUILayout.Button("Skills & progression")) inspectedHeroId = hero.id;
                    if (inspectedHeroId == hero.id) DrawHeroSkills(hero, progress);
                }
                GUILayout.Space(10);
            }
        }
        private void DrawAlliance()
        {
            if (string.IsNullOrEmpty(me.allianceId))
            {
                GUILayout.Label("Found an alliance", sectionStyle); allianceName = GUILayout.TextField(allianceName, 24);
                if (GUILayout.Button("Create · 50 gold")) Send(new GameCommand { type = "alliance-create", name = allianceName });
                GUILayout.Label("Or join an existing alliance", sectionStyle);
                foreach (var a in world.alliances) if (GUILayout.Button(a.name + " · " + a.members + " members")) Send("alliance-join", a.id);
                return;
            }
            GUILayout.Label(AllianceName(me.allianceId), sectionStyle);
            GUILayout.Label("The leader places the first beacon within 6 units of their city. Further beacons connect within 12 units. Your army must be within 4 units of placement.", noteStyle);
            if (GUILayout.Button(placeBeacon ? "Cancel beacon placement" : "Place beacon · 60 wood / 20 gold")) placeBeacon = !placeBeacon;
            GUILayout.Label("Bring territory within 12 units of a site, then send your army to capture it. Uncontested occupation takes 15 seconds.", noteStyle);
            foreach (var site in world.sites)
            {
                if (GUILayout.Button(site.name + (site.allianceId == me.allianceId ? " ✓" : ""))) { Select(site.id, "site"); cameraControl?.Focus(site.x, site.z); }
            }
            if (BuildingLevel("oathhall") > 0)
            {
                GUILayout.Label("Alliance assistance", sectionStyle);
                foreach (var ally in world.players)
                {
                    if (ally.id == playerId || ally.allianceId != me.allianceId) continue;
                    foreach (var job in new[] { ally.construction, ally.secondConstruction, ally.research })
                        if (job != null && !string.IsNullOrEmpty(job.id) && GUILayout.Button("Help " + ally.name + " · " + job.type)) Send("alliance-help", job.id);
                }
            }
            GUILayout.Label("Eastern gate unlocks x > 40; northern gate unlocks z > 40. The central sanctuary requires both.", noteStyle);
        }
        private void DrawJournal()
        {
            GUILayout.Label(me.ageName + " · " + me.marchSlots + "/5 march slots · " + me.constructionSlots + " builder(s)", sectionStyle);
            GUILayout.Label("A foothold in the fallen world", sectionStyle);
            GUILayout.Label($"Defeat three camps: {Mathf.Min(3, me.kills)}/3\nReward: Epic Atalanta, 200 gold, 150 wood, 150 food.", noteStyle);
            GUI.enabled = me.kills >= 3 && !me.questClaimed;
            if (GUILayout.Button(me.questClaimed ? "Reward claimed" : "Claim reward")) Send("quest");
            GUI.enabled = true;
            GUILayout.Space(10); GUILayout.Label("Kingdom chronicle", sectionStyle);
            foreach (var e in world.events) GUILayout.Label($"[{Mathf.FloorToInt(e.time)}s] {e.message}", noteStyle);
            if (world.persistence != null)
                GUILayout.Label(world.persistence.enabled ? "Autosave: " + (string.IsNullOrEmpty(world.persistence.error) ? world.persistence.lastSaved : world.persistence.error) : "This server has persistence disabled.", noteStyle);
            GUILayout.Space(10); GUILayout.Label("Your city and queues are saved locally by the server. Return with the same name and local profile. Time pauses while the server is closed; field orders stop safely on reload.", noteStyle);
        }
        private void DrawSelection()
        {
            if (string.IsNullOrEmpty(selectedId)) { GUILayout.Label("Left-click an object to inspect it.", noteStyle); return; }
            GUILayout.Label("Selected", sectionStyle);
            foreach (var camp in world.camps) if (camp.id == selectedId)
            {
                GUILayout.Label($"{camp.name} · Level {camp.level}\nHealth {camp.health}/{camp.maxHealth}\nBase rewards: {50 * camp.level} gold, {30 * camp.level} food. Shared by participating armies.", noteStyle);
                GUI.enabled = camp.health > 0;
                if (GUILayout.Button(camp.health > 0 ? "March & attack" : "Respawning in " + camp.respawn + "s")) Send("attack", camp.id);
                GUI.enabled = true;
            }
            foreach (var node in world.nodes) if (node.id == selectedId)
            {
                GUILayout.Label(node.name + "\n" + node.remaining + " " + node.resource + " remaining. Depleted sites refill after 30 seconds.", noteStyle);
                if (GUILayout.Button("March & gather")) Send("gather", node.id);
            }
            foreach (var site in world.sites) if (site.id == selectedId)
            {
                GUILayout.Label(site.name + "\n" + site.description + "\nOwner: " + AllianceName(site.allianceId) + $"\nCapture: {site.progress:F1}/15s", noteStyle);
                if (GUILayout.Button(site.allianceId == me.allianceId && !string.IsNullOrEmpty(me.allianceId) ? "March & defend" : "March & capture")) Send("capture", site.id);
            }
            foreach (var p in world.players) if (selectedId == "city-" + p.id)
                GUILayout.Label($"{p.name} · {CivilizationName(p.civilization)}\n{p.troops} troops · {p.mythic} mythic\nAlliance: {AllianceName(p.allianceId)}", noteStyle);
        }
        private bool AssignedElsewhere(string heroId) => Array.Exists(world.armies, a => a.ownerId == playerId && a.id != ActiveArmy.id && a.commanderId == heroId);
        private void DrawConstructionJobs()
        {
            int count = (HasJob(me.construction) ? 1 : 0) + (HasJob(me.secondConstruction) ? 1 : 0);
            GUILayout.Label($"Construction crews: {count}/{me.constructionSlots} busy", sectionStyle);
            if (HasJob(me.construction)) DrawJob(me.construction, JobName(me.construction), false);
            if (HasJob(me.secondConstruction)) DrawJob(me.secondConstruction, JobName(me.secondConstruction), false);
            if (me.constructionSlots == 1) GUILayout.Label("Age of Oaths (Citadel 2): build the Lodge of the First Builders for a permanent second crew.", noteStyle);
        }
        private void DrawDeployment()
        {
            int ownCount = 0; foreach (var a in world.armies) if (a.ownerId == playerId) ownCount++;
            GUILayout.Space(8); GUILayout.Label($"Marches {ownCount}/{me.marchSlots} · maximum 5", sectionStyle);
            GUILayout.Label("Each new age unlocks one march. Assign an unused commander and troops from city reserves.", noteStyle);
            var available = new List<string>(); var labels = new List<string>();
            foreach (var hero in world.commanders)
                if (Array.IndexOf(me.ownedCommanders, hero.id) >= 0 && !Array.Exists(world.armies, a => a.ownerId == playerId && a.commanderId == hero.id)) { available.Add(hero.id); labels.Add(hero.name); }
            if (available.Count == 0) { GUILayout.Label("Recruit another commander to lead a new march.", noteStyle); return; }
            deployHeroIndex = Mathf.Clamp(deployHeroIndex, 0, available.Count - 1);
            deployHeroIndex = GUILayout.SelectionGrid(deployHeroIndex, labels.ToArray(), 1);
            deployTroopIndex = GUILayout.Toolbar(deployTroopIndex, new[] { "5 troops", "10", "20" });
            deployMythic = GUILayout.Toggle(deployMythic, "Include 1 mythic unit");
            int troops = new[] { 5, 10, 20 }[deployTroopIndex];
            GUI.enabled = ownCount < me.marchSlots && me.reserveTroops >= troops && (!deployMythic || me.reserveMythic >= 1);
            if (GUILayout.Button("Deploy from city reserves")) Send(new GameCommand { type = "deploy-march", targetId = available[deployHeroIndex], troops = troops, mythic = deployMythic ? 1 : 0 });
            GUI.enabled = true;
        }
        private void DrawHeroSkills(CommanderData hero, HeroProgress progress)
        {
            GUILayout.Label($"Level {progress.heroLevel}/{progress.stars * 10} · {progress.stars} stars · XP {progress.xp:F0}", sectionStyle);
            GUI.enabled = progress.heroLevel < progress.stars * 10 && me.gold >= 40 && me.food >= 20;
            if (GUILayout.Button("Mentor +100 XP · 40 gold / 20 food")) Send("mentor-commander", hero.id);
            GUI.enabled = progress.stars < 6 && progress.heroLevel >= progress.stars * 10 && me.gold >= progress.stars * 100 && me.aether >= progress.stars * 10;
            if (GUILayout.Button("Promote star · " + progress.stars * 100 + " gold / " + progress.stars * 10 + " aether")) Send("promote-commander", hero.id);
            GUI.enabled = true;
            foreach (var skill in progress.skills)
            {
                GUILayout.Label(skill.name + " · " + skill.kind + " · " + skill.level + "/5", sectionStyle);
                GUILayout.Label(skill.description + (skill.level == 0 ? " Unlocks at " + skill.unlockStar + " stars." : ""), noteStyle);
                GUI.enabled = skill.level > 0 && skill.level < 5 && progress.shards >= 5 * (skill.level + 1) && me.gold >= 25 * (skill.level + 1);
                if (GUILayout.Button("Upgrade · " + 5 * (skill.level + 1) + " shards / " + 25 * (skill.level + 1) + " gold")) Send(new GameCommand { type = "upgrade-skill", targetId = hero.id, skillIndex = skill.index });
                GUI.enabled = true;
            }
            GUILayout.Label((progress.expertise ? "EXPERTISE ACTIVE · " : "Expertise · ") + progress.expertiseDescription, noteStyle);
            GUILayout.Label("Stars unlock skill slots; skill levels and ascension ranks are separate. Active skills fire automatically at 1,000 rage.", noteStyle);
        }
        private void DrawMinimap()
        {
            var rect = new Rect(Screen.width - 210, Screen.height - 240, 196, 190);
            GUI.Box(rect, "Kingdom map");
            var area = new Rect(rect.x + 10, rect.y + 26, 176, 150);
            GUI.color = new Color(0.25f, 0.34f, 0.25f); GUI.DrawTexture(area, Texture2D.whiteTexture); GUI.color = Color.white;
            foreach (var site in world.sites) Dot(area, site.x, site.z, new Color(0.8f, 0.6f, 1), 5);
            foreach (var p in world.armies) Dot(area, p.x, p.z, p.ownerId == playerId ? Color.cyan : Color.yellow, 4);
            Dot(area, me.homeX, me.homeZ, Color.white, 6);
            if (Event.current.type == EventType.MouseDown && area.Contains(Event.current.mousePosition))
            {
                cameraControl?.Focus((Event.current.mousePosition.x - area.x) / area.width * 80, (1 - (Event.current.mousePosition.y - area.y) / area.height) * 80);
                Event.current.Use();
            }
        }
        private static void Dot(Rect area, float x, float z, Color color, int size)
        {
            GUI.color = color; GUI.DrawTexture(new Rect(area.x + x / 80 * area.width - size / 2f, area.y + (1 - z / 80) * area.height - size / 2f, size, size), Texture2D.whiteTexture); GUI.color = Color.white;
        }
        private void DrawStatus()
        {
            GUI.Box(new Rect(0, Screen.height - 40, Screen.width, 40), GUIContent.none);
            GUI.Label(new Rect(14, Screen.height - 35, Screen.width - 28, 32), (world != null && world.persistence != null && !string.IsNullOrEmpty(world.persistence.error)) ? world.persistence.error : placeBeacon ? "BEACON PLACEMENT: left-click near your army. Esc cancels." : status, noteStyle);
        }
        private void Select(string id, string kind) { selectedId = id; selectedKind = kind; map.selectedId = id; }
        private void ActOnSelection()
        {
            if (selectedKind == "camp") Send("attack", selectedId);
            if (selectedKind == "node") Send("gather", selectedId);
            if (selectedKind == "site") Send("capture", selectedId);
            if (selectedId == "city-" + playerId) Send("return");
        }
        private string AllianceName(string id)
        {
            if (world != null) foreach (var a in world.alliances) if (a.id == id) return a.name;
            return "Unclaimed / unaffiliated";
        }
        private string CivilizationName(string id)
        {
            for (int i = 0; i < civilizationIds.Length; i++) if (civilizationIds[i] == id) return civilizationNames[i];
            return id;
        }
        private static Color RarityColor(string rarity)
        {
            if ((rarity == "green" || rarity == "common")) return new Color(0.4f, 0.9f, 0.4f);
            if ((rarity == "blue" || rarity == "rare")) return new Color(0.4f, 0.7f, 1);
            if ((rarity == "purple" || rarity == "epic")) return new Color(0.85f, 0.5f, 1);
            return new Color(1, 0.8f, 0.25f);
        }
        private IEnumerator Join()
        {
            joining = true;
            var body = new JoinRequest { name = playerName, civilization = civilizationIds[civilization], resumeToken = PlayerPrefs.GetString(SessionKey, "") };
            using (var request = Request("/join", "POST", JsonUtility.ToJson(body)))
            {
                yield return request.SendWebRequest();
                if (request.result == UnityWebRequest.Result.Success)
                {
                    var session = JsonUtility.FromJson<JoinResponse>(request.downloadHandler.text);
                    token = session.token; playerId = session.playerId; activeMarchId = playerId; focused = false;
                    PlayerPrefs.SetString(SessionKey, token); PlayerPrefs.SetString("ThronesOfMyth.name", playerName); PlayerPrefs.Save();
                    status = "Connected. Right-click ground to march; left-click objects to inspect.";
                    StartCoroutine(Poll());
                }
                else status = DescribeError(request);
            }
            joining = false;
        }
        private IEnumerator Poll()
        {
            while (!string.IsNullOrEmpty(token))
            {
                using (var request = Request("/world", "GET"))
                {
                    yield return request.SendWebRequest();
                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        var next = JsonUtility.FromJson<WorldSnapshot>(request.downloadHandler.text);
                        if (next.version != 5) { status = "Server version mismatch. Stop and restart node index.mjs from the updated repository."; token = null; break; }
                        world = next; me = Array.Find(world.players, p => p.id == playerId);
                        if (me != null)
                        {
                            if (!Array.Exists(world.armies, a => a.id == activeMarchId && a.ownerId == playerId)) activeMarchId = playerId;
                            if (me.summonHistory.Length > 0 && me.summonHistory[0].id != lastDrawId)
                            {
                                if (lastDrawId != null) revealUntil = Time.unscaledTime + 0.8f;
                                lastDrawId = me.summonHistory[0].id;
                            }
                            else if (lastDrawId == null) lastDrawId = "";
                            map.Sync(world, playerId, me.allianceId);
                            if (!focused) { cameraControl?.Focus(me.homeX, me.homeZ); focused = true; }
                        }
                    }
                    else
                    {
                        status = DescribeError(request);
                        if (request.responseCode == 401) { token = null; world = null; me = null; map.Clear(); }
                    }
                }
                yield return new WaitForSecondsRealtime(0.2f);
            }
        }
        private UnityWebRequest Request(string path, string method, string body = null)
        {
            var request = new UnityWebRequest(serverUrl.TrimEnd('/') + path, method) { downloadHandler = new DownloadHandlerBuffer(), timeout = 5 };
            if (body != null) { request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body)); request.SetRequestHeader("Content-Type", "application/json"); }
            if (!string.IsNullOrEmpty(token)) request.SetRequestHeader("Authorization", "Bearer " + token);
            return request;
        }
        private static string DescribeError(UnityWebRequest request)
        {
            var body = request.downloadHandler.text;
            if (!string.IsNullOrEmpty(body) && body.TrimStart().StartsWith("{"))
            {
                var error = JsonUtility.FromJson<ErrorResponse>(body); if (!string.IsNullOrEmpty(error.error)) return error.error;
            }
            return request.error + " — check that your updated local server is running.";
        }
        private void Send(string type, string targetId = "") { Send(new GameCommand { type = type, targetId = targetId }); }
        private void Send(GameCommand command)
        {
            if (string.IsNullOrEmpty(token) || commands.Count >= 8) return;
            command.marchId = activeMarchId;
            commands.Enqueue(command); if (!processing) StartCoroutine(ProcessCommands());
        }
        private IEnumerator ProcessCommands()
        {
            processing = true;
            while (commands.Count > 0 && !string.IsNullOrEmpty(token))
            {
                var command = commands.Dequeue();
                using (var request = Request("/command", "POST", JsonUtility.ToJson(command)))
                {
                    yield return request.SendWebRequest();
                    status = request.result == UnityWebRequest.Result.Success ? "Order accepted: " + command.type : DescribeError(request);
                }
            }
            commands.Clear(); processing = false;
        }
        private void OnDestroy() { StopAllCoroutines(); commands.Clear(); }
    }
}
