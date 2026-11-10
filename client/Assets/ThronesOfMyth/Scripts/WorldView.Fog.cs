using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private Mesh fogMesh;
        private Material fogMaterial;
        public Texture2D MinimapTerrain {get;private set;}
        private readonly Color[] minimapColors=new Color[400],veilPixels=new Color[400];
        private Texture2D veilMask;
        private GameObject fogObject;
        private readonly ExplorationData concealedMap=new ExplorationData{explored=System.Array.Empty<int>()};
        private readonly FogVisibilityGrid fogGrid=new FogVisibilityGrid();
        private void UpdateFog(ExplorationData data)
        {
            data=data??concealedMap;
            if(fogMesh==null)
            {
                // Ground-registered overlay: no elevated parallax or depth holes through tall scenery.
                fogObject=new GameObject("Unexplored kingdom veil");fogObject.transform.SetParent(transform,false);
                fogMesh=new Mesh{name="Kingdom veil footprint"};
                fogMesh.vertices=new[]{new Vector3(0,0,0),new Vector3(0,0,80),new Vector3(80,0,80),new Vector3(80,0,0)};
                fogMesh.uv=new[]{Vector2.zero,Vector2.up,Vector2.one,Vector2.right};fogMesh.triangles=new[]{0,1,2,0,2,3};fogMesh.RecalculateBounds();
                fogObject.AddComponent<MeshFilter>().sharedMesh=fogMesh;
                veilMask=new Texture2D(20,20,TextureFormat.RGBA32,false){name="Authoritative explored sectors",filterMode=FilterMode.Point,wrapMode=TextureWrapMode.Clamp};
                fogMaterial=new Material(Shader.Find("ThronesOfMyth/KingdomVeil")){name="Opaque unknown / clear explored",renderQueue=3900};fogMaterial.SetTexture("_Exploration",veilMask);
                var renderer=fogObject.AddComponent<MeshRenderer>();renderer.sharedMaterial=fogMaterial;
                renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;renderer.receiveShadows=false;
            }
            fogMaterial.SetFloat("_Drift",reducedMotion?0:1);
            if(!fogGrid.Update(data))return;
            if(MinimapTerrain==null)MinimapTerrain=new Texture2D(20,20,TextureFormat.RGB24,false){name="Explored kingdom minimap",filterMode=FilterMode.Point,wrapMode=TextureWrapMode.Clamp};
            for(int i=0;i<400;i++)
            {bool unknown=fogGrid.Opacity(i%20,i/20)>.5f;veilPixels[i]=unknown?Color.white:Color.black;minimapColors[i]=unknown?new Color(.07f,.12f,.17f):new Color(.29f,.43f,.31f);}
            veilMask.SetPixels(veilPixels);veilMask.Apply(false,false);MinimapTerrain.SetPixels(minimapColors);MinimapTerrain.Apply(false,false);
        }
        private void DisposeFog()
        {
            if(fogObject!=null)Destroy(fogObject);if(fogMesh!=null)Destroy(fogMesh);if(fogMaterial!=null)Destroy(fogMaterial);if(veilMask!=null)Destroy(veilMask);
            if(MinimapTerrain!=null)Destroy(MinimapTerrain);MinimapTerrain=null;fogGrid.Reset();
        }
    }
}
