using System;
using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
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
        private Rect WindowRect => new Rect((ViewWidth - Mathf.Min(1320, ViewWidth - 72)) / 2, 92, Mathf.Min(1320, ViewWidth - 72), ViewHeight - 184);
        private Rect MinimapRect => new Rect(ViewWidth - 202, ViewHeight - 246, 184, 152);
        private Rect ContextRect => new Rect((ViewWidth - 620) / 2, ViewHeight - 228, 620, 138);
        private Rect QuestRect => new Rect(18,138,242,Opening==null?142:200);
        private Rect ActivityRect => new Rect(18,100,242,28);
        private Rect CityShortcutRect => new Rect(18,ViewHeight-148,124,44);
        private Rect NotificationRect => new Rect((ViewWidth-560)/2,90,560,72);
        private float MarchStep => Mathf.Min(72,(ViewHeight-390)/5);
        private Rect MarchRail => new Rect(ViewWidth-186,100,168,32+5*MarchStep);
        private string hoveredTooltip="";
        private float tooltipSince;
        private bool NotificationVisible => processing||(!string.IsNullOrEmpty(status)&&status!=previousToast)||pendingOrder!=null||Time.unscaledTime<toastUntil||Time.unscaledTime-lastSnapshotAt>6||!string.IsNullOrEmpty(world?.persistence?.error)||placeBeacon;
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
            openingEnabled=PlayerPrefs.GetInt("ThronesOfMyth.openingGuidance",1)==1;
        }
        private void OpenInterface(InterfacePage page)
        {
            placeBeacon = false; chooseScoutDestination = false;
            interfacePage = interfacePage == page ? InterfacePage.World : page;
            pageOpenedAt=Time.unscaledTime;
            contentScroll = Vector2.zero; rosterScroll = Vector2.zero;
            GUIUtility.keyboardControl = 0;
            if (interfacePage == InterfacePage.World) PlayerPrefs.Save();
        }
        private void CloseInterface()
        {
            GUIUtility.keyboardControl = 0; chooseScoutDestination = false;
            if (interfacePage != InterfacePage.World) { interfacePage = InterfacePage.World; PlayerPrefs.Save(); }
            else if (placeBeacon) placeBeacon = false;
            else { selectedId = ""; map.selectedId = ""; }
        }
        private bool InterfaceBlocksPoint(Vector3 screenPoint)
        {
            if (LoadingActive || string.IsNullOrEmpty(token) || interfacePage != InterfacePage.World) return true;
            var p = new Vector2(screenPoint.x / InterfaceScale, (Screen.height - screenPoint.y) / InterfaceScale);
            if (p.y < 88 || p.y > ViewHeight - 84) return true;
            if(NotificationVisible&&NotificationRect.Contains(p))return true;
            if(ActivityRect.Contains(p))return true;
            if(!compactHud)
            {
                if(QuestRect.Contains(p))return true;
                int jobs=(HasJob(me?.construction)?1:0)+(HasJob(me?.secondConstruction)?1:0)+(HasJob(me?.research)?1:0);
                if(jobs>0&&new Rect(18,QuestRect.yMax+10,242,jobs*52-6).Contains(p))return true;
            }
            if(MarchRail.Contains(p)||MinimapRect.Contains(p))return true;
            if(!string.IsNullOrEmpty(selectedId)&&ContextRect.Contains(p))return true;
            return CityShortcutRect.Contains(p);
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
                case "scout-send": return "Your scout is surveying the route. A report will arrive when it reaches the destination.";
                case "scout-recall": return "Scout recalled. It will return through the gate corridors.";
                case "move": return "Your march is on its way.";
                case "rally-create": return "Rally assembly has begun. Allies can contribute a prepared march.";
                case "rally-join": return "Your march is moving to the rally assembly point.";
                case "rally-leave": case "garrison-leave": case "campaign-recall": return "Alliance assignment ended; surviving troops return in their own march.";
                case "garrison-join": return "Your march is on its way to reinforce the structure.";
                case "beacon-dismantle": return "The structure was dismantled. Check your territory connections.";
                case "attack-player": return "Your march is approaching the opposing army.";
                case "hospital-heal": return "The House of Renewal has begun treatment.";
                case "hospital-cancel": return "Treatment canceled; wounded units and resources returned.";
                case "chat-send": return "Message sent.";
                case "marker-place": case "marker-remove": return "Alliance marker updated.";
                case "alliance-leave": case "alliance-kick": case "alliance-promote": case "alliance-demote": case "alliance-transfer": return "Alliance membership updated.";
                case "attack": return "Your march advances into battle.";
                case "gather": return "Your march is heading to gather resources.";
                case "return": return "Your march is returning home.";
                case "stop": return "Your march awaits new orders.";
                case "building-upgrade": case "upgrade": return "Your builders have begun their work.";
                case "train": case "recruit": return "Recruitment has begun. New units will await you in city reserves.";
                case "cancel-job": return "Work canceled. Resources returned to your treasury.";
                case "reinforce": return "Your march has received its reinforcements.";
                case "configure-march": return "Your formation is ready. Select a destination on the map.";
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
                case "kingdom-claim": return "Kingdom milestone reward claimed.";
                case "daily-claim": return "Daily task reward claimed. Your activity points have increased.";
                case "activity-chest": return "Activity chest opened. Its rewards are now in your city.";
                case "alliance-goal-claim": return "Your weekly alliance reward has been claimed.";
                case "journey-claim": return "Objective reward claimed. Your campaign progress is saved.";
                case "chapter-claim": return "Chapter reward claimed. Your chronicle has advanced.";
                case "quest": return "Chapter rewards have been claimed.";
                case "craft": return "The Forge of Dawn has begun its work.";
                case "equip-relic": case "unequip-relic": return "Your march's relic loadout has been updated.";
                case "alliance-create": case "alliance-join": return "Your oath has been sworn.";
                case "alliance-help": return "Your aid has reached your ally.";
                case "flag": return "An Oath Beacon extends your alliance's reach.";
                case "capture": return "Your march advances to hold the sacred site.";
                case "trade": return "The exchange is complete.";
                case "promote": return "Your reserves have begun veteran training.";
                case "inventory-supplies": return "Founding supplies added to your inventory.";
                case "inventory-use": return "Your selected supplies have been used.";
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
            theme.ReducedMotion = reducedMotion;theme.ApplyScale(InterfaceScale);
            cityDiorama?.SetVisible(interfacePage == InterfacePage.City && cityModelView && !LoadingActive);
            commanderPreview?.SetVisible(interfacePage == InterfacePage.Heroes && !LoadingActive && showCommanderModel);
            if (map != null) map.reducedMotion = reducedMotion;
            if(cameraControl!=null)cameraControl.reducedMotion=reducedMotion;
            if (!LoadingActive && world != null && interfacePage == InterfacePage.World) { DrawMarchRoute(); map.labelScale = InterfaceScale; if (labelsEnabled) map.DrawLabels(Camera.main,theme); }
            GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(InterfaceScale, InterfaceScale, 1));
            GUI.color = Color.white;
            if (LoadingActive) RenderLoadingScreen();
            else if (string.IsNullOrEmpty(token)) { if(accountEntryOpen) RenderAccountEntry(); else RenderKingdomEntry(); }
            else
            {
                DrawTopHud();
                if (me != null)
                {
                    if (interfacePage == InterfacePage.World)
                    {
                        DrawQuestHud(); DrawMarchHud(); DrawKingdomMinimap(); DrawContextActions();
                        if (theme.Button(CityShortcutRect, "City [C]", true)) OpenInterface(InterfacePage.City);
                        theme.OneLine(new Rect(18,ViewHeight-194,242,24),"THRONES OF MYTH",theme.Eyebrow);
                    }
                    else DrawInterfaceWindow();
                    DrawBottomNavigation();
                    DrawInterfaceToast();
                }
                else theme.Text(new Rect(ViewWidth / 2 - 180, ViewHeight / 2, 360, 50), "Entering your kingdom…", theme.Center);
            }
            if(Event.current.type==EventType.Repaint&&GUI.tooltip!=hoveredTooltip){hoveredTooltip=GUI.tooltip;tooltipSince=Time.unscaledTime;}
            if (!string.IsNullOrEmpty(GUI.tooltip)&&Time.unscaledTime-tooltipSince>.35f)
            {
                var point = Event.current.mousePosition;
                float tipHeight = Mathf.Clamp(theme.Small.CalcHeight(new GUIContent(GUI.tooltip), 274) + 18, 42, Mathf.Min(320,ViewHeight*.4f));
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
            if (!advancedConnection)
            {
                GUILayout.Space(10); GUILayout.Label(specialties[civilization], theme.Heading);
                GUILayout.Label("Civilizations share the same world and can join the same alliance.", theme.Body);
            }
            GUILayout.Space(20); GUI.enabled = !joining && !string.IsNullOrWhiteSpace(playerName);
            if (GUILayout.Button(joining ? "Opening the gates…" : "Enter your kingdom", theme.Primary, GUILayout.Height(54))) StartCoroutine(Join());
            GUI.enabled = true;
            GUILayout.Label("This device resumes your city using its saved session.", theme.Small);
            if(GUILayout.Button("Sign in to a protected account",theme.Tab,GUILayout.Height(28))) { accountEntryOpen=true;accountRegistered=false; }
            GUILayout.Space(18); advancedConnection = GUILayout.Toggle(advancedConnection, "Connection settings");
            if (advancedConnection) { GUILayout.Label("Server address", theme.Small); serverUrl = GUILayout.TextField(serverUrl, 160, GUILayout.Height(30)); GUILayout.Label("Kingdom invitation code (private tests)", theme.Small); kingdomJoinCode = GUILayout.PasswordField(kingdomJoinCode, '*', 128, GUILayout.Height(30)); }
            if (status != previousToast || !string.IsNullOrEmpty(status)) GUILayout.Label(status, theme.Small);
            GUILayout.EndArea();
            theme.Text(new Rect(120, ViewHeight - 55, 600, 25), "WINDOWS PLAYTEST 0.27  ·  THRONES OF MYTH", theme.Eyebrow);
        }
        private static string ShortNumber(int value) => value >= 1000000 ? (value / 1000000f).ToString("0.##") + "M" : value >= 10000 ? (value / 1000f).ToString("0.#") + "K" : value.ToString("N0");
        private void DrawTopHud()
        {
            MythInterfaceTheme.Fill(new Rect(0,0,ViewWidth,88),new Color(.025f,.055f,.075f,.78f));
            var profile=new Rect(18,16,236,62);theme.Panel(profile);
            theme.Circle(new Rect(29,25,44,44),MythInterfaceTheme.Gold);theme.Circle(new Rect(31,27,40,40),new Color(.09f,.17f,.20f));theme.Icon(new Rect(40,36,23,23),"citadel",MythInterfaceTheme.Cream);
            theme.OneLine(new Rect(85,22,157,23),me==null?"THRONES OF MYTH":me.name,theme.Heading);
            theme.OneLine(new Rect(85,49,157,19),me==null?"Age of Fallen Gods":me.ageName+" · Citadel "+me.cityLevel,theme.Small);
            if(me!=null)
            {
                string[] ids={"food","wood","stone","gold","aether","sigil"};string[] names={"FOOD","WOOD","STONE","GOLD","AETHER","SIGILS"};
                int[] values={me.food,me.wood,me.stone,me.gold,me.aether,me.sigils};float width=Mathf.Min(126,(ViewWidth-436)/6-6);
                for(int i=0;i<ids.Length;i++)
                {
                    var rect=new Rect(266+i*(width+6),20,width,54);theme.Panel(rect,false,true);
                    theme.Icon(new Rect(rect.x+9,rect.y+18,19,22),ids[i],i==4?new Color(.70f,.60f,.95f):MythInterfaceTheme.Gold);
                    theme.OneLine(new Rect(rect.x+36,rect.y+4,width-43,18),names[i],theme.Eyebrow);
                    theme.OneLine(new Rect(rect.x+36,rect.y+23,width-43,27),ShortNumber(values[i]),theme.Number);
                    if(GUI.Button(rect,new GUIContent("",values[i].ToString("N0")+" "+names[i].ToLowerInvariant()),GUIStyle.none))OpenInterface(i==5?InterfacePage.Temple:InterfacePage.Market);
                }
            }
            bool stale=Time.unscaledTime-lastSnapshotAt>6;theme.Circle(new Rect(ViewWidth-156,37,7,7),stale?MythInterfaceTheme.Red:MythInterfaceTheme.Teal);
            theme.OneLine(new Rect(ViewWidth-143,27,88,24),stale?"Reconnecting":"Connected",theme.Small);
            if(theme.Button(new Rect(ViewWidth-49,24,32,34),"•••"))OpenInterface(InterfacePage.Settings);
        }
        private void DrawQuestHud()
        {
            if(theme.Button(new Rect(ActivityRect.x,ActivityRect.y,116,28),compactHud?"Activity +":"Activity −"))compactHud=!compactHud;
            var daily=world.activity?.daily;bool readyDaily=daily!=null&&(Array.Exists(daily.chests,c=>c.canClaim)||Array.Exists(daily.tasks,t=>t.canClaim));
            if(theme.Button(new Rect(ActivityRect.x+124,ActivityRect.y,118,28),readyDaily?"Daily · Claim":"Daily · "+(daily==null?0:Mathf.Min(100,daily.points))+"/100",readyDaily))OpenActivity();
            if(compactHud)return;
            var r=QuestRect;theme.Panel(r);var chapter=CurrentChapter;var task=NextTask(chapter);
            bool ready=chapter!=null&&(chapter.canClaim||task!=null&&task.canClaim);var intro=ready?null:Opening;
            theme.OneLine(new Rect(r.x+12,r.y+9,r.width-24,20),intro!=null?"FIRST STEPS · "+intro.Number+" / 9":chapter==null?"CAMPAIGN COMPLETE":chapter.title,theme.Eyebrow);
            theme.Text(new Rect(r.x+12,r.y+36,r.width-24,44),intro!=null?intro.Title:task==null?chapter==null?"Write the next legend.":"Your chapter reward awaits.":task.title,new GUIStyle(theme.Heading){fontSize=Mathf.Max(17,Mathf.CeilToInt(14/InterfaceScale))});
            theme.OneLine(new Rect(r.x+12,r.yMax-54,126,20),intro!=null?"Suggested next step":task==null?"Open campaign":task.progress+" / "+task.goal+(task.canClaim?" · READY":""),theme.Small);
            if(intro==null)theme.Bar(new Rect(r.x+12,r.yMax-23,126,5),task==null?1:(float)task.progress/Mathf.Max(1,task.goal),MythInterfaceTheme.Gold);
            if(intro!=null)theme.Text(new Rect(r.x+12,r.y+82,r.width-24,50),intro.Hint,theme.Small);
            if(theme.Button(new Rect(r.xMax-90,r.yMax-51,78,34),ready?"Claim":intro!=null?"Show":task==null?"View":"Go",ready))
            {
                if(chapter!=null&&chapter.canClaim)Send("chapter-claim",chapter.id);
                else if(task!=null&&task.canClaim)Send("journey-claim",task.id);
                else if(intro!=null)GuideOpening(intro);else if(task!=null)GuideObjective(task);else GuidePage(InterfacePage.Campaign);
            }
            if(GUI.Button(new Rect(r.x,r.y,r.width,80),GUIContent.none,GUIStyle.none))GuidePage(InterfacePage.Campaign);
            float y=r.yMax+10;
            foreach(var job in new[]{me.construction,me.secondConstruction,me.research})
            {
                if(!HasJob(job))continue;
                var row=new Rect(18,y,242,46);theme.Panel(row,false,true);theme.Icon(new Rect(row.x+10,row.y+10,21,24),job.type=="research"?"research":"builders",MythInterfaceTheme.Gold);
                theme.OneLine(new Rect(row.x+40,row.y+5,150,19),JobName(job),theme.Small);
                theme.OneLine(new Rect(row.xMax-47,row.y+5,38,19),Mathf.CeilToInt(job.remaining)+"s",theme.Small);
                theme.Bar(new Rect(row.x+40,row.y+32,190,4),1-job.remaining/job.duration,MythInterfaceTheme.Teal);
                if(GUI.Button(row,GUIContent.none,GUIStyle.none))OpenInterface(job.type=="research"?InterfacePage.Research:InterfacePage.City);y+=52;
            }
        }
        private void DrawMarchHud()
        {
            var own=OwnMarches();float x=MarchRail.x;
            theme.OneLine(new Rect(x,100,168,22),"MARCHES  "+own.Count+" / "+me.marchSlots,theme.Eyebrow);
            for(int i=0;i<5;i++)
            {
                var r=new Rect(x,132+i*MarchStep,168,MarchStep-6);
                if(i<own.Count)
                {
                    var army=own[i];theme.Panel(r,army.id==ActiveArmy.id);
                    var definition=Array.Find(world.commanders,h=>h.id==army.commanderId);
                    theme.Portrait(new Rect(x+8,r.y+8,34,34),army.commanderId,RarityColor(definition.color));
                    theme.OneLine(new Rect(x+50,r.y+5,110,19),HeroName(army.commanderId),theme.Small);
                    theme.OneLine(new Rect(x+50,r.y+24,110,17),ArmyPresentationState.Label(army),theme.Small);
                    theme.Bar(new Rect(x+50,r.yMax-13,108,4),(float)army.health/Mathf.Max(1,army.maxHealth),MythInterfaceTheme.Teal);
                    theme.Bar(new Rect(x+50,r.yMax-5,108,2),army.rage/1000f,MythInterfaceTheme.Gold);
                    if(GUI.Button(r,new GUIContent("","Select and focus "+HeroName(army.commanderId)),GUIStyle.none)){activeMarchId=army.id;Select(army.id,"army");cameraControl?.Focus(army.x,army.z);}
                }
                else
                {
                    bool unlocked=i<me.marchSlots;theme.Panel(r,false,true);
                    theme.Icon(new Rect(x+12,r.y+15,22,24),unlocked?"army":"lock",unlocked?MythInterfaceTheme.Gold:MythInterfaceTheme.Muted);
                    theme.OneLine(new Rect(x+46,r.y+8,112,19),unlocked?"+ Deploy march":"March "+(i+1),theme.Small);
                    theme.OneLine(new Rect(x+46,r.y+29,112,18),unlocked?"Ready reserves":"Unlock in Age "+(i+1),theme.Small);
                    if(GUI.Button(r,GUIContent.none,GUIStyle.none)){if(unlocked)BeginFormation(false);else OpenInterface(InterfacePage.City);}
                }
            }
        }
        private void DrawKingdomMinimap()
        {
            var r = MinimapRect; theme.Panel(r);
            if (theme.Button(new Rect(r.x + 10, r.y + 5, r.width - 20, 25), "KINGDOM CHRONICLE")) GuidePage(InterfacePage.Kingdom);
            var mapArea = new Rect(r.x + 12, r.y + 35, r.width - 24, r.height - 49);
            MythInterfaceTheme.Fill(mapArea, new Color(0.23f, 0.33f, 0.29f));
            MythInterfaceTheme.Line(new Vector2(mapArea.center.x, mapArea.y), new Vector2(mapArea.center.x, mapArea.yMax), 1, new Color(0.7f, 0.6f, 0.35f, 0.55f));
            MythInterfaceTheme.Line(new Vector2(mapArea.x, mapArea.center.y), new Vector2(mapArea.xMax, mapArea.center.y), 1, new Color(0.7f, 0.6f, 0.35f, 0.55f));
            if (world.exploration != null)
            {
                var known = new HashSet<int>(world.exploration.explored); var sight = new HashSet<int>(world.exploration.visible);
                for (int z = 0; z < 20; z++) for (int x = 0; x < 20; x++)
                { int cell = z * 20 + x; if (!sight.Contains(cell)) MythInterfaceTheme.Fill(new Rect(mapArea.x + x * mapArea.width / 20, mapArea.y + (19 - z) * mapArea.height / 20, mapArea.width / 20 + 1, mapArea.height / 20 + 1), known.Contains(cell) ? new Color(0.08f, 0.12f, 0.14f, 0.6f) : new Color(0.03f, 0.05f, 0.08f)); }
                foreach (var scout in world.exploration.scouts) Dot(mapArea, scout.x, scout.z, Color.cyan, 4);
            }
            foreach (var boss in world.strongholds) Dot(mapArea, boss.x, boss.z, MythInterfaceTheme.Red, 6);
            foreach (var site in world.sites) Dot(mapArea, site.x, site.z, new Color(0.85f, 0.72f, 0.95f), 5);
            foreach (var army in world.armies) Dot(mapArea, army.x, army.z, army.ownerId==playerId?MythInterfaceTheme.Teal:!string.IsNullOrEmpty(me.allianceId)&&army.allianceId==me.allianceId?new Color(.4f,.85f,.6f):MythInterfaceTheme.Red, army.id == ActiveArmy.id ? 6 : 3);
            Dot(mapArea, me.homeX, me.homeZ, Color.white, 5);
            if (Event.current.type == EventType.MouseDown && mapArea.Contains(Event.current.mousePosition))
            { cameraControl?.Focus((Event.current.mousePosition.x - mapArea.x) / mapArea.width * 80, (1 - (Event.current.mousePosition.y - mapArea.y) / mapArea.height) * 80); Event.current.Use(); }
        }
        private void DrawBottomNavigation()
        {
            float width=148,start=(ViewWidth-(width*5+24))/2;
            for(int i=0;i<PrimaryPages.Length;i++)
            {
                var rect=new Rect(start+i*(width+6),ViewHeight-70,width,48);
                if(theme.NavigationButton(rect,PrimaryTitles[i],PrimaryIcons[i],interfacePage==PrimaryPages[i],i==4?"Every screen and action":"Open "+PrimaryTitles[i]))
                {if(interfacePage!=PrimaryPages[i])Navigate(PrimaryPages[i]);else CloseInterface();}
            }
            if(interfacePage==InterfacePage.World&&theme.Button(new Rect(18,ViewHeight-36,166,28),"Controls & shortcuts"))OpenInterface(InterfacePage.Settings);
        }
        private void DrawInterfaceToast()
        {
            if (status != previousToast) { previousToast = status; toastUntil = Time.unscaledTime + 5; }
            string message = processing?"Waiting for the kingdom server…":pendingOrder!=null ? string.IsNullOrEmpty(pendingOrder.key)?"Check your last order, then open Settings to clear its unreadable record.":"Confirm your last order before sending another." : world.persistence != null && !string.IsNullOrEmpty(world.persistence.error) ? world.persistence.error
                : Time.unscaledTime - lastSnapshotAt > 6 ? "Connection interrupted. Retrying your kingdom server…"
                : placeBeacon ? "PLACE BEACON · Click near the selected march. Esc cancels." : Time.unscaledTime < toastUntil ? status : "";
            if (string.IsNullOrEmpty(message)) return;
            var r=NotificationRect;
            bool interrupted=Time.unscaledTime-lastSnapshotAt>6;
            bool persistenceError=world.persistence!=null&&!string.IsNullOrEmpty(world.persistence.error);
            string heading=processing?"ORDER PENDING":pendingOrder!=null?"CONFIRM YOUR ORDER":interrupted?"RECONNECTING":persistenceError||lastOrderFailed&&Time.unscaledTime-orderNoticeAt<6?"ACTION NEEDS ATTENTION":placeBeacon?"PLACE ALLIANCE BEACON":Time.unscaledTime-orderNoticeAt<6?"ORDER ACCEPTED":"KINGDOM UPDATE";
            var accent=processing&&!interrupted&&!persistenceError?MythInterfaceTheme.Gold:interrupted||persistenceError||lastOrderFailed&&Time.unscaledTime-orderNoticeAt<6?MythInterfaceTheme.Red:pendingOrder!=null?MythInterfaceTheme.Gold:MythInterfaceTheme.Teal;
            if(pendingOrder!=null)
            {
                theme.Panel(r);MythInterfaceTheme.Fill(new Rect(r.x,r.y+5,3,r.height-10),accent);
                theme.OneLine(new Rect(r.x+14,r.y+4,r.width-28,22),heading,theme.Eyebrow);
                theme.OneLine(new Rect(r.x+14,r.y+30,r.width-138,32),message,theme.Small);
                if(theme.Button(new Rect(r.xMax-116,r.y+29,102,36),processing?"Confirming…":"Retry order",true,!processing&&!accountBusy&&!string.IsNullOrEmpty(pendingOrder.key)))StartCoroutine(RetryPendingOrder());
            }
            else theme.Notice(r,heading,message,accent,Time.unscaledTime-orderNoticeAt);
        }
        private void DrawInterfaceWindow()
        {
            MythInterfaceTheme.Fill(new Rect(0, 88, ViewWidth, ViewHeight - 172), new Color(0.015f, 0.03f, 0.045f, 0.72f));
            var r = WindowRect; theme.Panel(r);
            string title=interfacePage==InterfacePage.City?"Your civilization":interfacePage==InterfacePage.Heroes?"Hall of Commanders":interfacePage==InterfacePage.Formation?"Assemble your march":GameNavigation.Title(interfacePage);
            theme.OneLine(new Rect(r.x+25,r.y+16,320,38),title,theme.Title);
            if(interfacePage!=InterfacePage.Menu&&theme.Button(new Rect(r.xMax-152,r.y+16,84,34),"Menu"))OpenInterface(InterfacePage.Menu);
            if (theme.Button(new Rect(r.xMax - 57, r.y + 14, 38, 38), "×")) { CloseInterface(); return; }
            var inner = new Rect(r.x + 20, r.y + 70, r.width - 40, r.height - 90);
            var before=GUI.color;
            if(!reducedMotion){float alpha=Mathf.Clamp01((Time.unscaledTime-pageOpenedAt)/.13f);GUI.color=new Color(before.r,before.g,before.b,before.a*(.70f+.30f*alpha));}
            if(interfacePage==InterfacePage.City)opening.CityViewed=true;
            if(interfacePage==InterfacePage.Reports)opening.OutcomeViewed=true;
            if(interfacePage==InterfacePage.Menu)DrawMenuWindow(inner);
            else if (interfacePage == InterfacePage.Formation) RenderFormationWindow(inner);
            else if (interfacePage == InterfacePage.City) RenderCityWindow(inner);
            else if (interfacePage == InterfacePage.Heroes) RenderHeroesWindow(inner);
            else if (interfacePage == InterfacePage.Temple) RenderTempleWindow(inner);
            else if (interfacePage == InterfacePage.Research) RenderResearchWindow(inner);
            else if (interfacePage == InterfacePage.Settings) RenderSettingsWindow(inner);
            else if (interfacePage == InterfacePage.Account) RenderAccountWindow(inner);
            else if (interfacePage == InterfacePage.Inventory) RenderInventoryWindow(inner);
            else if (interfacePage == InterfacePage.Rankings) RenderRankingsWindow(inner);
            else RenderActivityWindow(inner);
            GUI.color=before;
            if (placeBeacon) interfacePage = InterfacePage.World;
        }
        private void RenderActivityWindow(Rect r)
        {
            var left = new Rect(r.x, r.y, 202, r.height);
            var main = new Rect(r.x + 222, r.y, r.width - 222, r.height);
            theme.Panel(left, false, true);
            int group=0,count=0;
            foreach(var entry in GameNavigation.Entries)if(entry.Page==interfacePage){group=entry.Group;break;}
            foreach(var entry in GameNavigation.Entries)if(entry.Group==group)count++;
            var navigation=new Rect(left.x+12,left.y+12,left.width-24,left.height-24);
            activityNavScroll=GUI.BeginScrollView(navigation,activityNavScroll,new Rect(0,0,navigation.width-16,(count+1)*42));
            int row=0;
            foreach(var entry in GameNavigation.Entries)
            {
                if(entry.Group!=group)continue;
                if(theme.NavigationButton(new Rect(0,row++*42,navigation.width-16,36),entry.Title,"",interfacePage==entry.Page,entry.Hint)&&interfacePage!=entry.Page)Navigate(entry.Page);
            }
            if(theme.NavigationButton(new Rect(0,row*42,navigation.width-16,36),"All activities","",false,"Open the kingdom menu"))OpenInterface(InterfacePage.Menu);
            GUI.EndScrollView();
            theme.Panel(main, false, true);
            GUILayout.BeginArea(new Rect(main.x + 20, main.y + 12, main.width - 40, main.height - 24));
            contentScroll = GUILayout.BeginScrollView(contentScroll);
            if (interfacePage == InterfacePage.Marches) DrawArmy();
            if (interfacePage == InterfacePage.Training) DrawTraining();
            if (interfacePage == InterfacePage.Hospital) DrawHospital();
            if (interfacePage == InterfacePage.Reports) DrawBattleReports();
            if (interfacePage == InterfacePage.Chat) DrawChat();
            if (interfacePage == InterfacePage.Warfare) DrawWarfare();
            if (interfacePage == InterfacePage.Exploration) DrawExploration();
            if (interfacePage == InterfacePage.Campaign) DrawCampaign();
            if (interfacePage == InterfacePage.Activity) DrawActivity();
            if (interfacePage == InterfacePage.Kingdom) DrawKingdomStages();
            if (interfacePage == InterfacePage.Forge) DrawForge();
            if (interfacePage == InterfacePage.Market) DrawMarket();
            if (interfacePage == InterfacePage.Alliance) DrawAlliance();
            if (interfacePage == InterfacePage.Chronicle) DrawJournal();
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        private int routeDashBudget;
        private void DrawMarchRoute()
        {
            if (ActiveArmy == null || !ActiveArmy.hasOrder || Camera.main == null) return;
            routeDashBudget=160;
            var points = ActiveArmy.route;
            var start = new Vector3(ActiveArmy.x, 0.3f, ActiveArmy.z);
            if(points!=null&&points.Length>0)for(int index=0;index<points.Length;index++)
            {
                var point=points[index];var end=new Vector3(point.x,.3f,point.z);DrawRouteSegment(start,end,index==points.Length-1);start=end;
            }
            else DrawRouteSegment(start,new Vector3(ActiveArmy.targetX,.3f,ActiveArmy.targetZ),true);
        }
        private void DrawRouteSegment(Vector3 origin, Vector3 destination,bool endpoint)
        {
            var from = Camera.main.WorldToScreenPoint(origin);
            var to = Camera.main.WorldToScreenPoint(destination);
            if (from.z <= 0 || to.z <= 0 || Vector2.Distance(new Vector2(from.x, from.y), new Vector2(to.x, to.y)) < 4) return;
            var start = new Vector2(from.x, Screen.height - from.y); var end = new Vector2(to.x, Screen.height - to.y);
            var direction = (end - start).normalized; float distance = Vector2.Distance(start, end);
            Color color = (ActiveArmy.state == "Attacking" || ActiveArmy.state == "Siege fighting") ? MythInterfaceTheme.Red : ActiveArmy.state == "Gathering" ? MythInterfaceTheme.Teal : ActiveArmy.state == "Returning" ? new Color(0.5f, 0.8f, 1) : MythInterfaceTheme.Gold;
            float offset = reducedMotion ? 0 : Time.unscaledTime * 12 % 24;
            for (float d = offset; d < distance&&routeDashBudget>0; d += 24)
            {
                var a = start + direction * d; var b = start + direction * Mathf.Min(distance, d + 12); var middle = (a + b) / 2;
                if(!InterfaceBlocksPoint(new Vector3(middle.x,Screen.height-middle.y,0))){MythInterfaceTheme.Line(a,b,2,color);routeDashBudget--;}
            }
            if (endpoint&&!InterfaceBlocksPoint(new Vector3(end.x, Screen.height - end.y, 0)))
            {
                var across = new Vector2(-direction.y, direction.x);
                MythInterfaceTheme.Line(end, end - direction * 12 + across * 6, 2, color);
                MythInterfaceTheme.Line(end, end - direction * 12 - across * 6, 2, color);
            }
        }
    }
}
