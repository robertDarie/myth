using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private Material terrainMaterial;
        private static readonly Vector2[] RoadPoints = { new Vector2(5,5), new Vector2(20,20), new Vector2(40,20), new Vector2(60,20), new Vector2(60,40), new Vector2(65,65), new Vector2(20,20), new Vector2(20,40), new Vector2(20,60), new Vector2(40,60), new Vector2(65,65) };
        private float SegmentDistance(Vector2 point, Vector2 a, Vector2 b) { var d = b - a; return Vector2.Distance(point, a + d * Mathf.Clamp01(Vector2.Dot(point - a, d) / Mathf.Max(0.001f, d.sqrMagnitude))); }
        private float RoadDistance(Vector2 point)
        {
            float distance = 100;
            for (int i = 0; i < RoadPoints.Length - 1; i++) { if (i == 5) continue; distance = Mathf.Min(distance, SegmentDistance(point, RoadPoints[i], RoadPoints[i + 1])); }
            distance=Mathf.Min(distance,SegmentDistance(point,new Vector2(15,15),new Vector2(19,15)));
            return distance;
        }
        private static readonly Vector2[] Clearings = { new Vector2(20,23), new Vector2(50,52), new Vector2(65,65), new Vector2(27,20), new Vector2(14,32), new Vector2(53,24), new Vector2(24,53), new Vector2(62,61), new Vector2(19,15), new Vector2(14,28), new Vector2(31,15), new Vector2(26,36), new Vector2(50,25), new Vector2(25,52), new Vector2(60,58), new Vector2(10,36), new Vector2(30,10), new Vector2(50,42), new Vector2(62,32), new Vector2(33,32), new Vector2(54,58) };
        private bool SceneryClearing(Vector2 p)
        {
            if (p.x < 32 && p.y < 12.8f || RoadDistance(p) < 2.3f || Mathf.Abs(p.x - 40) < 3 || Mathf.Abs(p.y - 40) < 3) return true;
            foreach (var at in Clearings) if (Vector2.Distance(p, at) < 3.4f) return true;
            for (int i = 0; i < 12; i++) if (Vector2.Distance(p, new Vector2(8 + i % 4 * 8, 18 + i / 4 * 8)) < 2.7f) return true;
            return false;
        }
        // One deterministic woodland field drives both canopy placement and soil color.
        private float Woodland(Vector2 p) => Mathf.SmoothStep(.36f,.72f,Mathf.PerlinNoise(p.x*.16f+8,p.y*.16f+31));
        private void BuildKingdomEnvironment()
        {
            scenery = new GameObject("Painted realm scenery").transform;
            var ground = GameObject.Find("Ground"); if (ground == null) { ground = GameObject.CreatePrimitive(PrimitiveType.Cube); ground.name = "Ground"; }
            ground.transform.position = new Vector3(40, -0.3f, 40); ground.transform.localScale = new Vector3(80, 0.6f, 80);
            terrainMaterial = new Material(MaterialFor(Color.white)); var material = terrainMaterial; groundTexture = new Texture2D(512, 512, TextureFormat.RGB24, true) { name = "Painted province grass, earth and paths", wrapMode = TextureWrapMode.Clamp, anisoLevel = 4 };
            var pixels = new Color[512 * 512];
            for (int y = 0; y < 512; y++) for (int x = 0; x < 512; x++)
            {
                var p = new Vector2(x / 511f * 80, y / 511f * 80); float patch = Mathf.PerlinNoise(p.x * 0.12f + 43, p.y * 0.12f + 17), grain = Mathf.PerlinNoise(p.x * 2.1f, p.y * 2.1f);
                var south = Color.Lerp(new Color(.35f,.48f,.26f),new Color(.69f,.57f,.32f), Mathf.SmoothStep(0,1,(p.x-34)/30));
                var north = Color.Lerp(new Color(.25f,.39f,.35f),new Color(.47f,.55f,.37f), p.x/80);
                var meadow = Color.Lerp(south, north, Mathf.SmoothStep(0,1,(p.y-34)/22)); float brush=Mathf.PerlinNoise(p.x*.57f+patch*3,p.y*.63f)*.07f;
                meadow *= 0.84f + patch * 0.26f + grain * 0.055f+brush;
                meadow=Color.Lerp(meadow,new Color(.53f,.55f,.31f),Mathf.Clamp01((patch-.62f)*2)*.22f);
                float vein=Mathf.Abs(Mathf.PerlinNoise(p.x*.05f+12,p.y*.08f+21)-.5f);
                meadow=Color.Lerp(meadow,new Color(.34f,.37f,.27f),Mathf.Clamp01((.07f-vein)*5)*.30f);
                float woods=SceneryClearing(p)?0:Woodland(p);
                meadow=Color.Lerp(meadow,new Color(.22f,.32f,.21f),woods*.48f);
                float roadDistance=RoadDistance(p);float road = 1 - Mathf.SmoothStep(0.65f, 1.9f, roadDistance); var earth = Color.Lerp(new Color(0.65f,0.56f,0.36f), new Color(0.81f,0.72f,0.49f), patch);
                float shoulder=Mathf.Clamp01(1-Mathf.Abs(roadDistance-1.45f)*2)*.22f;
                meadow=Color.Lerp(meadow,new Color(.36f,.37f,.25f),shoulder);
                earth*=.96f+Mathf.Sin(roadDistance*6)*.035f;
                pixels[y * 512 + x] = Color.Lerp(meadow, earth, road * 0.86f);
            }
            groundTexture.SetPixels(pixels); groundTexture.Apply(true, true); material.mainTexture = groundTexture; material.SetTexture("_DetailAlbedoMap",Resources.Load<Texture2D>("Art/MeadowDetail"));material.SetTextureScale("_DetailAlbedoMap",new Vector2(34,34));material.EnableKeyword("_DETAIL_MULX2"); ground.GetComponent<Renderer>().enabled=false;BuildRelief(material);
            RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor=new Color(.51f,.60f,.66f);
            RenderSettings.ambientEquatorColor=new Color(.37f,.43f,.38f);
            RenderSettings.ambientGroundColor=new Color(.22f,.23f,.17f); RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogColor = new Color(.32f,.43f,.44f); RenderSettings.fogStartDistance = 105; RenderSettings.fogEndDistance = 185;
            var sun = GameObject.Find("Sun"); if (sun != null) { var light = sun.GetComponent<Light>(); if (light != null) { light.cullingMask &= ~((1 << 30) | (1 << 31)); light.color = new Color(1,0.94f,0.79f); light.intensity = 1.12f; light.shadows = LightShadows.Soft; light.shadowStrength = 0.58f; } }
            QualitySettings.shadowDistance = 110;
            // Opt-in diagnostic only: compare the same view with shadows disabled.
            if(System.Array.IndexOf(System.Environment.GetCommandLineArgs(),"--thrones-no-shadows")>=0)
            {QualitySettings.shadows=ShadowQuality.Disable;Debug.Log("Shadow diagnostic active · "+SystemInfo.graphicsDeviceName+" · "+SystemInfo.graphicsDeviceVersion);}

            var random = new System.Random(431);
            for (int cluster = 0; cluster < 125; cluster++)
            {
                var center = new Vector2(3 + (float)random.NextDouble()*74, 3 + (float)random.NextDouble()*74);
                int density=Mathf.RoundToInt(Mathf.Lerp(1,center.y>44?7:center.x>42?3:6,Woodland(center)));
                for (int tree = 0; tree < density; tree++)
                {
                    var p = center + new Vector2((float)random.NextDouble()*5-2.5f,(float)random.NextDouble()*5-2.5f); if (SceneryClearing(p)||Woodland(p)<.26f) continue;
                    bool pine = p.y > 40; var tint = pine ? new Color(0.24f,0.41f,0.34f) : p.x > 40 ? new Color(0.46f,0.52f,0.28f) : new Color(0.28f,0.48f,0.24f);
                    tint=Color.Lerp(tint,new Color(.56f,.59f,.30f),(cluster%4)/12f);
                    art.EnvironmentModel(scenery, pine ? "PineTree" : "OakTree", new Vector3(p.x,TerrainHeight(p),p.y), 0.75f + (float)random.NextDouble()*0.40f, tint, (float)random.NextDouble()*360);
                }
            }
            for (int i = 4; i < 80; i += 4)
            {
                if (Mathf.Abs(i-20)<5 || Mathf.Abs(i-60)<5) continue;
                art.EnvironmentModel(scenery,"BorderRock",new Vector3(40,0,i),1.4f,new Color(0.48f,0.51f,0.43f),i*17);
                art.EnvironmentModel(scenery,"BorderRock",new Vector3(i,0,40),1.4f,new Color(0.48f,0.51f,0.43f),i*23);
            }
            // Low vegetation punctuates meadows, without filling paths or site clearings.
            for(int i=0;i<480;i++)
            {
                var p=new Vector2(2+(float)random.NextDouble()*76,2+(float)random.NextDouble()*76);
                if(SceneryClearing(p)||p.x>44&&p.y<40)continue;
                art.Meadow(scenery,new Vector3(p.x,TerrainHeight(p),p.y),i,.75f+(i%3)*.15f,Color.Lerp(new Color(.33f,.45f,.23f),new Color(.58f,.57f,.30f),(i%4)/4f));
            }
            BuildRealmDressing();
            art.BatchEnvironment(scenery);
        }
    }
}
