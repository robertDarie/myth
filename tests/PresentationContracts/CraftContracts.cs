using System;
using ThronesOfMyth;
static class CraftContracts
{
 public static int Run()
 {
  int n=0;void Check(bool v,string why){n++;if(!v)throw new Exception(why);}
  void Mesh(CraftGeometry g,string name)
  {
   Check(g.Vertices.Count>0&&g.Vertices.Count<1000,name+" bounded vertices");Check(g.Triangles.Count%3==0,name+" complete triangles");
   foreach(var v in g.Vertices)Check(float.IsFinite(v.X)&&float.IsFinite(v.Y)&&float.IsFinite(v.Z),name+" finite vertices");
   foreach(var i in g.Triangles)Check(i>=0&&i<g.Vertices.Count,name+" index bounds");
   for(int i=0;i<g.Triangles.Count;i+=3)
   {var a=g.Vertices[g.Triangles[i]];var b=g.Vertices[g.Triangles[i+1]];var c=g.Vertices[g.Triangles[i+2]];float x=b.X-a.X,y=b.Y-a.Y,z=b.Z-a.Z,xx=c.X-a.X,yy=c.Y-a.Y,zz=c.Z-a.Z;float cx=y*zz-z*yy,cy=z*xx-x*zz,cz=x*yy-y*xx;Check(cx*cx+cy*cy+cz*cz>1e-12f,name+" degenerate face");}
  }
  foreach(string c in new[]{"greek","egyptian","norse","chinese","japanese"})Mesh(CraftGeometry.Roof(c),c);
  for(int i=0;i<4;i++)Mesh(CraftGeometry.Meadow(i),"meadow"+i);Mesh(CraftGeometry.Vessel(),"vessel");Mesh(CraftGeometry.Arrow(),"arrow");
  var a1=CraftGeometry.Meadow(2);var a2=CraftGeometry.Meadow(2);for(int i=0;i<a1.Vertices.Count;i++)Check(a1.Vertices[i].X==a2.Vertices[i].X&&a1.Vertices[i].Z==a2.Vertices[i].Z,"Geometry must be deterministic");
  Console.WriteLine("Crafted art geometry contracts: "+n+" passed; no rendering.");return n;
 }
}
