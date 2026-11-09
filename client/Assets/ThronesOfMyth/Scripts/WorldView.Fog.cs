using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private Mesh fogMesh;
        private Material fogMaterial;
        public Texture2D MinimapTerrain {get;private set;}
        private readonly Color[] minimapColors=new Color[400];
        private GameObject fogObject;
        private readonly FogVisibilityGrid fogGrid=new FogVisibilityGrid();
        private Color[] fogColors;
        private float[] fogCloud;
        private const int FogSteps=160;
        private float FogOpacity(int x,int z) => fogGrid.Opacity(x,z);
        private void UpdateFog(ExplorationData data)
        {
            if (data == null) return;
            if (fogMesh == null)
            {
                fogObject = new GameObject("Veil · feathered sector boundaries"); fogObject.transform.SetParent(transform, false);
                fogMesh = new Mesh { name = "Continuous kingdom veil" };
                int side = FogSteps + 1;fogColors=new Color[side*side];fogCloud=new float[side*side];
                for(int z=0;z<side;z++)for(int x=0;x<side;x++)fogCloud[z*side+x]=Mathf.PerlinNoise(x*.055f,z*.055f)*.035f;
                var vertices = new Vector3[side * side]; var triangles = new int[FogSteps * FogSteps * 6];
                for (int z = 0; z <= FogSteps; z++) for (int x = 0; x <= FogSteps; x++) vertices[z * side + x] = new Vector3(x * .5f, 4.5f, z * .5f);
                for (int z = 0; z < FogSteps; z++) for (int x = 0; x < FogSteps; x++)
                {
                    int v = z * side + x, t = (z * FogSteps + x) * 6;
                    triangles[t] = v; triangles[t + 1] = v + side; triangles[t + 2] = v + side + 1;
                    triangles[t + 3] = v; triangles[t + 4] = v + side + 1; triangles[t + 5] = v + 1;
                }
                fogMesh.vertices = vertices; fogMesh.triangles = triangles; fogMesh.RecalculateBounds();
                fogObject.AddComponent<MeshFilter>().sharedMesh = fogMesh;
                fogMaterial = new Material(Shader.Find("ThronesOfMyth/KingdomVeil")) { name = "Veil transparency", renderQueue = 3001 };
                var renderer = fogObject.AddComponent<MeshRenderer>(); renderer.sharedMaterial = fogMaterial;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; renderer.receiveShadows = false;
            }
            fogMaterial.SetFloat("_Drift",reducedMotion?0:1);
            if(!fogGrid.Update(data))return;
            if(MinimapTerrain==null)MinimapTerrain=new Texture2D(20,20,TextureFormat.RGB24,false){name="Surveyed kingdom minimap",filterMode=FilterMode.Point};
            for(int i=0;i<400;i++){float opacity=FogOpacity(i%20,i/20);minimapColors[i]=opacity<.25f?new Color(.29f,.43f,.31f):opacity<.75f?new Color(.24f,.29f,.29f):new Color(.07f,.12f,.17f);}
            MinimapTerrain.SetPixels(minimapColors);MinimapTerrain.Apply(false,false);
            for (int z = 0; z <= FogSteps; z++) for (int x = 0; x <= FogSteps; x++)
            {
                // Interpolate the presentation only. Server discovery and entity filtering
                // still use the exact sectors; feathering never authorizes a target.
                float sx = x / 8f - .5f, sz = z / 8f - .5f;
                int ix = Mathf.FloorToInt(sx), iz = Mathf.FloorToInt(sz);
                float tx = Mathf.SmoothStep(0, 1, sx - ix), tz = Mathf.SmoothStep(0, 1, sz - iz);
                float alpha = Mathf.Lerp(Mathf.Lerp(FogOpacity(ix, iz), FogOpacity(ix + 1, iz), tx), Mathf.Lerp(FogOpacity(ix, iz + 1), FogOpacity(ix + 1, iz + 1), tx), tz);
                float cloud=fogCloud[z*(FogSteps+1)+x];
                // Remembered land is a lighter, desaturated veil; unknown land is opaque slate.
                var tint=Color.Lerp(new Color(.30f,.35f,.34f),new Color(.12f,.20f,.25f),Mathf.Clamp01((alpha-.50f)*2));
                fogColors[z*(FogSteps+1)+x]=new Color(tint.r+cloud,tint.g+cloud,tint.b+cloud,alpha);
            }
            fogMesh.colors = fogColors;
        }
        private void DisposeFog()
        {
            if (fogObject != null) Destroy(fogObject); if (fogMesh != null) Destroy(fogMesh); if (fogMaterial != null) Destroy(fogMaterial);
            if(MinimapTerrain!=null)Destroy(MinimapTerrain);MinimapTerrain=null;
            fogGrid.Reset();fogColors=null;fogCloud=null;
        }
    }
}
