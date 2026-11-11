using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        private readonly Dictionary<string,Mesh> showcaseMeshes=new Dictionary<string,Mesh>();
        private Transform Sculpt(Transform parent,string key,Vector3 at,Vector3 scale,Color color)
        {
            if(!showcaseMeshes.TryGetValue(key,out var mesh))
            {
                var vertices=new List<Vector3>();var uv=new List<Vector2>();var triangles=new List<int>();
                bool arch=key=="arch";int sides=arch?24:12,rings=arch?2:9;
                for(int ring=0;ring<rings;ring++)for(int i=0;i<=sides;i++)
                {
                    float a=i*Mathf.PI*(arch?1:2)/sides,t=ring/(float)(rings-1),radius;
                    if(arch){radius=ring==0?1:.72f;vertices.Add(new Vector3(Mathf.Cos(a)*radius,Mathf.Sin(a)*radius,0));}
                    else {
                        bool trunk=key.StartsWith("trunk"),rock=key.StartsWith("rock"),pine=key.StartsWith("pine");
                        int seed=key[key.Length-1]%7;
                        radius=trunk?Mathf.Lerp(.17f,.06f,t):rock?(.58f+Mathf.Sin(t*Mathf.PI)*.34f):Mathf.Sin(t*Mathf.PI)*(.88f+.11f*Mathf.Sin(a*3+seed+t*7));
                        if(pine)radius*=1.25f-t*.7f;
                        radius*=1+.075f*Mathf.Sin(a*5+seed+t*9);
                        vertices.Add(new Vector3(Mathf.Cos(a)*radius+(trunk?Mathf.Sin(t*3+seed)*.13f:0),t*(trunk?1.65f:rock?1.3f:2.5f)+(rock?.1f*Mathf.Sin(a*3+seed)*t:0),Mathf.Sin(a)*radius));
                    }
                    uv.Add(new Vector2(i/(float)sides,t));
                }
                for(int ring=0;ring<rings-1;ring++)for(int i=0;i<sides;i++){int a=ring*(sides+1)+i,b=a+sides+1;triangles.AddRange(new[]{a,b,a+1,a+1,b,b+1});}
                if(!arch){int bottom=vertices.Count;vertices.Add(new Vector3(0,0,0));uv.Add(Vector2.zero);int top=vertices.Count;vertices.Add(new Vector3(0,key.StartsWith("trunk")?1.65f:key.StartsWith("rock")?1.3f:2.5f,0));uv.Add(Vector2.one);for(int i=0;i<sides;i++){triangles.AddRange(new[]{bottom,i,i+1});int a=(rings-1)*(sides+1)+i;triangles.AddRange(new[]{top,a+1,a});}}
                // Vaults have thickness and a second independently lit face.
                if(arch){int count=vertices.Count;for(int i=0;i<count;i++){var v=vertices[i];v.z=.32f;vertices.Add(v);uv.Add(uv[i]);}int countT=triangles.Count;for(int i=0;i<countT;i+=3)triangles.AddRange(new[]{triangles[i]+count,triangles[i+2]+count,triangles[i+1]+count});for(int i=0;i<sides;i++){int a=i,b=i+1;triangles.AddRange(new[]{a,b,a+count,b,b+count,a+count});a=i+sides+1;b=a+1;triangles.AddRange(new[]{a,a+count,b,b,a+count,b+count});}}
                mesh=new Mesh{name="Original sculpt · "+key};mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();showcaseMeshes[key]=mesh;authoredMeshes.Add(mesh);
            }
            var obj=new GameObject("Sculpted "+key);obj.transform.SetParent(parent,false);obj.transform.localPosition=at;obj.transform.localScale=scale;obj.AddComponent<MeshFilter>().sharedMesh=mesh;obj.AddComponent<MeshRenderer>().sharedMaterial=key.StartsWith("crown")||key.StartsWith("pine")?FoliageMaterial(color):MaterialFor(color);return obj.transform;
        }
        public Transform CityTerrace(Transform parent,Vector3 at,Vector3 scale,Color color)
        {
            const string key="city-terrace";
            if(!showcaseMeshes.TryGetValue(key,out var mesh))
            {
                var outline=new[]{new Vector2(-1,-.78f),new Vector2(-.78f,-1),new Vector2(.78f,-1),new Vector2(1,-.78f),new Vector2(1,.78f),new Vector2(.78f,1),new Vector2(-.78f,1),new Vector2(-1,.78f)};
                var v=new List<Vector3>();var uv=new List<Vector2>();var t=new List<int>();
                for(int layer=0;layer<2;layer++)foreach(var p in outline){v.Add(new Vector3(p.x,layer,p.y));uv.Add(p*.5f+Vector2.one*.5f);}
                for(int i=0;i<8;i++){int n=(i+1)%8;t.AddRange(new[]{i,i+8,n,n,i+8,n+8});}
                for(int i=1;i<7;i++){t.AddRange(new[]{0,i,i+1,8,8+i+1,8+i});}
                mesh=new Mesh{name="Original chamfered civic terrace"};mesh.SetVertices(v);mesh.SetUVs(0,uv);mesh.SetTriangles(t,0);mesh.RecalculateNormals();mesh.RecalculateBounds();showcaseMeshes[key]=mesh;authoredMeshes.Add(mesh);
            }
            var obj=new GameObject("Chamfered civic terrace");obj.transform.SetParent(parent,false);obj.transform.localPosition=at;obj.transform.localScale=scale;obj.AddComponent<MeshFilter>().sharedMesh=mesh;obj.AddComponent<MeshRenderer>().sharedMaterial=MaterialFor(color);return obj.transform;
        }
        private void PainterTree(Transform parent,bool pine,Color tint,int seed)
        {
            Sculpt(parent,"trunk"+seed,Vector3.zero,Vector3.one,timber);
            int crowns=pine?3:4;
            for(int i=0;i<crowns;i++)
            {
                float a=i*2.4f;var at=pine?new Vector3(0,.55f+i*.48f,0):new Vector3(Mathf.Cos(a)*.52f,.85f+(i%2)*.28f,Mathf.Sin(a)*.48f);
                var scale=pine?Vector3.one*(.85f-i*.16f):new Vector3(.85f,.62f,.85f);
                Sculpt(parent,(pine?"pine":"crown")+seed,at,scale,Color.Lerp(tint,new Color(.61f,.65f,.30f),i*.08f));
            }
        }
        public void ProvinceRidge(Transform parent,Vector3 at,float yaw,int variant)
        {
            var root=new GameObject("Layered province escarpment").transform;root.SetParent(parent,false);root.localPosition=at;root.localRotation=Quaternion.Euler(0,yaw,0);
            var pigment=variant>40?new Color(.42f,.48f,.45f):new Color(.57f,.51f,.38f);
            for(int layer=0;layer<3;layer++)
            {
                float taper=1-layer*.20f;
                var ledge=Sculpt(root,"rock"+(variant/4%3),new Vector3((layer%2-.5f)*.18f,layer*.48f,0),new Vector3(1.08f*taper,.65f,2.0f*taper),Color.Lerp(pigment,new Color(.70f,.67f,.51f),layer*.13f));
                ledge.localRotation=Quaternion.Euler(0,(variant%3-1)*6,layer%2==0?3:-3);
            }
        }
        private void ShowcaseCamp(Transform root,Color team)
        {
            // Original scout shelter, enclosure and stone hearth; no borrowed camp prefab.
            for(int i=0;i<8;i++){float a=i*Mathf.PI*2/8;var p=new Vector3(Mathf.Cos(a)*1.5f,.03f,Mathf.Sin(a)*1.3f);Sculpt(root,"rock"+(i%3),p,new Vector3(.3f,.25f,.3f),darkStone);}
            for(int side=-1;side<=1;side+=2){var gate=new GameObject("Palisade gate").transform;gate.SetParent(root,false);gate.localPosition=new Vector3(side*1.05f,0,-1.0f);for(int i=0;i<3;i++)Pillar(gate,i*.17f,.55f,0,.10f,1.1f,timber);}
            var canopy=new GameObject("Weathered scout shelter").transform;canopy.SetParent(root,false);canopy.localPosition=new Vector3(-.2f,.3f,.65f);DistrictRoof(canopy,"norse",new Vector3(0,.65f,0),1.8f,1.3f,new Color(.47f,.26f,.16f));
        }
        private void ShowcaseDistrict(Transform root,string id,string culture,int level,Color team)
        {
            if(level<=0)return;
            Color roof=culture=="norse"?new Color(.25f,.36f,.32f):culture=="egyptian"?new Color(.12f,.52f,.58f):culture=="japanese"?new Color(.24f,.30f,.48f):culture=="chinese"?new Color(.24f,.44f,.33f):new Color(.62f,.25f,.15f);
            if(id=="citadel")
            {
                // Front vaulted audience portico, fluted capitals, stepped entrance and tiled gallery.
                for(int side=-1;side<=1;side+=2){Pillar(root,side*1.4f,1.55f,-2.15f,.33f,2.3f,stone);Box(root,side*1.4f,2.71f,-2.15f,.57f,.18f,.55f,bronze);}
                Sculpt(root,"arch",new Vector3(0,1.55f,-2.34f),new Vector3(1.25f,1.2f,.9f),stone);
                DistrictRoof(root,culture,new Vector3(0,3.0f,-2.0f),3.6f,1.35f,roof);
                for(int step=0;step<4;step++)Box(root,0,.07f+step*.10f,-3+step*.18f,2.7f,.14f,.8f,stone);
                for(int i=-2;i<=2;i++)Box(root,i*.42f,1.1f,-2.18f,.03f,.8f,.03f,bronze);
            }
            else if(id=="oracle"||id=="academy")
            {Sculpt(root,"arch",new Vector3(0,.55f,-.73f),new Vector3(.53f,.66f,.5f),stone);for(int side=-1;side<=1;side+=2)Pillar(root,side*.73f,.24f,-.81f,.18f,.4f,bronze);}
            else if(id=="forge")
            {for(int i=0;i<4;i++)Box(root,.62f,.58f+i*.22f,.4f,.5f,.20f,.48f,i%2==0?darkStone:stone);Sculpt(root,"arch",new Vector3(.30f,.27f,-.71f),new Vector3(.36f,.36f,.7f),darkStone);}
            else if(id=="barracks")
            {for(int i=0;i<3;i++){Pillar(root,(i-1)*.35f,.45f,-.81f,.06f,.8f,timber);var shield=Sculpt(root,"rock1",new Vector3((i-1)*.35f,.38f,-.84f),new Vector3(.15f,.25f,.045f),team);}}
            if(level>=2)for(int side=-1;side<=1;side+=2)Box(root,side*.65f,.06f,-1.05f,.25f,.08f,.36f,roof);
        }
    }
}
