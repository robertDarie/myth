using System;
namespace ThronesOfMyth
{
    public static class MarchJourney
    {
        private static float Distance(float x,float z,float xx,float zz){float a=x-xx,b=z-zz;return (float)Math.Sqrt(a*a+b*b);}
        public static float StopDistance(ArmyData army)=>army.state=="Marching"||army.state=="Returning"?0:2;
        public static RoutePoint[] DisplayRoute(ArmyData army)
        {
            if(army==null||!army.hasOrder)return Array.Empty<RoutePoint>();
            var source=army.route;if(source==null||source.Length==0)source=new[]{new RoutePoint{x=army.targetX,z=army.targetZ}};
            var result=new RoutePoint[source.Length];for(int i=0;i<result.Length;i++)result[i]=new RoutePoint{x=source[i].x,z=source[i].z};
            var end=result[result.Length-1];float x=result.Length>1?result[result.Length-2].x:army.x,z=result.Length>1?result[result.Length-2].z:army.z;
            float d=Distance(x,z,end.x,end.z),stop=Math.Min(d,StopDistance(army));if(d>.00001f){end.x-=(end.x-x)/d*stop;end.z-=(end.z-z)/d*stop;}return result;
        }
        public static float Seconds(ArmyData army)
        {if(army==null||!army.hasOrder||army.speed<=0)return 0;float total=0,x=army.x,z=army.z;foreach(var p in DisplayRoute(army)){total+=Distance(x,z,p.x,p.z);x=p.x;z=p.z;}return total/army.speed;}
        public static string Status(ArmyData army)
        {
            if(army==null)return "No formation selected";if(army.recovery>0)return "Recovering at home · "+InterfaceLayout.Duration(army.recovery);
            if(!army.deployed)return "Home formation · ready to edit";
            if(ArmyPresentationState.IsGathering(army))return "Gathering · cargo "+(army.cargo==null?0:army.cargo.food+army.cargo.wood+army.cargo.stone+army.cargo.gold+army.cargo.mana)+" / "+army.carryCapacity;
            if(ArmyPresentationState.IsEngaged(army))return "In combat · skills activate at 1,000 rage";
            if(army.hasOrder)return ArmyPresentationState.Label(army)+" · arrival ≈ "+InterfaceLayout.Duration(Seconds(army));
            return army.state=="Paused"?"Paused after restart · choose a new order":army.state=="Target unavailable"?"Target unavailable · choose another destination":army.state=="Route locked"?"Route blocked · return or secure the gate":army.state=="Not enough AP"?"Not enough AP · recover energy or return":army.state+" · awaiting orders";
        }
        public static bool DefinitiveRejection(long code)=>code==400||code==403||code==404||code==409||code==413||code==422;
    }
}
