using System;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace ThronesOfMyth.Editor
{
    // Actual Unity scene-object validation, explicitly not native usability.
    public static class PassReview
    {
        [Serializable] private sealed class Evidence
        {
            public string unityVersion,sourceFingerprint,scope="Actual Unity map objects; no native input, readability or FPS certification";
            public int zones,passes,crossings,mountainRenderers,passModels;
            public bool success;
        }
        public static void ValidateTopology()
        {
            string folder=Path.GetFullPath(Path.Combine(Application.dataPath,"../..","work/recovery-a"));
            var world=JsonUtility.FromJson<WorldSnapshot>(File.ReadAllText(Path.Combine(folder,"client-snapshot.json")));
            if(world.provinces.Length!=7||world.passes.Length!=10||world.corridors.Length!=10)throw new Exception("Incomplete server topology snapshot");
            var root=new GameObject("Pass topology validation"){hideFlags=HideFlags.HideAndDontSave};var view=root.AddComponent<WorldView>();
            typeof(WorldView).GetMethod("DrawPassTopology",BindingFlags.Instance|BindingFlags.NonPublic).Invoke(view,new object[]{world});
            var topology=root.transform.Find("Authoritative zones and mountain passes");
            if(topology==null)throw new Exception("Topology not rendered");
            foreach(var zone in world.provinces){var label=topology.Find("Zone label "+zone.id)?.GetComponent<TextMesh>();if(label==null||label.font==null||!label.text.Contains(zone.name))throw new Exception("Missing usable zone label: "+zone.id);}
            foreach(var pass in world.passes){var corridor=Array.Find(world.corridors,c=>c.gateId==pass.id);var line=topology.Find("Crossing "+corridor.id)?.GetComponent<LineRenderer>();if(line==null||line.positionCount!=2||(line.GetPosition(0)-new Vector3(corridor.a.x,.18f,corridor.a.z)).sqrMagnitude>.00001f)throw new Exception("Incorrect crossing: "+pass.id);}
            int mountains=topology.Find("Mountain barriers").GetComponentsInChildren<MeshRenderer>().Length;
            if(mountains==0)throw new Exception("Mountain barriers missing");
            view.Sync(world,world.players[0].id,world.players[0].allianceId);
            foreach(var pass in world.passes){var marker=Array.Find(root.GetComponentsInChildren<MapMarker>(),m=>m.id==pass.id&&m.kind=="site");if(marker==null||(marker.transform.position-new Vector3(pass.x,0,pass.z)).sqrMagnitude>.0001f)throw new Exception("Missing actual pass model: "+pass.id);}
            var sources=new[]{"Scripts/WorldModels.cs","Scripts/WorldView.cs","Scripts/WorldView.Environment.cs","Scripts/WorldView.Territory.cs","Scripts/PrototypeClient.cs","Scripts/PrototypeClient.Screens.cs","Scripts/PrototypeClient.Interface.cs","Scripts/PrototypeClient.Warfare.cs","Editor/PassReview.cs"};
            var sourceText=new StringBuilder();foreach(var source in sources){string relative="client/Assets/ThronesOfMyth/"+source;sourceText.Append(relative).Append('\0').Append(File.ReadAllText(Path.Combine(Application.dataPath,"ThronesOfMyth",source)).Replace("\r\n","\n")).Append('\0');}
            string fingerprint;using(var hash=SHA256.Create())fingerprint=BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(sourceText.ToString()))).Replace("-","").ToLowerInvariant();
            Directory.CreateDirectory(folder);File.WriteAllText(Path.Combine(folder,"unity-pass-topology.json"),JsonUtility.ToJson(new Evidence{unityVersion=Application.unityVersion,sourceFingerprint=fingerprint,zones=7,passes=10,crossings=10,mountainRenderers=mountains,passModels=10,success=true},true));
            Debug.Log("PASS actual Unity zone labels, physical mountain barriers and all ten crossing objects; native interaction NOT TESTED");
        }
    }
}
