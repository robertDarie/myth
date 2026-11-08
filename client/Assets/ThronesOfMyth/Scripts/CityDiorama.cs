using System;
using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed class CityDiorama : IDisposable
    {
        private readonly GameObject stage;
        private readonly Transform content;
        private readonly Camera camera;
        private readonly RenderTexture texture;
        private readonly AudioSource ambient;
        private readonly WorldArtFactory art=new WorldArtFactory();
        private readonly Dictionary<string,Transform> districts=new Dictionary<string,Transform>(),cranes=new Dictionary<string,Transform>();
        private Transform[] guards;
        private string signature;
        private float renderedAt=-1,yaw;
        private bool showDistrictNames;
        private readonly List<Rect> labelBounds = new List<Rect>();
        private static Vector3 DistrictPosition(string id)
        {
            // Stable functional districts, independent of array order and culture art.
            switch (id)
            {
                case "oracle": return new Vector3(-2.8f,0,2.8f);
                case "academy": return new Vector3(2.8f,0,2.8f);
                case "barracks": return new Vector3(-2.8f,0,-2.8f);
                case "menagerie": return new Vector3(2.8f,0,-2.8f);
                case "farm": return new Vector3(-5.5f,0,-2.3f);
                case "lumber": return new Vector3(-5.5f,0,.3f);
                case "quarry": return new Vector3(5.5f,0,-2.3f);
                case "mint": return new Vector3(5.5f,0,.3f);
                case "well": return new Vector3(-2.8f,0,5.5f);
                case "infirmary": return new Vector3(-2.8f,0,-5.5f);
                case "vault": return new Vector3(2.8f,0,-5.5f);
                case "market": return new Vector3(0,0,5.5f);
                case "oathhall": return new Vector3(2.8f,0,5.5f);
                case "forge": return new Vector3(5.5f,0,3.8f);
                case "builders": return new Vector3(-5.5f,0,3.8f);
                default: return Vector3.zero;
            }
        }
        private void Boulevard(Vector3 destination)
        {
            Vector3 direction = destination; float length = direction.magnitude;
            if (length < .1f) return;
            var road = art.Shape(content,PrimitiveType.Cube,direction*.5f+Vector3.up*.012f,new Vector3(.65f,.035f,length),new Color(.67f,.60f,.46f));
            road.localRotation=Quaternion.LookRotation(direction);
        }
        public CityDiorama()
        {
            stage=new GameObject("Living city overview"){hideFlags=HideFlags.HideAndDontSave};stage.transform.position=new Vector3(3200,0,3200);
            content=new GameObject("City districts").transform;content.SetParent(stage.transform,false);
            var cameraObject=new GameObject("City overview camera");cameraObject.transform.SetParent(stage.transform,false);camera=cameraObject.AddComponent<Camera>();camera.enabled=false;camera.cullingMask=1<<30;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.10f,.17f,.21f);camera.orthographic=true;camera.orthographicSize=8.4f;camera.nearClipPlane=.1f;camera.farClipPlane=40;camera.transform.localPosition=new Vector3(11,15,-17);camera.transform.LookAt(stage.transform.position+Vector3.up*.3f);
            texture=new RenderTexture(1024,640,16,RenderTextureFormat.ARGB32){name="City overview render"};texture.Create();camera.targetTexture=texture;
            var lightObject=new GameObject("City light");lightObject.transform.SetParent(stage.transform,false);var light=lightObject.AddComponent<Light>();light.type=LightType.Directional;light.cullingMask=1<<30;light.intensity=1.1f;light.color=new Color(1,.91f,.75f);lightObject.transform.localRotation=Quaternion.Euler(45,-25,0);
            ambient=stage.AddComponent<AudioSource>();ambient.playOnAwake=false;ambient.loop=true;ambient.spatialBlend=0;ambient.clip=Resources.Load<AudioClip>("Audio/CityAmbience");
        }
        private static void Layer(Transform root){root.gameObject.layer=30;foreach(Transform child in root)Layer(child);}
        public void SetVisible(bool visible)
        {
            if(stage.activeSelf!=visible)stage.SetActive(visible);
            bool audio=Application.isPlaying&&visible&&BattlefieldAudio.Volume>0&&PlayerPrefs.GetInt("ThronesOfMyth.cityAmbience",1)==1&&ambient.clip!=null;
            ambient.volume=BattlefieldAudio.Volume*.22f;if(audio&&!ambient.isPlaying)ambient.Play();if(!audio&&ambient.isPlaying)ambient.Stop();
        }
        private QueueJob Job(ArmyData city,string id)
        {
            foreach(var job in new[]{city.construction,city.secondConstruction})if(job!=null&&!string.IsNullOrEmpty(job.id)&&(job.targetId==id||job.type=="upgrade"&&id=="citadel"))return job;
            if(id=="academy")return city.research;if(id=="forge")return city.crafting;if(id=="barracks"&&city.trainingQueue.Length>0)return city.trainingQueue[0];return null;
        }
        private void Sync(ArmyData city)
        {
            string key=city.civilization;foreach(var b in city.cityBuildings)key+="|"+b.id+":"+b.level;
            if(signature==key)return;signature=key;foreach(Transform child in content){child.gameObject.SetActive(false);UnityEngine.Object.Destroy(child.gameObject);}districts.Clear();cranes.Clear();
            art.Shape(content,PrimitiveType.Cylinder,new Vector3(0,-.23f,0),new Vector3(16,.22f,16),new Color(.36f,.42f,.29f));
            art.Shape(content,PrimitiveType.Cylinder,new Vector3(0,-.08f,0),new Vector3(15.5f,.08f,15.5f),new Color(.43f,.51f,.32f));
            foreach (var building in city.cityBuildings) Boulevard(DistrictPosition(building.id));
            Boulevard(new Vector3(0,0,-7.6f));
            art.Shape(content,PrimitiveType.Cylinder,new Vector3(0,.025f,0),new Vector3(4.2f,.045f,4.2f),new Color(.75f,.69f,.55f));
            // Civic edge and open southern gate are presentation, not city defenses.
            for(int edge=0;edge<28;edge++)
            {
                float angle=edge*Mathf.PI*2/28;if(edge>=12&&edge<=15)continue;
                var at=new Vector3(Mathf.Sin(angle)*7.1f,.30f,Mathf.Cos(angle)*7.1f);
                var wall=art.Shape(content,PrimitiveType.Cube,at,new Vector3(1.55f,.55f,.30f),new Color(.66f,.62f,.51f));wall.localRotation=Quaternion.Euler(0,angle*Mathf.Rad2Deg,0);
                if(edge%3==0)art.Shape(content,PrimitiveType.Cylinder,at+Vector3.up*.20f,new Vector3(.52f,.53f,.52f),new Color(.74f,.69f,.57f));
            }
            foreach(var at in new[]{new Vector3(-4,0,-.6f),new Vector3(4,0,-.6f),new Vector3(-.8f,0,4),new Vector3(.8f,0,-4)})
                art.EnvironmentModel(content,city.civilization=="norse"?"PineTree":"OakTree",at,.42f,new Color(.30f,.47f,.25f),35);
            art.Shape(content,PrimitiveType.Cylinder,new Vector3(0,.10f,-3.2f),new Vector3(.9f,.12f,.9f),new Color(.71f,.68f,.58f));
            art.Shape(content,PrimitiveType.Cylinder,new Vector3(0,.25f,-3.2f),new Vector3(.64f,.04f,.64f),new Color(.24f,.52f,.58f));
            for(int i=0;i<city.cityBuildings.Length;i++)
            {
                var b=city.cityBuildings[i];var district=art.Institution(content,b.id,city.civilization,b.level,MythInterfaceTheme.Teal);district.localPosition=DistrictPosition(b.id);
                var marker=district.gameObject.AddComponent<CityBuildingMarker>();marker.id=b.id;var collider=district.gameObject.AddComponent<BoxCollider>();collider.center=new Vector3(0,.7f,0);collider.size=b.id=="citadel"?new Vector3(3.3f,2.5f,3):new Vector3(1.6f,1.8f,1.5f);districts[b.id]=district;
                var crane=new GameObject("Active construction scaffold").transform;crane.SetParent(district,false);art.Shape(crane,PrimitiveType.Cube,new Vector3(-.7f,.8f,.3f),new Vector3(.07f,1.6f,.07f),new Color(.49f,.34f,.18f));art.Shape(crane,PrimitiveType.Cube,new Vector3(-.20f,1.55f,.3f),new Vector3(1.1f,.06f,.06f),new Color(.49f,.34f,.18f));cranes[b.id]=crane;
            }
            guards=new[]{art.CityGuard(content,city.civilization),art.CityGuard(content,city.civilization)};Layer(content);renderedAt=-1;
        }
        private int DistrictLabelPriority(ArmyData city,BuildingCard building,string selectedId)
        {
            if(building.id==selectedId)return 0;
            var job=Job(city,building.id);
            return job!=null&&!string.IsNullOrEmpty(job.id)?1:building.level>0?2:3;
        }
        public int Draw(Rect rect,ArmyData city,int selected,MythInterfaceTheme theme,bool reducedMotion)
        {
            SetVisible(true);Sync(city);selected=Mathf.Clamp(selected,0,city.cityBuildings.Length-1);content.localRotation=Quaternion.Euler(0,yaw,0);
            foreach(var b in city.cityBuildings){var job=Job(city,b.id);bool construction=job!=null&&(job.type=="building"||job.type=="upgrade");cranes[b.id].gameObject.SetActive(construction);}
            for(int i=0;i<guards.Length;i++){float t=reducedMotion?i*Mathf.PI:Time.unscaledTime*.16f+i*Mathf.PI;guards[i].localPosition=new Vector3(Mathf.Cos(t)*6.5f,0,Mathf.Sin(t)*6.5f);guards[i].localRotation=Quaternion.Euler(0,-t*Mathf.Rad2Deg,0);guards[i].GetComponent<WorldActorAnimation>().reducedMotion=reducedMotion;}
            var image=new Rect(rect.x+5,rect.y+5,rect.width-10,rect.height-45);
            camera.aspect=image.width/Mathf.Max(1,image.height);
            if(Event.current.type==EventType.Repaint&&(renderedAt<0||Time.unscaledTime-renderedAt>=1/20f)){camera.Render();renderedAt=Time.unscaledTime;}
            GUI.DrawTexture(image,texture,ScaleMode.StretchToFill,false);
            labelBounds.Clear();
            // Selected and working districts get labels first. Unbuilt plots stay quiet
            // until selected; the district list always exposes every institution.
            var labelOrder=new List<BuildingCard>(city.cityBuildings);
            string selectedId=city.cityBuildings[selected].id;
            labelOrder.Sort((a,b)=>DistrictLabelPriority(city,a,selectedId).CompareTo(DistrictLabelPriority(city,b,selectedId)));
            foreach(var b in labelOrder)
            {
                var job=Job(city,b.id);bool active=job!=null&&!string.IsNullOrEmpty(job.id);bool chosen=b.id==selectedId;
                if(!chosen&&!active&&!showDistrictNames)continue;
                var point=camera.WorldToViewportPoint(districts[b.id].position+Vector3.up*1.55f);if(point.z<=0)continue;
                var at=new Vector2(image.x+point.x*image.width,image.y+(1-point.y)*image.height);
                var label=new Rect(at.x-90,at.y-22,180,42);
                bool free=true;foreach(var occupied in labelBounds)if(occupied.Overlaps(label)){free=false;break;}
                if(!free||label.xMin<image.xMin||label.xMax>image.xMax||label.yMin<image.yMin||label.yMax>image.yMax)continue;
                labelBounds.Add(label);MythInterfaceTheme.Fill(label,new Color(.035f,.075f,.085f,.90f));
                theme.OneLine(new Rect(label.x+7,label.y+2,label.width-14,19),b.name,chosen?theme.Eyebrow:theme.Small);
                string detail=(b.level>0?"Level "+b.level:"Unbuilt district")+(active?" · "+Mathf.CeilToInt(job.remaining)+"s":"");
                theme.OneLine(new Rect(label.x+7,label.y+20,label.width-14,19),detail,theme.Small);
                if(active&&job.duration>0)theme.Bar(new Rect(label.x+7,label.yMax-3,label.width-14,3),1-job.remaining/job.duration,MythInterfaceTheme.Teal);
            }
            if(Event.current.type==EventType.MouseDown&&Event.current.button==0&&image.Contains(Event.current.mousePosition))
            {
                var p=Event.current.mousePosition;var ray=camera.ViewportPointToRay(new Vector3((p.x-image.x)/image.width,1-(p.y-image.y)/image.height,0));
                Physics.SyncTransforms();if(Physics.Raycast(ray,out var hit,40,1<<30)){var marker=hit.collider.GetComponentInParent<CityBuildingMarker>();if(marker!=null)selected=Mathf.Max(0,Array.FindIndex(city.cityBuildings,b=>b.id==marker.id));}Event.current.Use();
            }
            if(theme.Button(new Rect(rect.x+10,rect.yMax-34,70,26),"Rotate ↶"))yaw-=30;
            if(theme.Button(new Rect(rect.x+86,rect.yMax-34,70,26),"Rotate ↷"))yaw+=30;
            if(theme.Button(new Rect(rect.x+162,rect.yMax-34,120,26),showDistrictNames?"Hide names":"District names"))showDistrictNames=!showDistrictNames;
            theme.OneLine(new Rect(rect.x+294,rect.yMax-33,rect.width-304,27),"Select a building · live queues",theme.Small);return selected;
        }
        public void Dispose(){ambient.Stop();camera.targetTexture=null;texture.Release();UnityEngine.Object.Destroy(texture);UnityEngine.Object.Destroy(stage);art.Dispose();}
    }
}
