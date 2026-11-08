using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using UnityEditor;
using UnityEngine;
using Debug=UnityEngine.Debug;
namespace ThronesOfMyth.Editor
{
    public static class ArtReview
    {
        [Serializable] private sealed class AssetResult { public string asset; public int renderers,vertices,bones,clips; public float height; }
        [Serializable] private sealed class Review { public string unityVersion,graphicsDevice; public bool success; public AssetResult[] assets; public string[] errors; public string note="Asset/import review only; native gameplay layout and Windows executable need a playtest."; }
        [Serializable] private sealed class Performance { public string unityVersion,graphicsDevice,cpu; public int systemMemoryMB,graphicsMemoryMB,vSync,targetFrameRate; public long managedHeapStart,managedHeapEnd; public int frames,width,height; public float averageFrameMs,p95FrameMs,maxFrameMs,averageDrawCalls; public string note="Measured in the Editor Game View, not a standalone-build benchmark."; }
        private const string Root="Assets/ThronesOfMyth/Resources/Art/";
        private static readonly string[] Poses={"Idle","March","Attack","Skill","Retreat","Victory","Gather","Hit"};
        private static readonly List<float> frameTimes=new List<float>();
        private static int lastFrame;
        private static float drawCalls;
        private static long heapAtStart;
        private static string Folder { get { string path=Path.GetFullPath(Path.Combine(Application.dataPath,"../..","work/native-art-review"));Directory.CreateDirectory(path);return path; } }
        private static AnimationState FindPose(Animation animation,string pose)
        {
            if(animation[pose]!=null)return animation[pose];foreach(AnimationState state in animation)if(state.name.EndsWith(pose))return state;return null;
        }
        [MenuItem("Thrones of Myth/Art Review/Validate Imported Assets")]
        public static void ValidateFromMenu(){ValidateAssets(true);}
        public static void ValidateAssets(bool reimport)
        {
            if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop Play mode before validating imported assets.");
            var paths=new List<string>();foreach(string culture in new[]{"Greek","Egyptian","Norse","Chinese","Japanese"})
            {paths.Add(Root+"Models/City"+culture+".fbx");foreach(string role in new[]{"Infantry","Archer","Cavalry","Commander","Mythic"})paths.Add(Root+"Units/"+culture+role+".fbx");}
            foreach(string hero in new[]{"captain","warden","scout","rune-seer","atalanta","mulan","tomoe","horus-champion","heracles","sigurd","wukong"})paths.Add(Root+"Units/Hero_"+hero+".fbx");
            foreach(string environment in new[]{"OakTree","PineTree","BorderRock"})paths.Add(Root+"Models/"+environment+".fbx");
            var results=new List<AssetResult>();var errors=new List<string>();
            foreach(string path in paths)
            {
                if(reimport)AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceUpdate);
                var model=AssetDatabase.LoadAssetAtPath<GameObject>(path);if(model==null){errors.Add(path+": model missing");continue;}
                var result=new AssetResult{asset=path};var bounds=new Bounds();bool first=true;
                foreach(var renderer in model.GetComponentsInChildren<Renderer>())
                {
                    result.renderers++;if(first){bounds=renderer.bounds;first=false;}else bounds.Encapsulate(renderer.bounds);
                    foreach(var material in renderer.sharedMaterials)if(material==null||material.shader==null||material.shader.name=="Hidden/InternalErrorShader")errors.Add(path+": missing/error material");
                    if(renderer is SkinnedMeshRenderer skin){if(skin.sharedMesh!=null)result.vertices+=skin.sharedMesh.vertexCount;result.bones+=skin.bones.Length;foreach(var bone in skin.bones)if(bone==null)errors.Add(path+": missing bone binding");}
                    else{var filter=renderer.GetComponent<MeshFilter>();if(filter!=null&&filter.sharedMesh!=null)result.vertices+=filter.sharedMesh.vertexCount;}
                }
                result.height=bounds.size.y;if(first||result.height<.2f||result.height>8)errors.Add(path+": unexpected model scale or empty renderer");
                if(path.Contains("/Units/"))
                {
                    var animation=model.GetComponentInChildren<Animation>();if(animation==null)errors.Add(path+": no legacy Animation component");
                    else foreach(string pose in Poses){var state=FindPose(animation,pose);if(state==null||state.length<=0)errors.Add(path+": missing/empty "+pose+" take");else result.clips++;}
                    if(result.bones<11)errors.Add(path+": skeleton missing");
                }
                results.Add(result);
            }
            var report=new Review{unityVersion=Application.unityVersion,graphicsDevice=SystemInfo.graphicsDeviceName,success=errors.Count==0,assets=results.ToArray(),errors=errors.ToArray()};File.WriteAllText(Path.Combine(Folder,"import-review.json"),JsonUtility.ToJson(report,true));
            if(errors.Count>0)throw new InvalidOperationException("Art import validation failed. See work/native-art-review/import-review.json. First issue: "+errors[0]);
            Debug.Log("Art import review passed for "+results.Count+" models. Report: "+Folder);
        }
        [MenuItem("Thrones of Myth/Art Review/Capture Greek Asset Lineup")]
        public static void CaptureGreek()
        {
            ValidateAssets(false);if(SystemInfo.graphicsDeviceType==UnityEngine.Rendering.GraphicsDeviceType.Null)throw new InvalidOperationException("Capture needs a graphics-enabled Unity Editor.");
            if(AnimationMode.InAnimationMode())throw new InvalidOperationException("Close the current animation preview before capturing a lineup.");
            var preview=new PreviewRenderUtility();var stage=new GameObject("Greek review lineup");Texture2D image=null;
            try
            {
                string[] roles={"Infantry","Archer","Cavalry","Commander","Mythic"};
                var players=new List<Animation>();
                for(int i=0;i<roles.Length;i++)
                {
                    var placement=new GameObject(roles[i]);placement.transform.SetParent(stage.transform,false);placement.transform.localPosition=new Vector3(i*2.5f-5,0,0);
                    var facing=new GameObject("FBX facing");facing.transform.SetParent(placement.transform,false);
                    var model=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Root+"Units/Greek"+roles[i]+".fbx"),facing.transform,false);var animation=model.GetComponentInChildren<Animation>();
                    foreach(var node in model.GetComponentsInChildren<Transform>())if(node.name=="FacingForward") { var direction=placement.transform.InverseTransformDirection(node.position-model.transform.position);direction.y=0;if(direction.sqrMagnitude>.01f)facing.transform.localRotation=Quaternion.FromToRotation(direction,Vector3.forward)*facing.transform.localRotation; }
                    players.Add(animation);
                }
                AnimationMode.StartAnimationMode();AnimationMode.BeginSampling();foreach(var player in players)AnimationMode.SampleAnimationClip(player.gameObject,FindPose(player,"Idle").clip,.2f);AnimationMode.EndSampling();
                preview.AddSingleGO(stage);preview.camera.orthographic=true;preview.camera.orthographicSize=4.5f;preview.camera.transform.position=new Vector3(4,5,14);preview.camera.transform.LookAt(new Vector3(0,1,0));preview.camera.nearClipPlane=.1f;preview.camera.farClipPlane=50;preview.camera.backgroundColor=new Color(.12f,.18f,.21f);preview.camera.clearFlags=CameraClearFlags.SolidColor;
                preview.lights[0].intensity=1.2f;preview.lights[0].transform.rotation=Quaternion.Euler(40,-35,0);preview.lights[1].intensity=.5f;
                preview.BeginStaticPreview(new Rect(0,0,1440,900));preview.Render();image=preview.EndStaticPreview();File.WriteAllBytes(Path.Combine(Folder,"greek-native-lineup.png"),image.EncodeToPNG());Debug.Log("Native asset preview saved in "+Folder);
            }
            finally{if(AnimationMode.InAnimationMode())AnimationMode.StopAnimationMode();if(image!=null)UnityEngine.Object.DestroyImmediate(image);preview.Cleanup();}
        }
        [MenuItem("Thrones of Myth/Art Review/Measure 300 Game Frames")]
        public static void MeasureFrames()
        {
            if(!EditorApplication.isPlaying)throw new InvalidOperationException("Enter Play mode, keep the Game View active and move/fight while capturing.");
            frameTimes.Clear();drawCalls=0;heapAtStart=GC.GetTotalMemory(false);lastFrame=-1;EditorApplication.update-=Collect;EditorApplication.update+=Collect;Debug.Log("Capturing 300 Game View frames. Exercise marching/combat and city views.");
        }
        private static void Collect()
        {
            if(!EditorApplication.isPlaying){EditorApplication.update-=Collect;return;}if(EditorApplication.isPaused||Time.frameCount==lastFrame)return;lastFrame=Time.frameCount;
            frameTimes.Add(Time.unscaledDeltaTime*1000);drawCalls+=UnityStats.drawCalls;if(frameTimes.Count<300)return;EditorApplication.update-=Collect;
            var sorted=frameTimes.ToArray();Array.Sort(sorted);float sum=0;foreach(float ms in sorted)sum+=ms;
            var result=new Performance{cpu=SystemInfo.processorType,systemMemoryMB=SystemInfo.systemMemorySize,graphicsMemoryMB=SystemInfo.graphicsMemorySize,vSync=QualitySettings.vSyncCount,targetFrameRate=Application.targetFrameRate,managedHeapStart=heapAtStart,managedHeapEnd=GC.GetTotalMemory(false),unityVersion=Application.unityVersion,graphicsDevice=SystemInfo.graphicsDeviceName,frames=sorted.Length,width=Screen.width,height=Screen.height,averageFrameMs=sum/sorted.Length,p95FrameMs=sorted[Mathf.FloorToInt((sorted.Length-1)*.95f)],maxFrameMs=sorted[sorted.Length-1],averageDrawCalls=drawCalls/sorted.Length};File.WriteAllText(Path.Combine(Folder,"game-view-performance.json"),JsonUtility.ToJson(result,true));Debug.Log("Measured Game View performance saved in "+Folder);
        }
        [MenuItem("Thrones of Myth/Art Review/Capture Current Game View")]
        public static void CaptureGame(){if(!EditorApplication.isPlaying)throw new InvalidOperationException("Enter Play mode first.");ScreenCapture.CaptureScreenshot(Path.Combine(Folder,"game-view-"+Screen.width+"x"+Screen.height+"-"+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff")+".png"));}
    }
}
