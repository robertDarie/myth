using UnityEngine;
namespace ThronesOfMyth
{
    // One bounded world-space pool. Effects only decorate observed game events.
    public sealed class BattlefieldFeedback : MonoBehaviour
    {
        private sealed class Spark { public Transform root; public Renderer renderer; public Vector3 velocity; public float life, duration, size; }
        private static BattlefieldFeedback current;
        private readonly Spark[] pool = new Spark[48];
        private Material material;
        private Mesh fragment;
        private MaterialPropertyBlock tintBlock;
        private int cursor;
        private float nextAmbient;
        public static bool Enabled { get => PlayerPrefs.GetInt("ThronesOfMyth.combatEffects",1)==1; set => PlayerPrefs.SetInt("ThronesOfMyth.combatEffects",value?1:0); }
        private void Awake()
        {
            current=this;tintBlock=new MaterialPropertyBlock(); material=new Material(Shader.Find("Standard")){color=new Color(1,0.77f,0.35f),enableInstancing=true};material.SetFloat("_Glossiness",0);
            fragment=new Mesh{name="Original impact fleck"};fragment.vertices=new[]{Vector3.up,Vector3.down,Vector3.left*.5f,Vector3.right*.5f,Vector3.forward*.25f,Vector3.back*.25f};fragment.triangles=new[]{0,4,3,0,2,4,0,5,2,0,3,5,1,3,4,1,4,2,1,2,5,1,5,3};fragment.RecalculateNormals();fragment.RecalculateBounds();
            for(int i=0;i<pool.Length;i++)
            {
                var obj=new GameObject();obj.AddComponent<MeshFilter>().sharedMesh=fragment;obj.AddComponent<MeshRenderer>();obj.name="Pooled battlefield feedback";obj.transform.SetParent(transform,false);
                var renderer=obj.GetComponent<Renderer>();renderer.sharedMaterial=material;renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;renderer.receiveShadows=false;
                pool[i]=new Spark{root=obj.transform,renderer=renderer};obj.SetActive(false);
            }
        }
        public static void Emit(string kind,Vector3 point,Color color,bool reducedMotion)
        {
            if(current==null||!Enabled||reducedMotion||PlayerPrefs.GetInt("ThronesOfMyth.reducedMotion",0)==1||Camera.main==null)return;
            var view=Camera.main.WorldToViewportPoint(point);if(view.z<=0||view.x<0||view.x>1||view.y<0||view.y>1)return;
            bool ambient=kind=="gather"||kind=="dust";
            if(ambient&&Time.unscaledTime<current.nextAmbient)return;
            if(ambient)current.nextAmbient=Time.unscaledTime+.10f;
            int count=kind=="mythic"?9:kind=="gather"?3:kind=="dust"?2:kind=="skill"?12:7;
            for(int i=0;i<count;i++)
            {
                Spark spark=null;
                for(int slot=0;slot<current.pool.Length;slot++){var candidate=current.pool[current.cursor];current.cursor=(current.cursor+1)%current.pool.Length;if(candidate.life<=0){spark=candidate;break;}}
                if(spark==null){if(ambient)return;spark=current.pool[current.cursor];current.cursor=(current.cursor+1)%current.pool.Length;}
                float angle=i*Mathf.PI*2/count;
                spark.duration=kind=="mythic"?.4f:kind=="gather" ? .6f:kind=="dust"?.30f:kind=="skill"?.65f:.26f;spark.life=spark.duration;spark.size=kind=="mythic"?.10f:kind=="gather" ? .045f:kind=="dust"?.08f:.06f;
                spark.root.position=point+Vector3.up*(kind=="dust"?.07f:.5f);spark.velocity=new Vector3(Mathf.Cos(angle),kind=="skill"?1.6f:.8f,Mathf.Sin(angle))*(kind=="skill"?1.1f:.65f);
                if(kind=="gather"){spark.root.position=point+Vector3.up*.25f;spark.velocity=new Vector3(Mathf.Cos(angle)*.2f,.65f,Mathf.Sin(angle)*.2f);}
                spark.root.localScale=Vector3.one*spark.size;spark.root.gameObject.SetActive(true);current.tintBlock.SetColor("_Color",color);spark.renderer.SetPropertyBlock(current.tintBlock);
            }
        }
        private void Update()
        {
            bool enabled=Enabled&&PlayerPrefs.GetInt("ThronesOfMyth.reducedMotion",0)==0;
            foreach(var spark in pool)if(spark.life>0)
            {
                spark.life-=Time.deltaTime;if(spark.life<=0||!enabled){spark.root.gameObject.SetActive(false);spark.life=0;continue;}
                spark.velocity+=Vector3.down*Time.deltaTime*1.5f;spark.root.position+=spark.velocity*Time.deltaTime;spark.root.localScale=Vector3.one*spark.size*Mathf.Clamp01(spark.life/spark.duration);
            }
        }
        private void OnDestroy(){if(current==this)current=null;if(material!=null)Destroy(material);if(fragment!=null)Destroy(fragment);}
    }
}
