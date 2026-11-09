using System;
using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private readonly FirstSessionGuide opening=new FirstSessionGuide();
        private readonly HashSet<string> claimedFeedback=new HashSet<string>();
        private string feelProfile;
        private int encounterShown;
        private bool openingEnabled=true;
        private OpeningCue Opening => openingEnabled&&me!=null?opening.Next(me,ActiveArmy):null;
        private void ObserveSessionFeel()
        {
            string identity=serverUrl.TrimEnd('/')+"/"+playerId;
            opening.Profile(identity);
            if(feelProfile!=identity){feelProfile=identity;claimedFeedback.Clear();encounterShown=0;}
            if(!worldReady)encounterShown=0;
            if(map.EncounterSerial!=encounterShown)
            {
                encounterShown=map.EncounterSerial;
                if(pendingOrder==null&&!processing){status=map.LatestEncounterTitle+" · "+map.LatestEncounterDetail;toastUntil=Time.unscaledTime+6;}
            }
        }
        private void GuideOpening(OpeningCue cue)
        {
            if(cue.Guide=="prepare"){PrepareCityMarch();return;}
            if(cue.Guide=="outcome"){opening.OutcomeViewed=true;GuidePage(InterfacePage.Reports);return;}
            if(cue.Guide=="return")
            {
                if(ActiveArmy.state=="Returning")GuidePage(InterfacePage.City);
                else {Send("return");interfacePage=InterfacePage.World;cameraControl?.Focus(ActiveArmy.x,ActiveArmy.z);}
                return;
            }
            GuideObjective(new JourneyTask{guide=cue.Guide,targetId=cue.Target});
        }
        private string ClaimRewardPreview(GameCommand command)
        {
            var activityReward=ActivityRewardPreview.Find(command,world?.activity);if(activityReward!=null)return JourneyRewardText(activityReward);
            if(me?.journeyCampaign?.chapters==null)return null;
            foreach(var chapter in me.journeyCampaign.chapters)
            {
                if(command.type=="chapter-claim"&&chapter.id==command.targetId&&chapter.canClaim)return JourneyRewardText(chapter.reward)+(string.IsNullOrEmpty(chapter.commanderReward)?"":" · "+HeroName(chapter.commanderReward));
                foreach(var task in chapter.tasks)if(command.type=="journey-claim"&&task.id==command.targetId&&task.canClaim)return JourneyRewardText(task.reward);
            }
            return null;
        }
        private void OnConfirmedCommand(GameCommand command)
        {
            map.ConfirmDestination(command,me.homeX,me.homeZ);
            if(command.type=="configure-march"||command.type=="deploy-march")opening.ArmyPrepared=true;
            switch(command.type)
            {
                case "building-upgrade":case "upgrade":case "train":case "promote":case "research":case "configure-march":case "deploy-march":case "upgrade-skill":case "promote-commander":case "upgrade-commander":BattlefieldAudio.UiCue("confirm");break;
            }
        }
    }
}
