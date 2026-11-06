using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    // Animation only changes artwork children. Navigation and combat remain server-authoritative.
    public sealed class WorldActorAnimation : MonoBehaviour
    {
        public Transform artwork, banner, fire;
        public GameObject selection, skill, shield;
        public readonly List<Transform> legs = new List<Transform>(), weapons = new List<Transform>();
        public readonly List<GameObject> soldiers = new List<GameObject>();
        private Vector3 lastPosition;
        private bool gathering;
        private bool initialized;
        private int lastHealth, lastCasts, lastAttack;
        private float attackUntil, castUntil, captionUntil, phase;
        private string caption;
        private Color captionColor;
        public bool reducedMotion;
        private void Start() { lastPosition = transform.parent.position; phase = Mathf.Abs(transform.parent.position.x * 1.7f + transform.parent.position.z); }
        public void Observe(ArmyData army)
        {
            gathering = army.state == "Gathering";
            if (shield != null) shield.SetActive(army.shield > 0);
            if (initialized)
            {
                if (army.attackSequence > lastAttack) attackUntil = Time.unscaledTime + 0.38f;
                if (army.skillCasts > lastCasts)
                {
                    castUntil = Time.unscaledTime + 0.9f; caption = army.lastSkill; captionColor = new Color(0.65f, 0.9f, 1);
                    captionUntil = Time.unscaledTime + 1.5f;
                }
                else if (army.health != lastHealth)
                {
                    int delta = army.health - lastHealth; caption = delta > 0 ? "+" + delta : delta.ToString();
                    captionColor = delta > 0 ? new Color(0.55f, 1, 0.7f) : new Color(1, 0.65f, 0.5f); captionUntil = Time.unscaledTime + 0.85f;
                }
            }
            initialized = true; lastHealth = army.health; lastCasts = army.skillCasts; lastAttack = army.attackSequence;
        }
        public void SetWideView(bool wide)
        {
            for (int i = 0; i < soldiers.Count; i++) { bool show = !wide || i == 1; if (soldiers[i].activeSelf != show) soldiers[i].SetActive(show); }
        }
        public void SetSelected(bool chosen) { if (selection != null) selection.SetActive(chosen); }
        private void LateUpdate()
        {
            Vector3 position = transform.parent.position, movement = position - lastPosition; lastPosition = position;
            bool walking = movement.sqrMagnitude > 0.000003f;
            if (walking) transform.localRotation = Quaternion.Slerp(transform.localRotation, Quaternion.LookRotation(movement), 1 - Mathf.Exp(-12 * Time.deltaTime));
            phase += Time.deltaTime * (walking ? 10 : 2);
            float stride = !reducedMotion && walking ? Mathf.Sin(phase) * 27 : 0;
            for (int i = 0; i < legs.Count; i++) legs[i].localRotation = Quaternion.Euler(stride * (i % 2 == 0 ? 1 : -1), 0, 0);
            float strike = !reducedMotion && Time.unscaledTime < attackUntil ? Mathf.Sin((attackUntil - Time.unscaledTime) / 0.38f * Mathf.PI) * 65 : 0;
            foreach (var weapon in weapons) weapon.localRotation = Quaternion.Euler(-strike + (!reducedMotion && gathering ? Mathf.Sin(phase * 2) * 20 : 0), 0, 0);
            if (banner != null) banner.localRotation = Quaternion.Euler(0, reducedMotion ? 0 : Mathf.Sin(phase) * 12, 0);
            if (fire != null) fire.localScale = new Vector3(0.4f, reducedMotion ? 0.6f : 0.6f + Mathf.Sin(phase * 3) * 0.08f, 0.4f);
            if (skill != null)
            {
                bool active = Time.unscaledTime < castUntil; skill.SetActive(active);
                skill.transform.localScale = Vector3.one * (reducedMotion ? 1 : 1 + Mathf.Clamp01(1 - (castUntil - Time.unscaledTime) / 0.9f) * 0.6f);
            }
        }
        public void DrawCaption(Camera camera, float scale, System.Func<Vector2, bool> occluded)
        {
            if (string.IsNullOrEmpty(caption) || Time.unscaledTime >= captionUntil) return;
            var point = camera.WorldToScreenPoint(transform.parent.position + Vector3.up * 4.5f);
            var xy = new Vector2(point.x, Screen.height - point.y);
            if (point.z <= 0 || (occluded != null && occluded(xy))) return;
            if (!reducedMotion) xy.y -= (1 - Mathf.Clamp01(captionUntil - Time.unscaledTime)) * 20 * scale;
            var before = GUI.color; GUI.color = captionColor;
            GUI.Label(new Rect(xy.x - 130 * scale, xy.y, 260 * scale, 30 * scale), caption, new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontSize = Mathf.RoundToInt(13 * scale), fontStyle = FontStyle.Bold });
            GUI.color = before;
        }
    }
}
