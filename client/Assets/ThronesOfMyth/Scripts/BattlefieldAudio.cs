using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    // Original synthesized placeholder cues, shared and rate-limited across the visible field.
    public sealed class BattlefieldAudio : MonoBehaviour
    {
        private static BattlefieldAudio current;
        private AudioSource source;
        private float volume;
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
            foreach (var id in new[] { "step", "strike", "arrow", "skill", "retreat", "victory" }) clips.Add(id, Make(id));
        }
        private AudioClip Make(string id)
        {
            const int rate = 22050; float duration = id == "skill" || id == "victory" ? 0.45f : id == "retreat" ? 0.35f : 0.14f;
            var samples = new float[Mathf.CeilToInt(rate * duration)]; var random = new System.Random(47);
            for (int i = 0; i < samples.Length; i++)
            {
                float t = i / (float)rate, f = t / duration, envelope = Mathf.Sin(Mathf.PI * 0.5f * Mathf.Clamp01(f * 12)) * Mathf.Exp(-f * 5);
                float tone = id == "step" ? Mathf.Sin(t * 2 * Mathf.PI * 85) : id == "strike" ? Mathf.Sin(t * 2 * Mathf.PI * 210) * 0.6f + ((float)random.NextDouble() * 2 - 1) * 0.4f
                    : id == "arrow" ? ((float)random.NextDouble() * 2 - 1) * (1 - f) : id == "retreat" ? Mathf.Sin(2 * Mathf.PI * (240 * t - 100 * t * t))
                    : Mathf.Sin(t * 2 * Mathf.PI * 330) * 0.5f + Mathf.Sin(t * 2 * Mathf.PI * (id == "victory" ? 495 : 660)) * 0.3f;
                samples[i] = tone * envelope * 0.25f;
            }
            var clip = AudioClip.Create("Myth " + id, samples.Length, 1, rate, false); clip.SetData(samples, 0); return clip;
        }
        public static void Cue(string id, Vector3 point)
        {
            if (current == null || current.volume <= 0 || !current.clips.TryGetValue(id, out var clip) || Camera.main == null) return;
            var view = Camera.main.WorldToViewportPoint(point);
            if (view.z <= 0 || view.x < 0 || view.x > 1 || view.y < 0 || view.y > 1) return;
            if (current.nextCue.TryGetValue(id, out float next) && Time.unscaledTime < next) return;
            current.nextCue[id] = Time.unscaledTime + (id == "step" ? 0.25f : 0.12f);
            current.source.panStereo = Mathf.Clamp((view.x - 0.5f) * 1.2f, -0.6f, 0.6f);
            current.source.PlayOneShot(clip, id == "step" ? 0.3f : 1);
        }
        private void OnDestroy() { if (current == this) current = null; foreach (var clip in clips.Values) Destroy(clip); }
    }
}
