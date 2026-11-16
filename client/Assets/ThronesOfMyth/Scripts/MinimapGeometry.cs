using System;
namespace ThronesOfMyth
{
    public static class MinimapGeometry
    {
        // Coordinates and dimensions come from the authoritative snapshot.
        public static int CellIndex(float x,float z,float extent,int width)
        {
            if(width<1||width>256||extent<=0||float.IsNaN(extent)||float.IsInfinity(extent)||float.IsNaN(x)||float.IsInfinity(x)||float.IsNaN(z)||float.IsInfinity(z))return -1;
            int column=Math.Min(width-1,(int)Math.Floor(Math.Max(0,Math.Min(1,x/extent))*width));
            int row=Math.Min(width-1,(int)Math.Floor(Math.Max(0,Math.Min(1,z/extent))*width));
            return row*width+column;
        }
    }
}
