using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        // Decorative architecture only. No markers, colliders, levels or gameplay objects.
        private void ResidentialCourt(Transform parent, string culture, Vector3 at)
        {
            var root=new GameObject(culture+" residential court · scenery").transform;
            root.SetParent(parent,false);root.localPosition=at;root.localScale=Vector3.one*.68f;
            Color plaster=culture=="egyptian"?new Color(.79f,.65f,.43f):stone;
            Color roof=culture=="japanese"?new Color(.23f,.29f,.40f):culture=="chinese"?new Color(.24f,.41f,.32f):new Color(.32f,.39f,.28f);
            CityTerrace(root,Vector3.zero,new Vector3(1.15f,.05f,1.02f),darkStone);
            if(culture=="norse")
            {
                // Timber longhouse, deep gable and paired ridge finials.
                Box(root,0,.55f,0,1.18f,1,1.65f,timber);
                CraftedRoof(root,culture,new Vector3(0,1.05f,0),1.65f,2.1f,roof);
                for(int side=-1;side<=1;side+=2)
                {Pillar(root,side*.52f,.58f,-.88f,.09f,1.05f,bronze);Box(root,side*.44f,.35f,-.88f,.25f,.36f,.06f,stone);}
                for(int end=-1;end<=1;end+=2){var finial=Box(root,0,1.52f,end*.90f,.08f,.48f,.09f,timber);finial.localRotation=Quaternion.Euler(end*25,0,0);}
                Box(root,0,.34f,-.86f,.32f,.58f,.05f,darkStone);
            }
            else
            {
                // Two wings leave an open courtyard; flat Egyptian terraces versus East Asian eaves.
                for(int side=-1;side<=1;side+=2)
                {
                    Box(root,side*.66f,.46f,.12f,.56f,.83f,1.45f,plaster);
                    CraftedRoof(root,culture,new Vector3(side*.66f,.90f,.12f),.80f,1.72f,roof);
                    Box(root,side*.66f,.44f,-.63f,.24f,.34f,.035f,darkStone);
                    if(culture!="egyptian")for(int post=-1;post<=1;post+=2)
                        Pillar(root,side*.66f+post*.22f,.46f,-.64f,.05f,.84f,culture=="chinese"?new Color(.49f,.20f,.14f):timber);
                }
                Box(root,0,.50f,.72f,.85f,.90f,.34f,plaster);
                CraftedRoof(root,culture,new Vector3(0,1,.72f),1.10f,.65f,roof);
                if(culture=="egyptian")
                {
                    // Roof access stairs and a pottery court; no temple silhouette for a house.
                    for(int step=0;step<4;step++)Box(root,-.20f,.12f+step*.12f,.02f+step*.16f,.32f,.18f,.26f,plaster);
                    Vessel(root,new Vector3(.23f,.06f,-.25f),.46f,new Color(.62f,.32f,.18f));
                }
                else
                {
                    Box(root,0,.13f,-.52f,.78f,.12f,.24f,timber);
                    if(culture=="japanese")for(int slat=-2;slat<=2;slat++)Box(root,slat*.12f,.52f,.53f,.025f,.56f,.04f,timber);
                    else {Pillar(root,0,.22f,-.15f,.45f,.20f,stone);Vessel(root,new Vector3(0,.33f,-.15f),.36f,bronze);}
                }
            }
        }

        private void InstitutionalCourt(Transform root,string id,string culture,Color team)
        {
            Color roof=culture=="egyptian"?new Color(.22f,.48f,.49f):culture=="japanese"?new Color(.24f,.30f,.43f):culture=="chinese"?new Color(.23f,.43f,.32f):culture=="norse"?new Color(.30f,.37f,.28f):new Color(.62f,.28f,.18f);
            if(id=="menagerie")
            {
                // Open animal court, rear shelter and tall gate distinguish it from housing.
                Box(root,0,.40f,.43f,1.55f,.64f,.48f,stone);DistrictRoof(root,culture,new Vector3(0,.84f,.43f),1.85f,.80f,roof);
                for(int side=-1;side<=1;side+=2)for(int post=0;post<4;post++)Pillar(root,side*.75f,.42f,-.57f+post*.30f,.08f,.74f,timber);
                for(int side=-1;side<=1;side+=2){Box(root,side*.75f,.61f,-.10f,.08f,.10f,1.10f,timber);Pillar(root,side*.45f,.64f,-.65f,.12f,1.2f,stone);}
                Box(root,0,1.23f,-.65f,1.14f,.18f,.20f,stone);
                Vessel(root,new Vector3(.38f,.08f,-.12f),.56f,bronze);
            }
            else if(id=="vault")
            {
                Box(root,0,.56f,.08f,1.22f,1,.98f,darkStone);DistrictRoof(root,culture,new Vector3(0,1.12f,.08f),1.48f,1.18f,roof);
                for(int side=-1;side<=1;side+=2)Box(root,side*.57f,.60f,-.48f,.24f,1.12f,.34f,stone);
                Box(root,0,.45f,-.46f,.44f,.65f,.10f,bronze);
                for(int band=-1;band<=1;band+=2)Box(root,0,.45f+band*.18f,-.53f,.48f,.06f,.04f,darkStone);
                for(int step=0;step<2;step++)Box(root,0,.07f+step*.07f,-.79f+step*.13f,.72f,.10f,.28f,stone);
            }
            else if(id=="oathhall")
            {
                Box(root,0,.62f,.10f,1.42f,1.05f,1.12f,stone);DistrictRoof(root,culture,new Vector3(0,1.22f,.10f),1.78f,1.46f,roof);
                for(int side=-1;side<=1;side+=2){Pillar(root,side*.63f,.65f,-.70f,.12f,1.18f,culture=="norse"?timber:stone);Box(root,side*.43f,.80f,-.50f,.24f,.48f,.04f,team);}
                DistrictRoof(root,culture,new Vector3(0,1.16f,-.64f),1.6f,.64f,roof);
                Box(root,0,.40f,-.48f,.32f,.62f,.04f,timber);
            }
            else // Builders: an open carpentry yard, not another closed house.
            {
                for(int side=-1;side<=1;side+=2)Pillar(root,side*.59f,.56f,.30f,.08f,1.05f,timber);
                DistrictRoof(root,culture,new Vector3(0,1.13f,.30f),1.58f,.92f,roof);
                Box(root,0,.43f,.08f,1.0f,.12f,.42f,timber);
                for(int plank=0;plank<3;plank++)Box(root,-.37f,.14f+plank*.10f,-.58f,.77f,.08f,.25f,timber);
                Pillar(root,.61f,.78f,-.38f,.08f,1.5f,timber);Box(root,.21f,1.48f,-.38f,.93f,.09f,.10f,timber);
                Box(root,-.12f,1.06f,-.38f,.018f,.78f,.018f,bronze);
            }
        }
    }
}
