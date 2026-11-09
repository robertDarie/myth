using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        private readonly Dictionary<string,Mesh> craftMeshes=new Dictionary<string,Mesh>();
        private readonly Dictionary<Color,Material> roofMaterials=new Dictionary<Color,Material>();
        private Material RoofMaterial(Color tint)
        {
            if(!roofMaterials.TryGetValue(tint,out var material)){material=new Material(MaterialFor(tint));material.name="Painted fired tiles";material.mainTexture=Resources.Load<Texture2D>("Art/RoofTiles");roofMaterials[tint]=material;}return material;
        }
        private Transform Craft(Transform parent,string key,CraftGeometry data,Vector3 at,Vector3 scale,Material material)
        {
            if(!craftMeshes.TryGetValue(key,out var mesh))
            {
                var v=new Vector3[data.Vertices.Count];var uv=new Vector2[v.Length];for(int i=0;i<v.Length;i++){var p=data.Vertices[i];v[i]=new Vector3(p.X,p.Y,p.Z);uv[i]=new Vector2(p.U,p.V);}
                mesh=new Mesh{name="Original crafted "+key};mesh.vertices=v;mesh.uv=uv;mesh.SetTriangles(data.Triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();craftMeshes[key]=mesh;authoredMeshes.Add(mesh);
            }
            var obj=new GameObject(mesh.name);obj.transform.SetParent(parent,false);obj.transform.localPosition=at;obj.transform.localScale=scale;obj.AddComponent<MeshFilter>().sharedMesh=mesh;obj.AddComponent<MeshRenderer>().sharedMaterial=material;return obj.transform;
        }
        private Transform CraftedRoof(Transform parent,string culture,Vector3 at,float width,float depth,Color color)
        {string key="roof-"+culture;return Craft(parent,key,craftMeshes.ContainsKey(key)?null:CraftGeometry.Roof(culture),at,new Vector3(width,1,depth),RoofMaterial(color));}
        public void Meadow(Transform parent,Vector3 at,int variant,float scale,Color tint)
        {string key="meadow-"+(variant%4);Craft(parent,key,craftMeshes.ContainsKey(key)?null:CraftGeometry.Meadow(variant%4),at,Vector3.one*scale,MaterialFor(tint));}
        private Transform Vessel(Transform parent,Vector3 at,float scale,Color tint)
        {return Craft(parent,"vessel",craftMeshes.ContainsKey("vessel")?null:CraftGeometry.Vessel(),at,Vector3.one*scale,MaterialFor(tint));}
        public void CivicDressing(Transform parent,string culture)
        {
            for(int side=-1;side<=1;side+=2)
            {
                var gate=new GameObject("Culture gatehouse").transform;gate.SetParent(parent,false);gate.localPosition=new Vector3(side*1.0f,0,-7.0f);
                Box(gate,0,.65f,0,.65f,1.3f,.65f,stone);CraftedRoof(gate,culture,new Vector3(0,1.35f,0),1.0f,.95f,bronze);
                Vessel(parent,new Vector3(side*1.7f,.05f,-5.5f),.45f,new Color(.58f,.30f,.18f));
                for(int i=0;i<5;i++)Meadow(parent,new Vector3(side*5.8f,.03f,-4.8f+i*1.8f),i,.8f,new Color(.38f,.47f,.25f));
            }
            for(int i=-2;i<=2;i++){var bench=new GameObject("Public stone bench").transform;bench.SetParent(parent,false);bench.localPosition=new Vector3(i*1.1f,.08f,6.25f);Box(bench,0,.22f,0,.65f,.12f,.22f,stone);for(int side=-1;side<=1;side+=2)Box(bench,side*.22f,.10f,0,.12f,.22f,.2f,darkStone);}
        }
        private void WorksiteDressing(Transform root,string resource)
        {
            if(resource=="food")for(int i=0;i<3;i++)Vessel(root,new Vector3(.70f+i*.24f,0,.95f),.42f,new Color(.66f,.43f,.24f));
            if(resource=="wood"){CraftedRoof(root,"norse",new Vector3(.75f,1.1f,.85f),1.0f,.95f,timber);for(int side=-1;side<=1;side+=2)Pillar(root,.75f+side*.35f,.55f,.85f,.08f,1.1f,timber);}
            if(resource=="stone"||resource=="gold"||resource=="mana")Sculpt(root,"arch",new Vector3(0,.4f,-1.04f),new Vector3(.50f,.62f,.7f),stone);
        }
        private void DisposeCraft(){foreach(var m in roofMaterials.Values)Object.Destroy(m);roofMaterials.Clear();craftMeshes.Clear();}
    }
}
