using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using ThronesOfMyth;
class Program
{
    static int checks;
    static void Check(bool condition,string description){checks++;if(!condition)throw new Exception(description);}
    static ArmyData City(int level, bool work=false, bool second=false) => new ArmyData{
        cityBuildings=new[]{new BuildingCard{id="academy",level=level},new BuildingCard{id="citadel",level=level}},
        construction=work?new QueueJob{id="one",type="building",targetId="academy"}:null,
        secondConstruction=second?new QueueJob{id="two",type="upgrade"}:null};
    static string LegacyFit(string text,float width,Func<string,float> measure)
    {
        string shown=text;
        if(measure(shown)>width){while(shown.Length>0&&measure(shown+"…")>width)shown=shown.Substring(0,shown.Length-1);shown+="…";}
        return shown;
    }
    static QueueJob LegacyJob(ArmyData city,string id)
    {
        foreach(var job in new[]{city.construction,city.secondConstruction})if(job!=null&&!string.IsNullOrEmpty(job.id)&&(job.targetId==id||job.type=="upgrade"&&id=="citadel"))return job;
        if(id=="academy")return city.research;if(id=="forge")return city.crafting;if(id=="barracks"&&city.trainingQueue.Length>0)return city.trainingQueue[0];return null;
    }
    static (double ms,long bytes) Measure(Action action)
    {
        for(int i=0;i<100;i++)action();GC.Collect();GC.WaitForPendingFinalizers();
        long before=GC.GetAllocatedBytesForCurrentThread();var watch=Stopwatch.StartNew();for(int i=0;i<10000;i++)action();watch.Stop();return(watch.Elapsed.TotalMilliseconds,GC.GetAllocatedBytesForCurrentThread()-before);
    }
    static void Main()
    {
        var signal=new CityProgressFeedback();
        signal.Observe("A",City(4),0);Check(!signal.IsRecent("academy",0),"Initial saved level must not celebrate");
        signal.Observe("A",City(4,true,true),1);signal.Observe("A",City(5),2);
        Check(signal.IsRecent("academy",2)&&signal.IsRecent("citadel",2),"Two confirmed lanes must signal");
        signal.Observe("A",City(5),3);Check(!signal.IsRecent("academy",4.3f),"Unchanged polls must not extend completion");
        signal.Reset();signal.Observe("A",City(1,true),0);signal.Observe("A",City(1),1);
        Check(!signal.IsRecent("academy",1),"Cancellation must not celebrate");
        signal.Observe("A",City(2),2);Check(!signal.IsRecent("academy",2),"Level without previously observed work must not celebrate");
        signal.Reset();signal.Observe("A",City(1,true),0);signal.Observe("A",City(2),7);
        Check(!signal.IsRecent("academy",7),"Reconnect/downtime must not replay");
        signal.Reset();signal.Observe("A",City(1,true),0);signal.Observe("B",City(2),1);
        Check(!signal.IsRecent("academy",1),"Switching profiles must not replay");
        signal.Reset();signal.Observe("A",City(1,true),0);signal.Reset();signal.Observe("A",City(2),1);
        Check(!signal.IsRecent("academy",1),"Explicit reconnect reset must suppress old jobs");
        signal.Reset();signal.Observe("A",City(1,true),4);signal.Observe("A",City(2),2);
        Check(!signal.IsRecent("academy",2),"Clock rollback must reset transient state");
        signal.Reset();signal.Observe("A",City(1,true),0);signal.Observe("A",City(3),1);
        Check(!signal.IsRecent("academy",1),"Multiple offline levels must not look like one live completion");
        var destinations=new HashSet<InterfacePage>();
        foreach(var entry in GameNavigation.Entries)
        {
            Check(destinations.Add(entry.Page),"Duplicate navigation destination");
            Check(!string.IsNullOrWhiteSpace(entry.Title)&&!string.IsNullOrWhiteSpace(entry.Hint),"Every menu destination needs a title and hint");
            Check(entry.Group>=0&&entry.Group<GameNavigation.Groups.Length,"Invalid menu group");
        }
        foreach(InterfacePage page in Enum.GetValues(typeof(InterfacePage)))if(page!=InterfacePage.World&&page!=InterfacePage.Menu)Check(destinations.Contains(page),"Unreachable interface: "+page);
        foreach(float scale in new[]{.68f,.8f,.92f,1.02f,1.2f,1.38f,1.6f,1.84f})
        {
            Check(InterfaceReadability.FontSize(15,12,scale)*scale>=12-.001f,"Body text below physical floor");
            Check(InterfaceReadability.FontSize(13,11,scale)*scale>=11-.001f,"Small text below physical floor");
            Check(InterfaceReadability.FontSize(13,12,scale)*scale>=12-.001f,"Navigation text below physical floor");
        }
        Func<string,float> width=text=>text.Length;
        Check(TextElision.Fit("hello",10,width)=="hello","Short text should be retained");
        Check(TextElision.Fit("hello",3,width)=="he…","Long text should fit with ellipsis");
        Check(TextElision.Fit("hello",0,width)=="","Zero-width labels must be empty");
        Check(TextElision.Fit("😀hello",2,width)=="…","Truncation must not split surrogate pairs");
        foreach(int targetWidth in new[]{1,2,5,10,20,40})Check(TextElision.Fit(new string('x',100),targetWidth,width).Length<=targetWidth,"Elided text exceeds available width");
        var jobs=City(1,true,true);jobs.trainingQueue=new[]{new QueueJob{id="train",type="train",targetId="infantry"}};jobs.research=new QueueJob{id="research"};
        Check(ReferenceEquals(CityPresentationData.Job(jobs,"academy"),jobs.construction),"Construction must take precedence over research");
        Check(ReferenceEquals(CityPresentationData.Job(jobs,"citadel"),jobs.secondConstruction),"Second crew must retain citadel upgrade");
        Check(ReferenceEquals(CityPresentationData.Job(jobs,"barracks"),jobs.trainingQueue[0]),"Training work must remain visible");
        Check(CityPresentationData.Job(jobs,"unknown")==null,"Unknown institution must not fabricate work");
        var fog=new FogVisibilityGrid();var discovery=new ExplorationData{explored=new[]{0,1,-1,900},visible=new[]{1,2}};
        Check(fog.Update(discovery),"First fog snapshot should render");Check(!fog.Update(discovery),"Unchanged discovery must not rebuild fog colors");
        Check(fog.Opacity(0,0)==0&&fog.Opacity(1,0)==0&&fog.Opacity(2,0)==1&&fog.Opacity(3,0)==1,"Explored land stays clear and unknown land stays covered");
        Check(fog.Update(new ExplorationData{explored=new[]{0,1,2},visible=new int[0]}),"Lost sight must update fog");
        Check(fog.Opacity(1,0)==0,"Lost military sight must not restore fog");
        var camp=new ScoutCampCard{scouts=1,speed=7,radius=9,surveySeconds=.8f,autoSectors=2,hasNext=true,nextScouts=1,nextSpeed=8.5f,nextRadius=10,nextSurveySeconds=.7f,nextAutoSectors=3};
        Check(ScoutInterfaceCopy.Line(1,7,9,.8f,2).Contains("1 scout")&&ScoutInterfaceCopy.Delta(camp).Contains("faster travel"),"Outlook copy must describe current and next scout benefits");
        Check(ScoutInterfaceCopy.Phase("Outbound")=="Traveling"&&ScoutInterfaceCopy.Phase("Exploring")=="Exploring","Scout status names stay readable");
        var journalRows=new[]{new FindingData{id="hidden",known=false,state="known"},new FindingData{id="cave",known=true,requiresInvestigation=true,state="known"},new FindingData{id="hearth",known=true,state="known",reward=new FindingReward{food=80,wood=60,gold=25,xp=40}}};
        Check(DiscoveryJournal.Hidden(journalRows)==1&&DiscoveryJournal.NextUnclaimed(journalRows)=="hearth","Journal skips hidden places and uninvestigated caves");
        Check(DiscoveryJournal.RewardLine(journalRows[2].reward).Contains("80 food")&&DiscoveryJournal.RewardLine(journalRows[2].reward).Contains("commander experience"),"Claimed discovery copy names the granted gift");
        fog.Reset();Check(fog.Opacity(1,0)==1,"Reset must not leak the prior profile's fog");
        Check(fog.Update(new ExplorationData{width=64,cellSize=4,explored=new[]{64,4095}}),"Expanded fog dimensions rebuild once");
        Check(fog.Width==64&&fog.Opacity(0,1)==0&&fog.Opacity(63,63)==0&&fog.Opacity(20,0)==1,"64-column fog preserves locations and conceals unknown sectors");
        Check(!fog.Update(new ExplorationData{width=64,cellSize=4,explored=new[]{64,4095}}),"Unchanged expanded fog stays cached");
        fog.Update(new ExplorationData{width=20,cellSize=4,explored=new[]{19}});
        Check(fog.Width==20&&fog.Opacity(19,0)==0&&fog.Opacity(0,1)==1,"Dimension changes never retain another kingdom's sectors");
        string longText=new string('x',180);var baseline=Measure(()=>LegacyFit(longText,22,width));var optimized=Measure(()=>TextElision.Fit(longText,22,width));
        var baselineJobs=Measure(()=>LegacyJob(jobs,"barracks"));var optimizedJobs=Measure(()=>CityPresentationData.Job(jobs,"barracks"));
        Console.WriteLine("Measured CLR microbenchmark: text legacy="+baseline+", optimized="+optimized+"; job legacy="+baselineJobs+", optimized="+optimizedJobs);
        string folder=Path.Combine("work","presentation-checks");Directory.CreateDirectory(folder);
        File.WriteAllText(Path.Combine(folder,"microbench.json"),System.Text.Json.JsonSerializer.Serialize(new {runtime=System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,iterations=10000,text=new{legacyMs=baseline.ms,legacyBytes=baseline.bytes,optimizedMs=optimized.ms,optimizedBytes=optimized.bytes},cityJob=new{legacyMs=baselineJobs.ms,legacyBytes=baselineJobs.bytes,optimizedMs=optimizedJobs.ms,optimizedBytes=optimizedJobs.bytes},limitation=".NET CLR microbenchmark of production pure C# helpers; not Unity/Windows rendering, input, GUI font measurement or FPS."},new System.Text.Json.JsonSerializerOptions{WriteIndented=true}));
        checks+=ReadinessContracts.Run();
        checks+=ProgressionContracts.Run();
        checks+=ArmyControlContracts.Run();
        checks+=InterfacePolishContracts.Run();
        checks+=CombatSpectacleContracts.Run();
        checks+=CraftContracts.Run();
        checks+=ShowcaseContracts.Run();
        checks+=FeelContracts.Run();
        checks+=CityExperienceContracts.Run();
        Console.WriteLine("Presentation contracts: "+checks+" passed (production C# state/model sources; no Unity rendering).");
    }
}
