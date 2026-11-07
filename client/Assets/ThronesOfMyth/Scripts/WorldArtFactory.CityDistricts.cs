using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        public Transform Institution(Transform parent,string id,string culture,int level,Color team)
        {
            var root=new GameObject("District · "+id).transform;root.SetParent(parent,false);
            Box(root,0,.07f,0,1.5f,.14f,1.3f,level>0?stone:darkStone);
            if(level<=0){Ring(root,.6f,new Color(.45f,.52f,.52f));return root;}
            if(id=="citadel") { City(root,culture,team);root.localScale=Vector3.one*.55f;return root; }
            if(id=="farm")
            {
                for(int x=-2;x<=2;x++)for(int z=-1;z<=1;z++){Pillar(root,x*.24f,.28f,z*.34f,.035f,.42f,bronze);Ball(root,x*.24f,.49f,z*.34f,.10f,.25f,.10f,new Color(.85f,.71f,.32f));}
            }
            else if(id=="well") { Pillar(root,0,.35f,0,.85f,.50f,stone);Ball(root,0,.65f,0,.45f,.15f,.45f,new Color(.30f,.69f,.78f)); }
            else if(id=="quarry") { for(int i=0;i<4;i++)Ball(root,(i%2-.5f)*.6f,.35f+i*.03f,(i/2-.5f)*.5f,.6f,.5f,.5f,stone); }
            else if(id=="lumber") { for(int i=0;i<4;i++){var log=Pillar(root,(i%2-.5f)*.35f,.30f+i/2*.25f,0,.25f,1.0f,timber);log.localRotation=Quaternion.Euler(90,0,0);}Roof(root,1.1f,1.4f,1.2f,timber); }
            else if(id=="oracle") { var temple=new GameObject("Temple pavilion").transform;temple.SetParent(root,false);temple.localScale=Vector3.one*.34f;Temple(temple,team,false); }
            else
            {
                Color roof=id=="infirmary"?new Color(.25f,.52f,.43f):culture=="japanese"?new Color(.23f,.31f,.47f):culture=="chinese"?new Color(.22f,.46f,.35f):new Color(.62f,.28f,.18f);
                Box(root,0,.52f,0,1.03f,.80f,.88f,id=="forge"?darkStone:stone);Roof(root,1.02f,1.33f,1.12f,roof);Box(root,0,.40f,-.47f,.26f,.50f,.06f,timber);
                if(id=="academy") { for(int side=-1;side<=1;side+=2)Pillar(root,side*.43f,.64f,-.60f,.11f,1.0f,stone);Box(root,0,.98f,-.6f,1.1f,.18f,.25f,bronze); }
                if(id=="barracks")for(int i=-1;i<=1;i++){Pillar(root,i*.30f,.54f,-.73f,.035f,.83f,bronze);Ball(root,i*.30f,.40f,-.75f,.19f,.23f,.06f,team);}
                if(id=="menagerie") { for(int i=-2;i<=2;i++)Box(root,i*.28f,.44f,-.64f,.06f,.64f,.06f,timber);Ball(root,0,.47f,-.35f,.40f,.40f,.40f,bronze); }
                if(id=="market") { for(int i=-1;i<=1;i++)Box(root,i*.35f,.75f,-.63f,.33f,.10f,.60f,i==0?team:bronze); }
                if(id=="mint"||id=="vault")for(int i=0;i<3;i++)Pillar(root,.45f,.23f+i*.09f,-.46f,.23f,.06f,bronze);
                if(id=="forge") { Pillar(root,.45f,1.05f,.25f,.20f,1.25f,darkStone);Ball(root,0,.35f,-.48f,.30f,.25f,.12f,new Color(.95f,.40f,.13f)); }
                if(id=="oathhall") { Pillar(root,.50f,1.02f,-.60f,.06f,1.7f,bronze);Box(root,.67f,1.45f,-.60f,.35f,.45f,.04f,team); }
                if(id=="builders") { Box(root,-.5f,.72f,0,.07f,1.3f,.07f,timber);Box(root,0,1.3f,0,1.1f,.07f,.07f,timber); }
            }
            if(level>=3)Ball(root,.55f,1.18f,.35f,.16f,.21f,.16f,bronze);
            return root;
        }
        public Transform CityGuard(Transform parent,string culture)
        {
            var root=new GameObject("Ambient city guard").transform;root.SetParent(parent,false);root.localScale=Vector3.one*.28f;
            var actor=root.gameObject.AddComponent<WorldActorAnimation>();actor.artwork=root;
            if(!SkinnedUnit(root,culture,"Infantry","",Vector3.zero,new Color(.32f,.60f,.68f),actor))Soldier(root,Vector3.zero,new Color(.32f,.60f,.68f),culture,actor,"infantry");
            actor.previewWalking=true;return root;
        }
    }
}
