using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private CommanderComparison comparison;private bool comparisonBusy;private string comparisonError="";private int comparisonRequest;
        private void DrawPrerequisites(RequirementCard[] requirements)
        {
            if(requirements==null||requirements.Length==0)return;GUILayout.Label("PREREQUISITES · SELECT TO INSPECT",theme.Eyebrow);
            foreach(var r in requirements)if(GUILayout.Button((r.met?"✓ ":"→ ")+r.name+" · "+r.current+" / "+r.level,theme.Tab,GUILayout.MinHeight(32)))
            {
                if(r.kind=="research"){inspectedTechnology=Mathf.Max(0,Array.FindIndex(me.researchOptions,t=>t.id==r.id));GuidePage(InterfacePage.Research);}
                else{selectedBuilding=Mathf.Max(0,Array.FindIndex(me.cityBuildings,b=>b.id==r.id));GuidePage(InterfacePage.City);}
                contentScroll=Vector2.zero;
            }
        }
        private IEnumerator CompareCommander(string candidate)
        {
            comparisonBusy=true;comparisonError="";int serial=++comparisonRequest;string owner=playerId,origin=serverUrl,march=ActiveArmy.id;
            using(var request=Request("/commander-comparison?marchId="+UnityWebRequest.EscapeURL(march)+"&candidateId="+UnityWebRequest.EscapeURL(candidate),"GET"))
            {
                yield return request.SendWebRequest();
                if(serial!=comparisonRequest||owner!=playerId||origin!=serverUrl)yield break;
                if(request.result==UnityWebRequest.Result.Success)comparison=JsonUtility.FromJson<CommanderComparison>(request.downloadHandler.text);else comparisonError=DescribeError(request);
            }
            if(serial==comparisonRequest)comparisonBusy=false;
        }
        private void DrawCommanderComparison(CommanderData selected,bool owned)
        {
            GUILayout.Space(10);
            if(theme.Action(comparisonBusy?"Comparing…":"Compare with selected march",owned&&!comparisonBusy&&!processing,owned?"Wait for the current request.":"Acquire this commander through summons, shards or progression first."))StartCoroutine(CompareCommander(selected.id));
            if(!string.IsNullOrEmpty(comparisonError))GUILayout.Label(comparisonError,theme.Small);
            var c=comparison;if(c==null||c.marchId!=ActiveArmy.id||c.candidateId!=selected.id)return;
            GUILayout.Label(HeroName(c.currentId)+" → "+selected.name,theme.Heading);
            ComparisonRow("Maximum HP",c.current.maxHealth,c.candidate.maxHealth);ComparisonRow("Base damage",c.current.damage,c.candidate.damage);ComparisonRow("March speed",c.current.speed,c.candidate.speed);ComparisonRow("Gather multiplier",c.current.gather,c.candidate.gather);ComparisonRow("Recovery / second",c.current.heal,c.candidate.heal);
            GUILayout.Label("Server snapshot · same troops, equipment and city bonuses; before enemy counters and battle context. Refresh after changing the formation.",theme.Small);
            if(!c.available)GUILayout.Label("This commander already leads another formation.",theme.Small);
        }
        private void ComparisonRow(string name,float current,float candidate)
        {GUILayout.BeginHorizontal();GUILayout.Label(name,theme.Small);GUILayout.FlexibleSpace();GUILayout.Label(current.ToString("0.##")+" → "+candidate.ToString("0.##")+"  ("+(candidate-current>=0?"+":"")+(candidate-current).ToString("0.##")+")",theme.Body);GUILayout.EndHorizontal();}
    }
}
