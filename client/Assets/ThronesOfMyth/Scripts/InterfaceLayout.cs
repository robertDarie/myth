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
                case "harvest":return 0;case "masonry":return 1;case "stores":return 2;case "writing":return 4;
                case "logistics":return 6;case "march":return 7;case "caravan":return 8;case "drill":return 9;
                case "vitality":return 10;case "beastlore":return 11;case "veterans":return 12;
                case "veilreading":return 13;case "columns":return 15;case "bulwarks":return 16;case "titanhost":return 17;
                case "drills":return 18;case "mercy":return 19;default:return 21+Math.Max(0,fallbackIndex);
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
        public static float ContextHeight(bool pass)=>pass?284:138;
        public static float ContextDescriptionHeight(bool pass)=>pass?168:23;
        public static float ContextHealthY(bool pass)=>ContextHeight(pass)-60;
        public static float ContextActionY(bool pass)=>ContextHeight(pass)-47;
        public static float MarchOrdersTop(float viewHeight,bool pass)=>viewHeight-90-ContextHeight(pass)-56;
        public const float ChromeX=18f,ChromeWidth=254f,PlayfieldLeft=280f,PlayfieldRightInset=240f,PlayfieldTop=112f,PlayfieldBottomInset=100f;
        public static UiRect Playfield(float viewWidth,float viewHeight)=>new UiRect(PlayfieldLeft,PlayfieldTop,Math.Max(0,viewWidth-PlayfieldLeft-PlayfieldRightInset),Math.Max(0,viewHeight-PlayfieldTop-PlayfieldBottomInset));
        public static void Dock(float viewWidth,float viewHeight,bool pass,bool collapsed,bool deployed,out UiRect selection,out UiRect orders)
        {
            float bottom=viewHeight-152f,ordersH=deployed?46f:0f,gap=deployed?6f:0f,selH=collapsed?44f:ContextHeight(pass);
            float y=bottom-(selH+gap+ordersH);
            selection=new UiRect(ChromeX,y+ordersH+gap,ChromeWidth,selH);
            orders=new UiRect(ChromeX,y,deployed?ChromeWidth:0f,ordersH);
        }
        public static bool SelectionFits(float viewWidth,float viewHeight,bool pass,bool collapsed,bool deployed)
        {
            Dock(viewWidth,viewHeight,pass,collapsed,deployed,out var selection,out var orders);
            var quest=new UiRect(18,150,260,206);var floor=new UiRect(0,viewHeight-148,420,148);var play=Playfield(viewWidth,viewHeight);
            if(selection.Overlaps(quest)||selection.Overlaps(floor)||selection.Overlaps(play))return false;
            if(deployed&&(orders.Overlaps(quest)||orders.Overlaps(floor)||orders.Overlaps(selection)||orders.Overlaps(play)))return false;
            return selection.W>0&&selection.H>0;
        }
        public static UiRect ActionButton(UiRect card,bool pass,bool collapsed)=>collapsed?new UiRect(card.X+card.W-128,card.Y+6,90,32):new UiRect(card.X+12,card.Y+ContextActionY(pass),card.W-24,32);
        public static bool ContainsCard(UiRect card,UiRect inner)=>card.Contains(inner.X+1,inner.Y+1)&&card.Contains(inner.XMax-1,inner.YMax-1);
        public static float MinimapHeight(float viewHeight)=>viewHeight<800?132:152;
        public static int TabColumns(float logicalWidth,int count)=>Math.Max(1,Math.Min(count,(int)(logicalWidth/150)));
        // Keep a readable cell. Extra items wrap instead of crushing a label onto two clipped lines.
        public static int FlowColumns(float width,int count,float minimum)
        {
            if(count<1)return 1;
            int fit=(int)Math.Floor(Math.Max(0,width)/Math.Max(1,minimum));
            return Math.Max(1,Math.Min(count,fit));
        }
        public static string Duration(float seconds)
        {int s=Math.Max(0,(int)Math.Ceiling(seconds));return s>=3600?(s/3600)+"h "+(s%3600/60)+"m":s>=60?(s/60)+"m "+(s%60)+"s":s+"s";}
        public static float Countdown(float observed,float elapsed)=>Math.Max(0,observed-Math.Max(0,Math.Min(elapsed,3)));
        public static string ResourceHint(string id)=>id=="aether"?"Earned premium Aether · summon and item options":id=="sigil"?"Oracle Sigils · used at the Temple of Echoes":id=="mana"?"Mana · ordinary resource for mythic development and research":"Available city stockpile · alliance transfers at the Market";
    }
    public struct UiRect
    {
        public float X,Y,W,H;
        public UiRect(float x,float y,float w,float h){X=x;Y=y;W=w;H=h;}
        public float XMax=>X+W;public float YMax=>Y+H;
        public bool Contains(float x,float y)=>x>=X&&y>=Y&&x<XMax&&y<YMax;
        public bool Overlaps(UiRect o)=>W>0&&H>0&&o.W>0&&o.H>0&&X<o.XMax&&XMax>o.X&&Y<o.YMax&&YMax>o.Y;
    }
    public static class MarchClick
    {
        public static bool IssuesOrder(bool busy,bool authorized,bool sameTarget)=>!busy&&authorized&&sameTarget;
    }
}
