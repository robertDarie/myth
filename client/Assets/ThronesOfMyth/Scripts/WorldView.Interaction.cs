using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private sealed class GroundCue { public LineRenderer line; public float until,duration; }
        private readonly GroundCue[] groundCues=new GroundCue[8];
        private int groundCursor;
        public string LatestEncounterTitle {get;private set;}
        public string LatestEncounterDetail {get;private set;}
        public int EncounterSerial {get;private set;}
        private void GroundPulse(Vector3 point,Color color,float duration=.55f)
        {
            int index=groundCursor;groundCursor=(groundCursor+1)%groundCues.Length;var cue=groundCues[index];
            if(cue==null){cue=new GroundCue{line=art.Ring(transform,1,color,.07f)};groundCues[index]=cue;}
            cue.line.sharedMaterial=art.MaterialFor(color);cue.line.transform.position=point;cue.duration=duration;cue.until=Time.unscaledTime+duration;cue.line.gameObject.SetActive(true);
        }
        public void SelectionFeedback(string id)
        {
            if(!pieces.TryGetValue(id,out var piece))return;
            GroundPulse(piece.root.transform.position,MythInterfaceTheme.Gold,.32f);BattlefieldAudio.Cue("select",piece.root.transform.position);
        }
        public void ConfirmDestination(GameCommand command,float homeX,float homeZ)
        {
            Vector3 point;
            if(command.type=="move")point=new Vector3(command.x,0,command.z);
            else if(command.type=="return")point=new Vector3(homeX,0,homeZ);
            else if(!string.IsNullOrEmpty(command.targetId)&&pieces.TryGetValue(command.targetId,out var target))point=target.destination;
            else return;
            GroundPulse(point,command.type=="attack"||command.type=="attack-player"?MythInterfaceTheme.Red:MythInterfaceTheme.Teal,.85f);BattlefieldAudio.Cue("confirm",point);
        }
        private void UpdateGroundCues()
        {
            foreach(var cue in groundCues)
            {
                if(cue==null||!cue.line.gameObject.activeSelf)continue;
                float left=cue.until-Time.unscaledTime;if(left<=0){cue.line.gameObject.SetActive(false);continue;}
                cue.line.transform.localScale=Vector3.one*(reducedMotion?1:.65f+(1-left/cue.duration)*.65f);
            }
        }
        private void RecordEncounter(string title,string detail)
        {LatestEncounterTitle=title;LatestEncounterDetail=detail;EncounterSerial++;}
        private void ClearInteraction()
        {
            foreach(var cue in groundCues)if(cue!=null)cue.line.gameObject.SetActive(false);
            LatestEncounterTitle=null;LatestEncounterDetail=null;EncounterSerial=0;
        }
    }
}
