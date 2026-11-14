using System;
namespace ThronesOfMyth
{
    // Presentation cache only; server visibility still controls which entities exist.
    public sealed class FogVisibilityGrid
    {
        private bool[] known=new bool[400];
        private byte[] sectors=new byte[400];
        public int Width {get;private set;}=20;
        private bool initialized;
        public bool Update(ExplorationData data)
        {
            if(data==null)return false;
            int width=data.width>0?data.width:20;
            if(width<1||width>256)return false;
            if(Width!=width){Width=width;known=new bool[width*width];sectors=new byte[width*width];initialized=false;}
            Array.Clear(known,0,known.Length);
            if(data.explored!=null)foreach(int index in data.explored)if((uint)index<(uint)known.Length)known[index]=true;
            bool changed=!initialized;
            for(int i=0;i<known.Length;i++){byte next=known[i]?(byte)1:(byte)0;if(next!=sectors[i])changed=true;sectors[i]=next;}
            initialized=true;return changed;
        }
        public float Opacity(int x,int z)
        {
            // Explored land stays clear. Current military sight does not create a third, grey map state.
            byte state=sectors[Math.Max(0,Math.Min(Width-1,z))*Width+Math.Max(0,Math.Min(Width-1,x))];return state==1?0:1;
        }
        public void Reset(){initialized=false;Array.Clear(sectors,0,sectors.Length);}
    }
}
