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
            public Vector3 bodyRest, formationRest, formationVelocity;
            public bool formationCaptured;
            public bool ranged, mounted, commander;
            public string formationRole;
        }
        public Transform artwork, banner, fire, projectile, impact;
        public GameObject selection, skill, shield;
        public readonly List<AuthoredUnit> authored = new List<AuthoredUnit>();
        public readonly List<Rig> rigs = new List<Rig>();
        public readonly List<GameObject> soldiers = new List<GameObject>();
        private Vector3 lastPosition, targetPosition, attackTarget;
        public LineRenderer skillLine;
        public Material healMaterial, shieldMaterial, damageMaterial;
        public bool previewWalking;
        private bool gathering, hasTarget, initialized, rangedAttack;
        private int lastHealth;
        private float attackUntil, castUntil, captionUntil, phase;
        private string caption, skillKind;
        private Color captionColor;
        public bool reducedMotion, allowAudio;
        private bool mountedArmy, arrowReleasePending,combat,mythicAttack;
        private bool woundedReturning,usesSkillPool,confirmedShield;
        private bool recovering, campDead, impactSoundPending, wasFlashing;
        private string previewPose;
        private float previewPoseUntil, dustAt;
        public Vector3 FootprintCenter {get;private set;}
        public float FootprintRadius {get;private set;}=2.2f;
        private LineRenderer selectionLine;
        private BoxCollider pickingCollider;
        private Bounds visualBounds;
        private Quaternion pickingRotation;
        private bool pickingInitialized;
        private float workAt;
        private Color workColor=new Color(.68f,.70f,.47f);
        private bool? previousWide;
        private readonly HashSet<string> visibleRoles=new HashSet<string>();
        public bool IsGathering => gathering;
        public bool IsWorking => gathering&&!recovering;
        private float turnLean;
        private float walkBlend, recoilUntil, victoryUntil, impactAt, impactUntil, footstepAt;
        private Renderer[] flashRenderers;
        private Color[][] flashColors;
        private MaterialPropertyBlock flashBlock;
        private GUIStyle captionStyle;
        private void Start()
        {
            lastPosition = transform.parent.position; phase = Mathf.Abs(transform.parent.position.x * 1.7f + transform.parent.position.z);
            var renderers = new List<Renderer>();
            foreach (var renderer in GetComponentsInChildren<Renderer>(true)) if (!(renderer is LineRenderer)) renderers.Add(renderer);
            flashRenderers = renderers.ToArray(); flashColors = new Color[flashRenderers.Length][]; flashBlock = new MaterialPropertyBlock();
            for(int i=0;i<flashColors.Length;i++)
            {var source=flashRenderers[i].sharedMaterials;flashColors[i]=new Color[source.Length];for(int slot=0;slot<source.Length;slot++)flashColors[i][slot]=source[slot]!=null?source[slot].color:Color.white;}
        }
        public void ObserveCamp(CampData camp, bool defeatedNow)
        {
            if (initialized && camp.health < lastHealth) recoilUntil = Time.unscaledTime + 0.28f;
            campDead = camp.health <= 0;
            if (defeatedNow) { caption = "CAMP CLEARED"; captionColor = new Color(1, 0.8f, 0.4f); captionUntil = Time.unscaledTime + 1.2f; recoilUntil = Time.unscaledTime + 0.28f; }
            initialized = true; lastHealth = camp.health;
        }
        public void Observe(ArmyData army,ArmyObservation observation)
        {
            confirmedShield=army.shield>0;
            mountedArmy=army.units!=null&&army.units.Cavalry>0;
            woundedReturning=army.state=="Returning"&&army.health<army.maxHealth*.5f;
            gathering=ArmyPresentationState.IsGathering(army);hasTarget=army.hasOrder;
            targetPosition=new Vector3(army.targetX,0,army.targetZ);skillKind=army.skillKind;
            rangedAttack=army.units!=null&&army.units.Archers>0||authored.Exists(u=>u.commander&&u.ranged);
            mythicAttack=army.mythic>0;combat=ArmyPresentationState.IsEngaged(army)||observation.Has(ArmyCue.Attack);if(combat)attackTarget=new Vector3(army.attackX,0,army.attackZ);
            bool cry=CommanderSkillVfx.Present(transform,army,observation.Has(ArmyCue.Skill),reducedMotion,allowAudio,authored);
            usesSkillPool=cry;
            if(shield!=null)shield.SetActive(army.shield>0&&!cry);
            if(observation.Has(ArmyCue.Attack))
            {
                foreach(var unit in authored)unit.Restart("Attack");attackUntil=Time.unscaledTime+.65f;
                attackTarget=new Vector3(army.attackX,0,army.attackZ);impactAt=Time.unscaledTime+(rangedAttack?SkillPresentation.ArrowImpact:.35f);impactUntil=impactAt+.22f;impactSoundPending=true;arrowReleasePending=rangedAttack;
            }
            if(observation.Has(ArmyCue.Health))
            {
                if(observation.HealthDelta<0){foreach(var unit in authored)unit.Restart("Hit");recoilUntil=Time.unscaledTime+.20f;BattlefieldFeedback.Emit("hit",new Vector3(army.x,0,army.z),new Color(1,.55f,.3f),reducedMotion);}
                caption=(observation.HealthDelta>0?"+":"")+observation.HealthDelta+" HP";captionColor=observation.HealthDelta>0?new Color(.55f,1,.7f):new Color(1,.65f,.5f);captionUntil=Time.unscaledTime+.85f;
            }
            if(observation.Has(ArmyCue.Skill))
            {
                castUntil=Time.unscaledTime+.9f;foreach(var unit in authored)if(unit.commander)unit.Restart("Skill");
                var color=skillKind=="heal"?new Color(.4f,.9f,.6f):skillKind=="shield"?new Color(.4f,.7f,1):new Color(1,.7f,.25f);
                if(!usesSkillPool)BattlefieldFeedback.Emit("skill",transform.parent.position,color,reducedMotion);caption=army.lastSkill+(observation.Has(ArmyCue.Health)?" · "+(observation.HealthDelta>0?"+":"")+observation.HealthDelta+" HP":"");captionColor=color;captionUntil=Time.unscaledTime+1.4f;
                if(allowAudio&&!usesSkillPool)BattlefieldAudio.Cue("skill",transform.parent.position);
            }
            if(observation.Has(ArmyCue.Retreat)){attackUntil=castUntil=impactUntil=0;arrowReleasePending=impactSoundPending=false;SetCaption("RETREAT · RECOVERING",new Color(1,.65f,.4f),1.6f);if(allowAudio)BattlefieldAudio.UiCue("retreat");}
            else if(observation.Has(ArmyCue.Victory))ObserveVictory();
            else if(observation.Has(ArmyCue.Arrival)){SetCaption("AT HOME"+(army.health<army.maxHealth?" · RECOVERING":""),MythInterfaceTheme.Teal,.9f);if(Vector2.Distance(new Vector2(army.x,army.z),new Vector2(army.homeX,army.homeZ))>2)SetCaption("ARRIVED",MythInterfaceTheme.Teal,.9f);if(allowAudio)BattlefieldAudio.Cue("arrival",transform.parent.position);}
            else if(observation.Has(ArmyCue.Gather))SetCaption("GATHERING",MythInterfaceTheme.Teal,1);
            else if(observation.Has(ArmyCue.Returning))SetCaption(woundedReturning?"RETURNING · WOUNDED":"RETURNING HOME",new Color(.55f,.8f,1),1.2f);
            else if(observation.Has(ArmyCue.Combat))SetCaption("ENGAGING",MythInterfaceTheme.Red,.8f);
            recovering=army.recovery>0;
            if(skillLine!=null)skillLine.sharedMaterial=skillKind=="heal"?healMaterial:skillKind=="shield"?shieldMaterial:damageMaterial;
        }
        private void SetCaption(string text,Color color,float duration){caption=text;captionColor=color;captionUntil=Time.unscaledTime+duration;}
        public void PreviewPose(string state)
        {
            previewWalking=state=="March";previewPose=state;previewPoseUntil=state=="Idle"||state=="March"?float.PositiveInfinity:Time.unscaledTime+(state=="Attack"?.65f:state=="Victory"?1.1f:.9f);
            if(state=="Attack"){attackUntil=Time.unscaledTime+.65f;attackTarget=transform.parent.position+Vector3.forward*2;rangedAttack=authored.Exists(u=>u.ranged);}
            foreach(var unit in authored)unit.Restart(state);
        }
        public void ObserveVictory()
        {
            victoryUntil=Time.unscaledTime+1.4f;caption="VICTORY";captionColor=new Color(1,.82f,.40f);captionUntil=Time.unscaledTime+1.3f;
            foreach(var unit in authored)unit.Restart("Victory");BattlefieldFeedback.Emit("victory",transform.position,new Color(1,.82f,.4f),reducedMotion);if(allowAudio)BattlefieldAudio.UiCue("victory");
        }
        public void RebaseMotion() { lastPosition = transform.parent.position; }
        public void PreviewSkill(string kind)
        {
            previewPose="Skill";previewPoseUntil=Time.unscaledTime+.9f;foreach(var unit in authored)unit.Restart("Skill");
            skillKind = kind; castUntil = Time.unscaledTime + 0.9f;
            if (skillLine != null) skillLine.sharedMaterial = kind == "heal" ? healMaterial : kind == "shield" ? shieldMaterial : damageMaterial;
        }
        public void ConfigureFootprint()
        {
            bool first=true;var bounds=new Bounds();
            foreach(var renderer in GetComponentsInChildren<Renderer>())
            {
                if(renderer is LineRenderer)continue;
                var local=renderer.localBounds;
                for(int i=0;i<8;i++)
                {
                    var corner=local.center+Vector3.Scale(local.extents,new Vector3((i&1)==0?-1:1,(i&2)==0?-1:1,(i&4)==0?-1:1));
                    var point=transform.InverseTransformPoint(renderer.transform.TransformPoint(corner));
                    if(first){bounds=new Bounds(point,Vector3.zero);first=false;}else bounds.Encapsulate(point);
                }
            }
            if(first)return;
            FootprintCenter=new Vector3(bounds.center.x,0,bounds.center.z);
            FootprintRadius=Mathf.Max(.9f,new Vector2(bounds.extents.x,bounds.extents.z).magnitude+.12f);
            selectionLine=selection==null?null:selection.GetComponent<LineRenderer>();
            if(selectionLine!=null)
            {
                for(int i=0;i<selectionLine.positionCount;i++){float angle=i*Mathf.PI*2/selectionLine.positionCount;selectionLine.SetPosition(i,FootprintCenter+new Vector3(Mathf.Cos(angle)*FootprintRadius,.09f,Mathf.Sin(angle)*FootprintRadius));}
            }
            visualBounds=bounds;pickingCollider=transform.parent.GetComponent<BoxCollider>();RefreshPickingBounds();
        }
        private void RefreshPickingBounds()
        {
            if(pickingCollider==null||pickingInitialized&&pickingRotation==transform.localRotation)return;
            pickingInitialized=true;pickingRotation=transform.localRotation;
            var matrix=Matrix4x4.TRS(transform.localPosition,pickingRotation,transform.localScale);
            var x=matrix.MultiplyVector(Vector3.right*visualBounds.extents.x);
            var y=matrix.MultiplyVector(Vector3.up*visualBounds.extents.y);
            var z=matrix.MultiplyVector(Vector3.forward*visualBounds.extents.z);
            var extents=new Vector3(Mathf.Abs(x.x)+Mathf.Abs(y.x)+Mathf.Abs(z.x),Mathf.Abs(x.y)+Mathf.Abs(y.y)+Mathf.Abs(z.y),Mathf.Abs(x.z)+Mathf.Abs(y.z)+Mathf.Abs(z.z));
            pickingCollider.center=matrix.MultiplyPoint3x4(visualBounds.center);pickingCollider.size=extents*2+Vector3.one*.20f;
        }
        public void GatheringColor(Color color){workColor=color;}
        public void SetWideView(bool wide)
        {
            if(previousWide==wide)return;previousWide=wide;visibleRoles.Clear();
            foreach(var soldier in soldiers)
            {
                var unit=soldier.GetComponent<AuthoredUnit>();
                string role=unit!=null?unit.formationRole:null;
                if(string.IsNullOrEmpty(role))
                {
                    var rig=rigs.Find(r=>r.root==soldier.transform);
                    role=rig==null?"Mythic":rig.formationRole;
                }
                bool representative=visibleRoles.Add(role??"Infantry");
                bool show=!wide||representative;if(soldier.activeSelf!=show)soldier.SetActive(show);
            }
        }
        public void SetSelected(bool chosen,bool hovered=false)
        {
            if(selection==null)return;selection.SetActive(chosen||hovered);
            if(selectionLine==null)selectionLine=selection.GetComponent<LineRenderer>();
            if(selectionLine!=null)selectionLine.widthMultiplier=chosen ? .09f:.045f;
        }
        private void LateUpdate()
        {
            Vector3 position = transform.parent.position, movement = position - lastPosition; lastPosition = position;
            // A defeat return is a server teleport, never a sprint across the map.
            bool walking = previewWalking || (movement.sqrMagnitude > 0.000003f && movement.sqrMagnitude < 9);
            Vector3 facing = walking ? movement : combat ? targetPosition-position : hasTarget ? targetPosition-position : Vector3.zero; facing.y = 0;
            string pose=Time.unscaledTime<castUntil?"Skill":Time.unscaledTime<recoilUntil?"Hit":Time.unscaledTime<attackUntil?"Attack":Time.unscaledTime<victoryUntil?"Victory":walking&&!recovering?(woundedReturning?"Retreat":"March"):gathering?"Gather":"Idle";
            if(Time.unscaledTime<previewPoseUntil&&!string.IsNullOrEmpty(previewPose))pose=previewPose;
            foreach(var unit in authored)if(unit.gameObject.activeInHierarchy)
            {
                string unitPose=pose=="Skill"&&!unit.commander?(Time.unscaledTime<attackUntil?"Attack":"Idle"):pose;
                unit.Pose(unitPose,reducedMotion);
                unit.FormationMotion(turnLean,walkBlend,reducedMotion);
                float strike=SkillPresentation.AttackLean(.65f-(attackUntil-Time.unscaledTime));
                unit.CombatMotion(strike,unit.commander&&Time.unscaledTime<castUntil?SkillPresentation.CastPose(.9f-(castUntil-Time.unscaledTime)):0,Mathf.Clamp01((recoilUntil-Time.unscaledTime)/.2f),combat,reducedMotion,confirmedShield);
            }
            float previousYaw = transform.localEulerAngles.y;
            if (facing.sqrMagnitude > 0.001f) transform.localRotation = Quaternion.RotateTowards(transform.localRotation, Quaternion.LookRotation(facing), 210 * Time.deltaTime);
            float turn = Mathf.Clamp(Mathf.DeltaAngle(previousYaw, transform.localEulerAngles.y) / Mathf.Max(0.001f, Time.deltaTime), -210, 210);
            turnLean=turn/210;
            walkBlend = Mathf.MoveTowards(walkBlend, walking && !recovering ? 1 : 0, Time.deltaTime * 5);
            phase += previewWalking ? Time.deltaTime * 9 : walking ? movement.magnitude * 4.5f : 0;
            float progress = Mathf.Clamp01(1 - (attackUntil - Time.unscaledTime) / 0.65f);
            float attack = 0;
            if (!reducedMotion && Time.unscaledTime < attackUntil)
                attack = progress < 0.3f ? -0.25f * progress / 0.3f : progress < 0.6f ? Mathf.Lerp(-0.25f, 1, (progress - 0.3f) / 0.3f) : Mathf.Lerp(1, 0, (progress - 0.6f) / 0.4f);
            float cast = !reducedMotion && Time.unscaledTime < castUntil ? Mathf.Sin((castUntil - Time.unscaledTime) / 0.9f * Mathf.PI) : 0;
            attack *= 1 - cast;
            for (int i = 0; i < rigs.Count; i++)
            {
                var rig = rigs[i]; if (!rig.root.gameObject.activeInHierarchy) continue;
                float cycle = phase + i * 0.7f, idle = Time.unscaledTime * 2 + i * 0.7f;
                if (!rig.formationCaptured) { rig.formationRest = rig.root.localPosition; rig.formationCaptured = true; }
                var trail = reducedMotion ? Vector3.zero : new Vector3(-turn / 210 * 0.16f, 0, -walkBlend * (rig.commander ? 0.03f : 0.12f));
                rig.root.localPosition = Vector3.SmoothDamp(rig.root.localPosition, rig.formationRest + trail, ref rig.formationVelocity, 0.14f);
                rig.root.localRotation = Quaternion.Slerp(rig.root.localRotation, Quaternion.Euler(0, reducedMotion ? 0 : -turn * 0.065f, 0), 1 - Mathf.Exp(-8 * Time.deltaTime));
                float stride = !reducedMotion ? Mathf.Sin(cycle) * (rig.mounted ? 8 : 30) * walkBlend : 0;
                if (rig.leftLeg != null) rig.leftLeg.localRotation = Quaternion.Euler(stride, 0, rig.mounted ? -12 : 0);
                if (rig.rightLeg != null) rig.rightLeg.localRotation = Quaternion.Euler(-stride, 0, rig.mounted ? 12 : 0);
                float work = !reducedMotion && gathering && walkBlend < 0.1f ? Mathf.Sin(idle * 2) * 18 : 0;
                float salute = !reducedMotion && rig.commander && Time.unscaledTime < victoryUntil ? Mathf.Sin(Mathf.Clamp01(victoryUntil - Time.unscaledTime) * Mathf.PI) * 45 : 0;
                if (rig.weapon != null) rig.weapon.localRotation = Quaternion.Euler(rig.ranged ? -65 * attack - cast * 30 : -75 * attack - cast * (rig.commander ? 110 : 30) + work - salute, rig.ranged ? -30 * attack : 0, 0);
                if (rig.offhand != null) rig.offhand.localRotation = Quaternion.Euler(rig.ranged ? -60 * attack : -stride * 0.4f - cast * 40, 0, 0);
                if (rig.body != null)
                {
                    float bob = reducedMotion ? 0 : Mathf.Abs(Mathf.Sin(cycle)) * (rig.mounted ? 0.08f : 0.045f) * walkBlend + Mathf.Sin(idle) * (rig.commander ? 0.018f : 0.008f) * (1 - walkBlend);
                    rig.body.localPosition = rig.bodyRest + Vector3.up * bob;
                    float flinch = reducedMotion ? 0 : Mathf.Clamp01((recoilUntil - Time.unscaledTime) / 0.28f) * 12;
                    rig.body.localRotation = Quaternion.Euler((rig.commander ? attack * 8 - cast * 7 : attack * 5) - flinch + (recovering ? 15 : 0), 0, 0);
                }
                if (rig.cloak != null) rig.cloak.localRotation = Quaternion.Euler(reducedMotion ? 0 : 3 + walkBlend * 13 + Mathf.Sin(idle) * 4 + cast * 15, 0, 0);
                for (int wing = 0; wing < rig.wings.Count; wing++) rig.wings[wing].localRotation = rig.wingRest[wing] * Quaternion.Euler(0, 0, reducedMotion ? 0 : Mathf.Sin(walkBlend > 0.1f ? cycle : idle) * (wing % 2 == 0 ? -8 : 8));
                for (int leg = 0; leg < rig.horseLegs.Count; leg++)
                    rig.horseLegs[leg].localRotation = Quaternion.Euler(!reducedMotion ? Mathf.Sin(cycle + (leg % 2) * Mathf.PI) * 28 * walkBlend : 0, 0, 0);
            }
            if (banner != null) banner.localRotation = Quaternion.Euler(0, reducedMotion ? 0 : Mathf.Sin(Time.unscaledTime * 2) * 12, 0);
            if (fire != null) fire.localScale = new Vector3(0.4f, reducedMotion ? 0.6f : 0.6f + Mathf.Sin(Time.unscaledTime * 6) * 0.08f, 0.4f);
            if (skill != null)
            {
                bool active = Time.unscaledTime < castUntil&&!usesSkillPool&&BattlefieldFeedback.Enabled; skill.SetActive(active);
                skill.transform.localScale = Vector3.one * (reducedMotion ? 1 : 1 + Mathf.Clamp01(1 - (castUntil - Time.unscaledTime) / 0.9f) * 0.6f);
            }
            if (campDead) transform.localRotation = Quaternion.Slerp(transform.localRotation, Quaternion.Euler(0, 0, 22), reducedMotion ? 1 : 1 - Mathf.Exp(-5 * Time.deltaTime));
            float flash = Mathf.Clamp01((recoilUntil - Time.unscaledTime) / 0.28f);
            if ((flash > 0 || wasFlashing) && flashRenderers != null)
            {
                for (int i = 0; i < flashRenderers.Length; i++)
                { for(int slot=0;slot<flashColors[i].Length;slot++){flashBlock.SetColor("_Color", Color.Lerp(flashColors[i][slot], Color.white, reducedMotion ? 0 : flash * 0.65f)); flashRenderers[i].SetPropertyBlock(flashBlock,slot);} }
                wasFlashing = flash > 0;
            }
            bool impacting = Time.unscaledTime >= impactAt && Time.unscaledTime < impactUntil;
            if (impact != null)
            {
                impact.gameObject.SetActive(impacting);
                if (impacting) { impact.position = attackTarget + Vector3.up * 0.12f; impact.localScale = Vector3.one * (reducedMotion ? 1 : 0.5f + (Time.unscaledTime - impactAt) * 4); }
            }
            if (impacting && impactSoundPending) { impactSoundPending = false; BattlefieldFeedback.Emit(mythicAttack?"mythic":"impact",attackTarget,mythicAttack?new Color(.55f,.75f,1):new Color(1,.79f,.35f),reducedMotion); if (allowAudio) BattlefieldAudio.Cue(rangedAttack ? "impact" : "strike", attackTarget); }
            RefreshPickingBounds();
            if(gathering&&!walking&&!recovering&&Time.unscaledTime>=workAt)
            {workAt=Time.unscaledTime+1.2f;BattlefieldFeedback.Emit("gather",targetPosition,workColor,reducedMotion);}
            if(walking&&Time.unscaledTime>dustAt&&!previewWalking){dustAt=Time.unscaledTime+.28f;BattlefieldFeedback.Emit("dust",position,new Color(.70f,.63f,.43f),reducedMotion);}
            if (allowAudio && walkBlend > 0.6f && Time.unscaledTime > footstepAt)
            { footstepAt = Time.unscaledTime + 0.4f; BattlefieldAudio.Cue(mountedArmy?"hoof":"step", position); }
            if(arrowReleasePending&&Time.unscaledTime>=attackUntil-.65f+SkillPresentation.ArrowRelease){arrowReleasePending=false;if(allowAudio)BattlefieldAudio.Cue("arrow",position);}
            if (projectile != null)
            {
                float flightElapsed = 0.65f - (attackUntil - Time.unscaledTime);
                bool firing = !reducedMotion && rangedAttack && flightElapsed >= SkillPresentation.ArrowRelease && flightElapsed <= SkillPresentation.ArrowImpact;
                projectile.gameObject.SetActive(firing);
                if (firing)
                {
                    float t = SkillPresentation.ArrowProgress(flightElapsed);
                    Vector3 start = position + Vector3.up * 1.5f, end = attackTarget + Vector3.up;
                    projectile.position = Vector3.Lerp(start, end, t) + Vector3.up * SkillPresentation.ArrowHeight(t);
                    if ((end - start).sqrMagnitude > 0.01f) projectile.rotation = Quaternion.LookRotation(end - start + Vector3.up * SkillPresentation.ArrowSlope(t));
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
            if(captionStyle==null)captionStyle=new GUIStyle(GUI.skin.label){alignment=TextAnchor.MiddleCenter,fontStyle=FontStyle.Bold,wordWrap=false,clipping=TextClipping.Clip};
            captionStyle.fontSize=Mathf.Max(12,Mathf.RoundToInt(13*scale));
            GUI.Label(new Rect(xy.x-160*scale,xy.y,320*scale,30*scale),caption,captionStyle);
            GUI.color = before;
        }
    }
}
