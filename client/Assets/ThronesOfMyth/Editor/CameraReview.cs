using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace ThronesOfMyth.Editor
{
    // Runs the production controller and Unity's real viewport rays, without a server.
    public static class CameraReview
    {
        [Serializable] private sealed class Report
        {
            public string unityVersion;
            public int checks;
            public bool success;
            public string[] errors;
            public string limitation="Geometry validation only. Keyboard/drag smoothing, HUD, scene appearance and standalone performance require Play mode and Windows review.";
        }
        private static readonly Vector2[] Samples={Vector2.zero,Vector2.right,Vector2.up,Vector2.one,new Vector2(.5f,.5f),new Vector2(.25f,.75f)};
        [Serializable] private sealed class CursorReport
        {
            public string unityVersion;
            public float drift;
            public bool blockedScrollPreserved,success;
            public string limitation="Actual Unity geometry and controller calls; no native wheel, HUD interaction or FPS certification.";
        }
        public static void ValidateRecoveryGeometry(){ValidateCameraBoundaries();ValidateCursorZoom();}
        public static void ValidateCursorZoom()
        {
            var root=new GameObject("Isolated cursor zoom"){hideFlags=HideFlags.HideAndDontSave};
            try
            {
                var camera=root.AddComponent<Camera>();camera.enabled=false;camera.aspect=16f/9;
                var controller=root.AddComponent<StrategyCamera>();controller.Initialize();controller.reducedMotion=true;
                controller.SetView(new Vector3(128,0,128),14,true);var viewport=new Vector2(.3f,.7f);
                if(!CameraFootprint.GroundPoint(camera,viewport,out var before))throw new InvalidOperationException("Initial cursor ray missed ground");
                controller.ZoomBy(2,viewport);controller.ConstrainNow(true);
                if(!CameraFootprint.GroundPoint(camera,viewport,out var after))throw new InvalidOperationException("Zoomed cursor ray missed ground");
                float drift=Vector3.Distance(before,after);
                Debug.Log("Cursor anchor measured drift="+drift);
                if(drift>.002f)throw new InvalidOperationException("Cursor anchor drifts under center-based zoom: "+drift);
                float zoom=camera.orthographicSize;controller.blockInput=true;controller.Scroll(2,viewport);controller.ConstrainNow(true);
                bool blocked=Mathf.Abs(camera.orthographicSize-zoom)<.0001f;
                controller.blockInput=false;controller.inputBlocked=()=>true;controller.Scroll(2,viewport);controller.ConstrainNow(true);
                blocked&=Mathf.Abs(camera.orthographicSize-zoom)<.0001f;
                if(!blocked)throw new InvalidOperationException("Blocked wheel intent changed camera zoom");
                string folder=Path.GetFullPath(Path.Combine(Application.dataPath,"../..","work/native-visual-review"));Directory.CreateDirectory(folder);
                File.WriteAllText(Path.Combine(folder,"cursor-zoom.json"),JsonUtility.ToJson(new CursorReport{unityVersion=Application.unityVersion,drift=drift,blockedScrollPreserved=blocked,success=true},true));
            }
            finally{UnityEngine.Object.DestroyImmediate(root);}
        }
        private static void Check(Camera camera,Rect bounds,List<string> errors,ref int checks,string context)
        {
            foreach(var viewport in Samples)
            {
                checks++;
                if(!CameraFootprint.GroundPoint(camera,viewport,out var point)){errors.Add(context+": ray missed ground");continue;}
                const float tolerance=.025f;
                if(point.x<bounds.xMin-tolerance||point.x>bounds.xMax+tolerance||point.z<bounds.yMin-tolerance||point.z>bounds.yMax+tolerance)errors.Add(context+": viewport outside map: "+point);
                var projected=camera.WorldToViewportPoint(point);
                // Pixel error remains meaningful even in very thin windows, where tiny
                // viewport fractions amplify normal world-coordinate float rounding.
                if(Mathf.Abs(projected.x-viewport.x)*camera.pixelWidth>.75f||Mathf.Abs(projected.y-viewport.y)*camera.pixelHeight>.75f)errors.Add(context+": ground picking round trip failed");
            }
        }
        [MenuItem("Thrones of Myth/Visual Review/Validate Camera Boundaries")]
        public static void ValidateCameraBoundaries()
        {
            if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop Play mode before running isolated camera validation.");
            var errors=new List<string>();int checks=0;
            var root=new GameObject("Isolated camera validation"){hideFlags=HideFlags.HideAndDontSave};
            var camera=root.AddComponent<Camera>();camera.enabled=false;
            var controller=root.AddComponent<StrategyCamera>();controller.Initialize();controller.reducedMotion=true;
            float edge=ReleaseVersion.WorldSize-1,centerPoint=ReleaseVersion.WorldSize*.5f;
            var targets=new[]{new Vector3(1,0,1),new Vector3(edge,0,1),new Vector3(1,0,edge),new Vector3(edge,0,edge),new Vector3(centerPoint,0,1),new Vector3(1,0,centerPoint),new Vector3(edge,0,centerPoint),new Vector3(centerPoint,0,edge),new Vector3(centerPoint,0,centerPoint),new Vector3(-100,0,ReleaseVersion.WorldSize+100)};
            var sizes=new[]{new Vector2Int(1280,720),new Vector2Int(1920,1080),new Vector2Int(2560,1440),new Vector2Int(1024,768),new Vector2Int(2560,1080),new Vector2Int(3840,1080),new Vector2Int(720,1280),new Vector2Int(16384,2),new Vector2Int(2,16384)};
            try
            {
                foreach(var size in sizes)
                {
                    // No Render/Create needed: these targets exercise the camera's native
                    // viewport dimensions without allocating or claiming a visual capture.
                    var target=new RenderTexture(size.x,size.y,16);
                    try
                    {
                        camera.targetTexture=target;camera.aspect=size.x/(float)size.y;
                        controller.ConstrainNow(true);
                        foreach(float zoom in new[]{.01f,6f,14f,1000f})foreach(var position in targets)
                        {
                            controller.SetView(position,zoom,true);
                            string context=size+" zoom="+zoom+" target="+position;
                            Check(camera,controller.MapBounds,errors,ref checks,context);
                            checks++;if(camera.orthographicSize>controller.MaximumZoom+.001f||camera.orthographicSize<controller.MinimumZoom-.001f)errors.Add(context+": zoom outside fit range");
                            // In-map targets must remain visible even when focus is clamped.
                            if(position.x>=1&&position.x<=edge&&position.z>=1&&position.z<=edge)
                            {
                                checks++;var visible=camera.WorldToViewportPoint(position);
                                if(visible.x<-.001f||visible.x>1.001f||visible.y<-.001f||visible.y>1.001f)errors.Add(context+": focus target clipped");
                            }
                            controller.Pan(new Vector3(1000,0,-1000));controller.ConstrainNow(true);Check(camera,controller.MapBounds,errors,ref checks,context+" pan");
                            controller.Focus(position.x,position.z);controller.ConstrainNow(true);Check(camera,controller.MapBounds,errors,ref checks,context+" Focus");
                        }
                        controller.reducedMotion=false;
                        controller.SetView(new Vector3(centerPoint,0,centerPoint),1000,true);
                        controller.SetView(new Vector3(1,0,edge),3,false);
                        for(int frame=0;frame<120;frame++){controller.ConstrainNow(false,1/60f);Check(camera,controller.MapBounds,errors,ref checks,size+" smooth zoom-in frame="+frame);}
                        checks++;var targetPoint=camera.WorldToViewportPoint(new Vector3(1,0,edge));if(targetPoint.x<0||targetPoint.x>1||targetPoint.y<0||targetPoint.y>1)errors.Add(size+": smoothed focus lost its destination");
                        // Resize at maximum zoom before constraining: no intermediate blank frame.
                        controller.SetView(new Vector3(1,0,1),1000,true);camera.aspect=4;
                        controller.ConstrainNow(false,1/60f);Check(camera,controller.MapBounds,errors,ref checks,"live wide resize");
                        controller.reducedMotion=true;
                    }
                    finally{camera.targetTexture=null;UnityEngine.Object.DestroyImmediate(target);}
                }
                camera.aspect=16f/9;controller.SetMapBounds(new Rect(0,0,ReleaseVersion.WorldSize,ReleaseVersion.WorldSize));
                controller.SetView(new Vector3(128,0,128),14,true);
                var anchorViewport=new Vector2(.3f,.7f);
                CameraFootprint.GroundPoint(camera,anchorViewport,out var beforeZoom);
                controller.ZoomBy(2,anchorViewport);controller.ConstrainNow(true);
                CameraFootprint.GroundPoint(camera,anchorViewport,out var afterZoom);
                checks++;if(Vector3.Distance(beforeZoom,afterZoom)>.002f)errors.Add("Wheel zoom must keep the ground point under the cursor");
                // Non-origin / differently sized kingdoms, plus helpers under alternate
                // pitch/yaw. The production controller currently uses its original angle.
                foreach(var bounds in new[]{new Rect(-20,10,50,90),new Rect(0,0,12,12)})
                {
                    controller.SetMapBounds(bounds);controller.SetView(new Vector3(bounds.center.x,0,bounds.center.y),1000,true);
                    Check(camera,bounds,errors,ref checks,"custom map");
                }
                camera.aspect=16f/9;camera.orthographicSize=4;
                var standard=new Rect(0,0,80,80);
                foreach(float pitch in new[]{30f,54f,75f})foreach(float yaw in new[]{0f,45f,90f})
                {
                    camera.transform.rotation=Quaternion.Euler(pitch,yaw,0);camera.transform.position=new Vector3(40,0,40)-camera.transform.forward*60;
                    if(!CameraFootprint.TryOffsets(camera,out var offsets)){errors.Add("Alternate angle has no footprint");continue;}
                    camera.orthographicSize=CameraFootprint.MaximumZoom(standard,offsets);
                    var center=CameraFootprint.ClampFocus(new Vector3(-100,0,200),camera.orthographicSize,standard,offsets);
                    camera.transform.position=center-camera.transform.forward*60;
                    Check(camera,standard,errors,ref checks,"pitch="+pitch+" yaw="+yaw);
                }
            }
            finally{UnityEngine.Object.DestroyImmediate(root);}
            var report=new Report{unityVersion=Application.unityVersion,checks=checks,success=errors.Count==0,errors=errors.ToArray()};
            string folder=Path.GetFullPath(Path.Combine(Application.dataPath,"../..","work/native-visual-review"));Directory.CreateDirectory(folder);
            File.WriteAllText(Path.Combine(folder,"camera-boundaries.json"),JsonUtility.ToJson(report,true));
            if(errors.Count>0)throw new InvalidOperationException("Camera review failed: "+errors[0]+". Full report: "+folder);
            Debug.Log("Camera geometry passed "+checks+" checks. Report: "+folder+". Visual gameplay review is still required.");
        }
    }
}
