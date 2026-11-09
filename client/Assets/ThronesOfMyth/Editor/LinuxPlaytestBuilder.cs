using System;
using System.IO;
using System.IO.Compression;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace ThronesOfMyth.Editor
{
    public static class LinuxPlaytestBuilder
    {
        [MenuItem("Thrones of Myth/Build Linux x86_64 Playtest")]
        public static void BuildFromMenu()
        {
            if(!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())return;
            try{EditorUtility.RevealInFinder(Build());}catch(Exception e){Debug.LogException(e);EditorUtility.DisplayDialog("Linux build failed",e.Message,"OK");}
        }
        public static void BuildFromCommandLine(){Build();}
        private static string Build()
        {
            if(!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.Standalone,BuildTarget.StandaloneLinux64))throw new BuildFailedException("Install Linux Build Support (Mono) for Unity 6000.3.0f1 in Unity Hub.");
            string root=Directory.GetParent(Application.dataPath).Parent.FullName;
            if(!Directory.Exists(Path.Combine(root,"packaging/linux")))throw new BuildFailedException("Missing Linux packaging sources; pull the complete repository.");
            ArtReview.ValidateAssets(false);PrototypeSceneBuilder.EnsureBuildScene();
            using var identity=new PlaytestIdentity(root,"linux-x86_64");
            PlayerSettings.companyName="ThronesOfMyth";PlayerSettings.productName="Thrones of Myth";PlayerSettings.bundleVersion=ReleaseVersion.Current;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);PlayerSettings.defaultScreenWidth=1600;PlayerSettings.defaultScreenHeight=900;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;PlayerSettings.runInBackground=true;AssetDatabase.SaveAssets();
            string package=Path.Combine(root,"dist/Linux");string zip=Path.Combine(root,"dist/Thrones-of-Myth-Linux-x86_64.zip");
            if(File.Exists(zip))File.Delete(zip);if(Directory.Exists(package))Directory.Delete(package,true);Directory.CreateDirectory(Path.Combine(package,"Game"));
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/ThronesOfMyth/Scenes/Prototype.unity"},locationPathName=Path.Combine(package,"Game/ThronesOfMyth.x86_64"),target=BuildTarget.StandaloneLinux64,options=BuildOptions.None});
            if(report.summary.result!=BuildResult.Succeeded)throw new BuildFailedException("Linux player build failed; inspect the first Unity Console error.");
            Directory.CreateDirectory(Path.Combine(package,"Server"));
            foreach(string file in Directory.GetFiles(Path.Combine(root,"server"),"*.mjs",SearchOption.TopDirectoryOnly))if(!file.EndsWith(".test.mjs",StringComparison.Ordinal))File.Copy(file,Path.Combine(package,"Server",Path.GetFileName(file)),true);
            foreach(string file in Directory.GetFiles(Path.Combine(root,"packaging/linux")))File.Copy(file,Path.Combine(package,Path.GetFileName(file)),true);
            identity.WriteManifest(package);ZipFile.CreateFromDirectory(package,zip,System.IO.Compression.CompressionLevel.Optimal,false);
            Debug.Log("Linux package built: "+zip+" · "+identity.Data.commit+(identity.Data.dirty?" · DIRTY SOURCE CHECKOUT":"")+". Requires host Node.js 24+. Native playtest remains required.");return zip;
        }
    }
}
