using System;
using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private int inspectedTechnology,heroDetailTab;
        private string talentConfirmId;
        private CityDiorama cityDiorama;
        private readonly CityProgressFeedback cityProgress=new CityProgressFeedback();
        private bool cityModelView = true;
        private CommanderPreview commanderPreview;
        private CaptainPresentation captainPresentation;
        private Texture2D captainStudy;
        private bool showCommanderModel, preferCaptainStudy;
        private Vector2 heroRosterScroll, heroBodyScroll;
        private const string CaptainCredit = "Model created with Meshy – CC BY 4.0 License";
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
            if(cityModelView)return;
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
                    theme.Hint(cell,building.description);if (GUI.Button(cell, new GUIContent("", building.description), GUIStyle.none)) { selectedBuilding = i; contentScroll = Vector2.zero; }
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
            var productionLine = CityPresentationData.ProductionLine(selected, me.passiveLimit);
            if (productionLine.Length > 0) GUILayout.Label(productionLine, theme.Small);
            if (selected.id == "scoutcamp") DrawScoutCampPanel(selected.scoutCamp);
            if (selected.level < selected.maxLevel)
            {
                GUILayout.Space(16); GUILayout.Label("NEXT DEVELOPMENT", theme.Eyebrow);
                DrawPrerequisites(selected.prerequisites);GUILayout.Label(Cost(selected.nextCost), theme.Body);
                GUILayout.Label("Build time · " + Mathf.CeilToInt(selected.nextDuration) + " seconds", theme.Small);
                string reason=processing?"Sending your order…":pendingOrder!=null?"Confirm your previous order first.":selected.lockedReason;
                if(theme.Action(selected.level==0?"Build institution":"Upgrade to level "+(selected.level+1),selected.canUpgrade&&!processing&&pendingOrder==null,reason))Send("building-upgrade",selected.id);
            }
            GUILayout.Space(18); DrawConstructionJobs();
            GUILayout.Space(12); GUILayout.Label("Production rests at " + me.passiveLimit.ToString("N0") + " of each resource. Gathering and rewards can exceed this limit.", theme.Small);
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        private static readonly Color HallBronze=new Color(0.72f,0.55f,0.28f,1f);
        private static readonly Color HallMarble=new Color(0.78f,0.74f,0.66f,0.16f);
        private static Rect HallRect(Rect origin,HallFrame frame)=>new Rect(origin.x+frame.X,origin.y+frame.Y,frame.W,frame.H);
        private Texture2D CaptainStudy=>captainStudy!=null?captainStudy:captainStudy=Resources.Load<Texture2D>("Art/FrontierCaptainShowcase");
        private List<CommanderData> VisibleCommanders()
        {
            var heroes=new List<CommanderData>();
            if(world?.commanders==null)return heroes;
            foreach(var hero in world.commanders)
            {
                bool owned=Array.IndexOf(me.ownedCommanders,hero.id)>=0;
                if(onlyOwnedHeroes&&!owned)continue;
                if(!string.IsNullOrEmpty(heroSearch)&&hero.name.IndexOf(heroSearch,StringComparison.OrdinalIgnoreCase)<0)continue;
                if(heroFilter!=0&&hero.rarity!=new[]{"","Common","Rare","Epic","Legendary"}[heroFilter])continue;
                heroes.Add(hero);
            }
            return heroes;
        }
        private void CycleCommander(int direction)
        {
            var heroes=VisibleCommanders();
            if(heroes.Count==0)return;
            int index=heroes.FindIndex(hero=>hero.id==inspectedHeroId);
            if(index<0)index=0;
            inspectedHeroId=heroes[(index+direction+heroes.Count)%heroes.Count].id;
            heroBodyScroll=Vector2.zero;
        }
        private void RenderHeroesWindow(Rect r)
        {
            CommanderHallLayout.Place(r.width,r.height,out var rosterFrame,out var stageFrame,out var cardFrame,out var figureFrame);
            DrawHallStage(HallRect(r,stageFrame),HallRect(r,figureFrame));
            DrawHallRoster(HallRect(r,rosterFrame));
            DrawHallCard(HallRect(r,cardFrame));
        }
        private void DrawSkillGlyph(Rect rect,int index)
        {
            var ink=MythInterfaceTheme.Gold;
            float u=rect.width/24f;
            var center=rect.center;
            if(index==0)
            {
                MythInterfaceTheme.Line(new Vector2(center.x,rect.y+u),new Vector2(center.x,rect.yMax-u),2.2f*u,ink);
                theme.Diamond(new Rect(center.x-3.5f*u,rect.y,7*u,9*u),ink);
            }
            else if(index==1)
            {
                theme.Circle(new Rect(rect.x+3*u,rect.y+2*u,18*u,20*u),ink);
                theme.Diamond(new Rect(center.x-4*u,center.y-4*u,8*u,8*u),new Color(0.12f,0.2f,0.32f));
            }
            else if(index==2)
            {
                MythInterfaceTheme.Line(new Vector2(rect.x+4*u,rect.yMax-4*u),new Vector2(rect.x+14*u,rect.y+8*u),3*u,ink);
                MythInterfaceTheme.Line(new Vector2(rect.x+14*u,rect.y+8*u),new Vector2(rect.xMax-2*u,rect.y+3*u),2*u,ink);
                theme.Circle(new Rect(rect.xMax-8*u,rect.y+u,7*u,7*u),ink);
            }
            else
            {
                theme.Circle(new Rect(center.x-4*u,center.y-4*u,8*u,8*u),ink);
                for(int ray=0;ray<8;ray++)
                {
                    float angle=ray*45f*Mathf.Deg2Rad;
                    var dir=new Vector2(Mathf.Cos(angle),Mathf.Sin(angle));
                    MythInterfaceTheme.Line(center+dir*6*u,center+dir*11*u,1.6f*u,ink);
                }
            }
        }
        private void DrawHallStage(Rect stage,Rect figure)
        {
            var selected=Array.Find(world.commanders,hero=>hero.id==inspectedHeroId)??world.commanders[0];
            bool livingCaptain=selected.id=="captain"&&!showCommanderModel&&!preferCaptainStudy&&CaptainPresentation.Available;
            theme.Backdrop(stage,livingCaptain?0.15f:0.72f);
            if(!livingCaptain)
            {
                MythInterfaceTheme.Fill(stage,new Color(0.05f,0.09f,0.16f,0.42f));
                MythInterfaceTheme.Fill(new Rect(stage.x,stage.yMax-stage.height*0.22f,stage.width,stage.height*0.22f),new Color(0.18f,0.14f,0.08f,0.28f));
            }
            MythInterfaceTheme.Fill(new Rect(stage.x,stage.y,stage.width,2),HallBronze);
            if(showCommanderModel)
            {
                if(commanderPreview==null)commanderPreview=new CommanderPreview();
                commanderPreview.Draw(new Rect(stage.x+8,stage.y+8,stage.width-16,stage.height-46),selected,theme,reducedMotion);
                theme.OneLine(new Rect(stage.x+12,stage.yMax-32,stage.width-168,24),"Low-poly field model · poses are previews, not a live mesh",theme.Small);
            }
            else if(livingCaptain)
            {
                if(captainPresentation==null)captainPresentation=new CaptainPresentation();
                captainPresentation.Draw(new Rect(stage.x+8,stage.y+8,stage.width-16,stage.height-46),theme,reducedMotion);
                theme.OneLine(new Rect(stage.x+12,stage.yMax-32,stage.width-168,24),CaptainCredit,theme.Small);
            }
            else if(selected.id=="captain"&&CaptainStudy!=null)
            {
                GUI.BeginGroup(stage);
                float bob=reducedMotion?0:Mathf.Sin(Time.unscaledTime*0.9f)*3f;
                var local=new Rect(figure.x-stage.x,figure.y-stage.y+bob,figure.width,figure.height);
                theme.Circle(new Rect(local.x+local.width*0.18f,local.yMax-local.height*0.16f,local.width*0.64f,local.height*0.1f),new Color(0.72f,0.55f,0.28f,0.32f));
                if(!reducedMotion)for(int i=0;i<6;i++)
                {
                    float travel=Mathf.Repeat(Time.unscaledTime*14f+i*48f,stage.height-24f);
                    theme.Diamond(new Rect(18f+i*(stage.width-36f)/6f,stage.height-20f-travel,5,5),new Color(0.9f,0.76f,0.46f,0.28f));
                }
                GUI.DrawTexture(local,CaptainStudy,ScaleMode.ScaleToFit,true);
                GUI.EndGroup();
                theme.OneLine(new Rect(stage.x+12,stage.yMax-32,stage.width-168,24),"Painted study · "+CaptainCredit,theme.Small);
            }
            else
            {
                float diameter=Mathf.Min(stage.width*0.62f,stage.height*0.58f);
                var medallion=new Rect(stage.center.x-diameter*0.5f,stage.y+28,diameter,diameter);
                theme.Circle(new Rect(medallion.x-10,medallion.y-10,diameter+20,diameter+20),new Color(0.72f,0.55f,0.28f,0.35f));
                theme.Portrait(medallion,selected.id,RarityColor(selected.color));
                theme.OneLine(new Rect(stage.x+12,stage.yMax-32,stage.width-168,24),"Painted portrait · the full-body study is the Frontier Captain",theme.Small);
            }
            string stageToggle=showCommanderModel?"Hall figure":livingCaptain?"Painted study":selected.id=="captain"&&CaptainPresentation.Available?"Living figure":"Field model";
            if(theme.Button(new Rect(stage.xMax-150,stage.yMax-36,138,28),stageToggle))
            {
                if(showCommanderModel)showCommanderModel=false;
                else if(selected.id=="captain"&&CaptainPresentation.Available)preferCaptainStudy=!preferCaptainStudy;
                else showCommanderModel=true;
            }
        }
        private void DrawHallRoster(Rect roster)
        {
            MythInterfaceTheme.Fill(roster,new Color(0.04f,0.065f,0.1f,0.92f));
            MythInterfaceTheme.Fill(new Rect(roster.xMax-2,roster.y,2,roster.height),HallBronze);
            GUI.SetNextControlName("CommanderSearch");
            heroSearch=GUI.TextField(new Rect(roster.x+6,roster.y+4,roster.width-12,28),heroSearch??"",24);
            if(string.IsNullOrEmpty(heroSearch)&&GUI.GetNameOfFocusedControl()!="CommanderSearch")theme.Text(new Rect(roster.x+12,roster.y+8,roster.width-20,18),"Search",theme.Small);
            string[] filters={"All","Common","Rare","Epic","Legend"};
            if(theme.Button(new Rect(roster.x+6,roster.y+36,roster.width-12,24),filters[Mathf.Clamp(heroFilter,0,4)])){heroFilter=(heroFilter+1)%5;heroRosterScroll=Vector2.zero;}
            if(theme.Button(new Rect(roster.x+6,roster.y+62,roster.width-12,24),onlyOwnedHeroes?"Mine":"Any"))onlyOwnedHeroes=!onlyOwnedHeroes;
            var heroes=VisibleCommanders();
            var list=new Rect(roster.x+4,roster.y+92,roster.width-8,roster.height-98);
            float step=62f;
            heroRosterScroll=GUI.BeginScrollView(list,heroRosterScroll,new Rect(0,0,list.width-16,Mathf.Max(list.height,heroes.Count*step+8)));
            for(int i=0;i<heroes.Count;i++)
            {
                var hero=heroes[i];
                bool owned=Array.IndexOf(me.ownedCommanders,hero.id)>=0;
                var cell=new Rect((list.width-16-52)*0.5f,6+i*step,52,52);
                bool chosen=inspectedHeroId==hero.id;
                bool hover=cell.Contains(Event.current.mousePosition);
                if(chosen)theme.Circle(new Rect(cell.x-4,cell.y-4,60,60),HallBronze);
                else if(hover)theme.Circle(new Rect(cell.x-3,cell.y-3,58,58),new Color(0.9f,0.76f,0.46f,0.85f));
                theme.Portrait(cell,hero.id,owned?RarityColor(hero.color):new Color(0.25f,0.28f,0.3f));
                theme.Hint(cell,hero.name+" · "+(owned?hero.rarity:"Not recruited"));
                if(GUI.Button(cell,GUIContent.none,GUIStyle.none)){inspectedHeroId=hero.id;heroBodyScroll=Vector2.zero;}
            }
            GUI.EndScrollView();
        }
        private void DrawHallCard(Rect card)
        {
            var selected=Array.Find(world.commanders,hero=>hero.id==inspectedHeroId)??world.commanders[0];
            var progress=Array.Find(me.heroProgress,hero=>hero.id==selected.id);
            bool recruited=Array.IndexOf(me.ownedCommanders,selected.id)>=0;
            MythInterfaceTheme.Fill(card,new Color(0.07f,0.11f,0.18f,0.94f));
            MythInterfaceTheme.Fill(new Rect(card.x,card.y,card.width,2),HallBronze);
            MythInterfaceTheme.Fill(new Rect(card.x,card.yMax-2,card.width,2),HallBronze);
            MythInterfaceTheme.Fill(new Rect(card.x,card.y,2,card.height),HallMarble);
            float x=card.x+16,width=card.width-32,y=card.y+12;
            theme.Text(new Rect(x,y,width,18),selected.rarity.ToUpperInvariant()+" COMMANDER",theme.Eyebrow);
            theme.Text(new Rect(x,y+20,width,34),selected.name,theme.Title);
            MythInterfaceTheme.Fill(new Rect(x,y+54,72,2),MythInterfaceTheme.Gold);
            theme.Text(new Rect(x,y+60,width,42),selected.description,theme.Body);
            theme.Hint(new Rect(x,y+56,width,42),selected.description);
            if(progress!=null)
            {
                for(int i=0;i<6;i++)theme.Diamond(new Rect(x+i*24,y+106,18,18),i<progress.stars?MythInterfaceTheme.Gold:new Color(0.24f,0.28f,0.32f));
                theme.OneLine(new Rect(x+140,y+100,width-140,20),recruited?"STARS "+progress.stars+" / 6":"Not recruited",theme.Eyebrow);
                int cap=Math.Max(1,progress.stars*10);
                bool capped=progress.heroLevel>=cap;
                float into=progress.xp%100f;
                theme.OneLine(new Rect(x,y+124,width,18),"LEVEL "+progress.heroLevel,theme.Heading);
                theme.Bar(new Rect(x,y+146,width,10),capped?1f:into/100f,MythInterfaceTheme.Gold);
                theme.OneLine(new Rect(x,y+158,width,18),capped?(int)progress.xp+" XP · star cap "+cap:(int)progress.xp+" XP · "+(int)into+" / 100 toward the next level",theme.Small);
            }
            float skillsY=progress==null?y+108:y+182;
            if(progress?.skills!=null)
            {
                int shown=Math.Min(4,progress.skills.Length);
                for(int i=0;i<shown;i++)
                {
                    var skill=progress.skills[i];
                    var box=new Rect(x+i*58,skillsY,48,48);
                    theme.Circle(box,new Color(0.1f,0.16f,0.24f,1f));
                    theme.Circle(new Rect(box.x+3,box.y+3,42,42),i==0?new Color(0.13f,0.24f,0.38f):new Color(0.28f,0.2f,0.1f));
                    DrawSkillGlyph(new Rect(box.x+8,box.y+8,32,32),i);
                    theme.Hint(box,skill.name+" · "+skill.description);
                    if(GUI.Button(box,GUIContent.none,GUIStyle.none))heroDetailTab=0;
                }
                skillsY+=56;
            }
            var action=new Rect(x,skillsY,width,36);
            if(!recruited)
            {
                int shards=progress?.shards??0;
                if(theme.Button(action,"Recruit · "+shards+" / 10 Echo Shards",true,progress!=null&&shards>=10&&!processing,shards>=10?"":"Collect matching Echo Shards at the Temple of Echoes."))Send("recruit-shards",selected.id);
            }
            else
            {
                bool isPrimary=ActiveArmy.commanderId==selected.id;
                bool isCompanion=ActiveArmy.secondaryCommanderId==selected.id;
                string label=isPrimary?"Leading selected march":isCompanion?"Companion on selected march":AssignedElsewhere(selected.id)?"Assigned to another march":CanEditArmy?"Assign as primary":"Return selected march home to assign";
                bool canAssign=CanEditArmy&&!isPrimary&&!isCompanion&&!AssignedElsewhere(selected.id)&&!processing;
                if(theme.Button(action,label,true,canAssign,canAssign?"":label))Send(new GameCommand{type="commander",targetId=selected.id,marchId=ActiveArmy.id});
                var companion=new Rect(x,action.yMax+6,width,32);
                bool canPair=CanEditArmy&&!isPrimary&&!isCompanion&&!AssignedElsewhere(selected.id)&&!processing;
                string pairLabel=isCompanion?"Remove companion":"Assign as companion";
                if(theme.Button(companion,pairLabel,true,isCompanion?CanEditArmy&&!processing:canPair,canPair||isCompanion?"":"This commander is already committed."))Send(new GameCommand{type=isCompanion?"unpair-commander":"pair-commander",targetId=selected.id,marchId=ActiveArmy.id});
                action=new Rect(x,companion.yMax+6,width,0);
            }
            var body=new Rect(card.x+12,action.yMax+8,card.width-24,card.yMax-action.yMax-16);
            if(body.height<80)return;
            GUILayout.BeginArea(body);
            if(recruited&&progress!=null)
            {
                if(Opening?.Guide=="training"&&theme.Action("Next · Train five archers",!processing,"Wait for your order.")){trainingTier=0;GuidePage(InterfacePage.Training);}
                DrawCommanderComparison(selected,recruited);
                var tabRow=GUILayoutUtility.GetRect(10,34,GUILayout.ExpandWidth(true));
                string[] tabNames={"Skills","Talents","Development"};
                float tabGap=6,tabWidth=(tabRow.width-tabGap*2)/3f;
                for(int tab=0;tab<3;tab++)
                {
                    var tabRect=new Rect(tabRow.x+tab*(tabWidth+tabGap),tabRow.y,tabWidth,32);
                    if(theme.Button(tabRect,tabNames[tab],heroDetailTab==tab))heroDetailTab=tab;
                    if(heroDetailTab==tab)MythInterfaceTheme.Fill(new Rect(tabRect.x+8,tabRect.yMax-3,tabRect.width-16,2),MythInterfaceTheme.Gold);
                }
                heroBodyScroll=GUILayout.BeginScrollView(heroBodyScroll);
                DrawHeroSkills(selected,progress);
                if(heroDetailTab==2)
                {
                    GUILayout.Space(18);GUILayout.Label("COMPANION",theme.Eyebrow);
                    GUILayout.Label("A companion adds 1% damage and maximum health for each of their levels. They do not cast a skill. Camp victories still pay the primary the full grant and add half of that grant to the companion.",theme.Small);
                    GUILayout.Space(12);GUILayout.Label("ASCENSION · RANK "+progress.rank+" / 5",theme.Eyebrow);
                    GUILayout.Label("Each ascension rank adds 3% damage and 2% maximum health. Ascension is separate from stars and skills.",theme.Small);
                    string reason=progress.rank>=5?"Maximum ascension reached.":processing?"Sending your order…":pendingOrder!=null?"Confirm your previous order first.":progress.shards<progress.nextShards?"Collect more Echo Shards for this commander.":me.gold<progress.nextGold?"More gold required.":"";
                    if(theme.Action("Ascend · "+progress.nextShards+" shards / "+progress.nextGold+" gold",string.IsNullOrEmpty(reason),reason))Send("upgrade-commander",selected.id);
                }
                GUILayout.EndScrollView();
            }
            else
            {
                heroBodyScroll=GUILayout.BeginScrollView(heroBodyScroll);
                GUILayout.Label("SIGNATURE & PASSIVES",theme.Eyebrow);
                if(progress!=null)foreach(var skill in progress.skills){GUILayout.Label(skill.name,theme.Heading);GUILayout.Label(skill.description,theme.Body);}
                GUILayout.Space(12);GUILayout.Label("Recruit this commander to develop its individual experience, stars and skills.",theme.Small);
                GUILayout.EndScrollView();
            }
            GUILayout.EndArea();
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
            if (GUILayout.Button("Optional premium sigil · " + Cost(me.sealCost))) Send("premium-sigil");
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
            if(me.researchOptions==null||me.researchOptions.Length==0){theme.Text(new Rect(diagram.x+20,diagram.y+50,diagram.width-40,60),"Waiting for available research.",theme.Body);return;}
            var positions = new Dictionary<string, Vector2Int>();int rows=0,additional=0;
            foreach(var technology in me.researchOptions)
            {
                int slot=InterfaceLayout.ResearchSlot(technology.id,additional);if(slot>=21)additional++;
                positions[technology.id]=new Vector2Int(slot%3,slot/3);rows=Mathf.Max(rows,slot/3+1);
            }
            float step = (diagram.width - 34) / 3, cardWidth = step - 18;
            var viewport = new Rect(diagram.x + 12, diagram.y + 48, diagram.width - 24, diagram.height - 60);
            rosterScroll = GUI.BeginScrollView(viewport, rosterScroll, new Rect(0, 0, diagram.width - 42, rows*120+10));
            foreach (var technology in me.researchOptions)
            {
                if (string.IsNullOrEmpty(technology.prerequisite) || !positions.ContainsKey(technology.prerequisite) || !positions.ContainsKey(technology.id)) continue;
                var parent = positions[technology.prerequisite]; var child = positions[technology.id];
                MythInterfaceTheme.Line(new Vector2(parent.x * step + cardWidth, parent.y * 120 + 52), new Vector2(child.x * step, child.y * 120 + 52), 2, new Color(0.4f, 0.44f, 0.34f));
            }
            for (int i = 0; i < me.researchOptions.Length; i++)
            {
                var technology = me.researchOptions[i]; var position = positions[technology.id];
                var cell = new Rect(position.x * step + 2, position.y * 120 + 3, cardWidth, 104);
                theme.Panel(cell, i == inspectedTechnology);
                theme.OneLine(new Rect(cell.x + 10, cell.y + 7, cell.width - 20, 20), technology.branch.ToUpperInvariant(), theme.Eyebrow);
                theme.Text(new Rect(cell.x + 10, cell.y + 30, cell.width - 20, 43), technology.name, theme.Body);
                theme.Text(new Rect(cell.x + 10, cell.y + 77, cell.width - 20, 20), technology.level + " / " + technology.maxLevel + (technology.canResearch ? " · READY" : ""), theme.Small);
                if (GUI.Button(cell, GUIContent.none, GUIStyle.none)) { inspectedTechnology = i; contentScroll = Vector2.zero; }
            }
            GUI.EndScrollView();
            inspectedTechnology = Mathf.Clamp(inspectedTechnology, 0, me.researchOptions.Length - 1); var selected = me.researchOptions[inspectedTechnology];
            GUILayout.BeginArea(new Rect(detail.x + 20, detail.y + 16, detail.width - 40, detail.height - 32));
            contentScroll = GUILayout.BeginScrollView(contentScroll);
            if(HasJob(me.research)){theme.Section("Research in progress");DrawJob(me.research,JobName(me.research),false);}
            GUILayout.Label(selected.branch.ToUpperInvariant(), theme.Eyebrow); GUILayout.Label(selected.name, theme.Title);
            GUILayout.Label("Rank " + selected.level + " / " + selected.maxLevel, theme.Heading); GUILayout.Space(12);
            GUILayout.Label(selected.description, theme.Body);
            if (selected.percent > 0)
            {
                GUILayout.Label("Current effect · +" + selected.currentBonus + "%", theme.Body);
                if (selected.level < selected.maxLevel) GUILayout.Label("Next rank · +" + selected.nextBonus + "%", theme.Body);
            }
            GUILayout.Space(16);
            if (selected.level < selected.maxLevel)
            {
                DrawPrerequisites(selected.prerequisites);GUILayout.Label(Cost(selected.cost), theme.Body); GUILayout.Label(Mathf.CeilToInt(selected.duration) + " seconds", theme.Small);
                string reason=processing?"Sending your order…":pendingOrder!=null?"Confirm your previous order first.":selected.lockedReason;
                if(theme.Action("Research rank "+(selected.level+1),selected.canResearch&&!processing&&pendingOrder==null,reason))Send("research",selected.id);
            }

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
            if(!accountRegistered&&theme.Action("Return to guest profile selection",!processing&&!accountBusy&&pendingOrder==null&&commands.Count==0,"Finish pending orders or account requests before switching profiles."))
            {ReturnToAccountEntry("Guest cities and their saved sessions stay on this device.");accountEntryOpen=false;}
            if(GUILayout.Button("Account and recovery",GUILayout.Height(36)))OpenAccount();
            if(GUILayout.Button("Kingdom power rankings",GUILayout.Height(36)))OpenInterface(InterfacePage.Rankings);
            GUILayout.Label("COMMAND YOUR KINGDOM", theme.Eyebrow);
            openingEnabled=GUILayout.Toggle(openingEnabled,"Show optional first-session guidance");PlayerPrefs.SetInt("ThronesOfMyth.openingGuidance",openingEnabled?1:0);
            GUILayout.Label("WASD / arrows · Pan the map\nMouse wheel · Zoom\nMiddle mouse drag · Pan\nLeft-click · Inspect or select\nRight-click · March or act on a target\n1–5 · Select your march\nC · City    K · Commanders    L · Alliance\nH · Focus home    Space · Focus selected march\nR · Return selected march    Esc · Close / cancel", theme.Body);
            GUILayout.Space(18); GUILayout.Label("Kingdom · " + kingdomName + " · " + ActiveKingdomId, theme.Heading);
            if(theme.Action("Leave this kingdom",!processing&&!accountBusy&&pendingOrder==null&&commands.Count==0,"Finish pending orders before leaving this kingdom."))LeaveKingdom();
            GUILayout.Label("Build "+ReleaseIdentity.Label,theme.Small);GUILayout.Label("Connected to " + serverUrl, theme.Small);
            GUILayout.Label(world.persistence != null && world.persistence.enabled ? world.persistence.backend=="sqlite"?"SQLite kingdom · progress saves on the server; downtime job recovery is enabled.":"Local JSON kingdom · progress saves on this PC. A restart catches up paid city timers and up to eight hours of passive production." : "This server is not saving world progress.", theme.Small);
            if (GUILayout.Button("Restore interface defaults", GUILayout.Width(300))) { interfaceScalePreference = 1; labelsEnabled = true; reducedMotion = false; openingEnabled=true;PlayerPrefs.SetInt("ThronesOfMyth.openingGuidance",1); PlayerPrefs.SetInt("ThronesOfMyth.reducedMotion", 0); PlayerPrefs.SetFloat("ThronesOfMyth.uiScale", 1); PlayerPrefs.SetInt("ThronesOfMyth.labels", 1); }
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
            var army = OwnMarches().Find(a => a.id == selectedId) ?? Array.Find(world.armies, a => a.id == selectedId);
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
                subtitle += " · "+(me.economy?.rules.campAP??5)+" AP ON FIRST ENGAGEMENT";
                action = camp.health > 0 ? "March & attack" : "Returns in " + camp.respawn + "s"; enabled &= camp.health > 0;
                perform = () => Send("attack", camp.id);
            }
            else if (node != null)
            {
                title = node.name; subtitle = node.remaining.ToString("N0") + " " + node.resource.ToUpperInvariant() + " AVAILABLE · SELECT A MARCH, THEN GATHER"; emblem = node.resource;
                action = node.remaining > 0 ? "March & gather" : "Replenishing"; enabled &= node.remaining > 0; perform = () => Send("gather", node.id);
            }
            else if (site != null)
            {
                title = site.name; subtitle = "HELD BY · " + AllianceName(site.allianceId); emblem = "temple";
                bool routeOpen = (site.x <= 40 || Array.Exists(world.sites, s => s.id == "gate-east" && !string.IsNullOrEmpty(me.allianceId) && s.allianceId == me.allianceId)) && (site.z <= 40 || Array.Exists(world.sites, s => s.id == "gate-north" && !string.IsNullOrEmpty(me.allianceId) && s.allianceId == me.allianceId));
                bool connected = TerritoryReach.AllianceCovers(world, me.allianceId, site.x, site.z);
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
                title = HeroName(army.commanderId); subtitle = army.name + " · " + ArmyPresentationState.Label(army) + " · " + army.troops + " TROOPS"; health = (float)army.health / Mathf.Max(1, army.maxHealth);
                bool allied = !string.IsNullOrEmpty(me.allianceId) && army.allianceId == me.allianceId;
                var owner = Array.Find(world.players, p => p.id == army.ownerId);
                bool ownCity = Vector2.Distance(new Vector2(ActiveArmy.x, ActiveArmy.z), new Vector2(me.homeX, me.homeZ)) < 2;
                bool protectedArmy = ownCity || me.cityLevel < 2 || army.protectedField;
                if(army.ownerId==playerId)subtitle += " · CARGO " + CargoLabel(army);
                action = army.ownerId == playerId ? (army.deployed?"Return home":"Edit formation") : allied ? "Alliance army" : ownCity ? "Leave city first" : protectedArmy ? "Protected army" : "Attack player";
                enabled &= army.ownerId == playerId || (!allied && !protectedArmy);
                perform = () => { if (army.ownerId == playerId) { activeMarchId=army.id; if(army.deployed)Send("return");else BeginFormation(true); } else Send("attack-player", army.id); };
            }
            else if (city != null)
            {
                title = city.name + "'s city"; subtitle = city.ageName + " · CITADEL " + city.cityLevel; emblem = "city";
                bool alliedCity = !string.IsNullOrEmpty(me.allianceId) && city.allianceId == me.allianceId;
                bool readableCity = city.id != playerId && !alliedCity && city.cityLevel >= 2;
                action = city.id == playerId ? "Enter city" : readableCity ? "Read this city" : "Focus city";
                perform = () => { if (city.id == playerId) OpenInterface(InterfacePage.City); else if (readableCity) Send(new GameCommand { type = "recon-city", targetId = city.id }); else cameraControl?.Focus(city.homeX, city.homeZ); };
            }
            else if (pin != null) { title = pin.name; subtitle = "ALLIANCE MARKER · " + Mathf.CeilToInt(pin.expires - world.time) + "s"; action = "Focus marker"; perform = () => cameraControl?.Focus(pin.x, pin.z); }
            else if (world.exploration?.findings != null && Array.Find(world.exploration.findings, place => place.id == selectedId) is FindingData finding)
            {
                title = finding.name; emblem = "city";
                subtitle = finding.category.ToUpperInvariant() + " · " + finding.state.ToUpperInvariant();
                if (finding.state == "investigating") subtitle += " · " + Mathf.RoundToInt(Mathf.Clamp01(finding.progress) * 100f) + "%";
                string reward = DiscoveryJournal.RewardLine(finding.reward);
                if (reward.Length > 0) subtitle += " · " + reward;
                bool claim = finding.state == "known" && !finding.requiresInvestigation || finding.state == "completed";
                if (claim) { action = "Claim gift"; perform = () => Send(new GameCommand { type = "finding-claim", targetId = finding.id }); }
                else if (finding.requiresInvestigation && finding.state == "known") { action = "Investigate"; perform = () => Send(new GameCommand { type = "finding-investigate", targetId = finding.id }); }
                else { action = "Open the journal"; perform = () => OpenInterface(InterfacePage.Exploration); }
            }
            else { selectedId = ""; return; }
            bool remembered=boss?.lastKnown==true||camp?.lastKnown==true||node?.lastKnown==true||site?.lastKnown==true||beacon?.lastKnown==true||city?.lastKnown==true;
            bool terrainExplored=boss?.terrainExplored==true||camp?.terrainExplored==true||node?.terrainExplored==true||site?.terrainExplored==true||beacon?.terrainExplored==true||city?.terrainExplored==true;
            bool keepCityReading = city != null && city.id != playerId && (string.IsNullOrEmpty(me.allianceId) || city.allianceId != me.allianceId) && city.cityLevel >= 2;
            if(remembered){subtitle=LandmarkCopy.Inspection(terrainExplored);health=-1;float sx=boss!=null?boss.x:camp!=null?camp.x:node!=null?node.x:site!=null?site.x:beacon!=null?beacon.x:city.homeX;float sz=boss!=null?boss.z:camp!=null?camp.z:node!=null?node.z:site!=null?site.z:beacon!=null?beacon.z:city.homeZ;
                if(!keepCityReading){action="Scout to refresh";enabled=!processing;perform=()=>ScoutAt(sx,sz);}
                if(camp!=null){action="March & attack";enabled=!processing&&ActiveArmy!=null&&ActiveArmy.health>0&&ActiveArmy.recovery<=0;perform=()=>Send("attack",camp.id);}}
            theme.Panel(r); theme.Icon(new Rect(r.x + 18, r.y + 23, 34, 34), emblem, MythInterfaceTheme.Gold);
            theme.OneLine(new Rect(r.x + 68, r.y + 12, r.width-116, 27), title, theme.Heading);
            theme.OneLine(new Rect(r.x + 68, r.y + 46, r.width-92, 23), subtitle, theme.Small);
            if (health >= 0) theme.Bar(new Rect(r.x + 68, r.y + 78, 220, 5), health, camp != null ? MythInterfaceTheme.Red : MythInterfaceTheme.Teal);
            bool readMarch = army != null && army.ownerId != playerId && (string.IsNullOrEmpty(me.allianceId) || army.allianceId != me.allianceId) && army.deployed && !army.protectedField;
            bool readGarrison = (site != null || beacon != null) && (string.IsNullOrEmpty(me.allianceId) || (site != null ? site.allianceId : beacon.allianceId) != me.allianceId) && (site == null || !site.unknown && !site.locked);
            if ((city == null || city.id != playerId) && !readMarch && !readGarrison) theme.OneLine(new Rect(r.x + 18, r.y + 100, 370, 24), "SELECTED MARCH · " + HeroName(ActiveArmy.commanderId), theme.Small);
            if (theme.Button(new Rect(r.xMax - 38, r.y + 7, 28, 27), "×")) { selectedId = ""; map.selectedId = ""; }
            if (city != null && city.id == playerId)
            {
                if (theme.Button(new Rect(r.x + 18, r.y + 94, 140, 32), "Prepare march")) PrepareCityMarch();
            }
            if (readMarch && theme.Button(new Rect(r.x + 18, r.y + 94, 150, 32), "Read this march")) Send(new GameCommand { type = "recon-march", targetId = army.id });
            if (readGarrison && theme.Button(new Rect(r.x + 18, r.y + 94, 160, 32), "Read the garrison")) Send(new GameCommand { type = "recon-garrison", targetId = site != null ? site.id : beacon.id });
            if (theme.Button(new Rect(r.xMax - 208, r.y + 91, 190, 35), action, true, enabled)) perform?.Invoke();
        }
    }
}
