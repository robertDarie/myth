using System;
using System.IO;
using UnityEngine;
namespace ThronesOfMyth
{
    // Opt-in acceptance tool. Normal builds create no recorder and reserve no key.
    public sealed class VisualPerformanceRecorder : MonoBehaviour
    {
        [Serializable] private sealed class Report
        {
            public string unityVersion,platform,cpu,gpu,context;
            public int width,height,frames,systemMemoryMB,graphicsMemoryMB,vSync,targetFrameRate,gen0Collections;
            public float averageFrameMs,p95FrameMs,maxFrameMs,uiScale;
            public long managedHeapStart,managedHeapEnd;
            public bool mixedPages,configurationChanged;
            public string note="Standalone frame intervals including vsync/frame cap; not GPU/CPU timings or proof of a memory leak. Opt-in capture only.";
        }
        private readonly float[] samples=new float[600];
        private int count;
        private bool recording,mixedPages,configurationChanged;
        private int captureWidth,captureHeight,captureVsync,captureCap;
        private long heapStart;
        private int collectionsStart;
        private PrototypeClient client;
        private InterfacePage page;
        private string context;
        private float scale;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Initialize()
        {
            if(Array.IndexOf(Environment.GetCommandLineArgs(),"--thrones-profile")<0)return;
            var root=new GameObject("Opt-in visual performance recorder");DontDestroyOnLoad(root);root.AddComponent<VisualPerformanceRecorder>();
            Debug.Log("Visual profiler ready. F8 starts 600 frames; F8 again ends early. Results: "+Path.Combine(Application.persistentDataPath,"VisualReview"));
        }
        private void Update()
        {
            if(Input.GetKeyDown(KeyCode.F8))
            {
                if(recording){Finish();return;}
                client=FindFirstObjectByType<PrototypeClient>();if(client==null)return;
                count=0;mixedPages=false;configurationChanged=false;captureWidth=Screen.width;captureHeight=Screen.height;captureVsync=QualitySettings.vSyncCount;captureCap=Application.targetFrameRate;page=client.ReviewPage;context=page.ToString();scale=client.ReviewUiScale;
                heapStart=GC.GetTotalMemory(false);collectionsStart=GC.CollectionCount(0);recording=true;return;
            }
            if(!recording||!Application.isFocused)return;
            if(Screen.width!=captureWidth||Screen.height!=captureHeight||QualitySettings.vSyncCount!=captureVsync||Application.targetFrameRate!=captureCap||client!=null&&Mathf.Abs(client.ReviewUiScale-scale)>.001f)configurationChanged=true;
            if(client!=null&&client.ReviewPage!=page)mixedPages=true;
            samples[count++]=Time.unscaledDeltaTime*1000;
            if(count==samples.Length)Finish();
        }
        private void Finish()
        {
            recording=false;if(count==0)return;
            long heapEnd=GC.GetTotalMemory(false);int collections=GC.CollectionCount(0)-collectionsStart;
            var sorted=new float[count];Array.Copy(samples,sorted,count);Array.Sort(sorted);float sum=0;foreach(float sample in sorted)sum+=sample;
            var report=new Report{unityVersion=Application.unityVersion,platform=Application.platform.ToString(),cpu=SystemInfo.processorType,gpu=SystemInfo.graphicsDeviceName,width=captureWidth,height=captureHeight,frames=count,systemMemoryMB=SystemInfo.systemMemorySize,graphicsMemoryMB=SystemInfo.graphicsMemorySize,vSync=captureVsync,targetFrameRate=captureCap,context=context,uiScale=scale,mixedPages=mixedPages,configurationChanged=configurationChanged,averageFrameMs=sum/count,p95FrameMs=sorted[Mathf.CeilToInt(count*.95f)-1],maxFrameMs=sorted[count-1],managedHeapStart=heapStart,managedHeapEnd=heapEnd,gen0Collections=collections};
            try
            {
                string folder=Path.Combine(Application.persistentDataPath,"VisualReview");Directory.CreateDirectory(folder);
                string file=Path.Combine(folder,"performance-"+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff")+".json");File.WriteAllText(file,JsonUtility.ToJson(report,true));Debug.Log("Visual performance report saved: "+file);
            }
            catch(Exception error){Debug.LogWarning("Could not save visual performance capture: "+error.Message);}
        }
    }
}
