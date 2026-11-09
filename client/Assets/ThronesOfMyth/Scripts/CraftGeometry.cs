using System;
using System.Collections.Generic;
namespace ThronesOfMyth
{
    public struct CraftVertex
    {
        public float X,Y,Z,U,V;
        public CraftVertex(float x,float y,float z,float u=0,float v=0){X=x;Y=y;Z=z;U=u;V=v;}
    }
    // Original mesh recipes, independent of Unity so topology is executable in contracts.
    public sealed class CraftGeometry
    {
        public readonly List<CraftVertex> Vertices=new List<CraftVertex>();
        public readonly List<int> Triangles=new List<int>();
        private void Triangle(int a,int b,int c){Triangles.Add(a);Triangles.Add(b);Triangles.Add(c);}
        private void Quad(int a,int b,int c,int d){Triangle(a,b,c);Triangle(a,c,d);}
        public static CraftGeometry Roof(string culture)
        {
            var g=new CraftGeometry();const int across=12,along=8;const int stride=across+1;const int sheet=stride*(along+1);
            bool eastern=culture=="chinese"||culture=="japanese";
            for(int layer=0;layer<2;layer++)for(int z=0;z<=along;z++)for(int x=0;x<=across;x++)
            {
                float px=x/(float)across*2-1,pz=z/(float)along*2-1;
                float height=culture=="egyptian"?.07f:(1-Math.Abs(px))*(culture=="norse"?.65f:.40f)+(eastern?.23f*(float)Math.Pow(Math.Abs(px),4):0);
                height+=.018f*(float)Math.Sin(z*Math.PI*2)*Math.Abs(px);
                g.Vertices.Add(new CraftVertex(px*.5f,height-layer*.07f,pz*.5f,x/3f,z/2f));
            }
            for(int z=0;z<along;z++)for(int x=0;x<across;x++)
            {int a=z*stride+x;g.Quad(a,a+stride,a+stride+1,a+1);g.Quad(a+sheet,a+1+sheet,a+stride+1+sheet,a+stride+sheet);}
            for(int x=0;x<across;x++){g.Quad(x,x+1,x+1+sheet,x+sheet);int a=along*stride+x;g.Quad(a,a+sheet,a+sheet+1,a+1);}
            for(int z=0;z<along;z++){int a=z*stride;g.Quad(a,a+sheet,a+sheet+stride,a+stride);a+=across;g.Quad(a,a+stride,a+stride+sheet,a+sheet);}
            return g;
        }
        public static CraftGeometry Meadow(int seed)
        {
            var g=new CraftGeometry();var random=new Random(seed);
            for(int blade=0;blade<9;blade++)
            {
                float a=(float)random.NextDouble()*6.283185f,x=(float)random.NextDouble()*.75f-.375f,z=(float)random.NextDouble()*.75f-.375f,h=.18f+(float)random.NextDouble()*.25f;
                float dx=(float)Math.Cos(a)*.045f,dz=(float)Math.Sin(a)*.045f;int i=g.Vertices.Count;
                g.Vertices.Add(new CraftVertex(x-dx,0,z-dz));g.Vertices.Add(new CraftVertex(x+dx,0,z+dz));g.Vertices.Add(new CraftVertex(x+dx*.3f+.07f,h*.6f,z+dz*.3f));g.Vertices.Add(new CraftVertex(x+.11f,h,z+.025f));g.Vertices.Add(new CraftVertex(x-dx*.3f+.07f,h*.6f,z-dz*.3f));
                g.Triangle(i,i+1,i+2);g.Triangle(i,i+2,i+4);g.Triangle(i+4,i+2,i+3);
                g.Triangle(i+2,i+1,i);g.Triangle(i+4,i+2,i);g.Triangle(i+3,i+2,i+4);
            }
            return g;
        }
        public static CraftGeometry Arrow()
        {
            var g=new CraftGeometry();
            foreach(var v in new[]{new CraftVertex(-.02f,-.02f,0),new CraftVertex(.02f,-.02f,0),new CraftVertex(.02f,.02f,0),new CraftVertex(-.02f,.02f,0),new CraftVertex(-.02f,-.02f,.46f),new CraftVertex(.02f,-.02f,.46f),new CraftVertex(.02f,.02f,.46f),new CraftVertex(-.02f,.02f,.46f),new CraftVertex(-.10f,0,.42f),new CraftVertex(.10f,0,.42f),new CraftVertex(0,0,.65f),new CraftVertex(0,.08f,.42f),new CraftVertex(0,-.08f,.42f)})g.Vertices.Add(v);
            g.Quad(0,3,2,1);g.Quad(4,5,6,7);g.Quad(0,1,5,4);g.Quad(1,2,6,5);g.Quad(2,3,7,6);g.Quad(3,0,4,7);g.Triangle(8,9,10);g.Triangle(10,9,8);g.Triangle(11,12,10);g.Triangle(10,12,11);return g;
        }
        public static CraftGeometry Vessel()
        {
            var g=new CraftGeometry();float[] radius={.28f,.35f,.44f,.42f,.23f,.25f};
            for(int ring=0;ring<6;ring++)for(int i=0;i<=16;i++){float a=i*6.283185f/16;g.Vertices.Add(new CraftVertex((float)Math.Cos(a)*radius[ring],ring*.16f,(float)Math.Sin(a)*radius[ring],i/16f,ring/5f));}
            for(int ring=0;ring<5;ring++)for(int i=0;i<16;i++){int a=ring*17+i;g.Quad(a,a+17,a+18,a+1);}
            // Closed mouth and base, not a collectible or inventory object.
            int bottom=g.Vertices.Count;g.Vertices.Add(new CraftVertex(0,0,0));int top=g.Vertices.Count;g.Vertices.Add(new CraftVertex(0,.8f,0));
            for(int i=0;i<16;i++){g.Triangle(bottom,i,i+1);g.Triangle(top,86+i,85+i);}
            return g;
        }
    }
}
