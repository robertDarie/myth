using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        private void Resource(Transform root,string resource,Color color)
        {
            // Earth beds and work equipment distinguish sites from decorative scenery.
            var earth=new Color(.39f,.34f,.23f);
            Shape(root,PrimitiveType.Cylinder,new Vector3(0,-.035f,0),new Vector3(2.9f,.07f,2.65f),earth);
            var visual=root.gameObject.AddComponent<ResourceSiteVisual>();visual.stock=new Transform[4];
            for(int section=0;section<4;section++)
            {
                var group=new GameObject("Remaining stock · "+section).transform;group.SetParent(root,false);visual.stock[section]=group;
                float x=(section%2-.5f)*1.05f,z=(section/2-.5f)*.95f;
                group.localPosition=new Vector3(x,0,z);
                if(resource=="food")
                {
                    Box(root,x,.015f,z,.85f,.03f,.85f,new Color(.29f,.25f,.17f));
                    for(int row=0;row<3;row++)for(int column=0;column<2;column++)
                    {
                        float sx=(column-.5f)*.3f,sz=(row-1)*.26f;
                        Pillar(group,sx,.35f,sz,.035f,.65f,new Color(.66f,.58f,.25f));
                        var ear=Ball(group,sx,.69f,sz,.12f,.25f,.12f,new Color(.91f,.75f,.31f));ear.localRotation=Quaternion.Euler(0,0,(column==0?-1:1)*12);
                    }
                }
                else if(resource=="wood")
                {
                    Pillar(root,x,.13f,z,.32f,.26f,timber);
                    // Reuses our original oak mesh; depleted sites retain cut stumps.
                    EnvironmentModel(group,"OakTree",Vector3.zero,.43f,new Color(.30f,.48f,.24f),section*73);
                }
                else
                {
                    var rock=Shape(group,PrimitiveType.Cube,new Vector3(0,.35f,0),new Vector3(.85f,.70f,.75f),resource=="aether"?darkStone:stone);
                    rock.localRotation=Quaternion.Euler(8,section*37,12);
                    if(resource=="stone")
                    {
                        Box(group,0,.79f,0,.72f,.20f,.55f,new Color(.63f,.66f,.62f));
                        Box(group,.20f,.35f,-.38f,.55f,.55f,.18f,darkStone);
                    }
                    else if(resource=="gold")
                    {
                        for(int vein=0;vein<3;vein++)
                        {
                            var ore=Shape(group,PrimitiveType.Cube,new Vector3((vein-1)*.22f,.73f,-.15f+vein*.11f),new Vector3(.20f,.25f,.18f),new Color(.94f,.71f,.23f));ore.localRotation=Quaternion.Euler(15,vein*30,25);
                        }
                    }
                    else
                    {
                        for(int crystal=0;crystal<3;crystal++)
                        {
                            var shard=Shape(group,PrimitiveType.Cube,new Vector3((crystal-1)*.22f,.77f+crystal*.12f,0),new Vector3(.21f,.85f,.21f),color);shard.localRotation=Quaternion.Euler(12,crystal*45,(crystal-1)*18);
                        }
                    }
                }
            }
            if(resource=="wood")
            {
                for(int log=0;log<3;log++){var at=Pillar(root,-.40f+log*.35f,.22f,-1.04f,.24f,.85f,timber);at.localRotation=Quaternion.Euler(90,0,0);}
                Box(root,.97f,.35f,-.95f,.07f,.70f,.07f,timber);Box(root,1.08f,.65f,-.95f,.30f,.20f,.07f,stone);
            }
            else if(resource=="food")
            {
                for(int side=-1;side<=1;side+=2)Pillar(root,side*1.13f,.30f,-1.05f,.07f,.60f,timber);
                Box(root,0,.37f,-1.05f,2.3f,.06f,.06f,timber);
            }
            else
            {
                // Empty working entrance remains after ore is exhausted.
                for(int side=-1;side<=1;side+=2)Box(root,side*.33f,.40f,-1.02f,.10f,.80f,.12f,timber);
                Box(root,0,.81f,-1.02f,.82f,.13f,.16f,timber);
                Box(root,0,.32f,-1.01f,.51f,.60f,.08f,new Color(.16f,.20f,.19f));
            }
        }
    }
}
