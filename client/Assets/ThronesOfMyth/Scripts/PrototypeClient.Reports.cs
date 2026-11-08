using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private string reportSearch="",reportSelection="";
        private int reportCategory;
        private static string CargoLabel(ArmyData army) => (army.cargo==null?0:army.cargo.food+army.cargo.wood+army.cargo.stone+army.cargo.gold+army.cargo.aether)+" / "+army.carryCapacity;
        private void DrawUnifiedReports()
        {
            GUILayout.Label("MESSENGERS' ARCHIVE",theme.Eyebrow);
            GUILayout.Label("Reports",theme.Heading);
            GUILayout.Label("Private observations and confirmed outcomes. Reading a report never grants rewards.",noteStyle);
            reportCategory=GUILayout.Toolbar(reportCategory,new[]{"All","Battles","Gathering","Scouting","Alliance","System"});
            GUILayout.Label("Search titles, outcomes or details",theme.Small);reportSearch=GUILayout.TextField(reportSearch,80);
            bool found=false;
            foreach(var report in me.reports??Array.Empty<CoreReport>())
            {
                string category=reportCategory==1?"battle":reportCategory==2?"gathering":reportCategory==3?"scouting":reportCategory==4?"alliance":"system";
                if(reportCategory>0&&report.type!=category&&!(category=="battle"&&(report.type=="pve"||report.type=="rally"))&&!(category=="alliance"&&report.type=="rally"))continue;
                if(!string.IsNullOrWhiteSpace(reportSearch)&&((report.title??"")+" "+report.detail+" "+report.outcome+" "+report.reason).IndexOf(reportSearch,StringComparison.OrdinalIgnoreCase)<0)continue;
                found=true;
                if(GUILayout.Button(report.type.ToUpperInvariant()+" · "+report.title+" · "+Mathf.Max(0,Mathf.FloorToInt(world.time-report.time))+"s ago"))reportSelection=reportSelection==report.id?"":report.id;
                if(reportSelection!=report.id)continue;
                GUILayout.BeginVertical(GUI.skin.box);
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
                else if(report.type=="scouting")
                {
                    var survey=Array.Find(world.exploration.reports,r=>r.id==report.sourceId);
                    if(survey!=null){GUILayout.Label(survey.armies.Length+" observed enemy marches · "+survey.camps.Length+" camps · "+survey.sites.Length+" sacred sites",noteStyle);foreach(var enemy in survey.armies)GUILayout.Label(enemy.name+" · "+enemy.troops+" troops · "+enemy.health+" HP",noteStyle);foreach(var site in survey.sites)GUILayout.Label(site.name+" · "+AllianceName(site.allianceId),noteStyle);foreach(var fort in survey.strongholds??Array.Empty<StrongholdData>())GUILayout.Label(fort.name+" · "+Mathf.CeilToInt(fort.guardHealth)+" guard HP",noteStyle);foreach(var garrison in survey.garrisons)GUILayout.Label(WarTargetName(garrison.targetId)+" · "+garrison.marches+" marches · "+garrison.troops+" troops",noteStyle);if(GUILayout.Button("Focus surveyed area")){cameraControl?.Focus(survey.x,survey.z);OpenInterface(InterfacePage.World);}}
                }
                else if(report.resources!=null)GUILayout.Label("Credited: "+Cost(report.resources),noteStyle);
                GUILayout.EndVertical();
            }
            if(!found)GUILayout.Label("No matching reports. Gather and deliver resources, scout, or engage a camp to record your first outcome.",noteStyle);
        }
    }
}
