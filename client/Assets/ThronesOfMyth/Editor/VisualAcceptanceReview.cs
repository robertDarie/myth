using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
namespace ThronesOfMyth.Editor
{
    public static class VisualAcceptanceReview
    {
        [Serializable] private sealed class Report
        {
            public string unityVersion;
            public bool success;
            public int destinations;
            public string note="Native compilation, camera geometry, menu coverage and asset imports only. Rendering, input, Play-mode contracts and FPS require separate acceptance.";
        }
        [MenuItem("Thrones of Myth/Visual Review/Run Headless Contracts")]
        public static void ValidateHeadless()
        {
            if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop Play mode before running headless contracts.");
            CameraReview.ValidateCameraBoundaries();ArtReview.ValidateAssets(false);
            var pages=new HashSet<InterfacePage>();foreach(var entry in GameNavigation.Entries)if(!pages.Add(entry.Page))throw new InvalidOperationException("Duplicate navigation destination: "+entry.Page);
            foreach(InterfacePage page in Enum.GetValues(typeof(InterfacePage)))if(page!=InterfacePage.World&&page!=InterfacePage.Menu&&!pages.Contains(page))throw new InvalidOperationException("Unreachable screen: "+page);
            string folder=Path.GetFullPath(Path.Combine(Application.dataPath,"../..","work/native-visual-review"));Directory.CreateDirectory(folder);
            File.WriteAllText(Path.Combine(folder,"headless-contracts.json"),JsonUtility.ToJson(new Report{unityVersion=Application.unityVersion,success=true,destinations=pages.Count},true));
            Debug.Log("Headless contracts passed. Rendered gameplay acceptance is still required.");
        }
    }
}
