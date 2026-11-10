using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        public Transform Institution(Transform parent,string id,string culture,int level,Color team)
        {
            var root=new GameObject("District · "+id).transform;root.SetParent(parent,false);
            if(level<=0)
            {
                Box(root,0,.035f,0,1.2f,.04f,1.05f,new Color(.47f,.44f,.33f));
                for(int side=-1;side<=1;side+=2)for(int end=-1;end<=1;end+=2)Pillar(root,side*.54f,.16f,end*.45f,.065f,.26f,timber);
                return root;
            }
            if(culture=="greek"&&(id=="citadel"||id=="oracle"||id=="barracks"||id=="market"))
            {
                string model=id=="citadel"?(level>=2?"GreekCitadel2":"GreekCitadel1"):id=="oracle"?"GreekTemple":id=="market"?"GreekMarketStall":"GreekBarracks";
                if(Imported(root,model,team,culture))
                {
                    root.localScale=Vector3.one*(id=="citadel"?1.05f:.70f);
                    if(level>=3)for(int side=-1;side<=1;side+=2){Pillar(root,side*.95f,.7f,.6f,.05f,1.4f,bronze);Box(root,side*.95f+.13f,1.15f,.6f,.24f,.36f,.04f,team);}
                    return root;
                }
            }
            Box(root,0,.045f,0,1.5f,.09f,1.3f,stone);
            if(id=="citadel")
            {
                City(root,culture,team);
                if(level>=2)for(int side=-1;side<=1;side+=2)
                {Box(root,side*1.9f,1.5f,.6f,.65f,2.8f,.75f,stone);DistrictRoof(root,culture,new Vector3(side*1.9f,3.05f,.6f),1.0f,1.0f,bronze);Pillar(root,side*1.9f,3.6f,.6f,.06f,1.0f,bronze);Box(root,side*1.9f+.17f,3.85f,.6f,.34f,.32f,.04f,team);}
                if(level>=3)Sculpt(root,"arch",new Vector3(0,3.1f,-.2f),new Vector3(.8f,.75f,1.5f),stone);
                root.localScale=Vector3.one*.62f;return root;
            }
            if(id=="farm")
            {
                for(int x=-2;x<=2;x++)for(int z=-1;z<=1;z++){Pillar(root,x*.24f,.28f,z*.34f,.035f,.42f,bronze);Ball(root,x*.24f,.49f,z*.34f,.10f,.25f,.10f,new Color(.85f,.71f,.32f));}
            }
            else if(id=="well") { Pillar(root,0,.35f,0,.85f,.50f,stone);Ball(root,0,.65f,0,.45f,.15f,.45f,new Color(.30f,.69f,.78f)); }
            else if(id=="quarry") { for(int i=0;i<4;i++)Ball(root,(i%2-.5f)*.6f,.35f+i*.03f,(i/2-.5f)*.5f,.6f,.5f,.5f,stone); }
            else if(id=="lumber") { for(int i=0;i<4;i++){var log=Pillar(root,(i%2-.5f)*.35f,.30f+i/2*.25f,0,.25f,1.0f,timber);log.localRotation=Quaternion.Euler(90,0,0);}Roof(root,1.1f,1.4f,1.2f,timber); }
            else if(id=="oracle") { var temple=new GameObject("Temple pavilion").transform;temple.SetParent(root,false);temple.localScale=Vector3.one*.38f;Temple(temple,team,false); }
            else
            {
                Color roof=id=="infirmary"?new Color(.25f,.52f,.43f):culture=="japanese"?new Color(.23f,.31f,.47f):culture=="chinese"?new Color(.22f,.46f,.35f):culture=="norse"?new Color(.24f,.31f,.29f):new Color(.62f,.28f,.18f);
                if(id=="academy")
                {
                    for(int side=-1;side<=1;side+=2)
                    {Box(root,side*.66f,.65f,.18f,.48f,1.1f,1.24f,stone);DistrictRoof(root,culture,new Vector3(side*.66f,1.3f,.18f),.69f,1.5f,roof);}
                    for(int column=-1;column<=1;column++)Pillar(root,column*.48f,.64f,-.57f,.12f,1.05f,stone);
                    Box(root,0,1.21f,-.57f,1.8f,.22f,.38f,bronze);
                    Box(root,0,.29f,-.16f,.54f,.11f,.36f,timber);Box(root,0,.38f,-.16f,.40f,.06f,.28f,new Color(.91f,.85f,.67f));
                }
                else if(id=="barracks")
                {
                    Box(root,0,.45f,.40f,1.7f,.75f,.66f,stone);DistrictRoof(root,culture,new Vector3(0,.94f,.4f),2.05f,.95f,roof);
                    for(int side=-1;side<=1;side+=2)Box(root,side*.86f,.22f,-.34f,.12f,.38f,1.15f,stone);
                    for(int i=-2;i<=2;i++){Pillar(root,i*.32f,.53f,-.57f,.035f,.94f,bronze);Ball(root,i*.32f,.35f,-.60f,.22f,.26f,.06f,team);}
                    Pillar(root,.78f,1.1f,-.25f,.05f,1.95f,bronze);Box(root,.95f,1.7f,-.25f,.34f,.43f,.045f,team);
                }
                else if(id=="infirmary")
                {
                    for(int side=-1;side<=1;side+=2){Box(root,side*.62f,.46f,.08f,.48f,.72f,1.22f,stone);DistrictRoof(root,culture,new Vector3(side*.62f,.97f,.08f),.72f,1.5f,roof);}
                    Pillar(root,0,.14f,-.12f,.65f,.20f,stone);Pillar(root,0,.26f,-.12f,.48f,.04f,new Color(.24f,.55f,.59f));
                    Box(root,0,.47f,.63f,.72f,.67f,.18f,stone);Box(root,0,.64f,.51f,.36f,.09f,.06f,team);Box(root,0,.64f,.50f,.09f,.34f,.06f,team);
                }
                else if(id=="forge")
                {
                    Box(root,0,.47f,.32f,1.33f,.8f,.7f,darkStone);DistrictRoof(root,culture,new Vector3(0,1.03f,.32f),1.65f,1.03f,roof);
                    Box(root,.51f,1.16f,.33f,.34f,1.9f,.35f,darkStone);Box(root,.51f,2.13f,.33f,.49f,.15f,.49f,bronze);
                    Box(root,-.30f,.40f,-.45f,.22f,.55f,.24f,darkStone);Box(root,-.3f,.72f,-.45f,.64f,.17f,.26f,stone);
                    Box(root,.35f,.23f,-.31f,.42f,.25f,.28f,new Color(.9f,.39f,.15f));
                }
                else
                {
                    Box(root,0,.52f,0,1.03f,.8f,.88f,stone);DistrictRoof(root,culture,new Vector3(0,1.02f,0),1.36f,1.15f,roof);Box(root,0,.4f,-.47f,.26f,.50f,.06f,timber);
                    if(id=="menagerie"){for(int i=-2;i<=2;i++)Box(root,i*.28f,.44f,-.64f,.06f,.64f,.06f,timber);Ball(root,0,.47f,-.35f,.40f,.40f,.40f,bronze);}
                    if(id=="market")for(int i=-1;i<=1;i++)Box(root,i*.35f,.75f,-.63f,.33f,.10f,.60f,i==0?team:bronze);
                    if(id=="mint"||id=="vault"){for(int i=0;i<3;i++)Pillar(root,.45f,.23f+i*.09f,-.46f,.23f,.06f,bronze);Box(root,0,.48f,-.53f,.55f,.63f,.1f,darkStone);}
                    if(id=="oathhall"){Pillar(root,.50f,1.02f,-.60f,.06f,1.7f,bronze);Box(root,.67f,1.45f,-.60f,.35f,.45f,.04f,team);}
                    if(id=="builders"){Box(root,-.5f,.72f,0,.07f,1.3f,.07f,timber);Box(root,0,1.3f,0,1.1f,.07f,.07f,timber);}
                }
            }
            if(level>=2)Box(root,0,.10f,-.76f,1.45f,.10f,.15f,bronze);
            if(level>=4)for(int side=-1;side<=1;side+=2)Pillar(root,side*.78f,.39f,.62f,.16f,.70f,stone);
            if(level>=5){Pillar(root,0,.32f,-.81f,.20f,.35f,bronze);Ball(root,0,.59f,-.81f,.24f,.24f,.24f,team);}
            if(level>=3)Ball(root,.55f,1.18f,.35f,.16f,.21f,.16f,bronze);
            ShowcaseDistrict(root,id,culture,level,team);return root;
        }
        private void DistrictRoof(Transform parent,string culture,Vector3 position,float width,float depth,Color color)
        {
            CraftedRoof(parent,culture,position,width,depth,color);
            if(culture=="egyptian")for(int side=-1;side<=1;side+=2)Box(parent,side*width*.44f,position.y+.18f,position.z,.10f,.25f,depth,bronze);
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
