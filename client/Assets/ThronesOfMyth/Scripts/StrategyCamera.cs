using UnityEngine;
namespace ThronesOfMyth
{
    [DefaultExecutionOrder(100)]
    [RequireComponent(typeof(Camera))]
    public sealed class StrategyCamera : MonoBehaviour
    {
        public bool blockInput,reducedMotion;
        public System.Func<bool> inputBlocked;
        private Camera view;
        private Vector3 focus=new Vector3(20,0,20),wantedFocus=new Vector3(20,0,20);
        private Vector3 previousMouse;
        private bool dragging;
        private float wantedZoom=14;
        private Rect bounds=new Rect(0,0,ReleaseVersion.WorldSize,ReleaseVersion.WorldSize);
        private static readonly Vector3 Offset=new Vector3(0,42,-30);
        public Rect MapBounds => bounds;
        public Vector3 FocusPoint => focus;
        public float MaximumZoom {get;private set;}
        public float MinimumZoom => Mathf.Min(3,MaximumZoom);
        private void Awake(){Initialize();}
        public void Initialize()
        {
            if(view!=null)return;
            view=GetComponent<Camera>();view.orthographic=true;view.orthographicSize=14;view.nearClipPlane=.1f;view.farClipPlane=512;
            view.backgroundColor=new Color(.16f,.23f,.26f);view.clearFlags=CameraClearFlags.SolidColor;
            Pose();ConstrainNow(true);
        }
        public void SetMapBounds(Rect value)
        {
            if(value.width<=0||value.height<=0)return;
            if(bounds==value)return;
            bounds=value;ConstrainNow(false);
        }
        public void Focus(float x,float z){SetView(new Vector3(x,0,z),Mathf.Min(wantedZoom,12),false);}
        public void SetView(Vector3 point,float zoom,bool immediate=false)
        {
            Initialize();wantedFocus=point;wantedZoom=zoom;ConstrainNow(immediate);
        }
        public void Pan(Vector3 delta){wantedFocus+=new Vector3(delta.x,0,delta.z);ConstrainNow(false);}
        public void ZoomBy(float steps,Vector2 viewport)
        {
            Initialize();if(float.IsNaN(steps)||float.IsInfinity(steps)||steps==0)return;
            viewport=new Vector2(Mathf.Clamp01(viewport.x),Mathf.Clamp01(viewport.y));
            if(!CameraFootprint.GroundPoint(view,viewport,out var anchor))return;
            var offset=(anchor-focus)/view.orthographicSize;
            wantedZoom=Mathf.Clamp(wantedZoom-steps*Mathf.Max(.6f,wantedZoom*.1f),MinimumZoom,MaximumZoom);
            wantedFocus=anchor-offset*wantedZoom;
            ConstrainNow(false);
        }
        public void Scroll(float steps,Vector2 viewport)
        {
            if(blockInput||(inputBlocked?.Invoke()??false))return;
            ZoomBy(steps,viewport);
        }
        private void Pose()
        {
            // A256-wide overview needs enough altitude for every orthographic ray
            // to start above the ground. Fixed42-height rays failed at large zoom.
            var offset=Offset*Mathf.Max(1,view.orthographicSize/14f);
            transform.position=focus+offset;transform.rotation=Quaternion.LookRotation(-Offset,Vector3.up);
            view.farClipPlane=Mathf.Max(512,offset.magnitude*2+view.orthographicSize*4);
        }
        private void Update()
        {
            bool blocked=blockInput||(inputBlocked?.Invoke()??false);
            if(blocked){dragging=false;return;}
            var keys=new Vector3(Input.GetAxisRaw("Horizontal"),0,Input.GetAxisRaw("Vertical"));
            wantedFocus+=Vector3.ClampMagnitude(keys,1)*view.orthographicSize*.8f*Time.unscaledDeltaTime;
            Scroll(Input.mouseScrollDelta.y,view.ScreenToViewportPoint(Input.mousePosition));
            if(Input.GetMouseButtonDown(2)){dragging=true;previousMouse=Input.mousePosition;}
            if(!Input.GetMouseButton(2))dragging=false;
            if(dragging)
            {
                var previous=view.ScreenToViewportPoint(previousMouse);var current=view.ScreenToViewportPoint(Input.mousePosition);
                if(CameraFootprint.GroundPoint(view,previous,out var a)&&CameraFootprint.GroundPoint(view,current,out var b))wantedFocus+=a-b;
                previousMouse=Input.mousePosition;
            }
        }
        private void LateUpdate(){ConstrainNow(false);}
        public void ConstrainNow(bool immediate=false,float deltaSeconds=-1)
        {
            if(view==null)return;
            Pose();
            if(!CameraFootprint.TryOffsets(view,out var offsets))return;
            // Small inset avoids raster-edge slivers. Recompute for every aspect/zoom.
            float inset=Mathf.Min(.20f,Mathf.Min(bounds.width,bounds.height)*.01f);
            var safe=Rect.MinMaxRect(bounds.xMin+inset,bounds.yMin+inset,bounds.xMax-inset,bounds.yMax-inset);
            MaximumZoom=CameraFootprint.MaximumZoom(safe,offsets);
            wantedZoom=Mathf.Clamp(wantedZoom,MinimumZoom,MaximumZoom);
            float dt=deltaSeconds>=0?deltaSeconds:Time.unscaledDeltaTime;
            float blend=immediate||reducedMotion?1:1-Mathf.Exp(-12*Mathf.Clamp(dt,0,.1f));
            // A resize must clamp immediately; interpolation cannot expose blank land.
            view.orthographicSize=Mathf.Clamp(Mathf.Lerp(view.orthographicSize,wantedZoom,blend),MinimumZoom,MaximumZoom);
            wantedFocus=CameraFootprint.ClampFocus(wantedFocus,wantedZoom,safe,offsets);
            focus=CameraFootprint.ClampFocus(Vector3.Lerp(focus,wantedFocus,blend),view.orthographicSize,safe,offsets);
            Pose();
        }
    }
}
