using System;
using ThronesOfMyth;
static class InterfacePolishContracts
{
 public static int Run()
 {
  int n=0;void Check(bool v,string why){n++;if(!v)throw new Exception(why);}
  foreach(var size in new[]{(1200,720),(1280,720),(1366,768),(1600,900),(1920,1080),(2560,1440),(2560,1080),(1024,768)})foreach(float pref in new[]{.85f,1f,1.15f})
  {
   float scale=InterfaceLayout.Scale(size.Item1,size.Item2,pref);float w=size.Item1/scale,h=size.Item2/scale;
   float minimapTop=h-94-InterfaceLayout.MinimapHeight(h),lastMarch=InterfaceLayout.MarchTop+4*InterfaceLayout.MarchStep+InterfaceLayout.MarchStep-6;
   Check(w>=1279&&h>=719,"Minimum logical viewport");Check(lastMarch<minimapTop,"March cards must not overlap minimap");Check(InterfaceLayout.HudHeight<112,"HUD must clear side controls");
   Check(w-232>260,"Rails must leave gameplay viewport");Check(InterfaceLayout.TabColumns(w-280,7)>=2,"Responsive tab columns");
  }
  Check(InterfaceLayout.ShowItem(new InventoryItem{count=1,category="Resources"},"Resources",false),"Owned items visible");
  Check(!InterfaceLayout.ShowItem(new InventoryItem{count=0},"",false)&&InterfaceLayout.ShowItem(new InventoryItem{count=0},"",true),"Empty stacks hidden with explicit catalogue access");
  Check(InterfaceLayout.Scale(1024,768,1)>.64f,"Small display text receives larger physical scale");
  Check(InterfaceLayout.Duration(61)=="1m 1s"&&InterfaceLayout.Duration(3601)=="1h 0m","Duration format");Check(InterfaceLayout.Duration(-1)=="0s","Duration clamp");
  Check(InterfaceLayout.Countdown(2,4)==0&&InterfaceLayout.Countdown(10,100)==7,"Countdown must not extrapolate beyond short snapshot window");
  Check(ReleaseVersion.Current=="0.45.0"&&ReleaseVersion.Protocol==16,"Release identity advances without a protocol change");
  Check(ReconCopy.Depth(1).Contains("approximate strength")&&ReconCopy.Depth(2).Contains("quantities")&&ReconCopy.Depth(3).Contains("ordinary stores")&&ReconCopy.Stale.Contains("may have changed"),"Veil reading copy states depth and staleness");
  Check(OutcomeSummary.Credited(new ResourceAmounts{gold=50,food=30,mana=5})=="Credited · 50 gold · 30 food · 5 Mana","Reward presentation must use exact report values");
  Check(!OutcomeSummary.Credited(new ResourceAmounts()).Contains("Credited")&&!OutcomeSummary.Credited(null).Contains("Credited"),"No fabricated reward for missing or empty report");
  Console.WriteLine("UI layout/identity contracts: "+n+" passed; font rendering pending.");return n;
 }
}
