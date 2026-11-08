using System;
namespace ThronesOfMyth
{
    [Flags] public enum ArmyCue { None=0,Attack=1,Skill=2,Health=4,Victory=8,Retreat=16,Arrival=32,Gather=64,Returning=128,Combat=256 }
    public struct ArmyObservation { public ArmyCue Cues; public int HealthDelta; public bool Has(ArmyCue cue) => (Cues&cue)!=0; }
    // Lives on the map piece, not its replaceable art. No predicted hits or catch-up volleys.
    public sealed class ArmyPresentationState
    {
        private bool initialized,hadOrder,recovering,working,engaged;
        private int attacks,casts,health,maxHealth;
        private string state,identity,commander;
        private float observedAt,x,z;
        public void Reset(){initialized=false;}
        public ArmyObservation Observe(ArmyData army,float now)
        {
            var result=new ArmyObservation();
            bool continuous=initialized&&identity==army.id&&commander==army.commanderId&&now>=observedAt&&now-observedAt<3&&army.attackSequence>=attacks&&army.skillCasts>=casts;
            float dx=army.x-x,dz=army.z-z;
            if(continuous)
            {
                if(army.attackSequence>attacks)result.Cues|=ArmyCue.Attack;
                if(army.skillCasts>casts)result.Cues|=ArmyCue.Skill;
                if(army.maxHealth==maxHealth&&army.recovery<=0&&!recovering&&dx*dx+dz*dz<144&&army.health!=health)
                {result.Cues|=ArmyCue.Health;result.HealthDelta=army.health-health;}
                if(army.recovery>0&&!recovering)result.Cues|=ArmyCue.Retreat;
                if(army.state=="Victorious"&&state!="Victorious")result.Cues|=ArmyCue.Victory;
                if(IsGathering(army)&&!working)result.Cues|=ArmyCue.Gather;
                if(army.state=="Returning"&&state!="Returning")result.Cues|=ArmyCue.Returning;
                if(IsEngaged(army)&&!engaged)result.Cues|=ArmyCue.Combat;
                // A canceled/stopped order is not an arrival. Must have reached its prior destination.
                if(hadOrder&&!army.hasOrder&&(army.state=="Idle"||army.state=="Healing")&&army.recovery<=0&&!recovering&&dx*dx+dz*dz<144)
                {float tx=army.x-targetX,tz=army.z-targetZ;if(tx*tx+tz*tz<.16f)result.Cues|=ArmyCue.Arrival;}
            }
            initialized=true;identity=army.id;commander=army.commanderId;observedAt=now;attacks=army.attackSequence;casts=army.skillCasts;health=army.health;maxHealth=army.maxHealth;
            working=IsGathering(army);engaged=IsEngaged(army);state=army.state;hadOrder=army.hasOrder;recovering=army.recovery>0;x=army.x;z=army.z;targetX=army.targetX;targetZ=army.targetZ;
            return result;
        }
        private float targetX,targetZ;
        private static bool AtTarget(ArmyData army){float dx=army.x-army.targetX,dz=army.z-army.targetZ;return dx*dx+dz*dz<=4.001f;}
        public static bool IsGathering(ArmyData army) => army.state=="Gathering"&&army.recovery<=0&&AtTarget(army);
        public static bool IsEngaged(ArmyData army) => army.recovery<=0&&(army.state=="Fighting"||army.state=="Siege fighting"||army.state=="Attacking"&&AtTarget(army));
        public static string Label(ArmyData army) => army.state=="Gathering"&&!IsGathering(army)?"To resource":IsCombat(army.state)&&!IsEngaged(army)?"Approaching":army.state;
        public static bool IsCombat(string value) => value=="Attacking"||value=="Fighting"||value=="Siege fighting";
    }
}
