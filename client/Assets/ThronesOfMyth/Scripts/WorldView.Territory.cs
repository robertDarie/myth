using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        public bool showSupply = true;
        private Transform supplyRoot;
        private string supplySignature = "";
        private Transform topologyRoot;
        private string topologySignature="";

        private void DrawPassTopology(WorldSnapshot world)
        {
            if(world.provinces==null||world.corridors==null)return;
            string signature="";
            foreach(var zone in world.provinces)signature+=zone.id+":"+zone.name+":"+zone.category+":"+zone.minX+":"+zone.maxX+":"+zone.minZ+":"+zone.maxZ+";";
            foreach(var c in world.corridors)signature+=c.id+":"+c.gateId+":"+c.a?.x+":"+c.a?.z+":"+c.b?.x+":"+c.b?.z+";";
            foreach(var pass in world.passes??System.Array.Empty<SiteData>())signature+=pass.id+":"+pass.militaryAccess+":"+pass.locked+";";
            if(signature==topologySignature)return;topologySignature=signature;
            if(topologyRoot!=null)Destroy(topologyRoot.gameObject);
            topologyRoot=new GameObject("Authoritative zones and mountain passes").transform;topologyRoot.SetParent(transform,false);
            var ridges=new GameObject("Mountain barriers").transform;ridges.SetParent(topologyRoot,false);
            for(int i=0;i<world.provinces.Length;i++)for(int j=i+1;j<world.provinces.Length;j++)
            {
                var a=world.provinces[i];var b=world.provinces[j];
                if(Mathf.Approximately(a.maxX,b.minX)||Mathf.Approximately(b.maxX,a.minX))
                {
                    float x=Mathf.Approximately(a.maxX,b.minX)?a.maxX:b.maxX;
                    MountainBorder(ridges,world,new Vector2(x,Mathf.Max(a.minZ,b.minZ)),new Vector2(x,Mathf.Min(a.maxZ,b.maxZ)),0);
                }
                if(Mathf.Approximately(a.maxZ,b.minZ)||Mathf.Approximately(b.maxZ,a.minZ))
                {
                    float z=Mathf.Approximately(a.maxZ,b.minZ)?a.maxZ:b.maxZ;
                    MountainBorder(ridges,world,new Vector2(Mathf.Max(a.minX,b.minX),z),new Vector2(Mathf.Min(a.maxX,b.maxX),z),90);
                }
            }
            art.BatchEnvironment(ridges);
            foreach(var zone in world.provinces)
            {
                var label=new GameObject("Zone label "+zone.id);label.transform.SetParent(topologyRoot,false);
                label.transform.localPosition=new Vector3((zone.minX+zone.maxX)*.5f,.3f,(zone.minZ+zone.maxZ)*.5f);label.transform.localRotation=Quaternion.Euler(90,0,0);
                var text=label.AddComponent<TextMesh>();text.font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");label.GetComponent<MeshRenderer>().sharedMaterial=text.font.material;text.text=zone.name+"\n"+zone.category;text.anchor=TextAnchor.MiddleCenter;text.alignment=TextAlignment.Center;text.characterSize=.32f;text.fontSize=32;text.color=new Color(.95f,.84f,.61f);
            }
            foreach(var corridor in world.corridors)
            {
                if(corridor.a==null||corridor.b==null)continue;
                var pass=System.Array.Find(world.passes??System.Array.Empty<SiteData>(),s=>s.id==corridor.gateId);
                var color=pass!=null&&pass.militaryAccess?blue:pass!=null&&pass.locked?Color.gray:red;
                var holder=new GameObject("Crossing "+corridor.id);holder.transform.SetParent(topologyRoot,false);var line=holder.AddComponent<LineRenderer>();
                line.material=art.MaterialFor(color);line.startColor=line.endColor=color;line.startWidth=line.endWidth=.55f;line.positionCount=2;
                line.SetPosition(0,new Vector3(corridor.a.x,.18f,corridor.a.z));line.SetPosition(1,new Vector3(corridor.b.x,.18f,corridor.b.z));
            }
        }
        private void MountainBorder(Transform parent,WorldSnapshot world,Vector2 start,Vector2 end,float rotation)
        {
            float length=Vector2.Distance(start,end);if(length<.01f||end.x<start.x||end.y<start.y)return;
            for(float distance=2;distance<length;distance+=4)
            {
                var point=Vector2.Lerp(start,end,distance/length);bool opening=false;
                foreach(var corridor in world.corridors)if(corridor.a!=null&&corridor.b!=null&&Vector2.Distance(point,new Vector2((corridor.a.x+corridor.b.x)*.5f,(corridor.a.z+corridor.b.z)*.5f))<4){opening=true;break;}
                if(!opening)art.ProvinceRidge(parent,new Vector3(point.x,0,point.y),rotation,Mathf.RoundToInt(point.x+point.y));
            }
        }

        private void DrawSupply(WorldSnapshot world, string allianceId)
        {
            float radius = TerritoryReach.Radius(world);
            string signature = showSupply ? radius + "|" + (allianceId ?? "") + "|" : "hidden";
            if (showSupply && world?.flags != null)
            {
                foreach (var flag in world.flags)
                {
                    if (!TerritoryReach.Live(flag)) continue;
                    signature += flag.id + ":" + flag.x + ":" + flag.z + ":" + flag.allianceId + ";";
                }
            }
            if (signature == supplySignature) return;
            supplySignature = signature;
            ClearSupplyRings();
            if (!showSupply || radius <= 0 || world?.flags == null) return;
            if (supplyRoot == null)
            {
                var holder = new GameObject("Supply reach");
                holder.transform.SetParent(transform, false);
                supplyRoot = holder.transform;
            }
            foreach (var flag in world.flags)
            {
                if (!TerritoryReach.Live(flag)) continue;
                bool own = !string.IsNullOrEmpty(allianceId) && flag.allianceId == allianceId;
                var ring = art.Ring(supplyRoot, radius, own ? blue : red, 0.14f);
                ring.transform.localPosition = new Vector3(flag.x, 0.08f, flag.z);
            }
        }

        private void ClearSupplyRings()
        {
            if (supplyRoot == null) return;
            for (int i = supplyRoot.childCount - 1; i >= 0; i--) Destroy(supplyRoot.GetChild(i).gameObject);
        }

        private void ClearSupply()
        {
            supplySignature = "";
            if (supplyRoot == null) return;
            Destroy(supplyRoot.gameObject);
            supplyRoot = null;
        }
    }
}
