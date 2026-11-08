using System;
using ThronesOfMyth;
class Program
{
    static int checks;
    static void Check(bool condition,string description){checks++;if(!condition)throw new Exception(description);}
    static ArmyData City(int level, bool work=false, bool second=false) => new ArmyData{
        cityBuildings=new[]{new BuildingCard{id="academy",level=level},new BuildingCard{id="citadel",level=level}},
        construction=work?new QueueJob{id="one",type="building",targetId="academy"}:null,
        secondConstruction=second?new QueueJob{id="two",type="upgrade"}:null};
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
        Console.WriteLine("Presentation contracts: "+checks+" passed (production C# state/model sources; no Unity rendering).");
    }
}
