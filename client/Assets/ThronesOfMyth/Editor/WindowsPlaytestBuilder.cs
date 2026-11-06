using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using Debug = UnityEngine.Debug;

namespace ThronesOfMyth.Editor
{
    public static class WindowsPlaytestBuilder
    {
        private const string ScenePath = "Assets/ThronesOfMyth/Scenes/Prototype.unity";

        [MenuItem("Thrones of Myth/Build Windows Playtest")]
        public static void BuildFromMenu()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            try
            {
                string result = Build();
                EditorUtility.RevealInFinder(result);
                EditorUtility.DisplayDialog("Windows playtest ready", "The portable ZIP is ready. Extract all files and run Start Thrones of Myth.cmd.\n\nIf Inno Setup is installed, an installer is generated too.", "OK");
            }
            catch (Exception error)
            {
                Debug.LogException(error);
                EditorUtility.DisplayDialog("Playtest build failed", error.Message + "\n\nSee the Console for details.", "OK");
            }
        }

        // Can also be invoked with Unity -batchmode -quit -executeMethod
        // ThronesOfMyth.Editor.WindowsPlaytestBuilder.BuildFromCommandLine
        public static void BuildFromCommandLine() { Build(); }

        private static string Build()
        {
            if (Application.platform != RuntimePlatform.WindowsEditor)
                throw new BuildFailedException("Build this Windows package using the Unity Editor on Windows.");
            if (!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.Standalone, BuildTarget.StandaloneWindows64))
                throw new BuildFailedException("Install Windows Build Support for this editor through Unity Hub.");
            string repository = Directory.GetParent(Application.dataPath).Parent.FullName;
            string packaging = Path.Combine(repository, "packaging", "windows");
            if (!Directory.Exists(packaging)) throw new BuildFailedException("The packaging/windows folder is missing. Pull the latest main branch.");
            string node = FindTool("node.exe");
            if (node == null) throw new BuildFailedException("Install Node.js 24 LTS on this build PC, then restart Unity so it sees the updated PATH. Players will not need Node installed.");
            string version = Run(node, "--version").Trim().TrimStart('v');
            if (!Version.TryParse(version, out var nodeVersion) || nodeVersion.Major < 24)
                throw new BuildFailedException("Node.js 24 or later is required on the build PC.");
            string license = FindNodeLicense(node);
            if (license == null) throw new BuildFailedException("Cannot find the installed Node.js LICENSE beside node.exe. Install the official Node.js Windows distribution, which includes its license.");

            PrototypeSceneBuilder.EnsureBuildScene();
            if (!File.Exists(ScenePath)) throw new BuildFailedException("Prototype scene could not be created.");
            PlayerSettings.companyName = "ThronesOfMyth";
            PlayerSettings.productName = "Thrones of Myth";
            PlayerSettings.bundleVersion = "0.2.0";
            PlayerSettings.defaultScreenWidth = 1280;
            PlayerSettings.defaultScreenHeight = 800;
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.resizableWindow = true;
            PlayerSettings.runInBackground = true;
            // Mono avoids requiring a separate C++/IL2CPP toolchain for this playtest.
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.Standalone, ScriptingImplementation.Mono2x);
            AssetDatabase.SaveAssets();

            string dist = Path.Combine(repository, "dist");
            string package = Path.Combine(dist, "Windows");
            // Rebuild only our generated output folder, never project sources.
            if (Directory.Exists(package)) Directory.Delete(package, true);
            Directory.CreateDirectory(Path.Combine(package, "Game"));
            string installer = Path.Combine(dist, "Thrones-of-Myth-Setup.exe");
            // Do not leave an installer from an older successful build beside new output.
            if (File.Exists(installer)) File.Delete(installer);
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = Path.Combine(package, "Game", "ThronesOfMyth.exe"),
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            });
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException("Unity Windows player build failed. Check the first red Console error.");

            string runtime = Path.Combine(package, "Runtime"); Directory.CreateDirectory(runtime);
            File.Copy(node, Path.Combine(runtime, "node.exe"), true);
            File.Copy(license, Path.Combine(runtime, "LICENSE"), true);
            string server = Path.Combine(package, "Server"); Directory.CreateDirectory(server);
            foreach (string file in new[] { "index.mjs", "http.mjs", "world.mjs", "content.mjs" })
                File.Copy(Path.Combine(repository, "server", file), Path.Combine(server, file), true);
            foreach (string file in new[] { "Launcher.ps1", "Start Thrones of Myth.cmd", "README.txt" })
                File.Copy(Path.Combine(packaging, file), Path.Combine(package, file), true);
            string zip = Path.Combine(dist, "Thrones-of-Myth-Windows.zip");
            if (File.Exists(zip)) File.Delete(zip);
            ZipFile.CreateFromDirectory(package, zip, CompressionLevel.Optimal, false);
            Debug.Log("Portable playtest created: " + zip);

            string compiler = FindInnoSetup();
            if (compiler != null)
            {
                // Failure here leaves a usable portable ZIP and is reported clearly.
                try
                {
                    Run(compiler, "/Qp /DPackageSource=\"" + package + "\" /DInstallerOutput=\"" + dist + "\" \"" + Path.Combine(packaging, "Installer.iss") + "\"");
                    Debug.Log("Installer created: " + installer);
                }
                catch (Exception error) { Debug.LogWarning("Portable ZIP succeeded, but installer compilation failed: " + error.Message); }
            }
            else Debug.Log("Optional installer skipped: install Inno Setup 6.3+ to produce a Setup.exe. The portable ZIP is ready.");
            return zip;
        }

        private static string FindTool(string file)
        {
            foreach (string directory in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator))
            {
                string candidate = Path.Combine(directory.Trim().Trim('"'), file);
                if (File.Exists(candidate)) return candidate;
            }
            return null;
        }
        private static string FindNodeLicense(string node)
        {
            foreach (string name in new[] { "LICENSE", "LICENSE.txt", "LICENSE.md" })
            {
                string path = Path.Combine(Path.GetDirectoryName(node), name);
                if (File.Exists(path)) return path;
            }
            return null;
        }
        private static string FindInnoSetup()
        {
            string path = FindTool("ISCC.exe"); if (path != null) return path;
            foreach (string directory in new[] { Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) })
                foreach (string version in new[] { "Inno Setup 7", "Inno Setup 6" })
                {
                    string candidate = Path.Combine(directory, version, "ISCC.exe");
                    if (File.Exists(candidate)) return candidate;
                }
            return null;
        }
        private static string Run(string executable, string arguments)
        {
            using (var process = Process.Start(new ProcessStartInfo(executable, arguments)
            {
                UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true
            }))
            {
                if (process == null) throw new BuildFailedException("Could not start " + executable);
                string output = process.StandardOutput.ReadToEnd(); process.WaitForExit();
                if (process.ExitCode != 0) throw new BuildFailedException(executable + " failed with exit code " + process.ExitCode + ": " + output);
                return output;
            }
        }
    }
}
