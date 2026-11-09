using System;
using ThronesOfMyth;
static class ShowcaseContracts
{
 public static int Run()
 {
  int n=0;void Check(bool value,string why){n++;if(!value)throw new Exception(why);}
  Check(RallyingCryTimeline.Gather(-1)==0,"Reconnect must not gather energy");
  Check(RallyingCryTimeline.Gather(.16f)>.49f,"Confirmed cast anticipation missing");
  Check(RallyingCryTimeline.Gather(.5f)==0,"Gather must finish on release");
  Check(RallyingCryTimeline.Shock(.1f)==0&&RallyingCryTimeline.Shock(1)==1,"Shockwave phase bounds");
  Check(RallyingCryTimeline.Live(-1,true)&&!RallyingCryTimeline.Live(-1,false),"Baseline aura only for confirmed shield");
  Check(!RallyingCryTimeline.Live(3,false)&&RallyingCryTimeline.Live(3,true),"Effect cannot invent or prolong shield");
  Check(RallyingCryTimeline.Shell(.1f,false,false)==0,"No shell when shield exhausted");
  Check(RallyingCryTimeline.Shell(.1f,true,true)==RallyingCryTimeline.Shell(3,true,true),"Reduced motion shell must stay static");
  for(int i=-10;i<150;i++){float t=i*.01f;Check(RallyingCryTimeline.Shock(t)>=0&&RallyingCryTimeline.Shock(t)<=1,"Shock bounds");Check(RallyingCryTimeline.Shell(t,true,false)>=0&&RallyingCryTimeline.Shell(t,true,false)<=.42f,"Opacity bounds");}
  var tips=new TooltipSession();
  Check(tips.Observe(1,"First",0)=="","Tooltip dwell missing");
  Check(tips.Observe(1,"First",.5f)=="First","Fresh hovered tooltip missing");
  Check(tips.Observe(2,"First",.6f)=="","Page changes must dismiss even identical tooltip text");
  Check(tips.Observe(2,"",1)=="","Leaving control must clear tooltip");
  Check(tips.Observe(2,"Second",1.1f)==""&&tips.Observe(2,"Second",1.5f)=="Second","New control must dwell");
  tips.Reset();Check(tips.Observe(2,"Second",2)=="","Close/signout must reset tooltip");
  Check(GameNavigation.CompactTitle("Marches & reserves")=="Marches"&&GameNavigation.CompactTitle("Scouts & discovery")=="Scouting"&&GameNavigation.CompactTitle("Rallies & garrisons")=="Rallies","Compact navigation must retain clear labels");
  Console.WriteLine("Showcase timeline contracts: "+n+" passed.");return n;
 }
}
