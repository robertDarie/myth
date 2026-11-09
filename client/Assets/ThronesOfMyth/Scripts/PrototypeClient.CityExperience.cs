using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private readonly CityExperienceState cityExperience=new CityExperienceState();
        private Camera kingdomView;
        private int kingdomLayers;
        private Vector3 kingdomReturnFocus;
        private float kingdomReturnZoom;
        private bool kingdomViewSaved;
        private string cityExperienceServer="",cityExperienceOwner="";
        private float CitySideWidth=>Mathf.Clamp(ViewWidth*.25f,280,340);
        private Rect CityCanvas=>new Rect(0,144,Mathf.Max(1,ViewWidth-CitySideWidth-24),Mathf.Max(1,ViewHeight-278));
        private void BeginCity()
        {
            if(me==null||LoadingActive)return;
            if(!cityExperience.BlocksWorld&&cameraControl!=null&&kingdomView!=null){kingdomReturnFocus=cameraControl.FocusPoint;kingdomReturnZoom=kingdomView.orthographicSize;kingdomViewSaved=true;}
            cityExperience.SetCity(true);cityExperience.Advance(0,reducedMotion);
            placeBeacon=false;chooseScoutDestination=false;selectedId="";if(map!=null)map.selectedId="";
            interfacePage=InterfacePage.City;opening.CityViewed=true;
            cameraControl?.SetView(new Vector3(me.homeX,0,me.homeZ),cameraControl.MinimumZoom,reducedMotion);
        }
        private void ExitCity(bool restoreView=true)
        {
            cityExperience.SetCity(false);cityExperience.Advance(0,reducedMotion);interfacePage=InterfacePage.World;
            if(restoreView&&kingdomViewSaved)cameraControl?.SetView(kingdomReturnFocus,kingdomReturnZoom,reducedMotion);
            GUIUtility.keyboardControl=0;
        }
        private void ShowKingdomForTarget()
        {
            placeBeacon=false;chooseScoutDestination=false;
            if(cityExperience.BlocksWorld)ExitCity(false);else interfacePage=InterfacePage.World;
        }
        private void ResetCityExperience()
        {
            if(kingdomViewSaved&&cameraControl!=null)cameraControl.SetView(kingdomReturnFocus,kingdomReturnZoom,true);
            cityExperience.Reset();kingdomViewSaved=false;cityDiorama?.SetVisible(false);cityDiorama?.ResetView();
            if(kingdomView!=null)kingdomView.cullingMask=kingdomLayers;
        }
        private void TickCityExperience()
        {
            if(serverUrl!=cityExperienceServer||playerId!=cityExperienceOwner||me==null||string.IsNullOrEmpty(token)){ResetCityExperience();cityExperienceServer=serverUrl;cityExperienceOwner=playerId;return;}
            // Map-target flows can assign World directly; preserve their requested focus.
            if(interfacePage==InterfacePage.City&&!cityExperience.TargetCity)BeginCity();
            else if(interfacePage==InterfacePage.World&&cityExperience.TargetCity)ExitCity(false);
            cityExperience.Advance(Time.unscaledDeltaTime,reducedMotion);
            if(kingdomView!=null)kingdomView.cullingMask=!LoadingActive&&cityExperience.Blend>=1?0:kingdomLayers;
        }
        private bool HandleCityKeys()
        {
            if(!cityExperience.BlocksWorld)return false;
            if(GUIUtility.keyboardControl!=0&&interfacePage!=InterfacePage.City)return true;
            if(Input.GetKeyDown(KeyCode.C)){if(interfacePage==InterfacePage.City)ExitCity();else {interfacePage=InterfacePage.City;cityModelView=true;}return true;}
            if(Input.GetKeyDown(KeyCode.K)){OpenInterface(InterfacePage.Heroes);return true;}
            if(Input.GetKeyDown(KeyCode.L)){OpenInterface(InterfacePage.Alliance);return true;}
            if(interfacePage!=InterfacePage.City||!cityExperience.CanPickCity)return true;
            if(Input.GetKeyDown(KeyCode.Q))cityDiorama?.Rotate(-30);
            if(Input.GetKeyDown(KeyCode.E))cityDiorama?.Rotate(30);
            if(Input.GetKeyDown(KeyCode.Home))cityDiorama?.ResetView();
            if(Input.GetKeyDown(KeyCode.Tab)){selectedBuilding=CitySelection.Step(selectedBuilding,Input.GetKey(KeyCode.LeftShift)||Input.GetKey(KeyCode.RightShift)?-1:1,me.cityBuildings.Length);contentScroll=Vector2.zero;}
            return true;
        }
        private void DrawCityScene()
        {
            if(!cityExperience.BlocksWorld||me?.cityBuildings==null)return;
            if(cityDiorama==null)cityDiorama=new CityDiorama();
            Color before=GUI.color;GUI.color=new Color(before.r,before.g,before.b,before.a*cityExperience.Blend);
            MythInterfaceTheme.Fill(new Rect(0,98,ViewWidth,ViewHeight-180),new Color(.10f,.17f,.18f,cityExperience.Blend));
            int old=selectedBuilding;
            selectedBuilding=cityDiorama.Draw(CityCanvas,me,selectedBuilding,theme,reducedMotion,cityProgress,true,cityExperience.CanPickCity&&interfacePage==InterfacePage.City&&cityModelView&&!(NotificationVisible&&NotificationRect.Contains(Event.current.mousePosition)),cityExperience.Blend);
            if(old!=selectedBuilding){contentScroll=Vector2.zero;BattlefieldAudio.UiCue("confirm");}
            GUI.color=before;
        }
        private void DrawImmersiveCity()
        {
            opening.CityViewed=true;
            theme.OneLine(new Rect(18,106,ViewWidth-CitySideWidth-50,30),me.name+" · "+me.ageName,theme.Heading);
            if(theme.Button(new Rect(ViewWidth-CitySideWidth-18,106,CitySideWidth,32),"Return to kingdom [C / Esc]",true)){ExitCity();return;}
            var detail=new Rect(ViewWidth-CitySideWidth-18,154,CitySideWidth,ViewHeight-292);theme.Panel(detail,false,true);
            GUILayout.BeginArea(new Rect(detail.x+14,detail.y+12,detail.width-28,detail.height-24));contentScroll=GUILayout.BeginScrollView(contentScroll);
            var cue=Opening;if(cue!=null){GUILayout.Label("FIRST STEPS · "+cue.Number+" / 8",theme.Eyebrow);GUILayout.Label(cue.Title,theme.Heading);GUILayout.Label(cue.Hint,theme.Small);if(theme.Action("Show next step",!processing,"Sending your order…"))GuideOpening(cue);GUILayout.Space(12);}
            selectedBuilding=Mathf.Clamp(selectedBuilding,0,me.cityBuildings.Length-1);var selected=me.cityBuildings[selectedBuilding];
            GUILayout.Label(selected.category.ToUpperInvariant(),theme.Eyebrow);GUILayout.Label(selected.name,theme.Heading);GUILayout.Label("Level "+selected.level+" / "+selected.maxLevel,theme.Small);
            GUILayout.Label(selected.description,theme.Body);
            var job=CityPresentationData.Job(me,selected.id);
            if(job!=null&&!string.IsNullOrEmpty(job.id))DrawJob(job,JobName(job),false);
            if(selected.level<selected.maxLevel&&CityPresentationData.Construction(me,selected.id)==null)
            {
                GUILayout.Label(Cost(selected.nextCost)+" · "+Mathf.CeilToInt(selected.nextDuration)+"s",theme.Small);
                string reason=processing?"Sending your order…":pendingOrder!=null?"Confirm the previous order first.":!cityExperience.CanPickCity?"Entering your city…":selected.lockedReason;
                if(theme.Action(selected.level==0?"Construct":"Upgrade to level "+(selected.level+1),selected.canUpgrade&&!processing&&pendingOrder==null&&cityExperience.CanPickCity,reason))Send("building-upgrade",selected.id);
            }
            if(selected.level<selected.maxLevel)DrawPrerequisites(selected.prerequisites);
            var destination=CitySelection.Institution(selected.id);
            if(destination!=InterfacePage.City&&theme.Action("Open "+GameNavigation.Title(destination),selected.level>0,selected.level>0?"":"Construct this institution first."))OpenInterface(destination);
            GUILayout.Space(10);int busy=(HasJob(me.construction)?1:0)+(HasJob(me.secondConstruction)?1:0);
            GUILayout.Label("Crews · "+busy+" / "+me.constructionSlots+" busy",theme.Eyebrow);
            CityQueueLink(me.construction);CityQueueLink(me.secondConstruction);
            GUILayout.Label("Training · "+me.trainingQueue.Length+" / 3 orders",theme.Eyebrow);
            if(me.trainingQueue.Length>0)CityQueueLink(me.trainingQueue[0]);
            if(theme.Action("Train / promote troops",!processing,""))OpenInterface(InterfacePage.Training);
            if(theme.Action("Inventory & speedups",!processing,""))OpenInterface(InterfacePage.Inventory);
            GUILayout.EndScrollView();GUILayout.EndArea();
            float y=ViewHeight-124;
            if(theme.Button(new Rect(18,y,68,30),"↶ [Q]"))cityDiorama?.Rotate(-30);
            if(theme.Button(new Rect(92,y,68,30),"↷ [E]"))cityDiorama?.Rotate(30);
            if(theme.Button(new Rect(166,y,54,30),"−"))cityDiorama?.Zoom(-.15f);
            if(theme.Button(new Rect(226,y,54,30),"+"))cityDiorama?.Zoom(.15f);
            if(theme.Button(new Rect(286,y,94,30),"Fit [Home]"))cityDiorama?.ResetView();
            if(theme.Button(new Rect(386,y,120,30),"District list")){cityModelView=false;contentScroll=Vector2.zero;}
            theme.OneLine(new Rect(18,y-23,CityCanvas.width-28,20),"Select a building · Scroll to zoom · Tab / Shift+Tab select districts",theme.Small);
        }
        private void CityQueueLink(QueueJob job)
        {
            if(!HasJob(job))return;
            if(GUILayout.Button(JobName(job)+" · "+Mathf.CeilToInt(job.remaining)+"s",theme.Tab)){if(job.type=="train"||job.type=="promote"||job.type=="recruit")OpenInterface(InterfacePage.Training);else selectedBuilding=CitySelection.Find(me.cityBuildings,job.type=="upgrade"?"citadel":job.targetId,selectedBuilding);}
        }
    }
}
