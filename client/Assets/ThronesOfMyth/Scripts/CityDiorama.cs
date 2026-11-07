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
        public CityDiorama()
        {
            stage=new GameObject("Living city overview"){hideFlags=HideFlags.HideAndDontSave};stage.transform.position=new Vector3(3200,0,3200);
            content=new GameObject("City districts").transform;content.SetParent(stage.transform,false);
            var cameraObject=new GameObject("City overview camera");cameraObject.transform.SetParent(stage.transform,false);camera=cameraObject.AddComponent<Camera>();camera.enabled=false;camera.cullingMask=1<<30;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.10f,.17f,.21f);camera.orthographic=true;camera.orthographicSize=6.6f;camera.nearClipPlane=.1f;camera.farClipPlane=40;camera.transform.localPosition=new Vector3(8,11,-12);camera.transform.LookAt(stage.transform.position+Vector3.up*.3f);
            texture=new RenderTexture(768,512,16,RenderTextureFormat.ARGB32){name="City overview render"};texture.Create();camera.targetTexture=texture;
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
            art.Shape(content,PrimitiveType.Cube,new Vector3(0,-.16f,0),new Vector3(10.4f,.3f,10.4f),new Color(.40f,.49f,.32f));
            for(int i=0;i<city.cityBuildings.Length;i++)
            {
                var b=city.cityBuildings[i];var district=art.Institution(content,b.id,city.civilization,b.level,MythInterfaceTheme.Teal);district.localPosition=i==0?Vector3.zero:new Vector3(((i-1)%4-1.5f)*2.5f,0,((i-1)/4-1.5f)*2.5f);
                var marker=district.gameObject.AddComponent<CityBuildingMarker>();marker.id=b.id;var collider=district.gameObject.AddComponent<BoxCollider>();collider.center=new Vector3(0,.7f,0);collider.size=b.id=="citadel"?new Vector3(3.3f,2.5f,3):new Vector3(1.6f,1.8f,1.5f);districts[b.id]=district;
                var crane=new GameObject("Active construction scaffold").transform;crane.SetParent(district,false);art.Shape(crane,PrimitiveType.Cube,new Vector3(-.7f,.8f,.3f),new Vector3(.07f,1.6f,.07f),new Color(.49f,.34f,.18f));art.Shape(crane,PrimitiveType.Cube,new Vector3(-.20f,1.55f,.3f),new Vector3(1.1f,.06f,.06f),new Color(.49f,.34f,.18f));cranes[b.id]=crane;
            }
            guards=new[]{art.CityGuard(content,city.civilization),art.CityGuard(content,city.civilization)};Layer(content);renderedAt=-1;
        }
        public int Draw(Rect rect,ArmyData city,int selected,MythInterfaceTheme theme,bool reducedMotion)
        {
            SetVisible(true);Sync(city);selected=Mathf.Clamp(selected,0,city.cityBuildings.Length-1);content.localRotation=Quaternion.Euler(0,yaw,0);
            foreach(var b in city.cityBuildings){var job=Job(city,b.id);bool construction=job!=null&&(job.type=="building"||job.type=="upgrade");cranes[b.id].gameObject.SetActive(construction);}
            for(int i=0;i<guards.Length;i++){float t=reducedMotion?i*Mathf.PI:Time.unscaledTime*.16f+i*Mathf.PI;guards[i].localPosition=new Vector3(Mathf.Cos(t)*4.5f,0,Mathf.Sin(t)*4.5f);guards[i].localRotation=Quaternion.Euler(0,-t*Mathf.Rad2Deg,0);guards[i].GetComponent<WorldActorAnimation>().reducedMotion=reducedMotion;}
            var image=new Rect(rect.x+5,rect.y+5,rect.width-10,rect.height-45);
            if(Event.current.type==EventType.Repaint&&(renderedAt<0||Time.unscaledTime-renderedAt>=1/20f)){camera.Render();renderedAt=Time.unscaledTime;}
            GUI.DrawTexture(image,texture,ScaleMode.StretchToFill,false);
            foreach(var b in city.cityBuildings)
            {
                var point=camera.WorldToViewportPoint(districts[b.id].position+Vector3.up*1.55f);if(point.z<=0)continue;var at=new Vector2(image.x+point.x*image.width,image.y+(1-point.y)*image.height);var job=Job(city,b.id);string label=b.name+"\n"+(b.level>0?"Lv "+b.level:"Foundation")+(job!=null&&!string.IsNullOrEmpty(job.id)?" · "+Mathf.CeilToInt(job.remaining)+"s":"");
                theme.Text(new Rect(at.x-70,at.y-22,140,40),label,new GUIStyle(theme.Center){fontSize=10,normal={textColor=city.cityBuildings[selected].id==b.id?MythInterfaceTheme.Gold:MythInterfaceTheme.Cream}});
                if(job!=null&&job.duration>0)theme.Bar(new Rect(at.x-30,at.y+19,60,5),1-job.remaining/job.duration,MythInterfaceTheme.Teal);
            }
            if(Event.current.type==EventType.MouseDown&&Event.current.button==0&&image.Contains(Event.current.mousePosition))
            {
                var p=Event.current.mousePosition;var ray=camera.ViewportPointToRay(new Vector3((p.x-image.x)/image.width,1-(p.y-image.y)/image.height,0));
                Physics.SyncTransforms();if(Physics.Raycast(ray,out var hit,40,1<<30)){var marker=hit.collider.GetComponentInParent<CityBuildingMarker>();if(marker!=null)selected=Mathf.Max(0,Array.FindIndex(city.cityBuildings,b=>b.id==marker.id));}Event.current.Use();
            }
            if(theme.Button(new Rect(rect.x+10,rect.yMax-34,70,26),"Rotate ↶"))yaw-=30;
            if(theme.Button(new Rect(rect.x+86,rect.yMax-34,70,26),"Rotate ↷"))yaw+=30;
            theme.Text(new Rect(rect.x+168,rect.yMax-33,rect.width-178,27),"Select a district · progress reflects your live queues",theme.Small);return selected;
        }
        public void Dispose(){ambient.Stop();camera.targetTexture=null;texture.Release();UnityEngine.Object.Destroy(texture);UnityEngine.Object.Destroy(stage);art.Dispose();}
    }
}
