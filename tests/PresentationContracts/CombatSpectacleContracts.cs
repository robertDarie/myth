using System;
using ThronesOfMyth;
static class CombatSpectacleContracts
{
 public static int Run()
 {
  int n=0;void Check(bool v,string why){n++;if(!v)throw new Exception(why);}
  Check(SkillPresentation.ArrowProgress(0)==0&&SkillPresentation.ArrowProgress(1)==1,"Arrow flight clamps to observed attack window");
  Check(SkillPresentation.ArrowProgress(SkillPresentation.ArrowRelease)==0&&SkillPresentation.ArrowProgress(SkillPresentation.ArrowImpact)==1,"Release and impact align with flight endpoints");
  Check(SkillPresentation.ArrowHeight(0)==0&&SkillPresentation.ArrowHeight(1)==0&&SkillPresentation.ArrowHeight(.5f)>.7f,"Arrows rise and land at endpoints");
  Check(SkillPresentation.ArrowSlope(0)>0&&SkillPresentation.ArrowSlope(.5f)==0&&SkillPresentation.ArrowSlope(1)<0,"Arrow nose follows rising and falling trajectory");
  Check(SkillPresentation.CastPose(0)==0&&SkillPresentation.CastPose(RallyingCryTimeline.Release)==1,"Commander pose peaks with release audio and wave");
  Check(SkillPresentation.CastPose(-1)==0&&SkillPresentation.CastPose(.9f)==0,"No lingering cast pose outside confirmed presentation");
  foreach(string hero in new[]{"captain","warden","mulan"})Check(SkillPresentation.Profile(hero,"shield").Shape==SkillShape.Shield,"Shield authority");
  foreach(string hero in new[]{"rune-seer","horus-champion"})Check(SkillPresentation.Profile(hero,"heal").Shape==SkillShape.Healing,"Healing authority");
  foreach(string hero in new[]{"scout","atalanta","tomoe","heracles","sigurd","wukong"})
  {var p=SkillPresentation.Profile(hero,"damage");Check(p.Shape==SkillShape.Physical||p.Shape==SkillShape.Projectile,"Do not invent AoE, charge or debuff gameplay");Check(p.R>=0&&p.R<=1&&p.G>=0&&p.G<=1&&p.B>=0&&p.B<=1,"Palette bounds");}
  Check(SkillPresentation.Profile("rune-seer","damage").Shape!=SkillShape.Healing,"Commander identity cannot invent healing");
  Check(!SkillPresentation.HasPersistentShield(SkillShape.Healing,100)&&!SkillPresentation.HasPersistentShield(SkillShape.Shield,0),"No invented protection");
  Check(SkillPresentation.AttackLean(.1f)<0&&SkillPresentation.AttackLean(.35f)>.99f&&SkillPresentation.AttackLean(.65f)==0,"Anticipation, strike, recovery order");
  foreach(SkillShape shape in Enum.GetValues(typeof(SkillShape)))for(int i=-10;i<180;i++)
  {float t=i*.01f,e=SkillPresentation.Envelope(t,shape);Check(e>=0&&e<=1,"Envelope bounds");Check(SkillPresentation.Flight(t)>=0&&SkillPresentation.Flight(t)<=1,"Flight bounds");}
  var hp=new HealthBarTrail();hp.Observe(1,0);hp.Observe(.7f,1);Check(hp.Value(1.1f,false)>.99f,"Trace should briefly show real lost health");hp.Observe(.7f,1.2f);Check(hp.Value(1.3f,false)>.7f,"Repeated snapshots must not erase trace");Check(hp.Value(2,false)<.71f,"Trace must settle");Check(hp.Value(1.1f,true)==.7f,"Reduced motion must show actual health only");hp.Observe(.9f,2);Check(hp.Value(2,false)==.9f,"Actual healing should not retain damage trace");hp.Observe(-1,3);Check(hp.Value(3,false)<0,"Remembered objects must have no health trace");
  Console.WriteLine("Combat spectacle contracts: "+n+" passed.");return n;
 }
}
