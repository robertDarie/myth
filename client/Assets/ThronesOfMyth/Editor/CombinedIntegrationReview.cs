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
