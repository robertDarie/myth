using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private Mesh fogMesh;
        private Material fogMaterial;
        public Texture2D MinimapTerrain {get;private set;}
        private Color[] minimapColors,veilPixels;
        private Texture2D veilMask;
        private GameObject fogObject;
        private readonly ExplorationData concealedMap=new ExplorationData{width=64,cellSize=4,explored=System.Array.Empty<int>()};
        private readonly FogVisibilityGrid fogGrid=new FogVisibilityGrid();
        private void UpdateFog(ExplorationData data)
        {
            data=data??concealedMap;
            int width=data.width>0?data.width:20;float extent=width*(data.cellSize>0?data.cellSize:4);
            if(fogMesh!=null&&veilMask.width!=width)DisposeFog();
            if(fogMesh==null)
            {
                minimapColors=new Color[width*width];veilPixels=new Color[width*width];
                // Ground-registered overlay: no elevated parallax or depth holes through tall scenery.
                fogObject=new GameObject("Unexplored kingdom veil");fogObject.transform.SetParent(transform,false);
                fogMesh=new Mesh{name="Kingdom veil footprint"};
                fogMesh.vertices=new[]{new Vector3(0,0,0),new Vector3(0,0,extent),new Vector3(extent,0,extent),new Vector3(extent,0,0)};
                fogMesh.uv=new[]{Vector2.zero,Vector2.up,Vector2.one,Vector2.right};fogMesh.triangles=new[]{0,1,2,0,2,3};fogMesh.RecalculateBounds();
                fogObject.AddComponent<MeshFilter>().sharedMesh=fogMesh;
                veilMask=new Texture2D(width,width,TextureFormat.RGBA32,false){name="Authoritative explored sectors",filterMode=FilterMode.Point,wrapMode=TextureWrapMode.Clamp};
                fogMaterial=new Material(Shader.Find("ThronesOfMyth/KingdomVeil")){name="Opaque unknown / clear explored",renderQueue=3900};fogMaterial.SetTexture("_Exploration",veilMask);
                var renderer=fogObject.AddComponent<MeshRenderer>();renderer.sharedMaterial=fogMaterial;
                renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;renderer.receiveShadows=false;
            }
            fogMaterial.SetFloat("_Drift",reducedMotion?0:1);
            if(!fogGrid.Update(data))return;
            if(MinimapTerrain==null)MinimapTerrain=new Texture2D(width,width,TextureFormat.RGB24,false){name="Explored kingdom minimap",filterMode=FilterMode.Point,wrapMode=TextureWrapMode.Clamp};
            for(int i=0;i<width*width;i++)
            {bool unknown=fogGrid.Opacity(i%width,i/width)>.5f;veilPixels[i]=unknown?Color.white:Color.black;minimapColors[i]=unknown?new Color(.07f,.12f,.17f):new Color(.29f,.43f,.31f);}
            veilMask.SetPixels(veilPixels);veilMask.Apply(false,false);MinimapTerrain.SetPixels(minimapColors);MinimapTerrain.Apply(false,false);
        }
        private void DisposeFog()
        {
            if(fogObject!=null)Destroy(fogObject);if(fogMesh!=null)Destroy(fogMesh);if(fogMaterial!=null)Destroy(fogMaterial);if(veilMask!=null)Destroy(veilMask);
            if(MinimapTerrain!=null)Destroy(MinimapTerrain);MinimapTerrain=null;fogGrid.Reset();
        }
    }
}
