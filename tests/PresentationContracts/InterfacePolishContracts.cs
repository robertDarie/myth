using System;
using ThronesOfMyth;
static class InterfacePolishContracts
{
 public static int Run()
 {
  int n=0;void Check(bool v,string why){n++;if(!v)throw new Exception(why);}
  foreach(var size in new[]{(1200,720),(1280,720),(1366,768),(1600,900),(1920,1080),(2560,1440),(2560,1080),(1024,768)})foreach(float pref in new[]{.85f,1f,1.15f})
  {
   float scale=Math.Min(Math.Min(size.Item1/1600f,size.Item2/900f)*pref,Math.Min(size.Item1/1280f,size.Item2/720f));float w=size.Item1/scale,h=size.Item2/scale;
   float minimapTop=h-94-InterfaceLayout.MinimapHeight(h),lastMarch=InterfaceLayout.MarchTop+4*InterfaceLayout.MarchStep+InterfaceLayout.MarchStep-6;
   Check(w>=1279&&h>=719,"Minimum logical viewport");Check(lastMarch<minimapTop,"March cards must not overlap minimap");Check(InterfaceLayout.HudHeight<112,"HUD must clear side controls");
   Check(w-232>260,"Rails must leave gameplay viewport");Check(InterfaceLayout.TabColumns(w-280,7)>=2,"Responsive tab columns");
  }
  Check(InterfaceLayout.Duration(61)=="1m 1s"&&InterfaceLayout.Duration(3601)=="1h 0m","Duration format");Check(InterfaceLayout.Duration(-1)=="0s","Duration clamp");
  Check(InterfaceLayout.Countdown(2,4)==0&&InterfaceLayout.Countdown(10,100)==7,"Countdown must not extrapolate beyond short snapshot window");
  Check(ReleaseVersion.Current=="0.37.0"&&ReleaseVersion.Protocol==16,"One release identity without protocol change");
  Check(OutcomeSummary.Credited(new ResourceAmounts{gold=50,food=30,mana=5})=="Credited · 50 gold · 30 food · 5 Mana","Reward presentation must use exact report values");
  Check(!OutcomeSummary.Credited(new ResourceAmounts()).Contains("Credited")&&!OutcomeSummary.Credited(null).Contains("Credited"),"No fabricated reward for missing or empty report");
  Console.WriteLine("UI layout/identity contracts: "+n+" passed; font rendering pending.");return n;
 }
}
