using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private Mesh realmMesh;
        private float TerrainHeight(Vector2 p)
        {
            float edge=Mathf.Min(p.x,p.y,80-p.x,80-p.y);
            if(edge<1.5f||SceneryClearing(p))return 0;
            // Restrained cosmetic relief; authoritative movement/picking stays y=0.
            return -.18f*Mathf.SmoothStep(0,1,(edge-1.5f)/2)*Mathf.PerlinNoise(p.x*.21f+19,p.y*.21f+7);
        }
        private void BuildRelief(Material material)
        {
            const int steps=128;int side=steps+1;
            var vertices=new Vector3[side*side];var uv=new Vector2[vertices.Length];var triangles=new int[steps*steps*6];
            for(int z=0;z<=steps;z++)for(int x=0;x<=steps;x++)
            {
                var p=new Vector2(x*80f/steps,z*80f/steps);int i=z*side+x;
                vertices[i]=new Vector3(p.x,TerrainHeight(p),p.y);uv[i]=new Vector2(x/(float)steps,z/(float)steps);
                if(x==steps||z==steps)continue;int t=(z*steps+x)*6;
                triangles[t]=i;triangles[t+1]=i+side;triangles[t+2]=i+side+1;triangles[t+3]=i;triangles[t+4]=i+side+1;triangles[t+5]=i+1;
            }
            realmMesh=new Mesh{name="Realm ground · sculpted surface"};realmMesh.vertices=vertices;realmMesh.uv=uv;realmMesh.triangles=triangles;realmMesh.RecalculateNormals();realmMesh.RecalculateBounds();
            var obj=new GameObject("Realm surface · logical collider remains on Ground");obj.transform.SetParent(transform,false);obj.AddComponent<MeshFilter>().sharedMesh=realmMesh;obj.AddComponent<MeshRenderer>().sharedMaterial=material;
        }
        private void BuildRealmDressing()
        {
            // Visible stone edge belongs inside the kingdom, not a second playable map.
            var rim=new Color(.38f,.42f,.34f);
            foreach(var at in new[]{new Vector3(40,.035f,.32f),new Vector3(40,.035f,79.68f)})art.Shape(scenery,PrimitiveType.Cube,at,new Vector3(79.5f,.07f,.22f),rim);
            foreach(var at in new[]{new Vector3(.32f,.035f,40),new Vector3(79.68f,.035f,40)})art.Shape(scenery,PrimitiveType.Cube,at,new Vector3(.22f,.07f,79.5f),rim);
            foreach(var center in new[]{new Vector2(10,24),new Vector2(32,58),new Vector2(57,12),new Vector2(70,49)})
            {
                float y=TerrainHeight(center);
                for(int i=0;i<3;i++)
                {
                    var at=new Vector3(center.x+(i-1)*.8f,y,center.y+.4f*(i%2));
                    art.Shape(scenery,PrimitiveType.Cylinder,at+Vector3.up*.16f,new Vector3(.9f,.16f,.9f),new Color(.60f,.59f,.46f));
                    art.Shape(scenery,PrimitiveType.Cylinder,at+Vector3.up*(.8f+i*.2f),new Vector3(.30f,.7f+i*.2f,.30f),new Color(.67f,.65f,.52f));
                }
                // Ruin lintels, all below the fog plane; no collectible or objective implied.
                art.Shape(scenery,PrimitiveType.Cube,new Vector3(center.x,y+2.1f,center.y),new Vector3(2.2f,.24f,.45f),new Color(.63f,.61f,.49f));
            }
            var random=new System.Random(919);
            for(int i=0;i<140;i++)
            {
                var p=new Vector2(2+(float)random.NextDouble()*76,2+(float)random.NextDouble()*76);
                if(SceneryClearing(p))continue;
                art.EnvironmentModel(scenery,"BorderRock",new Vector3(p.x,TerrainHeight(p),p.y),.18f+(float)random.NextDouble()*.35f,new Color(.50f,.53f,.40f),(float)random.NextDouble()*360);
            }
        }
    }
}
