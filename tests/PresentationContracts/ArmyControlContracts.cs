using System;
using ThronesOfMyth;
static class ArmyControlContracts
{
 public static int Run(){int n=0;void Check(bool v,string why){n++;if(!v)throw new Exception(why);}
 var a=new ArmyData{state="Attacking",hasOrder=true,x=5,z=5,targetX=15,targetZ=5,speed=4,deployed=true,route=new[]{new RoutePoint{x=10,z=5},new RoutePoint{x=15,z=5}}};
 Check(Math.Abs(MarchJourney.Seconds(a)-2)<.001,"ETA must follow route and engagement stopping distance");Check(MarchJourney.DisplayRoute(a)[1].x==13&&a.route[1].x==15,"Presentation cannot mutate authoritative route");a.state="Returning";Check(MarchJourney.Seconds(a)==2.5f,"Return reaches city center");a.hasOrder=false;Check(MarchJourney.Seconds(a)==0,"Stopped order has no ETA");a.state="Paused";Check(MarchJourney.Status(a).Contains("restart"),"Restart needs actionable feedback");a.recovery=8;Check(MarchJourney.Status(a).Contains("Recovering"),"Recovery must not look ready");
 foreach(long c in new long[]{400,403,404,409,413,422})Check(MarchJourney.DefinitiveRejection(c),"Definitive rejection must release pending UI");foreach(long c in new long[]{0,408,429,500,503})Check(!MarchJourney.DefinitiveRejection(c),"Unknown/transient outcome must stay retryable");
 Console.WriteLine("Army control contracts: "+n+" passed.");return n;}
}
