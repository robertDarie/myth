using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    // Original layered PCM cues with generated fallbacks, shared and rate-limited.
    public sealed class BattlefieldAudio : MonoBehaviour
    {
        private static BattlefieldAudio current;
        private AudioSource source;
        private float volume;
        private int variation;
        private float nextVoice;
        private readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        private readonly Dictionary<string, float> nextCue = new Dictionary<string, float>();
        public static float Volume
        {
            get => current != null ? current.volume : PlayerPrefs.GetFloat("ThronesOfMyth.effectsVolume", 0.35f);
            set { float level = Mathf.Clamp01(value); PlayerPrefs.SetFloat("ThronesOfMyth.effectsVolume", level); if (current != null) { current.volume = level; current.source.volume = level; } }
        }
        private void Awake()
        {
            volume = PlayerPrefs.GetFloat("ThronesOfMyth.effectsVolume", 0.35f); current = this; source = gameObject.AddComponent<AudioSource>(); source.playOnAwake = false; source.spatialBlend = 0; source.volume = volume;
            if (Camera.main != null && FindFirstObjectByType<AudioListener>() == null) Camera.main.gameObject.AddComponent<AudioListener>();
            foreach (var id in new[] { "step", "hoof", "strike", "impact", "arrow", "skill", "retreat", "victory", "select", "confirm", "arrival", "reward", "rally-charge", "rally-release", "heal-cast", "volley-cast", "cleave-cast" })
            {
                string name=id=="step"?"Footstep":id=="hoof"?"HorseHoof":id=="arrow"?"BowRelease":id=="strike"||id=="impact"?"MetalImpact":id=="skill"?"DivineCast":id=="rally-charge"?"RallyCharge":id=="rally-release"?"RallyRelease":id=="heal-cast"?"RenewalChime":id=="volley-cast"?"HuntressFlight":id=="cleave-cast"?"CrescentImpact":null;
                var clip=name==null?null:Resources.Load<AudioClip>("Audio/"+name);clips.Add(id,clip!=null?clip:Make(id));
            }
        }
        private AudioClip Make(string id)
        {
            const int rate = 22050; float duration = id == "skill" || id == "victory" || id=="reward" ? 0.45f : id == "retreat" ? 0.35f : 0.14f;
            var samples = new float[Mathf.CeilToInt(rate * duration)]; var random = new System.Random(47);
            for (int i = 0; i < samples.Length; i++)
            {
                float t = i / (float)rate, f = t / duration, envelope = Mathf.Sin(Mathf.PI * 0.5f * Mathf.Clamp01(f * 12)) * Mathf.Exp(-f * 5);
                float tone = id == "step" ? Mathf.Sin(t * 2 * Mathf.PI * 85) : id == "strike" ? Mathf.Sin(t * 2 * Mathf.PI * 210) * 0.6f + ((float)random.NextDouble() * 2 - 1) * 0.4f
                    : id == "arrow" ? ((float)random.NextDouble() * 2 - 1) * (1 - f) : id == "retreat" ? Mathf.Sin(2 * Mathf.PI * (240 * t - 100 * t * t))
                    : Mathf.Sin(t * 2 * Mathf.PI * 330) * 0.5f + Mathf.Sin(t * 2 * Mathf.PI * (id == "victory" ? 495 : 660)) * 0.3f;
                if(id=="select")tone=Mathf.Sin(t*2*Mathf.PI*660)*.4f;
                if(id=="arrival"||id=="confirm")tone=Mathf.Sin(t*2*Mathf.PI*(id=="arrival"?392:523))*.4f;
                if(id=="reward")tone=Mathf.Sin(t*2*Mathf.PI*(f<.33f?440:f<.66f?550:660))*.5f;
                samples[i] = tone * envelope * 0.25f;
            }
            var clip = AudioClip.Create("Myth " + id, samples.Length, 1, rate, false); clip.SetData(samples, 0); return clip;
        }
        public static void UiCue(string id)
        {
            var camera=Camera.main;
            if(camera!=null&&CameraFootprint.GroundPoint(camera,new Vector2(.5f,.5f),out var point))Cue(id,point);
        }
        public static void Cue(string id, Vector3 point)
        {
            if (current == null || current.volume <= 0 || !current.clips.TryGetValue(id, out var clip) || Camera.main == null) return;
            var view = Camera.main.WorldToViewportPoint(point);
            if (view.z <= 0 || view.x < 0 || view.x > 1 || view.y < 0 || view.y > 1) return;
            bool important=id.EndsWith("-cast")||id=="rally-charge"||id=="rally-release"||id=="skill"||id=="victory"||id=="retreat"||id=="reward";
            if(!important&&Time.unscaledTime<current.nextVoice)return;
            if (current.nextCue.TryGetValue(id, out float next) && Time.unscaledTime < next) return;
            current.nextVoice=Time.unscaledTime+.045f;
            current.nextCue[id] = Time.unscaledTime + (id=="step"||important?.25f:.12f);
            current.source.panStereo = Mathf.Clamp((view.x - 0.5f) * 1.2f, -0.6f, 0.6f);
            current.source.pitch=1+(current.variation++%5-2)*.025f;
            current.source.PlayOneShot(clip, id == "step" || id == "hoof" ? 0.3f : id=="select"||id=="confirm"||id=="arrival"?.35f:id == "impact" ? 0.5f : 1);
        }
        private void OnDestroy() { if (current == this) current = null; foreach (var clip in clips.Values) if(clip.name.StartsWith("Myth ")) Destroy(clip); }
    }
}
