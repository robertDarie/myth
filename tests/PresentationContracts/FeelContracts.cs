using System;
using System.Collections.Generic;
using ThronesOfMyth;
static class FeelContracts
{
    public static int Run()
    {
        int checks=0;Action<bool,string> check=(value,name)=>{checks++;if(!value)throw new Exception(name);};
        var state=new ArmyPresentationState();
        var a=new ArmyData{id="army",commanderId="captain",state="Attacking",health=100,maxHealth=100,attackSequence=5,skillCasts=2,x=10,z=10,targetX=12,targetZ=10,hasOrder=true};
        check(state.Observe(a,0).Cues==ArmyCue.None,"First snapshot must not replay historic combat");
        a.attackSequence=6;check(state.Observe(a,.2f).Has(ArmyCue.Attack),"Confirmed counter must animate attack");
        check(state.Observe(a,.4f).Cues==ArmyCue.None,"Duplicate poll must not replay an attack");
        a.attackSequence=12;check(state.Observe(a,.6f).Has(ArmyCue.Attack),"Batched attacks coalesce into one observation");
        a.skillCasts=3;a.health=92;var both=state.Observe(a,.8f);
        check(both.Has(ArmyCue.Skill)&&both.Has(ArmyCue.Health)&&both.HealthDelta==-8,"Skill must not swallow actual net HP feedback");
        a.state="Victorious";a.hasOrder=false;var victory=state.Observe(a,1);
        check(victory.Has(ArmyCue.Victory),"Victory cannot depend on a counter already updated");
        check(!state.Observe(a,1.2f).Has(ArmyCue.Victory),"Victory repeated while idle");
        a.attackSequence=15;a.skillCasts=5;check(state.Observe(a,8).Cues==ArmyCue.None,"Reconnect must not replay catch-up volleys");
        a.attackSequence=0;check(state.Observe(a,8.2f).Cues==ArmyCue.None,"Counter rollback must rebaseline");
        a.health=1;a.recovery=8;a.x=5;a.z=5;a.state="Recovering";var retreat=state.Observe(a,8.4f);
        check(retreat.Has(ArmyCue.Retreat)&&!retreat.Has(ArmyCue.Health)&&!retreat.Has(ArmyCue.Arrival),"Forced retreat must not invent damage or arrival");
        state.Reset();a.recovery=0;a.state="Returning";a.hasOrder=true;a.targetX=5;a.targetZ=5;a.x=6;state.Observe(a,9);
        a.x=5;a.hasOrder=false;a.state="Healing";check(state.Observe(a,9.2f).Has(ArmyCue.Arrival),"Confirmed home arrival missing");
        a.hasOrder=true;a.targetX=20;state.Observe(a,9.4f);a.hasOrder=false;check(!state.Observe(a,9.6f).Has(ArmyCue.Arrival),"Stop/cancel must not announce arrival");
        a.maxHealth=150;a.health=150;check(!state.Observe(a,9.8f).Has(ArmyCue.Health),"Troop-capacity change must not fabricate healing");
        a.state="Gathering";a.targetX=7.5f;a.targetZ=5;
        check(ArmyPresentationState.Label(a)=="To resource","Travel label must not claim work");
        check(!state.Observe(a,10).Has(ArmyCue.Gather),"A gathering order in transit must not play work feedback");
        a.x=5.5f;check(state.Observe(a,10.2f).Has(ArmyCue.Gather),"Confirmed gathering arrival missing");
        a.state="Returning";check(state.Observe(a,10.4f).Has(ArmyCue.Returning),"Confirmed return transition missing");
        a.state="Fighting";check(state.Observe(a,10.6f).Has(ArmyCue.Combat),"PvP engagement missing");
        a.commanderId="warden";a.attackSequence++;check(state.Observe(a,10.8f).Cues==ArmyCue.None,"Commander swap must rebaseline");
        var reports=new ReportReplayGuard();reports.Begin("one",0);check(!reports.Observe("historic"),"Initial reports must be quiet");
        reports.Begin("one",.2f);check(!reports.Observe("historic")&&reports.Observe("new"),"Only a new completed report should present");
        reports.Begin("one",.4f);check(!reports.Observe("new"),"Report replay after polling");
        reports.Begin("two",.6f);check(!reports.Observe("new"),"Report replay after profile switch");
        reports.Begin("two",8);check(!reports.Observe("other"),"Historic report replay after reconnect");
        reports.Begin("bounded archive",10);for(int i=0;i<220;i++)reports.Observe("entry-"+i);
        reports.Begin("bounded archive",10.2f);bool replay=false;for(int i=0;i<220;i++)replay|=reports.Observe("entry-"+i);
        check(!replay,"A full combined archive must not churn the replay guard and repeat notifications");
        var memory=new Dictionary<string,bool>();
        Func<string,string,bool> load=(id,flag)=>memory.TryGetValue(id+"\n"+flag,out var seen)&&seen;
        Action<string,string,bool> store=(id,flag,value)=>memory[id+"\n"+flag]=value;
        var guide=new FirstSessionGuide(load,store);guide.Profile("city");
        var tasks=new[]{new JourneyTask{id="train-ten"},new JourneyTask{id="gather-wood"},new JourneyTask{id="gather-food"}};
        var city=new ArmyData{cityLevel=1,homeX=5,homeZ=5,trainingQueue=new QueueJob[0],journeyCampaign=new JourneyCampaign{chapters=new[]{new JourneyChapter{tasks=tasks}}}};
        var army=new ArmyData{x=5,z=5};
        check(guide.Next(city,army).Number==1,"Fresh journey should start at city");guide.CityViewed=true;
        check(guide.Next(city,army).Number==2,"Captain introduction should follow the city");guide.CommanderViewed=true;
        check(guide.Next(city,army).Number==3,"Opening should guide a real archer batch");
        city.reserveUnits=new UnitCounts{archers=5};check(guide.Next(city,army).Number==4,"Ready reserves should expose patrol preparation");guide.ArmyPrepared=true;
        check(guide.Next(city,army).Number==5,"Patrol should lead to real Scouts before gathering chores");city.kills=1;
        check(guide.Next(city,army).Number==6,"Outcome guidance missing");guide.OutcomeViewed=true;army.x=12;
        check(guide.Next(city,army).Number==7,"Survivor return missing");
        var restarted=new FirstSessionGuide(load,store);restarted.Profile("city");
        check(restarted.Next(city,army).Number==7,"Reviewed victory must not fall back to step 6 after the guide restarts");
        var blank=new FirstSessionGuide();blank.Profile("city");
        check(blank.Next(city,army).Number==6,"A guide with no remembered review starts at the victory report");
        restarted.Profile("other");
        check(restarted.Next(city,army).Number==6,"Another profile does not inherit the reviewed victory");
        restarted.Profile("city");
        check(restarted.Next(city,army).Number==7,"Returning to the reviewed profile restores step 7");
        army.x=5;
        check(guide.Next(city,army).Number==8,"Victory should lead back to city progression");city.cityLevel=2;
        check(guide.Next(city,army)==null,"Optional showcase should finish after first age");
        army.recovery=8;var recovering=guide.Next(city,army);check(recovering.Guide=="city"&&recovering.Title=="Recover at home","Recovery should guide city work rather than another attack");army.recovery=0;
        city.cityLevel=3;guide.Profile("another");check(guide.Next(city,army)==null,"Advanced cities must not be forced through intro");
        city.cityLevel=1;city.kills=0;check(guide.Next(city,army).Number==1,"Switching profiles should clear local introduction advice");
        var referenceGuide=new FirstSessionGuide();referenceGuide.Profile("reference");referenceGuide.CityViewed=referenceGuide.CommanderViewed=true;
        var referenceCity=new ArmyData{numericVersion=1,cityLevel=1,homeX=5,homeZ=5,troops=900,journeyCampaign=new JourneyCampaign{chapters=new[]{new JourneyChapter{tasks=tasks}}}};
        var referenceArmy=new ArmyData{x=5,z=5,troops=900};
        check(referenceGuide.Next(referenceCity,referenceArmy).Guide=="prepare","Reference founder must not wait25 minutes for archers before a legal first battle");
        check(referenceGuide.Next(referenceCity,referenceArmy).Hint.Contains("900"),"Reference guide must state a real recommended army");referenceGuide.ArmyPrepared=true;
        check(referenceGuide.Next(referenceCity,referenceArmy).Guide=="combat"&&referenceGuide.Next(referenceCity,referenceArmy).Title.Contains("Forsaken Lv.1"),"Reference guide must use the ordinary enemy identity");
        OpeningMatrix(check);
        var json="{\"id\":\"owner\",\"activeMarches\":0,\"homeFormations\":[{\"id\":\"march\",\"deployed\":false,\"carryCapacity\":320,\"cargo\":{\"wood\":12}}],\"reports\":[{\"type\":\"gathering\",\"outcome\":\"Delivered\",\"resources\":{\"wood\":12},\"sources\":[{\"nodeId\":\"grove\",\"amount\":12}]}]}";
        var dto=System.Text.Json.JsonSerializer.Deserialize<ArmyData>(json,new System.Text.Json.JsonSerializerOptions{IncludeFields=true});
        check(dto.homeFormations.Length==1&&!dto.homeFormations[0].deployed&&dto.activeMarches==0,"Protocol must distinguish home formations from active marches");
        check(dto.homeFormations[0].carryCapacity==320&&dto.homeFormations[0].cargo.wood==12,"Cargo and capacity DTO fields missing");
        check(dto.reports[0].resources.wood==12&&dto.reports[0].sources[0].nodeId=="grove","Delivery report attribution DTO missing");
        var economyJson="{\"mana\":137,\"aether\":5,\"economy\":{\"ap\":95,\"apCap\":100,\"nextAPSeconds\":60,\"fullAPSeconds\":300,\"nextTransfer\":4,\"rules\":{\"campAP\":5,\"strongholdAP\":10,\"tradeTax\":0.1},\"buffs\":[{\"kind\":\"attack\",\"percent\":0.1,\"remaining\":600}],\"members\":[{\"id\":\"ally\",\"name\":\"Ally\"}]}}";
        var economyDto=System.Text.Json.JsonSerializer.Deserialize<ArmyData>(economyJson,new System.Text.Json.JsonSerializerOptions{IncludeFields=true});
        check(economyDto.mana==137&&economyDto.aether==5,"Ordinary Mana and premium Aether must remain separate DTO balances");
        check(economyDto.economy.ap==95&&economyDto.economy.nextAPSeconds==60&&economyDto.economy.fullAPSeconds==300,"Server AP and refill timers missing");
        check(economyDto.economy.nextTransfer==4&&economyDto.economy.members[0].id=="ally","Transfer nonce and authenticated member IDs missing");
        check(economyDto.economy.rules.campAP==5&&economyDto.economy.rules.strongholdAP==10,"PvE AP costs missing from client rules");
        check(economyDto.economy.buffs[0].remaining==600&&Math.Abs(economyDto.economy.buffs[0].percent-.1f)<.0001,"Timed authoritative buff state missing");
        var rewardDto=System.Text.Json.JsonSerializer.Deserialize<JourneyRewards>("{\"mana\":10,\"aether\":2,\"itemRewards\":[{\"id\":\"ap-tonic-20\",\"name\":\"Pilgrim tonic\",\"count\":1}]}",new System.Text.Json.JsonSerializerOptions{IncludeFields=true});
        check(rewardDto.mana==10&&rewardDto.aether==2&&rewardDto.itemRewards[0].count==1,"Reward previews must show distinct currencies and exact stored items");
        Console.WriteLine("Gameplay-feel contracts: "+checks+" passed.");return checks;
    }
    static ArmyData OpeningCity()
    {
        var tasks=new[]{new JourneyTask{id="train-ten"},new JourneyTask{id="gather-wood"}};
        return new ArmyData{cityLevel=1,homeX=5,homeZ=5,kills=0,journeyCampaign=new JourneyCampaign{chapters=new[]{new JourneyChapter{tasks=tasks}}}};
    }
    static ArmyData OpeningArmy()=>new ArmyData{x=5,z=5,health=100,maxHealth=100,recovery=0,units=new UnitCounts()};
    static FirstSessionGuide Stored(Dictionary<string,bool> memory,string profile)
    {
        var guide=new FirstSessionGuide((id,flag)=>memory.TryGetValue(id+"\n"+flag,out var seen)&&seen,(id,flag,value)=>memory[id+"\n"+flag]=value);
        guide.Profile(profile);return guide;
    }
    static void OpeningMatrix(Action<bool,string> check)
    {
        var memory=new Dictionary<string,bool>();
        var city=OpeningCity();var army=OpeningArmy();
        int[] expected={1,2,3,4,5,6,7};
        string[] titles={"Discover your city","Meet your Frontier Captain","Train five archers","Prepare a Scout patrol","Challenge Forsaken Scouts","Review your victory","Return to your civilization"};
        Func<int,OpeningCue> at=number=>{
            var fresh=Stored(memory,"city");var cue=fresh.Next(city,army);
            check(cue!=null&&cue.Number==number,"Restart at First Steps "+number+"/8 returned "+(cue==null?"nothing":cue.Number.ToString()));
            check(FirstSessionGuide.Operation(cue)!="unknown","First Steps "+number+" has no real button action");
            return cue;
        };
        check(at(1).Title==titles[0],"Stage 1 title");
        Stored(memory,"city").CityViewed=true;check(at(2).Title==titles[1],"Stage 2 title");
        Stored(memory,"city").CommanderViewed=true;check(at(3).Guide=="training","Stage 3 trains");
        city.reserveUnits=new UnitCounts{archers=5};check(at(4).Guide=="prepare","Stage 4 prepares a march");
        Stored(memory,"city").ArmyPrepared=true;check(at(5).Guide=="combat","Stage 5 selects a camp");
        city.kills=1;army.x=12;check(at(6).Guide=="outcome","Stage 6 opens the victory report");
        var viewed=Stored(memory,"city");viewed.OutcomeViewed=true;viewed.OutcomeViewed=true;
        check(city.kills==1&&at(7).Guide=="return","Reading the victory again must not move the guide or the kill");
        var otherDevice=new Dictionary<string,bool>();
        var guest=Stored(otherDevice,"city");
        check(guest.Next(city,army).Number==6&&guest.Next(city,army).Guide=="outcome","A second device without local advice starts at the unread victory");
        check(at(7).Number==7,"The first device keeps the reviewed victory");
        army.recovery=9;var wounded=at(7);
        check(wounded.Title=="Recover at home"&&wounded.Guide=="city"&&wounded.Number==7,"Recovery keeps stage 7 instead of pretending the guide moved");
        var reconnected=Stored(memory,"city").Next(city,army);
        check(reconnected.Title=="Recover at home"&&reconnected.Number==7,"Recovery remains after the guide is constructed again");
        army.recovery=0;army.health=100;check(at(7).Guide=="return","Healing restores the return action without falling back to the report");
        army.x=5;army.health=40;var homeWound=Stored(memory,"city").Next(city,army);
        check(homeWound.Number==8&&homeWound.Title=="Recover at home","A wounded army already home keeps the Citadel stage while it heals");
        army.health=100;var raised=Stored(memory,"city").Next(city,army);
        check(raised.Number==8&&raised.Guide=="city"&&FirstSessionGuide.Operation(raised)=="navigate","Opening the report at home advances to the Citadel, once");
        Stored(memory,"city").OutcomeViewed=true;check(Stored(memory,"city").Next(city,army).Number==8,"Opening the same home report again does not skip or rewind");
        city.cityLevel=2;check(Stored(memory,"city").Next(city,army)==null,"The guide ends after the first age instead of looping");
        city.cityLevel=1;army.x=12;check(at(7).Number==7,"Leaving home after the report returns to recall, not to an earlier stage");
        int previous=0;
        foreach(var number in expected){check(number>previous,"Stage order");previous=number;}
        check(titles.Length==7,"Stage titles cover 1 through 7");
        var homeMemory=new Dictionary<string,bool>();
        var homeCity=OpeningCity();homeCity.kills=1;homeCity.reserveUnits=new UnitCounts{archers=5};
        var homeArmy=OpeningArmy();
        var homeGuide=Stored(homeMemory,"city");
        homeGuide.CityViewed=true;homeGuide.CommanderViewed=true;homeGuide.ArmyPrepared=true;
        var unread=homeGuide.Next(homeCity,homeArmy);
        check(unread.Number==6&&unread.Guide=="outcome","A victory whose army is already home still asks for the report");
        homeGuide.OutcomeViewed=true;homeGuide.OutcomeViewed=true;
        var afterHome=Stored(homeMemory,"city").Next(homeCity,homeArmy);
        check(afterHome.Number==8&&homeCity.kills==1,"Opening that report once reaches the Citadel, and opening it again does not move the guide");
        var early=new Dictionary<string,bool>();
        var earlyCity=OpeningCity();var earlyArmy=OpeningArmy();earlyArmy.health=20;
        check(Stored(early,"city").Next(earlyCity,earlyArmy).Number==1,"A wounded first stage does not jump to stage 7");
        earlyArmy.health=100;
        var healed=Stored(early,"city").Next(earlyCity,earlyArmy);
        check(healed.Number==1&&healed.Title=="Discover your city","Healing resumes the same stage");
    }
}
