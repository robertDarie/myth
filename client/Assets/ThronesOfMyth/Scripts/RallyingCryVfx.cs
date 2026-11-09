using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    // Eight reusable leases cap transparent draws and particles even in mass combat.
    // Kept outside army hierarchy so glow never expands picking bounds or hit flashes.
    public sealed class RallyingCryVfx : MonoBehaviour
    {
        private static readonly List<RallyingCryVfx> pool=new List<RallyingCryVfx>();
        private static Material glow;
        private Transform owner;
        private LineRenderer wave,charge,aura;
        private readonly List<LineRenderer> wards=new List<LineRenderer>();
        private Renderer shell;
        private ParticleSystem sparks;
        private MaterialPropertyBlock block;
        private float castAt=-100,releaseAt;
        private bool shielded,reduced,audio,releasePending;
        public static bool Present(Transform army,bool shield,bool cast,bool reducedMotion,bool sound,List<AuthoredUnit> units)
        {
            RallyingCryVfx effect=null,free=null;
            for(int i=pool.Count-1;i>=0;i--){if(pool[i]==null){pool.RemoveAt(i);continue;}if(pool[i].owner==army)effect=pool[i];else if(pool[i].owner==null)free=pool[i];}
            if(effect==null&&!shield&&!cast)return false;
            if(effect==null){effect=free;if(effect==null&&pool.Count<8){effect=new GameObject("Rallying Cry · pooled original effect").AddComponent<RallyingCryVfx>();effect.Build();pool.Add(effect);}if(effect==null)return false;effect.owner=army;effect.castAt=-100;effect.gameObject.SetActive(true);}
            effect.shielded=shield;if(reducedMotion&&!effect.reduced)effect.sparks.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);effect.reduced=reducedMotion;effect.audio=sound;
            int represented=0;foreach(var unit in units){if(unit.commander||!unit.gameObject.activeInHierarchy||represented>=4)continue;effect.wards[represented].transform.localPosition=army.InverseTransformPoint(unit.transform.position)+Vector3.up*.16f;represented++;}for(int i=0;i<4;i++)effect.wards[i].gameObject.SetActive(i<represented);
            if(cast){effect.castAt=Time.unscaledTime;effect.releaseAt=effect.castAt+RallyingCryTimeline.Release;effect.releasePending=!reducedMotion;if(!reducedMotion){effect.sparks.Emit(22);if(sound)BattlefieldAudio.Cue("rally-charge",army.position);}else if(sound)BattlefieldAudio.Cue("rally-release",army.position);}
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
            for(int i=0;i<4;i++){var rune=Ring("Soldier ward",6,.035f);rune.transform.localPosition=new Vector3((i%2==0?-1:1)*.72f,.18f,-(i/2)*1.0f);wards.Add(rune);}
            var dome=GameObject.CreatePrimitive(PrimitiveType.Sphere);dome.name="Magical protection shell";dome.transform.SetParent(transform,false);dome.transform.localPosition=new Vector3(0,.45f,0);dome.transform.localScale=new Vector3(4.8f,3.6f,4.8f);Destroy(dome.GetComponent<Collider>());shell=dome.GetComponent<Renderer>();shell.sharedMaterial=glow;shell.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;shell.receiveShadows=false;block=new MaterialPropertyBlock();
            var emitter=new GameObject("Gold embers");emitter.transform.SetParent(transform,false);emitter.transform.localPosition=new Vector3(0,.3f,1.2f);sparks=emitter.AddComponent<ParticleSystem>();sparks.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);var main=sparks.main;main.playOnAwake=false;main.loop=false;main.maxParticles=32;main.startLifetime=.65f;main.startSize=.07f;main.startSpeed=1.2f;main.startColor=new Color(1,.72f,.24f,.8f);main.simulationSpace=ParticleSystemSimulationSpace.Local;var emission=sparks.emission;emission.enabled=false;var shape=sparks.shape;shape.shapeType=ParticleSystemShapeType.Circle;shape.radius=1.6f;var velocity=sparks.velocityOverLifetime;velocity.enabled=true;velocity.y=1.4f;sparks.GetComponent<ParticleSystemRenderer>().sharedMaterial=glow;
        }
        private void Tint(Renderer renderer,float alpha){block.SetColor("_Tint",new Color(1,.74f,.26f,alpha));renderer.SetPropertyBlock(block);renderer.enabled=alpha>.001f;}
        private void Update()
        {
            if(owner==null||!owner.gameObject.activeInHierarchy){Release();return;}
            transform.position=owner.position+Vector3.up*.14f;transform.rotation=owner.rotation;
            float age=castAt<0?-1:Time.unscaledTime-castAt;
            if(!RallyingCryTimeline.Live(age,shielded)){Release();return;}
            if(reduced)releasePending=false;
            if(releasePending&&Time.unscaledTime>=releaseAt){releasePending=false;if(audio)BattlefieldAudio.Cue("rally-release",transform.position);}
            float shock=RallyingCryTimeline.Shock(age),gather=RallyingCryTimeline.Gather(age);
            wave.transform.localScale=Vector3.one*Mathf.Lerp(.8f,4.6f,shock);Tint(wave,!reduced&&age>=RallyingCryTimeline.Release&&age<.94f?(1-shock)*.8f:0);
            charge.transform.localPosition=new Vector3(0,.3f+gather*.8f,1.2f);charge.transform.localScale=Vector3.one*(2.1f-gather*1.4f);Tint(charge,reduced?0:gather*.7f);
            float strength=RallyingCryTimeline.Shell(age,shielded,reduced);Tint(shell,strength);aura.transform.localScale=Vector3.one*2.35f;Tint(aura,shielded?.4f:0);
            foreach(var ward in wards){ward.transform.localScale=Vector3.one*(.32f+(!reduced?.04f*Mathf.Sin(Time.unscaledTime*2):0));Tint(ward,shielded?strength:0);}
        }
        private void Release(){owner=null;shielded=releasePending=false;if(sparks!=null)sparks.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);gameObject.SetActive(false);}
        private void OnDestroy(){pool.Remove(this);if(pool.Count==0&&glow!=null){Destroy(glow);glow=null;}}
    }
}
