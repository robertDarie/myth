using System;
using ThronesOfMyth;
static class MinimapContracts
{
 public static int Run()
 {
  int checks=0;void Check(bool ok,string why){checks++;if(!ok)throw new Exception(why);}
  Check(MinimapGeometry.CellIndex(0,0,256,64)==0,"Southwest corner");
  Check(MinimapGeometry.CellIndex(256,0,256,64)==63,"Southeast corner uses authoritative64 columns");
  Check(MinimapGeometry.CellIndex(0,256,256,64)==4032,"Northwest corner");
  Check(MinimapGeometry.CellIndex(256,256,256,64)==4095,"Northeast corner");
  Check(MinimapGeometry.CellIndex(0,4,256,64)==64,"Cell row boundary is not legacy20");
  Check(MinimapGeometry.CellIndex(3.999f,3.999f,256,64)==0,"Below boundary");
  Check(MinimapGeometry.CellIndex(4,4,256,64)==65,"Exact boundary");
  Check(MinimapGeometry.CellIndex(128,128,256,64)==2080,"Map center");
  Check(MinimapGeometry.CellIndex(80,80,80,20)==399,"Explicit legacy grid remains valid");
  Check(MinimapGeometry.CellIndex(-1,999,256,64)==4032,"Outside widget coordinates clamp safely");
  Check(MinimapGeometry.CellIndex(float.NaN,1,256,64)==-1,"Invalid coordinate fails closed");
  Check(MinimapGeometry.CellIndex(1,1,0,64)==-1&&MinimapGeometry.CellIndex(1,1,256,0)==-1,"Invalid dimensions fail closed");
  Console.WriteLine("Minimap contracts: "+checks+" passed (pure production geometry, not native input).");
  return checks;
 }
}
