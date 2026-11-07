using System;
using UnityEngine;

namespace ThronesOfMyth
{
    // An isolated live model viewer. Pose buttons are previews, never game commands.
    public sealed class CommanderPreview : IDisposable
    {
        private readonly WorldArtFactory art = new WorldArtFactory();
        private readonly GameObject stage;
        private readonly Camera camera;
        private readonly RenderTexture texture;
        private WorldActorAnimation actor;
        private string heroId;
        private float renderedAt = -1;
        public CommanderPreview()
        {
            stage = new GameObject("Commander preview stage") { hideFlags = HideFlags.HideAndDontSave };
            stage.transform.position = new Vector3(3000, 0, 3000);
            var cameraObject = new GameObject("Portrait camera"); cameraObject.transform.SetParent(stage.transform, false);
            camera = cameraObject.AddComponent<Camera>(); camera.enabled = false; camera.cullingMask = 1 << 31;
            camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color(0.025f, 0.055f, 0.075f, 0);
            camera.orthographic = true; camera.orthographicSize = 1.85f; camera.nearClipPlane = 0.1f; camera.farClipPlane = 15;
            camera.transform.localPosition = new Vector3(3, 2.7f, 5);
            camera.transform.LookAt(stage.transform.position + new Vector3(0, 1.5f, 0.8f));
            texture = new RenderTexture(256, 320, 16, RenderTextureFormat.ARGB32) { name = "Live commander portrait", hideFlags = HideFlags.HideAndDontSave };
            texture.Create(); camera.targetTexture = texture;
            var lightObject = new GameObject("Portrait light"); lightObject.transform.SetParent(stage.transform, false);
            var light = lightObject.AddComponent<Light>(); light.type = LightType.Directional; light.cullingMask = 1 << 31; light.intensity = 1.1f; light.color = new Color(1, 0.9f, 0.76f);
            lightObject.transform.localRotation = Quaternion.Euler(35, -35, 0);
        }
        private static void Layer(Transform root)
        {
            root.gameObject.layer = 31; foreach (Transform child in root) Layer(child);
        }
        public void SetVisible(bool visible) { if (stage.activeSelf != visible) stage.SetActive(visible); }
        public void Draw(Rect rect, CommanderData hero, MythInterfaceTheme theme, bool reducedMotion)
        {
            SetVisible(true);
            if (heroId != hero.id)
            {
                if (actor != null) { actor.gameObject.SetActive(false); UnityEngine.Object.Destroy(actor.gameObject); }
                actor = art.Build(stage.transform, "army", "greek", MythInterfaceTheme.Gold, 0, new UnitCounts(), hero.id);
                Layer(actor.transform); heroId = hero.id; renderedAt = -1;
            }
            actor.reducedMotion = reducedMotion;
            theme.Panel(rect, true);
            if (Event.current.type == EventType.Repaint && (renderedAt < 0 || Time.unscaledTime - renderedAt >= 1 / 30f))
            { camera.Render(); renderedAt = Time.unscaledTime; }
            GUI.DrawTexture(new Rect(rect.x + 4, rect.y + 3, rect.width - 8, rect.height - 65), texture, ScaleMode.ScaleToFit, true);
            string[] poses={"Idle","March","Attack","Skill","Retreat","Victory"};float width=(rect.width-16)/3;
            for(int i=0;i<poses.Length;i++)if(theme.Button(new Rect(rect.x+4+i%3*(width+4),rect.yMax-60+i/3*29,width,26),poses[i]))
            { if(poses[i]=="Skill"){actor.previewWalking=false;actor.PreviewSkill(hero.skillKind);}else actor.PreviewPose(poses[i]); }
        }
        public void Dispose()
        {
            camera.targetTexture = null; texture.Release(); UnityEngine.Object.Destroy(texture);
            UnityEngine.Object.Destroy(stage); art.Dispose();
        }
    }
}
