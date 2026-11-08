using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private readonly ReportReplayGuard reportGuard=new ReportReplayGuard();
        private void ObserveCompletedBattles(WorldSnapshot world,string ownId)
        {
            var owner=Array.Find(world.players,p=>p.id==ownId);if(owner==null)return;
            reportGuard.Begin(ownId,Time.unscaledTime);
            if(owner.battleReports!=null)foreach(var report in owner.battleReports)
            {
                if(report.ended<=0||!reportGuard.Observe("field:"+report.id))continue;
                RecordEncounter(report.outcome,"Field battle complete. Battle reports show real damage, surviving troops and wounded units. No plunder is awarded in field duels.");
            }
            if(owner.reports!=null)foreach(var report in owner.reports)
            {
                if(report.type!="gathering"||!reportGuard.Observe("cargo:"+report.id))continue;
                RecordEncounter(report.title,report.outcome=="Delivered"?"Cargo delivered to your city. Open Reports for quantities and source deposits.":"Carried resources were lost in defeat. Open Reports for the loss record.");
            }
            if(owner.groupReports==null)return;
            foreach(var report in owner.groupReports)
            {
                if(report.ended<=0||!reportGuard.Observe("group:"+report.id))continue;
                RecordEncounter(report.outcome,report.targetName+" · Review contribution, wounds and credited rewards in Battle reports.");
                if(report.outcome!="Stronghold defeated")continue;
                foreach(var entry in report.participants)if(entry.playerId==ownId&&entry.result=="Survived"&&pieces.TryGetValue(entry.armyId,out var piece)&&piece.actor!=null)piece.actor.ObserveVictory();
            }
        }
    }
}
