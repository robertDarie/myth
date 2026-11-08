using System;
using System.Collections.Generic;
namespace ThronesOfMyth
{
    // Transient client presentation only. No serialized progress or optimistic levels.
    public sealed class CityProgressFeedback
    {
        private readonly Dictionary<string,int> levels=new Dictionary<string,int>();
        private readonly Dictionary<string,float> completedUntil=new Dictionary<string,float>();
        private readonly HashSet<string> buildingTargets=new HashSet<string>();
        private string profile;
        private float observedAt;
        private bool initialized;
        public void Reset(){initialized=false;levels.Clear();buildingTargets.Clear();completedUntil.Clear();}
        public bool IsRecent(string id,float now) => completedUntil.TryGetValue(id,out var until)&&now<until;
        public void Observe(string identity,ArmyData city,float now)
        {
            bool continuous=initialized&&identity==profile&&now>=observedAt&&now-observedAt<6;
            if(!continuous)completedUntil.Clear();
            if(city==null||city.cityBuildings==null){initialized=false;return;}
            foreach(var building in city.cityBuildings)
            {
                if(continuous&&levels.TryGetValue(building.id,out int before)&&building.level==before+1&&buildingTargets.Contains(building.id))completedUntil[building.id]=now+2.2f;
            }
            levels.Clear();foreach(var building in city.cityBuildings)levels[building.id]=building.level;
            buildingTargets.Clear();Track(city.construction);Track(city.secondConstruction);
            profile=identity;observedAt=now;initialized=true;
        }
        private void Track(QueueJob job)
        {
            if(job==null||string.IsNullOrEmpty(job.id))return;
            if(job.type=="upgrade")buildingTargets.Add("citadel");
            else if(job.type=="building"&&!string.IsNullOrEmpty(job.targetId))buildingTargets.Add(job.targetId);
        }
    }
}
