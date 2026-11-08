using System;
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
        var guide=new FirstSessionGuide();guide.Profile("city");
        var tasks=new[]{new JourneyTask{id="train-ten"},new JourneyTask{id="gather-wood"},new JourneyTask{id="gather-food"}};
        var city=new ArmyData{cityLevel=1,homeX=5,homeZ=5,trainingQueue=new QueueJob[0],journeyCampaign=new JourneyCampaign{chapters=new[]{new JourneyChapter{tasks=tasks}}}};
        var army=new ArmyData{x=5,z=5};
        check(guide.Next(city,army).Number==1,"Fresh journey should start at city");guide.CityViewed=true;
        check(guide.Next(city,army).Number==2,"Next should expose construction");city.construction=new QueueJob{id="job",type="upgrade"};
        check(guide.Next(city,army).Number==3,"Training should remain available during construction");
        city.cityLevel=2;tasks[0].progress=10;check(guide.Next(city,army).Number==4,"Prepare commander/troops after training");guide.ArmyPrepared=true;
        check(guide.Next(city,army).Number==5,"Wood guidance missing");tasks[1].progress=40;
        check(guide.Next(city,army).Number==6,"Food guidance missing");tasks[2].progress=40;
        check(guide.Next(city,army).Number==7,"First actual camp should follow supplies");city.kills=1;
        check(guide.Next(city,army).Number==8,"Outcome guidance missing");guide.OutcomeViewed=true;army.x=12;
        check(guide.Next(city,army).Number==9,"Survivor return missing");army.x=5;
        check(guide.Next(city,army)==null,"Opening advice should finish at home");
        army.recovery=8;check(guide.Next(city,army).Guide=="city","Recovery should guide city work rather than another attack");army.recovery=0;
        city.cityLevel=3;guide.Profile("another");check(guide.Next(city,army)==null,"Advanced cities must not be forced through intro");
        Console.WriteLine("Gameplay-feel contracts: "+checks+" passed.");return checks;
    }
}
