using UnityEngine;
namespace ThronesOfMyth
{
    // Imported legacy clips drive weighted skeletons; root movement stays server-owned.
    public sealed class AuthoredUnit : MonoBehaviour
    {
        public Animation player;
        public bool commander, mythic, ranged;
        public string formationRole;
        private string current;
        private bool frozen;
        private Vector3 rest,formationVelocity;
        private bool captured;
        private Vector3 combatOffset;
        private Quaternion formationRotation=Quaternion.identity;
        public static void Prepare(Animation animation)
        {
            foreach(string pose in new[]{"Idle","March","Attack","Skill","Retreat","Victory","Gather","Hit"})
            {
                if(animation[pose]!=null)continue;AnimationClip clip=null;
                foreach(AnimationState state in animation)if(state.name.EndsWith(pose)){clip=state.clip;break;}
                if(clip!=null){animation.AddClip(clip,pose);animation[pose].wrapMode=pose=="Idle"||pose=="March"||pose=="Retreat"||pose=="Gather"?WrapMode.Loop:WrapMode.ClampForever;}
            }
        }
        private void OnEnable(){current=null;frozen=false;if(player!=null)player.enabled=true;}
        public void Pose(string state, bool reducedMotion)
        {
            if (player == null) return;
            if (reducedMotion)
            {
                if (!frozen) { player.Play("Idle"); if (player["Idle"] != null) player["Idle"].time = 0; player.Sample(); player.enabled = false; frozen = true; }
                return;
            }
            if (frozen) { player.enabled = true; frozen = false; current = null; }
            if (current == state) return;
            if (player[state] == null) state = "Idle";
            player.CrossFade(state, state == "Hit" ? 0.05f : 0.12f);
            if(state=="Idle"||state=="March"||state=="Gather")player[state].normalizedTime=Mathf.Repeat(transform.localPosition.x*.37f+transform.localPosition.z*.21f,.85f);
            current = state;
        }
        public void FormationMotion(float turn,float walking,bool reducedMotion)
        {
            if(!captured){rest=transform.localPosition;captured=true;}
            transform.localPosition-=combatOffset;combatOffset=Vector3.zero;
            var target=rest+(reducedMotion?Vector3.zero:new Vector3(-turn*(mythic?.10f:.06f),0,-walking*(commander?.025f:.08f)));
            transform.localPosition=reducedMotion?rest:Vector3.SmoothDamp(transform.localPosition,target,ref formationVelocity,.16f);
            formationRotation=reducedMotion?Quaternion.identity:Quaternion.Slerp(formationRotation,Quaternion.Euler(0,-turn*9,0),1-Mathf.Exp(-9*Time.deltaTime));transform.localRotation=formationRotation;
        }
        public void CombatMotion(float attack,float casting,float hit,bool engaged,bool reduced)
        {
            if(reduced)return;
            // Additive, root-local anticipation/lunge; never moves the authoritative army.
            float lunge=ranged?-.04f*attack:.14f*attack;
            combatOffset=new Vector3(0,commander?casting*.035f:0,lunge-hit*.08f);transform.localPosition+=combatOffset;
            transform.localRotation*=Quaternion.Euler(-attack*(ranged?3:6)+hit*5,0,commander?-casting*5:engaged?-2:0);
        }
        public void Restart(string state)
        {
            if (player == null || player[state] == null || frozen) return;
            player[state].time = 0; player.CrossFade(state, 0.06f); current = state;
        }
    }
}
