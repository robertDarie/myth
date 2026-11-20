using System;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private int referenceBuilding;
        private Vector2 referenceScroll;
        private void SendReferenceQa(string type,string id="",int count=0)
        {
            if(me==null||!me.IsReferenceQa||
               !Uri.TryCreate(serverUrl,UriKind.Absolute,out var uri)||!uri.IsLoopback)return;
            Send(new GameCommand{type=type,targetId=id,count=count,requestId=Guid.NewGuid().ToString("N"),marchId=playerId});
        }
        private void RenderReferenceCityQa(Rect r)
        {
            var city=me.referenceCity;
            GUILayout.BeginArea(r);
            GUILayout.Label("EXPERIMENTAL / TEST DATA — NOT RoK numerical parity",theme.Heading);
            if(!Uri.TryCreate(serverUrl,UriKind.Absolute,out var uri)||!uri.IsLoopback||city.normalActivation||!city.experimental)
            {GUILayout.Label("QA controls require the isolated loopback QA server.",theme.Body);GUILayout.EndArea();return;}
            GUILayout.Label("Real kingdom identity · "+me.name+" · "+me.civilization+" · "+Cost(city.resources),theme.Body);
            GUILayout.Label("Construction, production, training and research use supplied TEST_ONLY data. Military and cross-profile conversion are blocked.",theme.Small);
            if(GUILayout.Button("Collect stored production",theme.Primary,GUILayout.Height(32)))SendReferenceQa("qa-city-collect");
            GUILayout.BeginHorizontal();GUILayout.BeginVertical(GUILayout.Width(240));
            for(int i=0;i<city.buildings.Length;i++)
                if(GUILayout.Button(city.buildings[i].name+"  "+city.buildings[i].level+"/"+city.buildings[i].maximum,theme.Tab,GUILayout.Height(30)))referenceBuilding=i;
            GUILayout.EndVertical();GUILayout.BeginVertical();referenceScroll=GUILayout.BeginScrollView(referenceScroll);
            var selected=city.buildings[Mathf.Clamp(referenceBuilding,0,city.buildings.Length-1)];
            GUILayout.Label(selected.name+" · "+selected.level+" / "+selected.maximum,theme.Heading);
            GUILayout.Label("Stored production: "+selected.stored.ToString("0.##"),theme.Small);
            if(selected.prerequisites!=null)foreach(var requirement in selected.prerequisites)
                GUILayout.Label("Requires "+requirement.id+" level "+requirement.level,theme.Small);
            GUILayout.Label("Next payment: "+Cost(selected.cost)+" · "+selected.seconds.ToString("0.##")+" seconds",theme.Body);
            if(theme.Action(selected.level==0?"Construct "+selected.name:"Upgrade "+selected.name,selected.canUpgrade&&!processing,selected.reason))SendReferenceQa("qa-city-upgrade",selected.id);
            if(selected.role=="production"&&GUILayout.Button("Collect "+selected.name,theme.Tab))SendReferenceQa("qa-city-collect",selected.id);
            if(selected.role=="training"&&selected.level>0&&GUILayout.Button("Train one TEST_ONLY reserve",theme.Primary))SendReferenceQa("qa-city-train",selected.id,1);
            GUILayout.Space(10);GUILayout.Label("Paid queues",theme.Heading);
            foreach(var job in city.jobs)GUILayout.Label(job.type+" · "+job.targetId+" · "+job.remaining.ToString("0.0")+"s remaining · paid "+Cost(job.paid),theme.Small);
            GUILayout.Space(10);GUILayout.Label("Research lane",theme.Heading);
            foreach(var research in city.research)
            {
                GUILayout.Label(research.name+" "+research.level+"/"+research.maximum+" · "+Cost(research.cost)+" · "+research.seconds.ToString("0.##")+"s",theme.Small);
                if(theme.Action("Research "+research.name,research.canUpgrade&&!processing,research.reason))SendReferenceQa("qa-city-research",research.id);
            }
            GUILayout.Label("Experimental reserves (not deployable)",theme.Heading);
            foreach(var reserve in city.reserves)GUILayout.Label(reserve.id+": "+reserve.count,theme.Small);
            GUILayout.Label("Quarantined legacy birth troops: "+city.quarantinedLegacyTroops+". No conversion, capacity or combat parity claimed.",theme.Small);
            GUILayout.EndScrollView();GUILayout.EndVertical();GUILayout.EndHorizontal();GUILayout.EndArea();
        }
    }
}
