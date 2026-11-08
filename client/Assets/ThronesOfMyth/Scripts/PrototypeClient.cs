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
        private string kingdomJoinCode = "";
        private readonly string[] civilizationIds = { "greek", "egyptian", "norse", "chinese", "japanese" };
        private readonly string[] civilizationNames = { "Greek", "Egyptian", "Norse", "Chinese", "Japanese" };
        private readonly string[] specialties = { "+12% army damage · Minotaur", "+35% recovery · Sphinx Guardian", "+15% health · Frost Giant", "+25% gathering · Qilin Guardian", "+15% march speed · Tengu" };
        private string playerName, token, playerId, allianceName = "Dawnkeepers";
        private string status = "Your kingdom will be saved on this PC.";
        private bool joining, processing, placeBeacon, focused;
        private int civilization, selectedBuilding;
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

        private ArmyData ActiveArmy => world == null || world.armies == null ? me : OwnMarches().Find(a => a.id == activeMarchId) ?? me;
        private static bool HasJob(QueueJob job) => job != null && !string.IsNullOrEmpty(job.id);
        private string SessionKey => "ThronesOfMyth.session." + serverUrl.TrimEnd('/') + "." + playerName.Trim();
        private void Awake()
        {
            Application.runInBackground = true;
            StartCoroutine(PreloadPresentation());
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
            if(map!=null)map.hoveredId="";
            if (cameraControl != null) cameraControl.blockInput = string.IsNullOrEmpty(token) || PointerOverUI();
            if (me == null || LoadingActive) return;
            if (Input.GetKeyDown(KeyCode.Escape)) { CloseInterface(); return; }
            if (HandleInterfaceKeys()) return;
            if (interfacePage != InterfacePage.World) return;
            if (Input.GetKeyDown(KeyCode.H)) cameraControl?.Focus(me.homeX, me.homeZ);
            if (Input.GetKeyDown(KeyCode.Space)) cameraControl?.Focus(ActiveArmy.x, ActiveArmy.z);
            if (Input.GetKeyDown(KeyCode.R)) Send("return");
            if (PointerOverUI() || Camera.main == null) return;
            if (!Physics.Raycast(Camera.main.ScreenPointToRay(Input.mousePosition), out var hit, 300)) return;
            var marker = hit.collider.GetComponentInParent<MapMarker>();
            map.hoveredId=marker==null?"":marker.id;
            if (!Input.GetMouseButtonDown(0) && !Input.GetMouseButtonDown(1)) return;
            GUIUtility.keyboardControl = 0;
            if (chooseScoutDestination && Input.GetMouseButtonDown(0))
            { ScoutAt(hit.point.x, hit.point.z); chooseScoutDestination = false; return; }
            if (placeBeacon && Input.GetMouseButtonDown(0))
            {
                Send(new GameCommand { type = "flag", x = hit.point.x, z = hit.point.z }); placeBeacon = false; return;
            }
            if (marker != null)
            {
                Select(marker.id,marker.kind);
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
            foreach (var march in OwnMarches())
            {
                if (march.ownerId != playerId) continue;
                if (GUILayout.Button((march.id == ActiveArmy.id ? "▶ " : "") + HeroName(march.commanderId) + " · " + march.state)) activeMarchId = march.id;
            }
            if (GUILayout.Button("Alliance warfare · rallies and garrisons")) OpenInterface(InterfacePage.Warfare);
            GUILayout.Label("Selected march", sectionStyle);
            GUILayout.Label($"{ActiveArmy.troops} mortal troops · {ActiveArmy.mythic} mythic units\nDamage {ActiveArmy.damage:F1} · March {ActiveArmy.speed:F1}\nRage {ActiveArmy.rage}/1000 · Shield {ActiveArmy.shield}\nLast skill: {ActiveArmy.lastSkill}", noteStyle);
            if (GUILayout.Button("Focus army [Space]")) cameraControl?.Focus(ActiveArmy.x, ActiveArmy.z);
            if (GUILayout.Button("Return & recover [R]")) Send("return");
            if (GUILayout.Button("Stop current order")) Send("stop");
            GUILayout.Label($"City reserves: {me.reserveTroops} troops · {me.reserveMythic} mythic", noteStyle);
            GUILayout.Label("Cargo " + CargoLabel(ActiveArmy) + " · Delivered resources become spendable only at home.",noteStyle);
            GUILayout.Label("Field: "+me.deployedTroops+" troops · Home formations: "+(me.assignedTroops-me.deployedTroops)+" troops · Unassigned reserves: "+me.reserveTroops,noteStyle);
            DrawReinforce();
            GUILayout.Label(UnitSummary(ActiveArmy.units), noteStyle);
            GUI.enabled = CanEditArmy && ActiveArmy.id != playerId && ActiveArmy.health >= ActiveArmy.maxHealth;
            if (GUILayout.Button("Return selected march to reserves")) Send("disband-march");
            GUI.enabled = true;
            DrawDeployment();
            GUILayout.Space(8); GUILayout.Label("Nearby threats", sectionStyle);
            foreach (var camp in world.camps)
                if (GUILayout.Button($"Lv {camp.level} · {camp.name}")) { Select(camp.id, "camp"); interfacePage = InterfacePage.World; cameraControl?.Focus(camp.x, camp.z); }
            GUILayout.Label("Inspect a camp before attacking. High-level camps may require stronger armies or help from another player.", noteStyle);
        }
        private bool CanEditArmy => me != null && !ActiveArmy.deployed && Vector2.Distance(new Vector2(ActiveArmy.x, ActiveArmy.z), new Vector2(me.homeX, me.homeZ)) < 2 && !ActiveArmy.hasOrder && ActiveArmy.recovery <= 0;
        private void DrawReinforce()
        {
            GUI.enabled = CanEditArmy && !processing;
            if (GUILayout.Button("Choose troops for selected march", GUILayout.Height(40))) BeginFormation(true);
            GUI.enabled = true;
        }
        private int trainingTier;
        private void DrawTraining()
        {
            if (GUILayout.Button("House of Renewal · " + me.hospitalTroops + " mortal / " + me.hospitalMythic + " mythic awaiting recovery")) OpenInterface(InterfacePage.Hospital);
            GUILayout.Label("Ready troops & capacity", sectionStyle);
            GUILayout.Label("Train reserves → prepare a march → gather or fight. City work continues while armies are away.", noteStyle);
            int queuedTroops = 0, queuedMythic = 0;
            foreach (var job in me.trainingQueue)
                if (job.type == "train"||job.type=="promote") queuedTroops += job.amount; else queuedMythic += job.amount;
            int cap = me.troopCapacity;
            GUILayout.Label($"City {me.cityLevel}/5 · Troops {me.assignedTroops + me.reserveTroops + me.hospitalTroops + queuedTroops}/{cap} including reserves and queues", noteStyle);
            DrawConstructionJobs();
            GUILayout.Space(8); GUILayout.Label("Training ground", sectionStyle);
            GUILayout.Label("Infantry counters cavalry · Cavalry counters archers · Archers counter infantry. Tiers keep these roles.",noteStyle);
            trainingTier=GUILayout.SelectionGrid(trainingTier,new[]{"Tier I · Levies","Tier II · Veterans"},2,GUILayout.Height(38));
            if(trainingTier==1)
            {
                GUILayout.Label("Unlock: Citadel 2, Hall of Spears 2, Athenaeum 2 and Veteran Oaths research. Promote five ready Tier I reserves or train veterans directly.",noteStyle);
                if(GUILayout.Button("Open Veteran Oaths research")){inspectedTechnology=Mathf.Max(0,Array.FindIndex(me.researchOptions,t=>t.id=="veterans"));OpenInterface(InterfacePage.Research);}
                if(GUILayout.Button("Assemble march / leave troops in reserves"))PrepareCityMarch();
            }
            foreach (var troop in me.trainingOptions)
            {
                if(troop.tier!=trainingTier+1)continue;
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(troop.name + " · " + troop.role + " · T" + troop.tier, sectionStyle);
                GUILayout.Label(troop.description + "  Base health " + troop.health + " · Damage " + troop.damage.ToString("F2") + " per troop", noteStyle);
                string reason=processing?"Sending your order…":pendingOrder!=null?"Confirm your previous order first.":!string.IsNullOrEmpty(troop.lockedReason)?troop.lockedReason:me.trainingQueue.Length>=3?"Training queue is full.":me.assignedTroops+me.reserveTroops+me.hospitalTroops+queuedTroops+5>cap?"Increase troop capacity or finish current training.":!Afford(troop.cost)?"More resources required: "+Cost(troop.cost):"";
                float duration=me.trainingDuration*troop.duration/8;
                if(theme.Action("Train 5 · "+Mathf.CeilToInt(duration)+"s · "+Cost(troop.cost),string.IsNullOrEmpty(reason),reason))Send("train",troop.id);
                if(troop.tier==2)
                {
                    var source=Array.Find(world.troopTypes,t=>t.id==troop.baseId);
                    GUILayout.Label("Per unit: health "+source.health+" → "+troop.health+" · damage "+source.damage.ToString("F2")+" → "+troop.damage.ToString("F2"),noteStyle);
                    GUILayout.Label("Ready Tier I reserves: "+troop.sourceAvailable+" · promotion preserves soldier count",noteStyle);
                    string promotionReason=processing?"Sending your order…":pendingOrder!=null?"Confirm your previous order first.":!string.IsNullOrEmpty(troop.lockedReason)?troop.lockedReason:troop.sourceAvailable<5?"Needs five ready Tier I reserves.":me.trainingQueue.Length>=3?"Training queue is full.":!Afford(troop.promotionCost)?"More resources required: "+Cost(troop.promotionCost):"";
                    float sourceDuration=source.duration;
                    if(theme.Action("Promote 5 · "+Mathf.CeilToInt(me.trainingDuration*(troop.duration-sourceDuration)/8)+"s · "+Cost(troop.promotionCost),string.IsNullOrEmpty(promotionReason),promotionReason,false))Send("promote",troop.id);
                }
                GUILayout.EndVertical();
            }
            string mythic = "Mythic guardian";
            foreach (var civ in world.civilizations) if (civ.id == me.civilization) mythic = civ.mythic;
            GUI.enabled = BuildingLevel("menagerie") > 0 && me.cityLevel >= 2 && me.trainingQueue.Length < 3 && me.assignedMythic + me.reserveMythic + me.hospitalMythic + queuedMythic < me.mythicCapacity && me.food >= 80 && me.gold >= 100;
            if (GUILayout.Button(mythic + " · " + Mathf.CeilToInt(me.recruitDuration) + "s · 80 food / 100 gold")) Send("recruit");
            GUI.enabled = true;
            GUILayout.Label($"One training lane · {me.trainingQueue.Length}/3 orders. Mythic recruitment needs Citadel 2 and Sanctuary of Beasts.", noteStyle);
            for (int i = 0; i < me.trainingQueue.Length; i++)
                DrawJob(me.trainingQueue[i], (me.trainingQueue[i].type == "train"||me.trainingQueue[i].type=="promote") ? me.trainingQueue[i].amount + " " + TroopName(me.trainingQueue[i].targetId) : mythic, i > 0);
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
            if (cost.mana > 0) parts.Add(cost.mana + " mana");
            if (cost.aether > 0) parts.Add(cost.aether + " premium Aether");
            return parts.Count==0?"none":string.Join(" / ", parts);
        }
        private bool Afford(ResourceAmounts c) => c != null && me.food >= c.food && me.wood >= c.wood && me.stone >= c.stone && me.gold >= c.gold && me.mana >= c.mana && me.aether >= c.aether;
        private int BuildingLevel(string id)
        {
            foreach (var b in me.cityBuildings) if (b.id == id) return b.level;
            return 0;
        }
        private string JobName(QueueJob job)
        {
            if(job.type=="promote"||job.type=="train")return (job.type=="promote"?"Promoting ":"Training ")+job.amount+" "+TroopName(job.targetId);
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
        private int tradeMember,tradeResource;
        private string tradeAmount="100";
        private void DrawMarket()
        {
            GUILayout.Label("Agora of Fates · Alliance deliveries",sectionStyle);
            var economy=me.economy;if(economy==null)return;
            GUILayout.Label("Immediate delivery to another alliance member. Sender pays amount + "+(economy.rules.tradeTax*100).ToString("F0")+"% tax. Premium Aether, Sigils and items cannot be transferred.",noteStyle);
            GUILayout.Label("Remaining today: "+economy.tradeRemaining+" resources · Resets in "+economy.tradeResetSeconds+"s",theme.Small);
            if(BuildingLevel("market")==0)GUILayout.Label("Build the Agora to send resources. Receiving does not require a Market.",noteStyle);
            if(economy.members.Length==0){GUILayout.Label("Join an alliance with another member to trade.",noteStyle);return;}
            tradeMember=Mathf.Clamp(tradeMember,0,economy.members.Length-1);
            var names=Array.ConvertAll(economy.members,m=>m.name);tradeMember=GUILayout.SelectionGrid(tradeMember,names,2);
            string[] resources={"food","wood","stone","gold","mana"};tradeResource=GUILayout.Toolbar(tradeResource,resources);
            GUILayout.Label("Amount delivered",theme.Small);tradeAmount=GUILayout.TextField(tradeAmount,8);
            bool valid=int.TryParse(tradeAmount,out int amount)&&amount>0&&amount<=economy.tradeRemaining;
            int tax=valid?Mathf.CeilToInt(amount*economy.rules.tradeTax):0;
            GUILayout.Label("Recipient receives "+(valid?amount:0)+" · Tax "+tax+" · Sender pays "+(valid?amount+tax:0),noteStyle);
            int[] available={me.food,me.wood,me.stone,me.gold,me.mana};
            GUILayout.Label("Available to send: "+available[tradeResource]+" "+resources[tradeResource],theme.Small);
            GUI.enabled=valid&&amount+tax<=available[tradeResource]&&BuildingLevel("market")>0&&!processing&&pendingOrder==null;
            if(GUILayout.Button("Send to "+names[tradeMember],theme.Primary))Send(new GameCommand{type="resource-transfer",targetId=economy.members[tradeMember].id,name=resources[tradeResource],count=amount,jobId=economy.nextTransfer+"-"+Guid.NewGuid().ToString("N")});
            GUI.enabled=true;
            if(GUILayout.Button("View transfer reports"))OpenInterface(InterfacePage.Reports);
        }
        private void DrawAlliance()
        {
            if (GUILayout.Button("Alliance weekly goals", theme.Primary)) OpenActivity(true);
            if (GUILayout.Button("Kingdom and alliance chat")) OpenInterface(InterfacePage.Chat);
            if (string.IsNullOrEmpty(me.allianceId))
            {
                GUILayout.Label("Found an alliance", sectionStyle); allianceName = GUILayout.TextField(allianceName, 24);
                if (GUILayout.Button("Create · 50 gold")) Send(new GameCommand { type = "alliance-create", name = allianceName });
                GUILayout.Label("Or join an existing alliance", sectionStyle);
                foreach (var a in world.alliances) if (GUILayout.Button(a.name + " · " + a.members + " members")) Send("alliance-join", a.id);
                return;
            }
            if (GUILayout.Button("Alliance warfare · rallies, garrisons and structures", theme.Primary)) OpenInterface(InterfacePage.Warfare);
            GUILayout.Label(AllianceName(me.allianceId) + " · " + me.allianceRole, sectionStyle);
            DrawAllianceMembers();
            GUILayout.Label("The leader places the first beacon within 6 units of their city. Further beacons connect within 12 units. Your army must be within 4 units of placement.", noteStyle);
            GUI.enabled = me.allianceRole == "Leader" || me.allianceRole == "Officer";
            if (GUILayout.Button(placeBeacon ? "Cancel beacon placement" : "Place fort / beacon · 60 wood / 20 gold")) placeBeacon = !placeBeacon;
            GUI.enabled = true;
            GUILayout.Label("The root fort builds in 30 seconds; connected beacons take 10 seconds. Only completed, connected territory supplies captures and rallies.", noteStyle);
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
            if (GUILayout.Button("Kingdom milestones & opening times", theme.Primary)) GuidePage(InterfacePage.Kingdom);
            if (GUILayout.Button("Open chapter campaign", theme.Primary)) GuidePage(InterfacePage.Campaign);
            if (GUILayout.Button("Open battle reports · " + (me.battleReports.Length + me.groupReports.Length))) OpenInterface(InterfacePage.Reports);
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
        private bool AssignedElsewhere(string heroId) => OwnMarches().Exists(a => a.id != ActiveArmy.id && a.commanderId == heroId);
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
            if (GUILayout.Button("Assemble a new march", theme.Primary, GUILayout.Height(44))) BeginFormation(false);
        }
        private void DrawHeroSkills(CommanderData hero, HeroProgress progress)
        {
            GUILayout.Label($"Level {progress.heroLevel}/{progress.stars * 10} · {progress.stars} stars · XP {progress.xp:F0}", sectionStyle);
            var experience = GUILayoutUtility.GetRect(80, 9, GUILayout.ExpandWidth(true));
            theme.Bar(experience, progress.heroLevel >= progress.stars * 10 ? 1 : progress.xp % 100 / 100f, MythInterfaceTheme.Teal);
            GUILayout.Space(8);
            GUI.enabled = progress.heroLevel < progress.stars * 10 && me.gold >= 40 && me.food >= 20 && !processing;
            if (GUILayout.Button("Mentor +100 XP · 40 gold / 20 food")) Send("mentor-commander", hero.id);
            GUI.enabled = progress.stars < 6 && progress.heroLevel >= progress.stars * 10 && me.gold >= progress.stars * 100 && me.mana >= progress.stars * 10 && !processing;
            if (GUILayout.Button("Promote star · " + progress.stars * 100 + " gold / " + progress.stars * 10 + " mana")) Send("promote-commander", hero.id);
            GUI.enabled = true;
            foreach (var skill in progress.skills)
            {
                GUILayout.Space(10); GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.BeginHorizontal();
                var emblem = GUILayoutUtility.GetRect(46, 46, GUILayout.Width(46), GUILayout.Height(46));
                var color = skill.level == 0 ? MythInterfaceTheme.Muted : skill.kind == "Active" ? RarityColor(hero.color) : MythInterfaceTheme.Teal;
                theme.Panel(emblem, skill.kind == "Active" && skill.level > 0);
                theme.Icon(new Rect(emblem.x + 10, emblem.y + 10, 26, 26), skill.level == 0 ? "lock" : skill.kind == "Active" ? "mana" : "research", color);
                GUILayout.Space(10); GUILayout.BeginVertical();
                GUILayout.Label(skill.kind.ToUpperInvariant() + (skill.level == 0 ? " · LOCKED" : " · LEVEL " + skill.level + " / 5"), theme.Eyebrow);
                GUILayout.Label(skill.name, sectionStyle);
                GUILayout.EndVertical(); GUILayout.EndHorizontal();
                var pips = GUILayoutUtility.GetRect(80, 10, GUILayout.ExpandWidth(true));
                for (int i = 0; i < 5; i++) MythInterfaceTheme.Fill(new Rect(pips.x + i * (pips.width / 5), pips.y + 3, pips.width / 5 - 4, 3), i < skill.level ? color : new Color(0.22f, 0.29f, 0.3f));
                GUILayout.Label(skill.description + (skill.level == 0 ? " Unlocks at " + skill.unlockStar + " stars." : ""), noteStyle);
                GUI.enabled = skill.level > 0 && skill.level < 5 && progress.shards >= 5 * (skill.level + 1) && me.gold >= 25 * (skill.level + 1) && !processing;
                if (GUILayout.Button("Upgrade · " + 5 * (skill.level + 1) + " shards / " + 25 * (skill.level + 1) + " gold")) Send(new GameCommand { type = "upgrade-skill", targetId = hero.id, skillIndex = skill.index });
                GUI.enabled = true; GUILayout.EndVertical();
            }
            GUILayout.Label((progress.expertise ? "EXPERTISE ACTIVE · " : "Expertise · ") + progress.expertiseDescription, noteStyle);
            GUILayout.Label("Stars unlock skill slots; skill levels and ascension ranks are separate. Active skills fire automatically at 1,000 rage.", noteStyle);
        }
        private static void Dot(Rect area, float x, float z, Color color, int size)
        {
            GUI.color = color; GUI.DrawTexture(new Rect(area.x + x / 80 * area.width - size / 2f, area.y + (1 - z / 80) * area.height - size / 2f, size, size), Texture2D.whiteTexture); GUI.color = Color.white;
        }
        private void Select(string id, string kind) { if(selectedId!=id)map.SelectionFeedback(id);selectedId=id;selectedKind=kind;map.selectedId=id; }
        private void ActOnSelection()
        {
            if (selectedKind == "army") { var enemy = Array.Find(world.armies, a => a.id == selectedId); if (enemy != null && enemy.ownerId != playerId) Send("attack-player", selectedId); }
            if (selectedKind == "stronghold") OpenWarfare(selectedId);
            if (selectedKind == "camp") Send("attack", selectedId);
            if (selectedKind == "node") Send("gather", selectedId);
            if (selectedKind == "site") { var site = Array.Find(world.sites, s => s.id == selectedId); if (site != null && site.locked) GuidePage(InterfacePage.Kingdom); else if (site != null && site.unknown) ScoutAt(site.x, site.z); else Send("capture", selectedId); }
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
            cityProgress.Reset();joining = true; worldReady = false; loadingError = ""; loadingStage = "Opening the kingdom gates";
            var body = new JoinRequest { name = playerName, civilization = civilizationIds[civilization], resumeToken = PlayerPrefs.GetString(SessionKey, ""), joinCode = kingdomJoinCode };
            using (var request = Request("/join", "POST", JsonUtility.ToJson(body)))
            {
                yield return request.SendWebRequest();
                if (request.result == UnityWebRequest.Result.Success)
                {
                    var session = JsonUtility.FromJson<JoinResponse>(request.downloadHandler.text);
                    token = session.token; playerId = session.playerId; activeMarchId = playerId; focused = false; lastSnapshotAt = Time.unscaledTime; interfacePage = InterfacePage.World;
                    PlayerPrefs.SetString(SessionKey, token); PlayerPrefs.SetString("ThronesOfMyth.name", playerName); PlayerPrefs.Save();
                    status = "Connected. Right-click ground to march; left-click objects to inspect.";
                    loadingStage = "Restoring your city and armies";
                    pollRoutine = StartCoroutine(Poll());
                }
                else { status = DescribeError(request); loadingError = status; }
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
                        if (next.version != 16) { status = "Server version mismatch. Stop and restart node index.mjs from the updated repository."; token = null; loadingError = status; break; }
                        lastSnapshotAt = Time.unscaledTime;
                        world = next; cameraControl?.SetMapBounds(new Rect(0,0,next.size,next.size)); me = Array.Find(world.players, p => p.id == playerId);
                        if (me != null)
                        {
                            cityProgress.Observe(serverUrl.TrimEnd('/')+"/"+playerId,me,Time.unscaledTime);
                            if (!OwnMarches().Exists(a => a.id == activeMarchId)) activeMarchId = playerId;
                            if (me.summonHistory.Length > 0 && me.summonHistory[0].id != lastDrawId)
                            {
                                if (lastDrawId != null) revealUntil = Time.unscaledTime + 0.8f;
                                lastDrawId = me.summonHistory[0].id;
                            }
                            else if (lastDrawId == null) lastDrawId = "";
                            if (!worldReady) { loadingStage = "Preparing the kingdom map"; yield return null; }
                            map.Sync(world, playerId, me.allianceId);ObserveSessionFeel();
                            worldReady = true; loadingError = "";RestorePendingOrder();
                            if (!string.IsNullOrEmpty(pendingFormationHero))
                            {
                                var assembled = OwnMarches().Find(a => a.commanderId == pendingFormationHero);
                                if (assembled != null) { activeMarchId = assembled.id; Select(assembled.id, "army"); cameraControl?.Focus(assembled.x, assembled.z); pendingFormationHero = null; }
                            }
                            if (!focused) { cameraControl?.Focus(me.homeX, me.homeZ); focused = true; }
                        }
                        else { loadingError = "Your city was not present in the kingdom snapshot. Return to entry and reconnect."; status = loadingError; worldReady = false; token = null; }
                    }
                    else
                    {
                        cityProgress.Reset();status = DescribeError(request); if (!worldReady) loadingError = status;
                        if (request.responseCode == 401) { ReturnToAccountEntry(status); yield break; }
                    }
                }
                float retryAt = Time.unscaledTime + (string.IsNullOrEmpty(loadingError) ? 0.2f : 2);
                while (Time.unscaledTime < retryAt && !retryLoading) yield return null;
                retryLoading = false;
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
            if (string.IsNullOrEmpty(token) || LoadingActive || commands.Count >= 8 || pendingOrder != null || accountBusy) return;
            command.marchId = activeMarchId;
            commands.Enqueue(command); if (!processing) StartCoroutine(ProcessCommands());
        }
        private IEnumerator ProcessCommands()
        {
            processing = true;
            while (commands.Count > 0 && !string.IsNullOrEmpty(token))
            {
                var command = commands.Dequeue();
                string body=JsonUtility.ToJson(command);
                PendingOrder retained=null;
                if(world?.persistence?.backend=="sqlite")
                {
                    retained=new PendingOrder{key=Guid.NewGuid().ToString("N"),body=body,playerId=playerId,server=serverUrl};
                    if(!SavePendingOrder(retained))break;
                    pendingOrder=retained;
                }
                yield return TransmitOrder(command,body,retained);
                if(pendingOrder!=null)break;
            }
            commands.Clear(); processing = false;
        }
        private void OnDestroy() { StopAllCoroutines(); commands.Clear(); commanderPreview?.Dispose(); cityDiorama?.Dispose(); theme?.Dispose(); PlayerPrefs.Save(); }
    }
}
