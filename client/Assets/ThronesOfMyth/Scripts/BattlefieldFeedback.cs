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
        private MaterialPropertyBlock tintBlock;
        private int cursor;
        public static bool Enabled { get => PlayerPrefs.GetInt("ThronesOfMyth.combatEffects",1)==1; set => PlayerPrefs.SetInt("ThronesOfMyth.combatEffects",value?1:0); }
        private void Awake()
        {
            current=this;tintBlock=new MaterialPropertyBlock(); material=new Material(Shader.Find("Standard")){color=new Color(1,0.77f,0.35f),enableInstancing=true};material.SetFloat("_Glossiness",0);
            for(int i=0;i<pool.Length;i++)
            {
                var obj=GameObject.CreatePrimitive(PrimitiveType.Cube);obj.name="Pooled battlefield feedback";obj.transform.SetParent(transform,false);Destroy(obj.GetComponent<Collider>());
                var renderer=obj.GetComponent<Renderer>();renderer.sharedMaterial=material;renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;renderer.receiveShadows=false;
                pool[i]=new Spark{root=obj.transform,renderer=renderer};obj.SetActive(false);
            }
        }
        public static void Emit(string kind,Vector3 point,Color color,bool reducedMotion)
        {
            if(current==null||!Enabled||reducedMotion||Camera.main==null)return;
            var view=Camera.main.WorldToViewportPoint(point);if(view.z<=0||view.x<0||view.x>1||view.y<0||view.y>1)return;
            int count=kind=="gather"?3:kind=="dust"?2:kind=="skill"?12:7;
            for(int i=0;i<count;i++)
            {
                var spark=current.pool[current.cursor++%current.pool.Length];float angle=i*Mathf.PI*2/count;
                spark.duration=kind=="gather" ? .6f:kind=="dust"?.30f:kind=="skill"?.65f:.26f;spark.life=spark.duration;spark.size=kind=="gather" ? .045f:kind=="dust"?.08f:.06f;
                spark.root.position=point+Vector3.up*(kind=="dust"?.07f:.5f);spark.velocity=new Vector3(Mathf.Cos(angle),kind=="skill"?1.6f:.8f,Mathf.Sin(angle))*(kind=="skill"?1.1f:.65f);
                if(kind=="gather"){spark.root.position=point+Vector3.up*.25f;spark.velocity=new Vector3(Mathf.Cos(angle)*.2f,.65f,Mathf.Sin(angle)*.2f);}
                spark.root.gameObject.SetActive(true);current.tintBlock.SetColor("_Color",color);spark.renderer.SetPropertyBlock(current.tintBlock);
            }
        }
        private void Update()
        {
            foreach(var spark in pool)if(spark.life>0)
            {
                spark.life-=Time.deltaTime;if(spark.life<=0||!Enabled){spark.root.gameObject.SetActive(false);spark.life=0;continue;}
                spark.velocity+=Vector3.down*Time.deltaTime*1.5f;spark.root.position+=spark.velocity*Time.deltaTime;spark.root.localScale=Vector3.one*spark.size*Mathf.Clamp01(spark.life/spark.duration);
            }
        }
        private void OnDestroy(){if(current==this)current=null;if(material!=null)Destroy(material);}
    }
}
