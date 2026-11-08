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
        private RenderTexture texture;
        private readonly AudioSource ambient;
        private readonly WorldArtFactory art=new WorldArtFactory();
        private readonly Dictionary<string,Transform> districts=new Dictionary<string,Transform>(),cranes=new Dictionary<string,Transform>();
        private Transform[] guards;
        private readonly Dictionary<string,GameObject> plotSeals=new Dictionary<string,GameObject>();
        private readonly Dictionary<string,LineRenderer> districtRings=new Dictionary<string,LineRenderer>();
        private readonly List<Vector3> framingPoints=new List<Vector3>();
        private string hoveredDistrict="";
        private float fittedAspect=-1,fittedYaw=-999;
        private string signature;
        private ArmyData appearanceObserved;
        private readonly List<BuildingCard> labelOrder=new List<BuildingCard>();
        private WorldActorAnimation[] guardActors;
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
            var fillObject=new GameObject("City sky fill");fillObject.transform.SetParent(stage.transform,false);var fill=fillObject.AddComponent<Light>();fill.type=LightType.Directional;fill.cullingMask=1<<30;fill.intensity=.32f;fill.color=new Color(.64f,.79f,1);fillObject.transform.localRotation=Quaternion.Euler(35,145,0);
            ambient=stage.AddComponent<AudioSource>();ambient.playOnAwake=false;ambient.loop=true;ambient.spatialBlend=0;ambient.clip=Resources.Load<AudioClip>("Audio/CityAmbience");
        }
        private static void Layer(Transform root){root.gameObject.layer=30;foreach(Transform child in root)Layer(child);}
        public void SetVisible(bool visible)
        {
            if(stage.activeSelf!=visible)stage.SetActive(visible);
            bool audio=Application.isPlaying&&visible&&BattlefieldAudio.Volume>0&&PlayerPrefs.GetInt("ThronesOfMyth.cityAmbience",1)==1&&ambient.clip!=null;
            ambient.volume=BattlefieldAudio.Volume*.22f;if(audio&&!ambient.isPlaying)ambient.Play();if(!audio&&ambient.isPlaying)ambient.Stop();
        }
        private QueueJob Job(ArmyData city,string id) => CityPresentationData.Job(city,id);
        private void Sync(ArmyData city)
        {
            if(ReferenceEquals(appearanceObserved,city))return;appearanceObserved=city;
            string key=city.civilization;foreach(var b in city.cityBuildings)key+="|"+b.id+":"+b.level;
            if(signature==key)return;signature=key;foreach(Transform child in content){child.gameObject.SetActive(false);UnityEngine.Object.Destroy(child.gameObject);}districts.Clear();cranes.Clear();plotSeals.Clear();districtRings.Clear();framingPoints.Clear();fittedAspect=-1;
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
                if(b.level==0)
                {
                    var seal=new GameObject("Unavailable foundation seal");seal.transform.SetParent(district,false);
                    for(int sign=-1;sign<=1;sign+=2){var beam=art.Shape(seal.transform,PrimitiveType.Cube,new Vector3(0,.14f,0),new Vector3(1.25f,.10f,.10f),new Color(.42f,.37f,.27f));beam.localRotation=Quaternion.Euler(0,sign*40,0);}plotSeals[b.id]=seal;
                }
                var marker=district.gameObject.AddComponent<CityBuildingMarker>();marker.id=b.id;var collider=district.gameObject.AddComponent<BoxCollider>();collider.center=new Vector3(0,.7f,0);collider.size=b.id=="citadel"?new Vector3(3.3f,2.5f,3):new Vector3(1.6f,1.8f,1.5f);districts[b.id]=district;
                var pickBounds=new Bounds(Vector3.up*.3f,new Vector3(1.4f,.6f,1.3f));
                foreach(var renderer in district.GetComponentsInChildren<Renderer>())
                {
                    var local=renderer.localBounds;
                    for(int corner=0;corner<8;corner++)pickBounds.Encapsulate(district.InverseTransformPoint(renderer.transform.TransformPoint(local.center+Vector3.Scale(local.extents,new Vector3((corner&1)==0?-1:1,(corner&2)==0?-1:1,(corner&4)==0?-1:1)))));
                }
                collider.center=pickBounds.center;collider.size=pickBounds.size+Vector3.one*.08f;
                // Capture visual bounds before adding status rings and scaffold overlays.
                foreach(var renderer in district.GetComponentsInChildren<Renderer>())
                {
                    var bounds=renderer.localBounds;
                    for(int corner=0;corner<8;corner++)framingPoints.Add(content.InverseTransformPoint(renderer.transform.TransformPoint(bounds.center+Vector3.Scale(bounds.extents,new Vector3((corner&1)==0?-1:1,(corner&2)==0?-1:1,(corner&4)==0?-1:1)))));
                }
                var ring=art.Ring(district,(b.id=="citadel"?1.8f:1.02f)/district.localScale.x,MythInterfaceTheme.Gold,.04f);districtRings[b.id]=ring;
                var crane=new GameObject("Active construction scaffold").transform;crane.SetParent(district,false);art.Shape(crane,PrimitiveType.Cube,new Vector3(-.7f,.8f,.3f),new Vector3(.07f,1.6f,.07f),new Color(.49f,.34f,.18f));art.Shape(crane,PrimitiveType.Cube,new Vector3(-.20f,1.55f,.3f),new Vector3(1.1f,.06f,.06f),new Color(.49f,.34f,.18f));cranes[b.id]=crane;
            }
            for(int edge=0;edge<32;edge++){float angle=edge*Mathf.PI*2/32;framingPoints.Add(new Vector3(Mathf.Sin(angle)*8,-.45f,Mathf.Cos(angle)*8));}
            guards=new[]{art.CityGuard(content,city.civilization),art.CityGuard(content,city.civilization)};guardActors=new[]{guards[0].GetComponent<WorldActorAnimation>(),guards[1].GetComponent<WorldActorAnimation>()};Layer(content);renderedAt=-1;
        }
        private void FitCity(float aspect)
        {
            if(Mathf.Abs(fittedAspect-aspect)<.001f&&fittedYaw==yaw)return;
            fittedAspect=aspect;fittedYaw=yaw;
            var center=stage.transform.position+Vector3.up*.4f;
            float halfHeight=0,halfWidth=0;
            foreach(var point in framingPoints)
            {
                var relative=content.TransformPoint(point)-center;
                halfHeight=Mathf.Max(halfHeight,Mathf.Abs(Vector3.Dot(relative,camera.transform.up)));
                halfWidth=Mathf.Max(halfWidth,Mathf.Abs(Vector3.Dot(relative,camera.transform.right)));
            }
            camera.orthographicSize=Mathf.Max(halfHeight,halfWidth/Mathf.Max(.1f,aspect))*1.08f;
            renderedAt=-1;
        }
        private int DistrictLabelPriority(ArmyData city,BuildingCard building,string selectedId)
        {
            if(building.id==selectedId)return 0;
            var job=Job(city,building.id);
            return job!=null&&!string.IsNullOrEmpty(job.id)?1:building.level>0?2:3;
        }
        public int Draw(Rect rect,ArmyData city,int selected,MythInterfaceTheme theme,bool reducedMotion,CityProgressFeedback progress=null)
        {
            SetVisible(true);Sync(city);selected=Mathf.Clamp(selected,0,city.cityBuildings.Length-1);content.localRotation=Quaternion.Euler(0,yaw,0);
            foreach(var b in city.cityBuildings)
            {
                var job=Job(city,b.id);bool active=job!=null&&!string.IsNullOrEmpty(job.id);
                bool construction=active&&(job.type=="building"||job.type=="upgrade");cranes[b.id].gameObject.SetActive(construction);
                if(plotSeals.TryGetValue(b.id,out var seal))seal.SetActive(!b.canUpgrade&&!construction);
                var ring=districtRings[b.id];bool chosen=b.id==city.cityBuildings[selected].id;
                bool completed=progress!=null&&progress.IsRecent(b.id,Time.unscaledTime);
                Color status=completed?MythInterfaceTheme.Cream:chosen?MythInterfaceTheme.Gold:active?MythInterfaceTheme.Teal:b.canUpgrade?new Color(.62f,.55f,.31f):new Color(.32f,.38f,.39f);
                ring.sharedMaterial=art.MaterialFor(status);ring.widthMultiplier=completed ? (reducedMotion?.12f:.12f+Mathf.Sin(Time.unscaledTime*6)*.025f):chosen ? .10f:b.id==hoveredDistrict ? .075f:.035f;
                // Construction stays readable with motion disabled; only the crane's idle sway stops.
                cranes[b.id].localRotation=Quaternion.Euler(0,reducedMotion?0:Mathf.Sin(Time.unscaledTime*.8f)*5,0);
            }
            for(int i=0;i<guards.Length;i++){float t=reducedMotion?i*Mathf.PI:Time.unscaledTime*.16f+i*Mathf.PI;guards[i].localPosition=new Vector3(Mathf.Cos(t)*6.5f,0,Mathf.Sin(t)*6.5f);guards[i].localRotation=Quaternion.Euler(0,-t*Mathf.Rad2Deg,0);guardActors[i].reducedMotion=reducedMotion;}
            var image=new Rect(rect.x+5,rect.y+5,rect.width-10,rect.height-45);
            // Match render density to UI scale, capped to keep this inset inexpensive.
            int width=Mathf.Clamp(Mathf.CeilToInt(image.width*Mathf.Abs(GUI.matrix.m00)/16)*16,512,1600);
            int height=Mathf.Clamp(Mathf.CeilToInt(image.height*Mathf.Abs(GUI.matrix.m11)/16)*16,320,1024);
            if(texture.width!=width||texture.height!=height)
            {
                camera.targetTexture=null;texture.Release();UnityEngine.Object.Destroy(texture);
                texture=new RenderTexture(width,height,16,RenderTextureFormat.ARGB32){name="City overview render"};texture.Create();camera.targetTexture=texture;renderedAt=-1;
            }
            camera.aspect=image.width/Mathf.Max(1,image.height);FitCity(camera.aspect);
            hoveredDistrict="";
            if(image.Contains(Event.current.mousePosition))
            {
                var pointer=Event.current.mousePosition;
                var hoverRay=camera.ViewportPointToRay(new Vector3((pointer.x-image.x)/image.width,1-(pointer.y-image.y)/image.height,0));
                Physics.SyncTransforms();if(Physics.Raycast(hoverRay,out var hoverHit,40,1<<30))hoveredDistrict=hoverHit.collider.GetComponentInParent<CityBuildingMarker>()?.id??"";
            }
            if(Event.current.type==EventType.Repaint&&(renderedAt<0||Time.unscaledTime-renderedAt>=1/20f)){camera.Render();renderedAt=Time.unscaledTime;}
            GUI.DrawTexture(image,texture,ScaleMode.StretchToFill,false);
            foreach(var building in city.cityBuildings)
            {
                var job=Job(city,building.id);bool active=job!=null&&!string.IsNullOrEmpty(job.id);
                bool complete=progress!=null&&progress.IsRecent(building.id,Time.unscaledTime);
                if(!active&&!complete&&!building.canUpgrade&&building.level>0)continue;
                var point=camera.WorldToViewportPoint(districts[building.id].position+Vector3.back*.8f+Vector3.up*.12f);
                var badge=new Rect(image.x+point.x*image.width-9,image.y+(1-point.y)*image.height-9,18,18);
                if(!image.Contains(badge.min)||!image.Contains(badge.max))continue;
                theme.Circle(badge,new Color(.045f,.09f,.11f,.95f));
                if(complete)theme.Text(new Rect(badge.x-24,badge.y-2,66,22),"Ready",theme.Eyebrow);
                else if(active||!building.canUpgrade)theme.Icon(new Rect(badge.x+3,badge.y+3,12,12),active?"builders":"lock",active?MythInterfaceTheme.Teal:MythInterfaceTheme.Muted);
                else {MythInterfaceTheme.Line(new Vector2(badge.center.x,badge.y+4),new Vector2(badge.center.x,badge.yMax-4),2,MythInterfaceTheme.Gold);MythInterfaceTheme.Line(new Vector2(badge.x+4,badge.center.y),new Vector2(badge.xMax-4,badge.center.y),2,MythInterfaceTheme.Gold);}
                GUI.Label(badge,new GUIContent("",building.name+" · "+(active?"Working":building.canUpgrade?building.level>0?"Upgrade available":"Ready to build":building.lockedReason)),GUIStyle.none);
            }
            labelBounds.Clear();
            // Selected and working districts get labels first. Unbuilt plots stay quiet
            // until selected; the district list always exposes every institution.
            labelOrder.Clear();labelOrder.AddRange(city.cityBuildings);
            string selectedId=city.cityBuildings[selected].id;
            labelOrder.Sort((a,b)=>DistrictLabelPriority(city,a,selectedId).CompareTo(DistrictLabelPriority(city,b,selectedId)));
            foreach(var b in labelOrder)
            {
                var job=Job(city,b.id);bool active=job!=null&&!string.IsNullOrEmpty(job.id);bool chosen=b.id==selectedId;
                bool completed=progress!=null&&progress.IsRecent(b.id,Time.unscaledTime);
                if(!chosen&&!active&&!completed&&b.id!=hoveredDistrict&&!showDistrictNames)continue;
                var point=camera.WorldToViewportPoint(districts[b.id].position+Vector3.up*1.55f);if(point.z<=0)continue;
                var at=new Vector2(image.x+point.x*image.width,image.y+(1-point.y)*image.height);
                var label=new Rect(at.x-90,at.y-22,180,42);
                bool free=true;foreach(var occupied in labelBounds)if(occupied.Overlaps(label)){free=false;break;}
                if(!free||label.xMin<image.xMin||label.xMax>image.xMax||label.yMin<image.yMin||label.yMax>image.yMax)continue;
                labelBounds.Add(label);MythInterfaceTheme.Fill(label,new Color(.035f,.075f,.085f,.90f));
                theme.OneLine(new Rect(label.x+7,label.y+2,label.width-14,19),b.name,chosen?theme.Eyebrow:theme.Small);
                string detail=completed?"Completed · Level "+b.level:(b.level>0?"Level "+b.level:"Foundation")+" · "+(active?"Working "+Mathf.CeilToInt(job.remaining)+"s":b.canUpgrade?b.level>0?"Upgrade ready":"Build ready":b.level>=b.maxLevel?"Complete":b.level==0?"Not yet buildable":"Upgrade unavailable");
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
