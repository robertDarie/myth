using System;
namespace ThronesOfMyth
{
    // Session-only presentation state. Never modifies city data, jobs or world orders.
    public sealed class CityExperienceState
    {
        public const float Duration=.75f;
        public bool TargetCity {get;private set;}
        public float Amount {get;private set;}
        public float Blend => Amount*Amount*(3-2*Amount);
        public bool BlocksWorld => TargetCity||Amount>0;
        public bool CanPickCity => TargetCity&&Amount>=1;
        public bool IsTransitioning => Amount>0&&Amount<1;
        public void SetCity(bool value){TargetCity=value;}
        public void Advance(float seconds,bool reducedMotion)
        {
            if(reducedMotion){Amount=TargetCity?1:0;return;}
            if(float.IsNaN(seconds)||float.IsInfinity(seconds)||seconds<0)return;
            float step=Math.Min(seconds,.1f)/Duration;
            Amount=Math.Max(0,Math.Min(1,Amount+(TargetCity?step:-step)));
        }
        public bool AllowsWorldInput(bool worldPage,bool overUi,bool textFocus) => !BlocksWorld&&worldPage&&!overUi&&!textFocus;
        public InterfacePage CloseDestination(InterfacePage current,bool districtList) => TargetCity&&(current!=InterfacePage.City||districtList)?InterfacePage.City:InterfacePage.World;
        public void Reset(){TargetCity=false;Amount=0;}
    }
    public sealed class CityViewMotion
    {
        public float Yaw {get;private set;}
        public float Zoom {get;private set;}=1;
        private float wantedYaw,wantedZoom=1;
        public void Rotate(float degrees){if(!float.IsNaN(degrees)&&!float.IsInfinity(degrees))wantedYaw+=degrees;}
        public void Magnify(float delta){if(!float.IsNaN(delta)&&!float.IsInfinity(delta))wantedZoom=Math.Max(1,Math.Min(1.45f,wantedZoom+delta));}
        public void Reset(){Yaw=((Yaw+180)%360+360)%360-180;wantedYaw=0;wantedZoom=1;}
        public void Advance(float seconds,bool reducedMotion)
        {
            float t=reducedMotion?1:1-(float)Math.Exp(-12*Math.Max(0,Math.Min(.1f,float.IsNaN(seconds)?0:seconds)));
            Yaw+=(wantedYaw-Yaw)*t;Zoom+=(wantedZoom-Zoom)*t;
            if(Math.Abs(Yaw-wantedYaw)<.001f)Yaw=wantedYaw;
            if(Math.Abs(Zoom-wantedZoom)<.001f)Zoom=wantedZoom;
            if(Math.Abs(Yaw)>3600){float turns=(float)Math.Truncate(Yaw/360)*360;Yaw-=turns;wantedYaw-=turns;}
        }
    }
    public static class CityViewportPolicy
    {
        public static void RenderSize(float pixelsX,float pixelsY,bool immersive,out int width,out int height)
        {
            pixelsX=float.IsNaN(pixelsX)||float.IsInfinity(pixelsX)?1:Math.Max(1,pixelsX);
            pixelsY=float.IsNaN(pixelsY)||float.IsInfinity(pixelsY)?1:Math.Max(1,pixelsY);
            float density=Math.Min(1,Math.Min((immersive?2560:1600)/pixelsX,(immersive?1440:1024)/pixelsY));
            width=Math.Max(16,(int)Math.Ceiling(pixelsX*density/16)*16);height=Math.Max(16,(int)Math.Ceiling(pixelsY*density/16)*16);
        }
    }
    public static class CitySelection
    {
        public static InterfacePage Institution(string id)
        {
            switch(id){case "oracle":return InterfacePage.Temple;case "academy":return InterfacePage.Research;case "barracks":case "menagerie":return InterfacePage.Training;case "infirmary":return InterfacePage.Hospital;case "forge":return InterfacePage.Forge;case "market":return InterfacePage.Market;case "vault":return InterfacePage.Inventory;case "oathhall":return InterfacePage.Alliance;default:return InterfacePage.City;}
        }
        public static int Find(BuildingCard[] buildings,string id,int fallback=0)
        {if(buildings==null||buildings.Length==0)return -1;for(int i=0;i<buildings.Length;i++)if(buildings[i].id==id)return i;return Math.Max(0,Math.Min(buildings.Length-1,fallback));}
        public static int Step(int selected,int direction,int count) => count<=0?-1:((selected+direction)%count+count)%count;
    }
}
