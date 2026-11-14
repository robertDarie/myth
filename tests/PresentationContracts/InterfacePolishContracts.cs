using System;
using ThronesOfMyth;
static class InterfacePolishContracts
{
 public static int Run()
 {
  int n=0;void Check(bool v,string why){n++;if(!v)throw new Exception(why);}
  foreach(var size in new[]{(1200,720),(1280,720),(1366,768),(1600,900),(1920,1080),(2560,1440),(2560,1080),(1024,768),(1280,800)})foreach(float pref in new[]{.85f,1f,1.15f})
  {
   float scale=InterfaceLayout.Scale(size.Item1,size.Item2,pref);float w=size.Item1/scale,h=size.Item2/scale;
   float minimapTop=h-94-InterfaceLayout.MinimapHeight(h),lastMarch=InterfaceLayout.MarchTop+4*InterfaceLayout.MarchStep+InterfaceLayout.MarchStep-6;
   float panel=Math.Min(1320,w-72)-40,rowWidth=panel-InterfaceLayout.FormationRosterWidth(panel)-16-42;
   Check(InterfaceLayout.TroopTitleWidth(rowWidth)>200,"Formation title has dedicated width independent of quantity controls");
   Check(83+16<=InterfaceLayout.TroopRowHeight&&InterfaceLayout.TroopRowStep>InterfaceLayout.TroopRowHeight,"Slider stays inside row with space between stacks");
   Check(w>=1279&&h>=719,"Minimum logical viewport");Check(lastMarch<minimapTop,"March cards must not overlap minimap");Check(InterfaceLayout.HudHeight<112,"HUD must clear side controls");
   Check(w-232>260,"Rails must leave gameplay viewport");Check(InterfaceLayout.TabColumns(w-280,7)>=2,"Responsive tab columns");
  }
  var cells=new System.Collections.Generic.HashSet<int>();
  foreach(string id in new[]{"harvest","masonry","writing","logistics","march","drill","vitality","beastlore","veterans","veilreading"})
   Check(cells.Add(InterfaceLayout.ResearchSlot(id,0)),"Research cards including veil reading never overlap");
  for(int i=0;i<12;i++)Check(cells.Add(InterfaceLayout.ResearchSlot("future-"+i,i)),"Additional research gets a distinct scrollable cell");
  Check(InterfaceLayout.ShowItem(new InventoryItem{count=1,category="Resources"},"Resources",false),"Owned items visible");
  Check(!InterfaceLayout.ShowItem(new InventoryItem{count=0},"",false)&&InterfaceLayout.ShowItem(new InventoryItem{count=0},"",true),"Empty stacks hidden with explicit catalogue access");
  Check(InterfaceLayout.Scale(1024,768,1)>.64f,"Small display text receives larger physical scale");
  Check(InterfaceLayout.Duration(61)=="1m 1s"&&InterfaceLayout.Duration(3601)=="1h 0m","Duration format");Check(InterfaceLayout.Duration(-1)=="0s","Duration clamp");
  Check(InterfaceLayout.Countdown(2,4)==0&&InterfaceLayout.Countdown(10,100)==7,"Countdown must not extrapolate beyond short snapshot window");
  Check(ReleaseVersion.Current=="0.45.0"&&ReleaseVersion.Protocol==17,"Release identity advances with the expanded-map protocol");
  foreach(var size in new[]{(1024f,768f),(1280f,800f),(1920f,1080f)})
  {
   InterfaceLayout.CommanderWindow(size.Item1,size.Item2,1f,out float innerW,out float innerH);
   Check(CommanderHallLayout.Separated(innerW,innerH),"Commander hall keeps the roster, figure and card apart at "+size.Item1+"x"+size.Item2);
  }
  Check(ReconCopy.Depth(1).Contains("approximate strength")&&ReconCopy.Depth(2).Contains("quantities")&&ReconCopy.Depth(3).Contains("ordinary stores")&&ReconCopy.Stale.Contains("may have changed"),"Veil reading copy states depth and staleness");
  Check(LandmarkCopy.ShowRemembered(true)&&!LandmarkCopy.ShowRemembered(false),"Unexplored remembered markers stay concealed");
  Check(!LandmarkCopy.MapLabel(true,"Stone Cutting").Contains("Last seen")&&LandmarkCopy.MapLabel(true,"Stone Cutting").Contains("Recorded landmark"),"Explored landmarks keep their name without a last-seen label");
  Check(LandmarkCopy.Inspection(true).Contains("not a live count")&&LandmarkCopy.Inspection(false).Contains("Concealed"),"Historical counts are not presented as current");
  Check(OutcomeSummary.Credited(new ResourceAmounts{gold=50,food=30,mana=5})=="Credited · 50 gold · 30 food · 5 Mana","Reward presentation must use exact report values");
  Check(!OutcomeSummary.Credited(new ResourceAmounts()).Contains("Credited")&&!OutcomeSummary.Credited(null).Contains("Credited"),"No fabricated reward for missing or empty report");
  Console.WriteLine("UI layout/identity contracts: "+n+" passed; font rendering pending.");return n;
 }
}
