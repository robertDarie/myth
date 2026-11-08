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
            return distance;
        }
        private bool SceneryClearing(Vector2 p)
        {
            if (p.x < 32 && p.y < 16 || RoadDistance(p) < 2.3f || Mathf.Abs(p.x - 40) < 3 || Mathf.Abs(p.y - 40) < 3) return true;
            var clearings = new[] { new Vector2(20,23), new Vector2(50,52), new Vector2(65,65), new Vector2(27,20), new Vector2(14,32), new Vector2(53,24), new Vector2(24,53), new Vector2(62,61), new Vector2(19,15), new Vector2(14,28), new Vector2(31,15), new Vector2(26,36), new Vector2(50,25), new Vector2(25,52), new Vector2(60,58), new Vector2(10,36), new Vector2(30,10), new Vector2(50,42), new Vector2(62,32), new Vector2(33,32), new Vector2(54,58) };
            foreach (var at in clearings) if (Vector2.Distance(p, at) < 3.4f) return true;
            for (int i = 0; i < 12; i++) if (Vector2.Distance(p, new Vector2(8 + i % 4 * 8, 18 + i / 4 * 8)) < 2.7f) return true;
            return false;
        }
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
                var meadow = Color.Lerp(south, north, Mathf.SmoothStep(0,1,(p.y-34)/22)); meadow *= 0.86f + patch * 0.24f + grain * 0.055f;
                float vein=Mathf.Abs(Mathf.PerlinNoise(p.x*.05f+12,p.y*.08f+21)-.5f);
                meadow=Color.Lerp(meadow,new Color(.34f,.37f,.27f),Mathf.Clamp01((.07f-vein)*5)*.30f);
                float road = 1 - Mathf.SmoothStep(0.65f, 1.9f, RoadDistance(p)); var earth = Color.Lerp(new Color(0.65f,0.56f,0.36f), new Color(0.81f,0.72f,0.49f), patch);
                pixels[y * 512 + x] = Color.Lerp(meadow, earth, road * 0.86f);
            }
            groundTexture.SetPixels(pixels); groundTexture.Apply(true, true); material.mainTexture = groundTexture; ground.GetComponent<Renderer>().enabled=false;BuildRelief(material);
            RenderSettings.ambientLight = new Color(.53f,.59f,.57f); RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogColor = new Color(.32f,.43f,.44f); RenderSettings.fogStartDistance = 105; RenderSettings.fogEndDistance = 185;
            var sun = GameObject.Find("Sun"); if (sun != null) { var light = sun.GetComponent<Light>(); if (light != null) { light.cullingMask &= ~((1 << 30) | (1 << 31)); light.color = new Color(1,0.94f,0.79f); light.intensity = 1.15f; light.shadows = LightShadows.Soft; light.shadowStrength = 0.5f; } }
            QualitySettings.shadowDistance = 110;
            var random = new System.Random(431);
            for (int cluster = 0; cluster < 85; cluster++)
            {
                var center = new Vector2(3 + (float)random.NextDouble()*74, 3 + (float)random.NextDouble()*74);
                for (int tree = 0; tree < 4; tree++)
                {
                    var p = center + new Vector2((float)random.NextDouble()*5-2.5f,(float)random.NextDouble()*5-2.5f); if (SceneryClearing(p)) continue;
                    bool pine = p.y > 40; var tint = pine ? new Color(0.24f,0.41f,0.34f) : p.x > 40 ? new Color(0.46f,0.52f,0.28f) : new Color(0.28f,0.48f,0.24f);
                    art.EnvironmentModel(scenery, pine ? "PineTree" : "OakTree", new Vector3(p.x,TerrainHeight(p),p.y), 0.75f + (float)random.NextDouble()*0.40f, tint, (float)random.NextDouble()*360);
                }
            }
            for (int i = 4; i < 80; i += 4)
            {
                if (Mathf.Abs(i-20)<5 || Mathf.Abs(i-60)<5) continue;
                art.EnvironmentModel(scenery,"BorderRock",new Vector3(40,0,i),1.4f,new Color(0.48f,0.51f,0.43f),i*17);
                art.EnvironmentModel(scenery,"BorderRock",new Vector3(i,0,40),1.4f,new Color(0.48f,0.51f,0.43f),i*23);
            }
            BuildRealmDressing();
            art.BatchEnvironment(scenery);
        }
    }
}
