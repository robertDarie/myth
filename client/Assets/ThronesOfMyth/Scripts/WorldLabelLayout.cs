using System;
using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    // Stable priority-ordered placement; shared bounds and HUD occlusion checks.
    public sealed class WorldLabelLayout
    {
        private readonly List<Rect> occupied=new List<Rect>();
        private Rect viewport;
        public void Reset(Rect bounds){viewport=bounds;occupied.Clear();}
        public bool TryPlace(Rect desired,float gap,Func<Vector2,bool> blocked,out Rect result)
        {
            result=desired;
            if(desired.width>viewport.width||desired.height>viewport.height)return false;
            result.x=Mathf.Clamp(desired.x,viewport.xMin,viewport.xMax-desired.width);
            for(int attempt=0;attempt<3;attempt++)
            {
                result.y=desired.y-attempt*(desired.height+gap*2+4);
                if(result.yMin<viewport.yMin||result.yMax>viewport.yMax)continue;
                var reserved=Rect.MinMaxRect(result.xMin-gap,result.yMin-gap,result.xMax+gap,result.yMax+gap+3);
                bool overlap=false;
                foreach(var other in occupied)if(reserved.Overlaps(other)){overlap=true;break;}
                // Sample the whole plate, not only its center: controls can be narrow.
                if(!overlap&&blocked!=null)
                    for(int y=0;y<=2&&!overlap;y++)for(int x=0;x<=4;x++)
                        if(blocked(new Vector2(Mathf.Lerp(result.xMin,result.xMax,x/4f),Mathf.Lerp(result.yMin,result.yMax,y/2f)))){overlap=true;break;}
                if(overlap)continue;
                occupied.Add(reserved);return true;
            }
            return false;
        }
    }
}
