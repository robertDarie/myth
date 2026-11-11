using UnityEngine;

namespace ThronesOfMyth
{
    // The Frontier Captain's skeletal presentation. Pose buttons are inspection only.
    public sealed class CaptainPresentation : System.IDisposable
    {
        private const int Layer = 30;
        private readonly GameObject stage;
        private readonly Camera camera;
        private readonly RenderTexture texture;
        private readonly Animator animator;
        private readonly Transform figure;
        private float yaw;
        private string pose = "Idle";
        private float renderedAt = -1;
        private bool reviewLock;
        private float reviewYaw, reviewTime;
        private string reviewPose = "Idle";

        public static bool Available => Resources.Load<GameObject>("Commanders/FrontierCaptain/FrontierCaptainPresentation") != null;

        public CaptainPresentation()
        {
            var source = Resources.Load<GameObject>("Commanders/FrontierCaptain/FrontierCaptainPresentation");
            stage = new GameObject("Frontier Captain stage") { hideFlags = HideFlags.HideAndDontSave };
            stage.transform.position = new Vector3(4200f, 0f, 4200f);
            figure = UnityEngine.Object.Instantiate(source, stage.transform).transform;
            figure.localPosition = Vector3.zero;
            figure.localRotation = Quaternion.identity;
            figure.localScale = Vector3.one;
            Dress(figure);
            SetLayer(figure);
            animator = figure.GetComponentInChildren<Animator>();
            if (animator == null) animator = figure.gameObject.AddComponent<Animator>();
            var controller = Resources.Load<RuntimeAnimatorController>("Commanders/FrontierCaptain/FrontierCaptain");
            if (controller != null) animator.runtimeAnimatorController = controller;
            var avatar = Resources.Load<Avatar>("Commanders/FrontierCaptain/FrontierCaptainPresentation");
            if (avatar == null)
            {
                var assets = Resources.LoadAll<Avatar>("Commanders/FrontierCaptain");
                if (assets.Length > 0) avatar = assets[0];
            }
            if (avatar != null) animator.avatar = avatar;
            animator.applyRootMotion = false;
            animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            foreach (var skin in figure.GetComponentsInChildren<SkinnedMeshRenderer>()) skin.updateWhenOffscreen = true;

            var cameraObject = new GameObject("Frontier Captain camera");
            cameraObject.transform.SetParent(stage.transform, false);
            camera = cameraObject.AddComponent<Camera>();
            camera.enabled = false;
            camera.cullingMask = 1 << Layer;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.045f, 0.07f, 0.11f, 1f);
            camera.fieldOfView = 27f;
            camera.transform.localPosition = new Vector3(0f, 1.15f, 5.15f);
            camera.transform.LookAt(stage.transform.position + new Vector3(0f, 1.05f, 0f));
            camera.nearClipPlane = 0.05f;
            camera.farClipPlane = 20f;
            camera.allowHDR = false;
            texture = new RenderTexture(900, 1200, 24, RenderTextureFormat.ARGB32) { name = "Frontier Captain presentation", hideFlags = HideFlags.HideAndDontSave, antiAliasing = 2 };
            texture.Create();
            camera.targetTexture = texture;
            var main = Camera.main;
            if (main != null) main.cullingMask &= ~(1 << Layer);

            AddLight("Key", new Color(1f, 0.86f, 0.68f), 1.55f, new Vector3(32f, -42f, 0f), true);
            AddLight("Fill", new Color(0.55f, 0.68f, 0.86f), 0.32f, new Vector3(8f, 128f, 0f), false);
            AddLight("Rim", new Color(1f, 0.72f, 0.38f), 1.05f, new Vector3(16f, 164f, 0f), false);
            var plinth = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            plinth.name = "Frontier Captain plinth";
            plinth.transform.SetParent(stage.transform, false);
            plinth.transform.localPosition = new Vector3(0f, -0.08f, 0f);
            plinth.transform.localScale = new Vector3(1.55f, 0.08f, 1.55f);
            plinth.layer = Layer;
            var stone = new Material(Shader.Find("Standard"));
            stone.color = new Color(0.42f, 0.38f, 0.32f);
            stone.SetFloat("_Glossiness", 0.18f);
            stone.SetFloat("_Metallic", 0.04f);
            plinth.GetComponent<MeshRenderer>().sharedMaterial = stone;
            UnityEngine.Object.Destroy(plinth.GetComponent<Collider>());
            var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ring.name = "Frontier Captain bronze ring";
            ring.transform.SetParent(stage.transform, false);
            ring.transform.localPosition = new Vector3(0f, 0.012f, 0f);
            ring.transform.localScale = new Vector3(1.15f, 0.012f, 1.15f);
            ring.layer = Layer;
            var bronze = new Material(Shader.Find("Standard"));
            bronze.color = new Color(0.62f, 0.42f, 0.16f);
            bronze.SetFloat("_Glossiness", 0.55f);
            bronze.SetFloat("_Metallic", 0.72f);
            ring.GetComponent<MeshRenderer>().sharedMaterial = bronze;
            UnityEngine.Object.Destroy(ring.GetComponent<Collider>());
        }

