using System;
namespace ThronesOfMyth
{
    // Presentation cache only; server visibility still controls which entities exist.
    public sealed class FogVisibilityGrid
    {
        private readonly bool[] known=new bool[400],visible=new bool[400];
        private readonly byte[] sectors=new byte[400];
        private bool initialized;
        public bool Update(ExplorationData data)
        {
            if(data==null)return false;
            Array.Clear(known,0,known.Length);Array.Clear(visible,0,visible.Length);
            if(data.explored!=null)foreach(int index in data.explored)if((uint)index<400)known[index]=true;
            if(data.visible!=null)foreach(int index in data.visible)if((uint)index<400)visible[index]=true;
            bool changed=!initialized;
            for(int i=0;i<400;i++){byte next=visible[i]?(byte)2:known[i]?(byte)1:(byte)0;if(next!=sectors[i])changed=true;sectors[i]=next;}
            initialized=true;return changed;
        }
        public float Opacity(int x,int z)
        {
            byte state=sectors[Math.Max(0,Math.Min(19,z))*20+Math.Max(0,Math.Min(19,x))];return state==2?0:state==1?.50f:1;
        }
        public void Reset(){initialized=false;Array.Clear(sectors,0,sectors.Length);}
    }
}
