using System;
using System.Text.Json;
using ThronesOfMyth;
static class CityExperienceContracts
{
    public static int Run()
    {
        int checks=0;Action<bool,string> check=(value,name)=>{checks++;if(!value)throw new Exception(name);};
        var city=new CityExperienceState();
        check(!city.BlocksWorld&&city.AllowsWorldInput(true,false,false),"Initial kingdom must accept world input");
        city.SetCity(true);check(city.BlocksWorld&&!city.CanPickCity&&!city.AllowsWorldInput(true,false,false),"Entry must block world orders before the first rendered frame");
        float before=city.Amount;for(int i=0;i<4;i++){city.Advance(.1f,false);check(city.Amount>=before&&city.Blend>=0&&city.Blend<=1,"Entry must progress monotonically within bounds");before=city.Amount;}
        city.SetCity(false);check(!city.AllowsWorldInput(true,false,false),"Exit must not release input before the fade ends");city.Advance(.1f,false);check(city.Amount<before,"Exit should reverse from the current amount");
        float reversing=city.Amount;city.SetCity(true);city.Advance(.1f,false);check(city.Amount>reversing,"Interrupted exit must reverse smoothly");
        for(int i=0;i<20;i++)city.Advance(.1f,false);check(city.CanPickCity&&city.Amount==1&&city.Blend==1,"Settled city must allow city picking only");
        check(!city.AllowsWorldInput(false,false,false)&&!city.AllowsWorldInput(true,false,false),"Neither world nor institution pages may leak field input while city is active");
        foreach(var page in new[]{InterfacePage.Training,InterfacePage.Research,InterfacePage.Inventory,InterfacePage.Temple,InterfacePage.Exploration,InterfacePage.Reports})check(city.CloseDestination(page,false)==InterfacePage.City,"Institution screens must close back to their city parent");
        check(city.CloseDestination(InterfacePage.City,true)==InterfacePage.City&&city.CloseDestination(InterfacePage.City,false)==InterfacePage.World,"District list closes to city; main city closes to kingdom");
        city.SetCity(false);for(int i=0;i<20;i++)city.Advance(.1f,false);check(!city.BlocksWorld&&city.Amount==0,"Exit must completely release the presentation");
        check(!city.AllowsWorldInput(true,true,false)&&!city.AllowsWorldInput(true,false,true)&&!city.AllowsWorldInput(false,false,false),"HUD, text focus and non-world pages must block world input");
        city.SetCity(true);city.Advance(0,true);check(city.CanPickCity&&city.Blend==1,"Reduced motion must enter immediately");city.SetCity(false);city.Advance(0,true);check(!city.BlocksWorld&&city.Blend==0,"Reduced motion must exit immediately");
        city.SetCity(true);city.Advance(float.NaN,false);check(city.Amount==0&&city.BlocksWorld,"Invalid frame delta must not corrupt entry state");city.Advance(-1,false);check(city.Amount==0,"Negative time must not run a transition backwards");city.Reset();check(!city.BlocksWorld&&!city.TargetCity,"Account reset must clear presentation input capture");
        var motion=new CityViewMotion();motion.Magnify(500);motion.Rotate(90);motion.Advance(.1f,false);check(motion.Zoom>1&&motion.Zoom<1.45f&&motion.Yaw>0&&motion.Yaw<90,"Ordinary camera commands should interpolate");motion.Advance(.1f,true);check(motion.Zoom==1.45f&&motion.Yaw==90,"Reduced motion should snap zoom and rotation");
        motion.Magnify(-500);motion.Advance(0,true);check(motion.Zoom==1,"City zoom-out must remain framed");motion.Magnify(float.NaN);motion.Rotate(float.PositiveInfinity);motion.Advance(0,true);check(motion.Zoom==1&&motion.Yaw==90,"Invalid camera commands must not corrupt view");
        for(int i=0;i<300;i++){motion.Rotate(30);motion.Advance(.1f,true);}check(Math.Abs(motion.Yaw)<=3600,"Long sessions must keep angles bounded");motion.Reset();motion.Advance(0,true);check(motion.Yaw==0&&motion.Zoom==1,"Fit city must restore the overview");
        motion.Rotate(3390);motion.Advance(0,true);motion.Reset();motion.Advance(.01f,false);check(Math.Abs(motion.Yaw)<=180,"Fit must take a bounded short rotation rather than replaying many complete turns");
        foreach(var size in new[]{(1280,720),(1920,1080),(2560,1440),(3440,1440),(5120,1440),(1024,768)})foreach(float scale in new[]{.85f,1f,1.15f})
        {
            CityViewportPolicy.RenderSize(size.Item1*scale,size.Item2*scale,true,out int w,out int h);
            check(w>=16&&w<=2560&&h>=16&&h<=1440&&w%16==0&&h%16==0,"City targets must remain bounded across supported displays and scales");
            check(Math.Abs((float)w/h-(float)size.Item1/size.Item2)<.06f,"Render density must not distort city composition significantly");
        }
        CityViewportPolicy.RenderSize(float.NaN,0,true,out int zeroW,out int zeroH);check(zeroW==16&&zeroH==16,"Transient invalid display size must remain safe");
        string[] ids={"citadel","oracle","academy","barracks","menagerie","farm","lumber","quarry","mint","well","infirmary","vault","market","oathhall","forge","builders"};
        var buildings=Array.ConvertAll(ids,id=>new BuildingCard{id=id,level=1,maxLevel=5});
        for(int i=0;i<ids.Length;i++)check(CitySelection.Find(buildings,ids[i])==i,"Every institution must map from a picked marker ID");
        check(CitySelection.Find(buildings,"missing",4)==4&&CitySelection.Find(buildings,"missing",500)==15&&CitySelection.Find(null,"citadel")==-1,"Stale picks must preserve a valid selection");
        check(CitySelection.Step(15,1,16)==0&&CitySelection.Step(0,-1,16)==15&&CitySelection.Step(0,1,0)==-1,"Keyboard selection must wrap safely");
        check(CitySelection.Institution("oracle")==InterfacePage.Temple&&CitySelection.Institution("academy")==InterfacePage.Research&&CitySelection.Institution("menagerie")==InterfacePage.Training&&CitySelection.Institution("infirmary")==InterfacePage.Hospital&&CitySelection.Institution("market")==InterfacePage.Market,"Institution actions must route to existing systems");
        var data=new ArmyData{civilization="norse",mana=137,aether=5,cityBuildings=buildings,construction=new QueueJob{id="a",type="building",targetId="academy",remaining=8,duration=12},secondConstruction=new QueueJob{id="b",type="upgrade",remaining=10,duration=20},research=new QueueJob{id="r",type="research",targetId="logistics",remaining=4,duration=12},trainingQueue=new[]{new QueueJob{id="t",type="train",remaining=5,duration=8}},economy=new EconomyData{ap=95},homeFormations=new[]{new ArmyData{id="home",commanderId="captain",health=90}}};
        string original=JsonSerializer.Serialize(data,new JsonSerializerOptions{IncludeFields=true});
        for(int i=0;i<100;i++){city.SetCity(true);city.Advance(1,true);CitySelection.Find(data.cityBuildings,"academy");city.SetCity(false);city.Advance(1,true);}
        check(JsonSerializer.Serialize(data,new JsonSerializerOptions{IncludeFields=true})==original,"Repeated presentation cycles must preserve city, queues, economy and formations");
        check(CityPresentationData.Construction(data,"academy")==data.construction&&CityPresentationData.Job(data,"academy")==data.construction,"Construction has priority over research when showing the same district");data.construction=null;
        check(CityPresentationData.Construction(data,"academy")==null&&CityPresentationData.Job(data,"academy")==data.research,"Research must not be confused with construction and block parallel institution upgrades");
        Console.WriteLine("City experience contracts: "+checks+" passed.");return checks;
    }
}