        public void LockReview(float yawDegrees, string clip, float normalizedTime)
        {
            reviewLock = true;
            reviewYaw = yawDegrees;
            reviewPose = string.IsNullOrEmpty(clip) ? "Idle" : clip;
            reviewTime = normalizedTime;
        }

        public void Draw(Rect rect, MythInterfaceTheme theme, bool reducedMotion)
        {
            float shownYaw = reviewLock ? reviewYaw : yaw;
            figure.localRotation = Quaternion.Euler(0f, shownYaw, 0f);
            camera.transform.localPosition = new Vector3(0f, 1.16f, 5.2f);
            camera.transform.LookAt(stage.transform.position + new Vector3(0f, 1.08f, 0f));
            if (animator != null)
            {
                if (reviewLock)
                {
                    animator.speed = 0f;
                    animator.Play(reviewPose, 0, Mathf.Repeat(reviewTime, 1f));
                    animator.Update(0f);
                }
                else animator.speed = reducedMotion ? 0f : 1f;
            }
            var view = new Rect(rect.x, rect.y, rect.width, rect.height - 34f);
            if (Event.current.type == EventType.Repaint && (renderedAt < 0f || Time.unscaledTime - renderedAt >= 1f / 30f))
            {
                camera.Render();
                renderedAt = Time.unscaledTime;
            }
            GUI.DrawTexture(view, texture, ScaleMode.ScaleToFit, false);
            if (!reviewLock && Event.current.type == EventType.MouseDrag && Event.current.button == 0 && view.Contains(Event.current.mousePosition))
            {
                yaw += Event.current.delta.x * 0.45f;
                Event.current.Use();
            }
            string[] labels = { "Idle", "Ready", "Strike", "Victory" };
            string[] clips = { "Idle", "Ready", "Attack", "Victory" };
            float width = (rect.width - 12f) / labels.Length;
            for (int i = 0; i < labels.Length; i++)
            {
                if (theme.Button(new Rect(rect.x + i * (width + 4f), rect.yMax - 30f, width, 26f), labels[i]) && !reviewLock)
                {
                    pose = clips[i];
                    if (animator != null) animator.CrossFade(pose, 0.18f, 0);
                }
            }
        }

        public void Dispose()
        {
            camera.targetTexture = null;
            texture.Release();
            UnityEngine.Object.Destroy(texture);
            UnityEngine.Object.Destroy(stage);
        }

        private void AddLight(string name, Color color, float intensity, Vector3 euler, bool shadows)
        {
            var lightObject = new GameObject(name);
            lightObject.transform.SetParent(stage.transform, false);
            lightObject.transform.localRotation = Quaternion.Euler(euler);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = color;
            light.intensity = intensity;
            light.cullingMask = 1 << Layer;
            light.shadows = shadows ? LightShadows.Soft : LightShadows.None;
            light.shadowStrength = 0.62f;
            light.shadowBias = 0.035f;
            lightObject.layer = Layer;
        }

        private static Material Gear(string prefix, float gloss)
        {
            var material = new Material(Shader.Find("Standard"));
            material.SetTexture("_MainTex", Resources.Load<Texture2D>("Commanders/FrontierCaptain/" + prefix + "_Albedo"));
            var normal = Resources.Load<Texture2D>("Commanders/FrontierCaptain/" + prefix + "_Normal");
            var metal = Resources.Load<Texture2D>("Commanders/FrontierCaptain/" + prefix + "_MetallicSmoothness");
            if (normal != null)
            {
                material.SetTexture("_BumpMap", normal);
                material.EnableKeyword("_NORMALMAP");
            }
            if (metal != null)
            {
                material.SetTexture("_MetallicGlossMap", metal);
                material.EnableKeyword("_METALLICGLOSSMAP");
                material.SetFloat("_Metallic", 1f);
                material.SetFloat("_GlossMapScale", gloss);
            }
            return material;
        }

        private static void Dress(Transform root)
        {
            var body = Gear("FrontierCaptain", 1f);
            var shield = Gear("SuncrestAegis", 1f);
            var spear = Gear("SunforgedSpear", 1f);
            foreach (var renderer in root.GetComponentsInChildren<Renderer>())
            {
                string name = renderer.gameObject.name;
                if (name.IndexOf("Aegis", System.StringComparison.OrdinalIgnoreCase) >= 0) renderer.sharedMaterial = shield;
                else if (name.IndexOf("Spear", System.StringComparison.OrdinalIgnoreCase) >= 0) renderer.sharedMaterial = spear;
                else renderer.sharedMaterial = body;
            }
        }

        private static void SetLayer(Transform root)
        {
            root.gameObject.layer = Layer;
            foreach (Transform child in root) SetLayer(child);
        }
    }
}
