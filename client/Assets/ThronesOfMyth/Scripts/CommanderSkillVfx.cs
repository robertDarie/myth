using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    // Eight reusable leases cap transparent draws and particles even in mass combat.
    // Kept outside army hierarchy so glow never expands picking bounds or hit flashes.
    public sealed class CommanderSkillVfx : MonoBehaviour
    {
        private static readonly List<CommanderSkillVfx> pool=new List<CommanderSkillVfx>();
        private static Material glow;
        private Transform owner;
        private string commander;
        private LineRenderer wave,charge,aura,trail,sigil;
        private SkillPalette profile;
        private Vector3 target;
        private readonly List<LineRenderer> wards=new List<LineRenderer>();
        private Renderer shell;
        private ParticleSystem sparks;
        private ParticleSystemRenderer sparkRenderer;
        private MaterialPropertyBlock block;
        private float castAt=-100,releaseAt;
        private bool shielded,reduced,audio,releasePending;
        public static bool Present(Transform army,ArmyData state,bool cast,bool reducedMotion,bool sound,List<AuthoredUnit> units)
        {
            var style=SkillPresentation.Profile(state.commanderId,state.skillKind);
            bool shield=SkillPresentation.HasPersistentShield(style.Shape,state.shield);
            CommanderSkillVfx effect=null,free=null;
            for(int i=pool.Count-1;i>=0;i--){if(pool[i]==null){pool.RemoveAt(i);continue;}if(pool[i].owner==army)effect=pool[i];else if(pool[i].owner==null)free=pool[i];}
            if(effect!=null&&effect.commander!=state.commanderId){effect.Release();free=effect;effect=null;}
            if(!BattlefieldFeedback.Enabled){if(effect!=null)effect.Release();return false;}
            if(effect==null&&!shield&&!cast)return false;
            if(effect==null&&Camera.main!=null){var viewport=Camera.main.WorldToViewportPoint(army.position);if(viewport.z<=0||viewport.x<-.05f||viewport.x>1.05f||viewport.y<-.05f||viewport.y>1.05f)return false;}
            if(effect==null){effect=free;if(effect==null&&pool.Count<8){effect=new GameObject("Commander skill · pooled original effect").AddComponent<CommanderSkillVfx>();effect.Build();pool.Add(effect);}if(effect==null)return false;effect.owner=army;effect.commander=state.commanderId;effect.castAt=-100;effect.gameObject.SetActive(true);}
            effect.profile=style;effect.block.SetColor("_Tint",new Color(style.R,style.G,style.B,.6f));effect.sparkRenderer.SetPropertyBlock(effect.block);if(cast)effect.target=new Vector3(state.attackX,.4f,state.attackZ);effect.shielded=shield;if(reducedMotion&&!effect.reduced)effect.sparks.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);effect.reduced=reducedMotion;effect.audio=sound;
            int represented=0;foreach(var unit in units){if(unit.commander||!unit.gameObject.activeInHierarchy||represented>=4)continue;effect.wards[represented].transform.localPosition=army.InverseTransformPoint(unit.transform.position)+Vector3.up*.16f;represented++;}for(int i=0;i<4;i++)effect.wards[i].gameObject.SetActive(i<represented);
            if(cast){effect.castAt=Time.unscaledTime;effect.releaseAt=effect.castAt+RallyingCryTimeline.Release;effect.releasePending=!reducedMotion;if(!reducedMotion){effect.sparks.Emit(22);if(sound&&style.Shape==SkillShape.Shield)BattlefieldAudio.Cue("rally-charge",army.position);}else if(sound)BattlefieldAudio.Cue(style.Sound,army.position);}
            return true;
        }
        private LineRenderer Ring(string name,int points,float width)
        {
            var obj=new GameObject(name);obj.transform.SetParent(transform,false);var line=obj.AddComponent<LineRenderer>();line.sharedMaterial=glow;line.useWorldSpace=false;line.loop=true;line.positionCount=points;line.widthMultiplier=width;line.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;line.receiveShadows=false;for(int i=0;i<points;i++){float a=i*Mathf.PI*2/points;line.SetPosition(i,new Vector3(Mathf.Cos(a),0,Mathf.Sin(a)));}return line;
        }
        private void Build()
        {
            if(glow==null){glow=new Material(Shader.Find("ThronesOfMyth/RallyGold")){name="Shared Rallying Cry light"};}
            wave=Ring("Golden shockwave",64,.11f);charge=Ring("Energy gathering",40,.06f);aura=Ring("Confirmed protection",48,.035f);
            trail=Ring("Confirmed skill trajectory",16,.09f);trail.loop=false;trail.useWorldSpace=true;
            sigil=Ring("Commander rune",20,.055f);
            for(int i=0;i<4;i++){var rune=Ring("Soldier ward",6,.035f);rune.transform.localPosition=new Vector3((i%2==0?-1:1)*.72f,.18f,-(i/2)*1.0f);wards.Add(rune);}
            var dome=GameObject.CreatePrimitive(PrimitiveType.Sphere);dome.name="Magical protection shell";dome.transform.SetParent(transform,false);dome.transform.localPosition=new Vector3(0,.45f,0);dome.transform.localScale=new Vector3(4.8f,3.6f,4.8f);Destroy(dome.GetComponent<Collider>());shell=dome.GetComponent<Renderer>();shell.sharedMaterial=glow;shell.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;shell.receiveShadows=false;block=new MaterialPropertyBlock();
            var emitter=new GameObject("Gold embers");emitter.transform.SetParent(transform,false);emitter.transform.localPosition=new Vector3(0,.3f,1.2f);sparks=emitter.AddComponent<ParticleSystem>();sparks.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);var main=sparks.main;main.playOnAwake=false;main.loop=false;main.maxParticles=32;main.startLifetime=.65f;main.startSize=.07f;main.startSpeed=1.2f;main.startColor=Color.white;main.simulationSpace=ParticleSystemSimulationSpace.Local;var emission=sparks.emission;emission.enabled=false;var shape=sparks.shape;shape.shapeType=ParticleSystemShapeType.Circle;shape.radius=1.6f;var velocity=sparks.velocityOverLifetime;velocity.enabled=true;velocity.y=1.4f;sparkRenderer=sparks.GetComponent<ParticleSystemRenderer>();sparkRenderer.sharedMaterial=glow;
        }
        private void Tint(Renderer renderer,float alpha){block.SetColor("_Tint",new Color(profile.R,profile.G,profile.B,alpha));renderer.SetPropertyBlock(block);renderer.enabled=alpha>.001f;}
        private void Update()
        {
            if(owner==null||!owner.gameObject.activeInHierarchy||!BattlefieldFeedback.Enabled){Release();return;}
            transform.position=owner.position+Vector3.up*.14f;transform.rotation=owner.rotation;
            float age=castAt<0?-1:Time.unscaledTime-castAt;
            if(!RallyingCryTimeline.Live(age,shielded)){Release();return;}
            if(reduced)releasePending=false;
            if(releasePending&&Time.unscaledTime>=releaseAt){releasePending=false;if(audio)BattlefieldAudio.Cue(profile.Sound,transform.position);}
            bool wide=Camera.main!=null&&Camera.main.orthographicSize>18;sparkRenderer.enabled=!wide&&!reduced;
            bool defensive=profile.Shape==SkillShape.Shield;
            float envelope=SkillPresentation.Envelope(age,profile.Shape),shock=RallyingCryTimeline.Shock(age),gather=RallyingCryTimeline.Gather(age);
            wave.transform.localPosition=profile.Shape==SkillShape.Healing?Vector3.up*(.1f+shock*1.5f):Vector3.zero;
            wave.transform.localScale=Vector3.one*Mathf.Lerp(.8f,defensive?4.6f:1.8f,shock);
            Tint(wave,!reduced&&age>=RallyingCryTimeline.Release&&age<.94f&&(defensive||profile.Shape==SkillShape.Healing)?(1-shock)*.8f:0);
            charge.transform.localPosition=new Vector3(0,.3f+gather*.8f,1.2f);charge.transform.localScale=Vector3.one*(2.1f-gather*1.4f);Tint(charge,reduced?0:gather*.7f);
            float strength=defensive?RallyingCryTimeline.Shell(age,shielded,reduced):0;Tint(shell,wide?strength*.55f:strength);aura.transform.localScale=Vector3.one*2.35f;Tint(aura,shielded?.4f:!reduced&&(profile.Shape==SkillShape.Buff||profile.Shape==SkillShape.Debuff)?envelope*.25f:0);
            foreach(var ward in wards){ward.transform.localScale=Vector3.one*(.32f+(!reduced?.04f*Mathf.Sin(Time.unscaledTime*2):0));Tint(ward,shielded&&!wide?strength:0);}
            float flight=SkillPresentation.Flight(age);
            bool projectile=profile.Shape==SkillShape.Projectile||profile.Shape==SkillShape.Charge;
            bool striking=profile.Shape==SkillShape.Physical||profile.Shape==SkillShape.Area;
            Tint(trail,!reduced&&age>=.32f&&age<.88f&&(projectile||striking)?envelope*.8f:0);
            if(trail.enabled)for(int i=0;i<trail.positionCount;i++)
            {
                float t=i/(float)(trail.positionCount-1);
                if(projectile){float f=Mathf.Lerp(Mathf.Max(0,flight-.26f),flight,t);trail.SetPosition(i,Vector3.Lerp(owner.position+Vector3.up*1.5f,target,f)+Vector3.up*Mathf.Sin(f*Mathf.PI)*1.2f);}
                else {float a=Mathf.Lerp(-1.3f,1.3f,t)+flight*.5f;trail.SetPosition(i,target+new Vector3(Mathf.Cos(a)*.9f,.25f+Mathf.Sin(a)*.4f,Mathf.Sin(a)*.9f));}
            }
            bool healing=profile.Shape==SkillShape.Healing;
            sigil.transform.localPosition=healing?Vector3.up*.12f:transform.InverseTransformPoint(target)+Vector3.up*.05f;
            sigil.transform.localRotation=Quaternion.Euler(0,reduced?0:age*35,0);
            sigil.transform.localScale=Vector3.one*(healing?1.5f:.8f);
            if(!reduced)for(int i=0;i<sigil.positionCount;i++){float a=i*Mathf.PI*2/sigil.positionCount;float radius=i%2==0?1:.68f+(profile.Rune%3)*.08f;sigil.SetPosition(i,new Vector3(Mathf.Cos(a)*radius,0,Mathf.Sin(a)*radius));}
            Tint(sigil,!reduced&&(healing||striking)&&age>=.32f?envelope*.45f:0);
        }

        private void Release(){owner=null;shielded=releasePending=false;if(sparks!=null)sparks.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);gameObject.SetActive(false);}
        private void OnDestroy(){pool.Remove(this);if(pool.Count==0&&glow!=null){Destroy(glow);glow=null;}}
    }
}
