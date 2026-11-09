using System;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using UnityEditor;
using UnityEngine;
namespace ThronesOfMyth.Editor
{
    // Same identity is baked into the player and packaged beside the matching server.
    public sealed class PlaytestIdentity : IDisposable
    {
        [Serializable] public sealed class Stamp {public string version,commit,unity,platform;public int protocol;public bool dirty;public FileHash[] files;}
        [Serializable] public sealed class FileHash {public string path,sha256;}
        private readonly string assetPath="Assets/ThronesOfMyth/Resources/BuildIdentity.json";
        private readonly byte[] before,metaBefore;
        public readonly Stamp Data;
        private static string Git(string root,string arguments)
        {
            using(var process=Process.Start(new ProcessStartInfo("git",arguments){WorkingDirectory=root,UseShellExecute=false,RedirectStandardOutput=true,RedirectStandardError=true,CreateNoWindow=true}))
            {string output=process.StandardOutput.ReadToEnd();string error=process.StandardError.ReadToEnd();if(!process.WaitForExit(15000)||process.ExitCode!=0)throw new InvalidOperationException("Git is required for package identity. "+error);return output.Trim();}
        }
        public PlaytestIdentity(string repository,string platform)
        {
            Data=new Stamp{version=ReleaseVersion.Current,protocol=ReleaseVersion.Protocol,commit=Git(repository,"rev-parse HEAD"),dirty=Git(repository,"status --porcelain --untracked-files=normal").Length>0,unity=Application.unityVersion,platform=platform};
            if(Data.commit.Length<40)throw new InvalidOperationException("Cannot identify the source commit.");
            before=File.Exists(assetPath)?File.ReadAllBytes(assetPath):null;metaBefore=File.Exists(assetPath+".meta")?File.ReadAllBytes(assetPath+".meta"):null;
            File.WriteAllText(assetPath,JsonUtility.ToJson(Data,true));AssetDatabase.ImportAsset(assetPath,ImportAssetOptions.ForceSynchronousImport);
        }
        public void WriteManifest(string package)
        {
            var paths=Directory.GetFiles(package,"*",SearchOption.AllDirectories);Array.Sort(paths,StringComparer.Ordinal);var hashes=new System.Collections.Generic.List<FileHash>();
            foreach(var path in paths)
            {if(Path.GetFileName(path)=="manifest.json")continue;using(var sha=SHA256.Create())using(var stream=File.OpenRead(path))hashes.Add(new FileHash{path=path.Substring(package.Length+1).Replace('\\','/'),sha256=BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant()});}
            Data.files=hashes.ToArray();File.WriteAllText(Path.Combine(package,"manifest.json"),JsonUtility.ToJson(Data,true));
        }
        public void Dispose()
        {
            if(before==null){if(File.Exists(assetPath))File.Delete(assetPath);}else File.WriteAllBytes(assetPath,before);
            if(metaBefore==null){if(File.Exists(assetPath+".meta"))File.Delete(assetPath+".meta");}else File.WriteAllBytes(assetPath+".meta",metaBefore);
            AssetDatabase.Refresh();
        }
    }
}
