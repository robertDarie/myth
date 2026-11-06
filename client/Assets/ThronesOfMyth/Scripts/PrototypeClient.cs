using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient : MonoBehaviour
    {
        public string serverUrl = "http://127.0.0.1:8080";
        private readonly string[] civilizationIds = { "greek", "egyptian", "norse", "chinese", "japanese" };
        private readonly string[] civilizationNames = { "Greek", "Egyptian", "Norse", "Chinese", "Japanese" };
        private readonly string[] specialties = { "+12% army damage · Minotaur", "+35% recovery · Sphinx Guardian", "+15% health · Frost Giant", "+25% gathering · Qilin Guardian", "+15% march speed · Tengu" };
        private string playerName, token, playerId, allianceName = "Dawnkeepers";
        private string status = "Your kingdom will be saved on this PC.";
        private bool joining, processing, placeBeacon, focused;
        private int civilization, selectedBuilding, deployHeroIndex, deployTroopIndex;
        private bool deployMythic;
        private string activeMarchId, inspectedHeroId = "captain";
        private string lastDrawId;
        private float revealUntil;
        private string selectedId = "", selectedKind = "";
        private WorldSnapshot world;
        private ArmyData me;
        private WorldView map;
        private StrategyCamera cameraControl;
        private readonly Queue<GameCommand> commands = new Queue<GameCommand>();
        private GUIStyle titleStyle, sectionStyle, noteStyle;

        private ArmyData ActiveArmy => world == null || world.armies == null ? me : Array.Find(world.armies, a => a.id == activeMarchId) ?? me;
        private static bool HasJob(QueueJob job) => job != null && !string.IsNullOrEmpty(job.id);
        private string SessionKey => "ThronesOfMyth.session." + serverUrl.TrimEnd('/') + "." + playerName.Trim();
        private void Awake()
        {
            Application.runInBackground = true;
            InitializeInterface();
            playerName = PlayerPrefs.GetString("ThronesOfMyth.name", "Commander");
            map = gameObject.AddComponent<WorldView>();
            map.occluded = point => InterfaceBlocksPoint(new Vector3(point.x, Screen.height - point.y, 0));
            var camera = Camera.main;
            if (camera != null)
            {
                cameraControl = camera.GetComponent<StrategyCamera>() ?? camera.gameObject.AddComponent<StrategyCamera>();
                cameraControl.inputBlocked = () => string.IsNullOrEmpty(token) || PointerOverUI();
            }
        }
        private void Update()
        {
            if (cameraControl != null) cameraControl.blockInput = string.IsNullOrEmpty(token) || PointerOverUI();
            if (me == null) return;
            if (Input.GetKeyDown(KeyCode.Escape)) { CloseInterface(); return; }
            if (HandleInterfaceKeys()) return;
            if (interfacePage != InterfacePage.World) return;
            if (Input.GetKeyDown(KeyCode.H)) cameraControl?.Focus(me.homeX, me.homeZ);
            if (Input.GetKeyDown(KeyCode.Space)) cameraControl?.Focus(ActiveArmy.x, ActiveArmy.z);
            if (Input.GetKeyDown(KeyCode.R)) Send("return");
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
        private bool PointerOverUI() => InterfaceBlocksPoint(Input.mousePosition);
        private void OnGUI() => RenderStrategyInterface();
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
                if (GUILayout.Button($"Lv {camp.level} · {camp.name}")) { Select(camp.id, "camp"); interfacePage = InterfacePage.World; cameraControl?.Focus(camp.x, camp.z); }
            GUILayout.Label("Inspect a camp before attacking. High-level camps may require stronger armies or help from another player.", noteStyle);
        }
        private bool CanEditArmy => me != null && Vector2.Distance(new Vector2(ActiveArmy.x, ActiveArmy.z), new Vector2(me.homeX, me.homeZ)) < 2 && !ActiveArmy.hasOrder && ActiveArmy.recovery <= 0;
        private void DrawReinforce()
        {
            GUI.enabled = CanEditArmy && (me.reserveTroops > 0 || me.reserveMythic > 0);
            if (GUILayout.Button("Add ready reserves to army (at home)")) Send("reinforce");
            GUI.enabled = true;
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
                if (GUILayout.Button(node.name + " · " + node.remaining)) { Select(node.id, "node"); interfacePage = InterfacePage.World; cameraControl?.Focus(node.x, node.z); }
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
        private string HeroName(string id)
        {
            foreach (var hero in world.commanders) if (hero.id == id) return hero.name;
            return id;
        }
        private void DrawForge()
        {
            GUILayout.Label("Forge of Dawn", sectionStyle);
            bool built = BuildingLevel("forge") > 0;
            if (!built) GUILayout.Label("Requires Citadel 3 and Titan Stoneworks 2. Construct it in your city.", noteStyle);
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
            if (BuildingLevel("market") == 0) GUILayout.Label("Build the Agora in your city to exchange resources.", noteStyle);
            foreach (var trade in world.trades)
            {
                GUI.enabled = BuildingLevel("market") > 0 && Afford(trade.cost);
                if (GUILayout.Button(trade.name)) Send("trade", trade.id);
                GUI.enabled = true;
            }
            GUILayout.Label("Rates are fixed and displayed before exchange. Resource trades cannot create profit loops.", noteStyle);
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
        private static void Dot(Rect area, float x, float z, Color color, int size)
        {
            GUI.color = color; GUI.DrawTexture(new Rect(area.x + x / 80 * area.width - size / 2f, area.y + (1 - z / 80) * area.height - size / 2f, size, size), Texture2D.whiteTexture); GUI.color = Color.white;
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
                    token = session.token; playerId = session.playerId; activeMarchId = playerId; focused = false; lastSnapshotAt = Time.unscaledTime; interfacePage = InterfacePage.World;
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
                        lastSnapshotAt = Time.unscaledTime;
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
                    status = request.result == UnityWebRequest.Result.Success ? OrderFeedback(command) : DescribeError(request);
                    toastUntil = Time.unscaledTime + 5;
                }
            }
            commands.Clear(); processing = false;
        }
        private void OnDestroy() { StopAllCoroutines(); commands.Clear(); theme?.Dispose(); PlayerPrefs.Save(); }
    }
}
