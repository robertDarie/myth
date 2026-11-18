using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace ThronesOfMyth.Editor
{
    public static class ReferenceCityReview
    {
        [Serializable] private sealed class Evidence
        {
            public bool success;
            public string unityVersion,sourceFingerprint,scope="Actual Unity JsonUtility DTO/command integration; native input NOT TESTED";
            public int independentBuildings,paidJobs;
        }
        public static void Validate()
        {
            string repository=Path.GetFullPath(Path.Combine(Application.dataPath,"../.."));
            string folder=Path.Combine(repository,"work/task7-b2");
            var snapshot=JsonUtility.FromJson<WorldSnapshot>(File.ReadAllText(Path.Combine(folder,"client-snapshot.json")));
            var player=Array.Find(snapshot.players,p=>p.referenceCity!=null);
            if(player==null)throw new Exception("Actual QA World snapshot has no reference interface");
            var city=player.referenceCity;
            if(!city.experimental||city.normalActivation||city.playerId!=player.id||!city.label.Contains("TEST DATA")||city.buildings.Length!=11||city.jobs.Length<1)throw new Exception("Invalid reference DTO/identity/jobs");
            if(city.resources.food!=player.food||city.resources.wood!=player.wood)throw new Exception("Multiple spendable resource ledgers");
            foreach(var b in city.buildings)if(b.maximum!=25||string.IsNullOrEmpty(b.id))throw new Exception("Missing independent building");
            var request=new GameCommand{type="qa-city-upgrade",targetId="citadel",requestId="unity-reference-request",marchId=player.id};
            var decoded=JsonUtility.FromJson<GameCommand>(JsonUtility.ToJson(request));
            if(decoded.requestId!=request.requestId||decoded.type!=request.type||decoded.marchId!=player.id)throw new Exception("Command serialization lost request identity");
            var text=new StringBuilder();
            foreach(var name in new[]{"Scripts/WorldModels.cs","Scripts/PrototypeClient.Interface.cs","Scripts/PrototypeClient.CityExperience.cs","Scripts/PrototypeClient.ReferenceCityQa.cs","Editor/ReferenceCityReview.cs"})
                text.Append(name).Append('\0').Append(File.ReadAllText(Path.Combine(Application.dataPath,"ThronesOfMyth",name)).Replace("\r\n","\n")).Append('\0');
            string fingerprint;using(var hash=SHA256.Create())fingerprint=BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(text.ToString()))).Replace("-","").ToLowerInvariant();
            File.WriteAllText(Path.Combine(folder,"unity-interface.json"),JsonUtility.ToJson(new Evidence{success=true,unityVersion=Application.unityVersion,sourceFingerprint=fingerprint,independentBuildings=city.buildings.Length,paidJobs=city.jobs.Length},true));
            PassReview.ValidateTopology();
            Debug.Log("PASS actual Unity reference city DTOs, World identity, paid queue and serialized command; native input remains independent");
        }
    }
}
