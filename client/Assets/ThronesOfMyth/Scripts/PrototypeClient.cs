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
        private int civilization, tab;
        private string selectedId = "", selectedKind = "";
        private Vector2 scroll;
        private WorldSnapshot world;
        private ArmyData me;
        private WorldView map;
        private StrategyCamera cameraControl;
        private readonly Queue<GameCommand> commands = new Queue<GameCommand>();
        private readonly string[] tabs = { "Army", "City", "Heroes", "Alliance", "Journal" };
        private GUIStyle titleStyle, sectionStyle, noteStyle;

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
            if (Input.GetKeyDown(KeyCode.Escape)) { placeBeacon = false; selectedId = ""; }
            if (GUIUtility.keyboardControl == 0 && Input.GetKeyDown(KeyCode.H)) cameraControl?.Focus(me.homeX, me.homeZ);
            if (GUIUtility.keyboardControl == 0 && Input.GetKeyDown(KeyCode.Space)) cameraControl?.Focus(me.x, me.z);
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
            return p.x < 320 || p.y < 65 || p.y > Screen.height - 44 || (p.x > Screen.width - 220 && p.y > Screen.height - 250);
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
                GUILayout.Label($"Gold {me.gold}    Wood {me.wood}    Food {me.food}    |    City {me.cityLevel}    |    {me.name}", sectionStyle);
                if (GUILayout.Button("Home [H]", GUILayout.Width(85))) cameraControl?.Focus(me.homeX, me.homeZ);
            }
            GUILayout.EndHorizontal(); GUILayout.EndArea();
            if (string.IsNullOrEmpty(token)) { DrawJoin(); DrawStatus(); return; }
            if (me == null) { DrawStatus(); return; }
            GUI.Box(new Rect(8, 70, 302, Mathf.Max(160, Screen.height - 120)), GUIContent.none);
            GUILayout.BeginArea(new Rect(18, 80, 282, Mathf.Max(140, Screen.height - 142)));
            GUILayout.Label(CivilizationName(me.civilization) + " · " + me.state, sectionStyle);
            GUILayout.Label($"Health {me.health}/{me.maxHealth}   |   Army Lv {me.level}", noteStyle);
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
            GUILayout.Label("Field army", sectionStyle);
            GUILayout.Label($"{me.troops} mortal troops · {me.mythic} mythic units\nDamage {me.damage:F1} · March {me.speed:F1}\nKills {me.kills} · Experience {me.xp}", noteStyle);
            if (GUILayout.Button("Focus army [Space]")) cameraControl?.Focus(me.x, me.z);
            if (GUILayout.Button("Return & recover [R]")) Send("return");
            if (GUILayout.Button("Stop current order")) Send("stop");
            GUILayout.Label($"City reserves: {me.reserveTroops} troops · {me.reserveMythic} mythic", noteStyle);
            DrawReinforce();
            GUILayout.Space(8); GUILayout.Label("Nearby threats", sectionStyle);
            foreach (var camp in world.camps)
                if (GUILayout.Button($"Lv {camp.level} · {camp.name}")) { Select(camp.id, "camp"); cameraControl?.Focus(camp.x, camp.z); }
            GUILayout.Label("Inspect a camp before attacking. High-level camps may require stronger armies or help from another player.", noteStyle);
        }
        private bool HasConstruction => me.construction != null && !string.IsNullOrEmpty(me.construction.id);
        private bool CanEditArmy => me != null && Vector2.Distance(new Vector2(me.x, me.z), new Vector2(me.homeX, me.homeZ)) < 2 && !me.hasOrder && me.recovery <= 0;
        private void DrawReinforce()
        {
            GUI.enabled = CanEditArmy && (me.reserveTroops > 0 || me.reserveMythic > 0);
            if (GUILayout.Button("Add ready reserves to army (at home)")) Send("reinforce");
            GUI.enabled = true;
        }
        private void DrawCity()
        {
            GUILayout.Label("City development", sectionStyle);
            GUILayout.Label("Your city works while armies march, gather or fight. New recruits wait in city reserves until you reinforce at home.", noteStyle);
            int queuedTroops = 0, queuedMythic = 0;
            foreach (var job in me.trainingQueue)
                if (job.type == "train") queuedTroops += job.amount; else queuedMythic += job.amount;
            int cap = me.cityLevel * 20 + 20;
            GUILayout.Label($"City {me.cityLevel}/5 · Troops {me.troops + me.reserveTroops + queuedTroops}/{cap} including reserves and queues", noteStyle);
            GUI.enabled = !HasConstruction && me.cityLevel < 5 && me.wood >= me.cityLevel * 100 && me.gold >= me.cityLevel * 75;
            if (GUILayout.Button("Upgrade · " + me.cityLevel * 100 + " wood / " + me.cityLevel * 75 + " gold")) Send("upgrade");
            GUI.enabled = true;
            if (HasConstruction) DrawJob(me.construction, "City level " + (me.cityLevel + 1), false);
            else GUILayout.Label("Builder available · upgrades take 20s × current level.", noteStyle);
            GUILayout.Space(8); GUILayout.Label("Training ground", sectionStyle);
            GUI.enabled = me.trainingQueue.Length < 3 && me.troops + me.reserveTroops + queuedTroops + 5 <= cap && me.food >= 50 && me.gold >= 20;
            if (GUILayout.Button("Train 5 troops · 8s · 50 food / 20 gold")) Send("train");
            GUI.enabled = true;
            string mythic = "Mythic guardian";
            foreach (var civ in world.civilizations) if (civ.id == me.civilization) mythic = civ.mythic;
            GUI.enabled = me.cityLevel >= 2 && me.trainingQueue.Length < 3 && me.mythic + me.reserveMythic + queuedMythic < me.cityLevel && me.food >= 80 && me.gold >= 100;
            if (GUILayout.Button(mythic + " · 20s · 80 food / 100 gold")) Send("recruit");
            GUI.enabled = true;
            GUILayout.Label($"One training lane · {me.trainingQueue.Length}/3 orders. Mythic recruitment unlocks at city level 2.", noteStyle);
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
            if (GUILayout.Button("Cancel & refund resources")) Send("cancel-job", job.id);
            GUILayout.EndVertical();
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
                    GUI.enabled = CanEditArmy && me.commanderId != hero.id;
                    if (GUILayout.Button(me.commanderId == hero.id ? "Equipped" : "Equip at home")) Send("commander", hero.id);
                }
                GUI.enabled = true; GUILayout.Space(10);
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
            GUILayout.Label("Eastern gate unlocks x > 40; northern gate unlocks z > 40. The central sanctuary requires both.", noteStyle);
        }
        private void DrawJournal()
        {
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
            foreach (var p in world.players) if (selectedId == p.id || selectedId == "city-" + p.id)
                GUILayout.Label($"{p.name} · {CivilizationName(p.civilization)}\n{p.troops} troops · {p.mythic} mythic\nAlliance: {AllianceName(p.allianceId)}", noteStyle);
        }
        private void DrawMinimap()
        {
            var rect = new Rect(Screen.width - 210, Screen.height - 240, 196, 190);
            GUI.Box(rect, "Kingdom map");
            var area = new Rect(rect.x + 10, rect.y + 26, 176, 150);
            GUI.color = new Color(0.25f, 0.34f, 0.25f); GUI.DrawTexture(area, Texture2D.whiteTexture); GUI.color = Color.white;
            foreach (var site in world.sites) Dot(area, site.x, site.z, new Color(0.8f, 0.6f, 1), 5);
            foreach (var p in world.players) Dot(area, p.x, p.z, p.id == playerId ? Color.cyan : Color.yellow, 4);
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
            if (rarity == "green") return new Color(0.4f, 0.9f, 0.4f);
            if (rarity == "blue") return new Color(0.4f, 0.7f, 1);
            if (rarity == "purple") return new Color(0.85f, 0.5f, 1);
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
                    token = session.token; playerId = session.playerId; focused = false;
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
                        if (next.version != 3) { status = "Server version mismatch. Stop and restart node index.mjs from the updated repository."; token = null; break; }
                        world = next; me = Array.Find(world.players, p => p.id == playerId);
                        if (me != null)
                        {
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
