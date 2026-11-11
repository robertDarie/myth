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
            camera.fieldOfView = 24f;
            camera.nearClipPlane = 0.05f;
            camera.farClipPlane = 20f;
            camera.allowHDR = false;
            texture = new RenderTexture(900, 1200, 24, RenderTextureFormat.ARGB32) { name = "Frontier Captain presentation", hideFlags = HideFlags.HideAndDontSave, antiAliasing = 2 };
            texture.Create();
            camera.targetTexture = texture;
            var main = Camera.main;
            if (main != null) main.cullingMask &= ~(1 << Layer);

            AddLight("Key", new Color(1f, 0.9f, 0.74f), 1.45f, new Vector3(28f, -36f, 0f), true);
            AddLight("Fill", new Color(0.62f, 0.74f, 0.9f), 0.38f, new Vector3(12f, 140f, 0f), false);
            AddLight("Rim", new Color(0.95f, 0.78f, 0.48f), 0.85f, new Vector3(18f, 168f, 0f), false);
            var floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.name = "Frontier Captain floor";
            floor.transform.SetParent(stage.transform, false);
            floor.transform.localPosition = new Vector3(0f, -0.012f, 0f);
            floor.transform.localScale = new Vector3(0.28f, 1f, 0.28f);
            floor.layer = Layer;
            var floorMaterial = new Material(Shader.Find("Standard"));
            floorMaterial.color = new Color(0.11f, 0.09f, 0.07f);
            floorMaterial.SetFloat("_Glossiness", 0.12f);
            floorMaterial.SetFloat("_Metallic", 0.15f);
            floor.GetComponent<MeshRenderer>().sharedMaterial = floorMaterial;
            UnityEngine.Object.Destroy(floor.GetComponent<Collider>());
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
            camera.transform.localPosition = new Vector3(0f, 1.08f, 4.55f);
            camera.transform.LookAt(stage.transform.position + new Vector3(0f, 0.98f, 0f));
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

        private static void Dress(Transform root)
        {
            var albedo = Resources.Load<Texture2D>("Commanders/FrontierCaptain/FrontierCaptain_Albedo");
            var normal = Resources.Load<Texture2D>("Commanders/FrontierCaptain/FrontierCaptain_Normal");
            var metal = Resources.Load<Texture2D>("Commanders/FrontierCaptain/FrontierCaptain_MetallicSmoothness");
            var material = new Material(Shader.Find("Standard"));
            material.SetTexture("_MainTex", albedo);
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
                material.SetFloat("_GlossMapScale", 1f);
            }
            foreach (var renderer in root.GetComponentsInChildren<Renderer>()) renderer.sharedMaterial = material;
        }

        private static void SetLayer(Transform root)
        {
            root.gameObject.layer = Layer;
            foreach (Transform child in root) SetLayer(child);
        }
    }
}
