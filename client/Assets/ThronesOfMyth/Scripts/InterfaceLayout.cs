using System;
namespace ThronesOfMyth
{
    public static class InterfaceLayout
    {
        public static float Scale(float width,float height,float preference)=>Math.Min(Math.Min(width/(width<1280?1440f:1600f),height/900f)*preference,Math.Min(width/1280f,height/720f));
        public static bool ShowItem(InventoryItem item,string category,bool catalogue)=>item!=null&&(catalogue||item.count>0)&&(string.IsNullOrEmpty(category)||item.category==category);
        public const float HudHeight=104,RailWidth=214,MarchTop=142,MarchStep=70;
        public static float MinimapHeight(float viewHeight)=>viewHeight<800?132:152;
        public static int TabColumns(float logicalWidth,int count)=>Math.Max(1,Math.Min(count,(int)(logicalWidth/150)));
        public static string Duration(float seconds)
        {int s=Math.Max(0,(int)Math.Ceiling(seconds));return s>=3600?(s/3600)+"h "+(s%3600/60)+"m":s>=60?(s/60)+"m "+(s%60)+"s":s+"s";}
        public static float Countdown(float observed,float elapsed)=>Math.Max(0,observed-Math.Max(0,Math.Min(elapsed,3)));
        public static string ResourceHint(string id)=>id=="aether"?"Earned premium Aether · summon and item options":id=="sigil"?"Oracle Sigils · used at the Temple of Echoes":id=="mana"?"Mana · ordinary resource for mythic development and research":"Available city stockpile · alliance transfers at the Market";
    }
}
