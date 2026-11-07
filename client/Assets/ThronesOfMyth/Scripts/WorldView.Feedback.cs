using System;
using System.Collections.Generic;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private string reportOwner;
        private HashSet<string> completedReports=new HashSet<string>();
        private void ObserveCompletedBattles(WorldSnapshot world,string ownId)
        {
            var owner=Array.Find(world.players,p=>p.id==ownId);if(owner==null||owner.groupReports==null)return;
            bool initial=reportOwner!=ownId;reportOwner=ownId;var current=new HashSet<string>();
            foreach(var report in owner.groupReports)
            {
                if(report.ended<=0)continue;current.Add(report.id);
                if(initial||completedReports.Contains(report.id)||report.outcome!="Stronghold defeated")continue;
                foreach(var entry in report.participants)if(entry.playerId==ownId&&entry.result=="Survived"&&pieces.TryGetValue(entry.armyId,out var piece)&&piece.actor!=null)piece.actor.ObserveVictory();
            }
            completedReports=current;
        }
    }
}
