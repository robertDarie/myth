using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace ThronesOfMyth.Editor
{
    public static class CombinedIntegrationReview
    {
        [Serializable] private sealed class Evidence
        {
            public bool success = true;
            public string unityVersion, sourceFingerprint;
            public string scope = "Actual compiled Unity scripts and reference snapshot/topology assertions; native input independent";
            public int scripts;
        }
        public static void Validate()
        {
            var normal = JsonUtility.FromJson<ArmyData>("{\"id\":\"normal-city\"}");
            if (normal.IsReferenceQa) throw new Exception("Normal snapshot without referenceCity must never select the QA city interface");
            var qa = JsonUtility.FromJson<ArmyData>("{\"id\":\"qa-city\",\"referenceCity\":{\"experimental\":true,\"normalActivation\":false,\"playerId\":\"qa-city\"}}");
            if (!qa.IsReferenceQa) throw new Exception("Bound explicit experimental city must retain the QA interface");
            qa.referenceCity.playerId="other-city";
            if (qa.IsReferenceQa) throw new Exception("Unbound reference DTO cannot select the QA interface");
            var cameraRoot=new GameObject("Initial kingdom camera regression");
            try
            {
                var camera=cameraRoot.AddComponent<Camera>();
                var controller=cameraRoot.AddComponent<StrategyCamera>();
                controller.SetMapBounds(new Rect(0,0,256,256));
                var home=new Vector3(220,0,220);
                controller.SetView(home,10,true);
                var projected=camera.WorldToViewportPoint(home);
                if(projected.z<=0||projected.x<0||projected.x>1||projected.y<0||projected.y>1)throw new Exception("Fresh far-from-origin city must be visible before the intro saves its return view");
                var returnFocus=controller.FocusPoint;float returnZoom=camera.orthographicSize;
                controller.SetView(home,controller.MinimumZoom,true);
                controller.SetView(returnFocus,returnZoom,true);
                projected=camera.WorldToViewportPoint(home);
                if(projected.z<=0||projected.x<0||projected.x>1||projected.y<0||projected.y>1)throw new Exception("City-to-world return lost the initialized home view");
            }
            finally { UnityEngine.Object.DestroyImmediate(cameraRoot); }
            ReferenceCityReview.Validate();
            string repository = Path.GetFullPath(Path.Combine(Application.dataPath, "../.."));
            string folder = Path.Combine(Application.dataPath, "ThronesOfMyth/Scripts");
            var files = Directory.GetFiles(folder, "*.cs").OrderBy(p => Path.GetFileName(p), StringComparer.Ordinal).ToArray();
            var text = new StringBuilder();
            foreach (var path in files) text.Append(Path.GetFileName(path)).Append('\0').Append(File.ReadAllText(path).Replace("\r\n", "\n")).Append('\0');
            string fingerprint;
            using (var hash = SHA256.Create()) fingerprint = BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(text.ToString()))).Replace("-", "").ToLowerInvariant();
            string output = Path.Combine(repository, "work/combined-integration/unity-current.json");
            File.WriteAllText(output, JsonUtility.ToJson(new Evidence { unityVersion = Application.unityVersion, sourceFingerprint = fingerprint, scripts = files.Length }, true));
            Debug.Log("PASS combined compiled client source, actual DTO snapshot and pass topology; native input remains independent");
        }
    }
}
