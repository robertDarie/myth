using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed class WorldActorAnimation : MonoBehaviour
    {
        public sealed class Rig
        {
            public Transform root, body, leftLeg, rightLeg, weapon, offhand, cloak;
            public readonly List<Transform> horseLegs = new List<Transform>(), wings = new List<Transform>();
            public readonly List<Quaternion> wingRest = new List<Quaternion>();
            public Vector3 bodyRest;
            public bool ranged, mounted, commander;
        }
        public Transform artwork, banner, fire, projectile;
        public GameObject selection, skill, shield;
        public readonly List<Rig> rigs = new List<Rig>();
        public readonly List<GameObject> soldiers = new List<GameObject>();
        private Vector3 lastPosition, targetPosition, attackTarget;
        public LineRenderer skillLine;
        public Material healMaterial, shieldMaterial, damageMaterial;
        public bool previewWalking;
        private bool gathering, hasTarget, initialized, rangedAttack;
        private int lastHealth, lastCasts, lastAttack;
        private float attackUntil, castUntil, captionUntil, phase;
        private string caption, skillKind;
        private Color captionColor;
        public bool reducedMotion;
        private void Start() { lastPosition = transform.parent.position; phase = Mathf.Abs(transform.parent.position.x * 1.7f + transform.parent.position.z); }
        public void Observe(ArmyData army)
        {
            gathering = army.state == "Gathering"; hasTarget = army.hasOrder;
            targetPosition = new Vector3(army.targetX, 0, army.targetZ); skillKind = army.skillKind;
            rangedAttack = army.units != null && army.units.archers > 0;
            if (shield != null) shield.SetActive(army.shield > 0);
            if (initialized)
            {
                if (army.attackSequence > lastAttack) { attackUntil = Time.unscaledTime + 0.45f; attackTarget = new Vector3(army.attackX, 0, army.attackZ); }
                if (army.skillCasts > lastCasts)
                {
                    castUntil = Time.unscaledTime + 0.9f; caption = army.lastSkill;
                    captionColor = skillKind == "heal" ? new Color(0.5f, 1, 0.72f) : skillKind == "shield" ? new Color(0.65f, 0.9f, 1) : new Color(1, 0.8f, 0.35f);
                    captionUntil = Time.unscaledTime + 1.5f;
                }
                else if (army.health != lastHealth)
                {
                    int delta = army.health - lastHealth; caption = delta > 0 ? "+" + delta : delta.ToString();
                    captionColor = delta > 0 ? new Color(0.55f, 1, 0.7f) : new Color(1, 0.65f, 0.5f); captionUntil = Time.unscaledTime + 0.85f;
                }
            }
            if (skillLine != null) skillLine.sharedMaterial = skillKind == "heal" ? healMaterial : skillKind == "shield" ? shieldMaterial : damageMaterial;
            initialized = true; lastHealth = army.health; lastCasts = army.skillCasts; lastAttack = army.attackSequence;
        }
        public void RebaseMotion() { lastPosition = transform.parent.position; }
        public void PreviewSkill(string kind)
        {
            skillKind = kind; castUntil = Time.unscaledTime + 0.9f;
            if (skillLine != null) skillLine.sharedMaterial = kind == "heal" ? healMaterial : kind == "shield" ? shieldMaterial : damageMaterial;
        }
        public void SetWideView(bool wide)
        {
            for (int i = 0; i < soldiers.Count; i++)
            {
                bool show = !wide || i == 0;
                if (soldiers[i].activeSelf != show) soldiers[i].SetActive(show);
            }
        }
        public void SetSelected(bool chosen) { if (selection != null) selection.SetActive(chosen); }
        private void LateUpdate()
        {
            Vector3 position = transform.parent.position, movement = position - lastPosition; lastPosition = position;
            // A defeat return is a server teleport, never a sprint across the map.
            bool walking = previewWalking || (movement.sqrMagnitude > 0.000003f && movement.sqrMagnitude < 9);
            Vector3 facing = walking ? movement : hasTarget ? targetPosition - position : Vector3.zero; facing.y = 0;
            if (facing.sqrMagnitude > 0.001f) transform.localRotation = Quaternion.Slerp(transform.localRotation, Quaternion.LookRotation(facing), 1 - Mathf.Exp(-12 * Time.deltaTime));
            phase += Time.deltaTime * (walking ? 10 : 2);
            float attack = !reducedMotion && Time.unscaledTime < attackUntil ? Mathf.Sin((attackUntil - Time.unscaledTime) / 0.45f * Mathf.PI) : 0;
            float cast = !reducedMotion && Time.unscaledTime < castUntil ? Mathf.Sin((castUntil - Time.unscaledTime) / 0.9f * Mathf.PI) : 0;
            attack *= 1 - cast;
            for (int i = 0; i < rigs.Count; i++)
            {
                var rig = rigs[i]; if (!rig.root.gameObject.activeInHierarchy) continue;
                float cycle = phase + i * 0.7f;
                float stride = !reducedMotion && walking ? Mathf.Sin(cycle) * (rig.mounted ? 8 : 30) : 0;
                if (rig.leftLeg != null) rig.leftLeg.localRotation = Quaternion.Euler(stride, 0, rig.mounted ? -12 : 0);
                if (rig.rightLeg != null) rig.rightLeg.localRotation = Quaternion.Euler(-stride, 0, rig.mounted ? 12 : 0);
                float work = !reducedMotion && gathering && !walking ? Mathf.Sin(cycle * 2) * 18 : 0;
                if (rig.weapon != null) rig.weapon.localRotation = Quaternion.Euler(rig.ranged ? -65 * attack - cast * 30 : -75 * attack - cast * (rig.commander ? 110 : 30) + work, rig.ranged ? -30 * attack : 0, 0);
                if (rig.offhand != null) rig.offhand.localRotation = Quaternion.Euler(rig.ranged ? -60 * attack : -stride * 0.4f - cast * 40, 0, 0);
                if (rig.body != null)
                {
                    float bob = reducedMotion ? 0 : walking ? Mathf.Abs(Mathf.Sin(cycle)) * (rig.mounted ? 0.08f : 0.045f) : Mathf.Sin(cycle) * (rig.commander ? 0.018f : 0.008f);
                    rig.body.localPosition = rig.bodyRest + Vector3.up * bob;
                    rig.body.localRotation = Quaternion.Euler(rig.commander ? attack * 8 - cast * 7 : attack * 5, 0, 0);
                }
                if (rig.cloak != null) rig.cloak.localRotation = Quaternion.Euler(reducedMotion ? 0 : (walking ? 16 : 3) + Mathf.Sin(cycle) * 4 + cast * 15, 0, 0);
                for (int wing = 0; wing < rig.wings.Count; wing++) rig.wings[wing].localRotation = rig.wingRest[wing] * Quaternion.Euler(0, 0, reducedMotion ? 0 : Mathf.Sin(cycle) * (wing % 2 == 0 ? -8 : 8));
                for (int leg = 0; leg < rig.horseLegs.Count; leg++)
                    rig.horseLegs[leg].localRotation = Quaternion.Euler(!reducedMotion && walking ? Mathf.Sin(cycle + (leg % 2) * Mathf.PI) * 28 : 0, 0, 0);
            }
            if (banner != null) banner.localRotation = Quaternion.Euler(0, reducedMotion ? 0 : Mathf.Sin(phase) * 12, 0);
            if (fire != null) fire.localScale = new Vector3(0.4f, reducedMotion ? 0.6f : 0.6f + Mathf.Sin(phase * 3) * 0.08f, 0.4f);
            if (skill != null)
            {
                bool active = Time.unscaledTime < castUntil; skill.SetActive(active);
                skill.transform.localScale = Vector3.one * (reducedMotion ? 1 : 1 + Mathf.Clamp01(1 - (castUntil - Time.unscaledTime) / 0.9f) * 0.6f);
            }
            if (projectile != null)
            {
                bool firing = !reducedMotion && rangedAttack && Time.unscaledTime < attackUntil;
                projectile.gameObject.SetActive(firing);
                if (firing)
                {
                    float t = Mathf.Clamp01(1 - (attackUntil - Time.unscaledTime) / 0.45f);
                    Vector3 start = position + Vector3.up * 1.5f, end = attackTarget + Vector3.up;
                    projectile.position = Vector3.Lerp(start, end, t) + Vector3.up * Mathf.Sin(t * Mathf.PI) * 0.5f;
                    if ((end - start).sqrMagnitude > 0.01f) projectile.rotation = Quaternion.LookRotation(end - start);
                }
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
