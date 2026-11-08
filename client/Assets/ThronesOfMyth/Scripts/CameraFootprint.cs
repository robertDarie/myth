using UnityEngine;
namespace ThronesOfMyth
{
    // Ground-plane ray intersections, not focus-only or Screen.width estimates.
    public static class CameraFootprint
    {
        private static readonly Vector2[] Corners={Vector2.zero,Vector2.right,Vector2.one,Vector2.up};
        public static bool GroundPoint(Camera camera,Vector2 viewport,out Vector3 point)
        {
            var ray=camera.ViewportPointToRay(new Vector3(viewport.x,viewport.y,0));
            var plane=new Plane(Vector3.up,Vector3.zero);
            if(plane.Raycast(ray,out float distance)){point=ray.GetPoint(distance);return true;}
            point=Vector3.zero;return false;
        }
        public static bool TryOffsets(Camera camera,out Rect offsets)
        {
            offsets=new Rect();
            if(!camera.orthographic||camera.orthographicSize<=0||!GroundPoint(camera,new Vector2(.5f,.5f),out var center))return false;
            float minX=float.PositiveInfinity,minZ=float.PositiveInfinity,maxX=float.NegativeInfinity,maxZ=float.NegativeInfinity;
            foreach(var corner in Corners)
            {
                if(!GroundPoint(camera,corner,out var point))return false;
                var offset=(point-center)/camera.orthographicSize;
                minX=Mathf.Min(minX,offset.x);maxX=Mathf.Max(maxX,offset.x);minZ=Mathf.Min(minZ,offset.z);maxZ=Mathf.Max(maxZ,offset.z);
            }
            offsets=Rect.MinMaxRect(minX,minZ,maxX,maxZ);return offsets.width>.0001f&&offsets.height>.0001f;
        }
        public static float MaximumZoom(Rect bounds,Rect offsets) => Mathf.Min(bounds.width/offsets.width,bounds.height/offsets.height)*.9999f;
        public static Vector3 ClampFocus(Vector3 focus,float size,Rect bounds,Rect offsets)
        {
            float minX=bounds.xMin-offsets.xMin*size,maxX=bounds.xMax-offsets.xMax*size;
            float minZ=bounds.yMin-offsets.yMin*size,maxZ=bounds.yMax-offsets.yMax*size;
            return new Vector3(minX<=maxX?Mathf.Clamp(focus.x,minX,maxX):bounds.center.x,0,minZ<=maxZ?Mathf.Clamp(focus.z,minZ,maxZ):bounds.center.y);
        }
    }
}
