using System;
namespace ThronesOfMyth
{
    public static class InterfaceLayout
    {
        public static float FormationRosterWidth(float available)=>Math.Min(286,Math.Max(220,available*.27f));
        public static float TroopTitleWidth(float rowWidth)=>Math.Max(1,rowWidth-74);
        public const float TroopRowHeight=104,TroopRowStep=110;
        // Stable tree cells. Newly introduced technologies must not overlap an authored cell.
        public static int ResearchSlot(string id,int fallbackIndex)
        {
            switch(id)
            {
                case "harvest":return 0;case "masonry":return 1;case "writing":return 4;
                case "logistics":return 6;case "march":return 7;case "drill":return 9;
                case "vitality":return 10;case "beastlore":return 11;case "veterans":return 12;
                case "veilreading":return 13;default:return 15+Math.Max(0,fallbackIndex);
            }
        }
        public static float Scale(float width,float height,float preference)=>Math.Min(Math.Min(width/(width<1280?1440f:1600f),height/900f)*preference,Math.Min(width/1280f,height/720f));
        public static void CommanderWindow(float screenW,float screenH,float preference,out float innerW,out float innerH)
        {
            float scale=Scale(screenW,screenH,preference);float viewW=screenW/scale,viewH=screenH/scale;
            float winW=Math.Min(1320f,viewW-72f),winH=viewH-204f;innerW=winW-40f;innerH=winH-90f;
        }
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
