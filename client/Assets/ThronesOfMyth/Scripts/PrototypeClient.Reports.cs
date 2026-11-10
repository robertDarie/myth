using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private string reportSearch="",reportSelection="";
        private int reportCategory;
        private static string CargoLabel(ArmyData army) => (army.cargo==null?0:army.cargo.food+army.cargo.wood+army.cargo.stone+army.cargo.gold+army.cargo.mana)+" / "+army.carryCapacity;
        private void DrawUnifiedReports()
        {
            GUILayout.Label("MESSENGERS' ARCHIVE",theme.Eyebrow);
            GUILayout.Label("Reports",theme.Heading);
            GUILayout.Label("Private observations and confirmed outcomes. Reading a report never grants rewards.",noteStyle);
            reportCategory=theme.Tabs(reportCategory,new[]{"All","Battles","Gathering","Scouting","Alliance","System","Transfers"},WindowRect.width-280);
            GUILayout.Label("Search titles, outcomes or details",theme.Small);reportSearch=GUILayout.TextField(reportSearch,80);
            bool found=false;
            foreach(var report in me.reports??Array.Empty<CoreReport>())
            {
                string category=reportCategory==1?"battle":reportCategory==2?"gathering":reportCategory==3?"scouting":reportCategory==4?"alliance":reportCategory==6?"trade":"system";
                if(reportCategory>0&&report.type!=category&&!(category=="battle"&&(report.type=="pve"||report.type=="rally"))&&!(category=="alliance"&&report.type=="rally")&&!(category=="scouting"&&(report.type=="reconnaissance"||report.type=="recon-notice")))continue;
                if(!string.IsNullOrWhiteSpace(reportSearch)&&((report.title??"")+" "+report.detail+" "+report.outcome+" "+report.reason).IndexOf(reportSearch,StringComparison.OrdinalIgnoreCase)<0)continue;
                found=true;
                if(GUILayout.Button(report.title+"\n"+report.type.ToUpperInvariant()+" · "+report.outcome+" · "+InterfaceLayout.Duration(Mathf.Max(0,world.time-report.time))+" ago",reportSelection==report.id?theme.Primary:theme.Skin.button,GUILayout.MinHeight(54)))reportSelection=reportSelection==report.id?"":report.id;
                if(reportSelection!=report.id)continue;
                GUILayout.BeginVertical(GUI.skin.box);
                if(!string.IsNullOrEmpty(report.currencyNote))GUILayout.Label(report.currencyNote,noteStyle);
                GUILayout.Label(report.detail??"",new GUIStyle(noteStyle){richText=false});
                if(report.type=="gathering")
                {
                    GUILayout.Label(report.outcome+" · "+HeroName(report.commanderId)+" · "+Mathf.Max(0,Mathf.CeilToInt(report.time-report.started))+"s",sectionStyle);
                    GUILayout.Label("Delivered: "+Cost(report.resources)+"\nLost: "+Cost(report.lost),noteStyle);
                    GUILayout.Label(report.reason??"",noteStyle);
                    foreach(var source in report.sources??Array.Empty<CargoSource>())GUILayout.Label(source.name+" · "+source.amount+" "+source.resource+" · "+source.x.ToString("F0")+", "+source.z.ToString("F0"),noteStyle);
                }
                else if(report.type=="battle")DrawBattleReports();
                else if(report.type=="rally")DrawGroupReports();
                else if(report.type=="reconnaissance")DrawReading(report);
                else if(report.type=="recon-notice")GUILayout.Label(report.detail??"",noteStyle);
                else if(report.type=="scouting")
                {
                    var survey=Array.Find(world.exploration.reports,r=>r.id==report.sourceId);
                    if(survey!=null){GUILayout.Label(survey.armies.Length+" observed enemy marches · "+survey.camps.Length+" camps · "+survey.sites.Length+" sacred sites",noteStyle);foreach(var enemy in survey.armies)GUILayout.Label(enemy.name+" · "+enemy.troops+" troops · "+enemy.health+" HP",noteStyle);foreach(var site in survey.sites)GUILayout.Label(site.name+" · "+AllianceName(site.allianceId),noteStyle);foreach(var fort in survey.strongholds??Array.Empty<StrongholdData>())GUILayout.Label(fort.name+" · "+Mathf.CeilToInt(fort.guardHealth)+" guard HP",noteStyle);foreach(var garrison in survey.garrisons)GUILayout.Label(WarTargetName(garrison.targetId)+" · "+garrison.marches+" marches · "+garrison.troops+" troops",noteStyle);if(GUILayout.Button("Focus surveyed area")){FocusGameplay(survey.x,survey.z);}}
                }
                else if(report.type=="trade")GUILayout.Label("Delivered transfer: "+Cost(report.resources),noteStyle);
                else if(report.resources!=null)GUILayout.Label("Credited: "+Cost(report.resources),noteStyle);
                GUILayout.EndVertical();
            }
            if(!found)GUILayout.Label("No matching reports. Gather and deliver resources, scout, or engage a camp to record your first outcome.",noteStyle);
        }
        private void DrawReading(CoreReport report)
        {
            var reading=Array.Find(world.exploration?.reconReports??Array.Empty<ReconReport>(),item=>item.id==report.sourceId);
            if(reading==null){GUILayout.Label(report.detail??"",noteStyle);return;}
            GUILayout.Label(reading.subjectName+" · "+reading.civilization+" · Citadel "+reading.cityLevel+(string.IsNullOrEmpty(reading.strength)?"":" · "+reading.strength),sectionStyle);
            GUILayout.Label("Observed "+InterfaceLayout.Duration(Mathf.Max(0,world.time-reading.time))+" ago · depth "+reading.depth+" · "+reading.staleNote,noteStyle);
            if(reading.showsCommand)GUILayout.Label("Commander "+reading.commanderName+" · "+(reading.bonuses??""),noteStyle);
            if(reading.showsForces)foreach(var force in reading.forces??Array.Empty<ReconForce>())
            {
                GUILayout.Label(force.role+" · "+force.commanderName+" · "+force.troops+" troops",noteStyle);
                foreach(var type in force.types??Array.Empty<ReconTypeLine>())GUILayout.Label(type.name+" · tier "+type.tier+" · "+type.count,noteStyle);
            }
            if(reading.showsResources&&reading.resources!=null)GUILayout.Label("Stores · food "+reading.resources.food+" · wood "+reading.resources.wood+" · stone "+reading.resources.stone+" · gold "+reading.resources.gold+" · Mana "+reading.resources.mana,noteStyle);
            if(GUILayout.Button("Go to the target"))FocusGameplay(reading.x,reading.z);
        }
    }
}
