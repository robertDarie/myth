using System;
namespace ThronesOfMyth
{
    // A short visual loss trace. The filled health is always the observed value.
    public sealed class HealthBarTrail
    {
        private float health=-1,previous=-1,changed;
        public void Observe(float value,float now)
        {
            if(value<0){health=previous=-1;return;}
            value=Math.Max(0,Math.Min(1,value));
            if(health<0||value>health){previous=value;}else{previous=Math.Max(Value(now,false),health);changed=now;}
            health=value;
        }
        public float Value(float now,bool reducedMotion)
        {if(health<0||reducedMotion)return health;float t=Math.Max(0,now-changed-.18f);return health+(previous-health)*(float)Math.Exp(-t*7);}
    }
}
