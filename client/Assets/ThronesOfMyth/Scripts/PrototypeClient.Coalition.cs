using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private bool showCoalition;
        private string coalitionName = "Northern Oath";
        private string coalitionChat = "";
        private void DrawCoalition()
        {
            var state = world.coalition;
            if (state == null)
            {
                GUILayout.Label("Coalition state has not arrived from the kingdom yet.", noteStyle);
                return;
            }
            GUILayout.Label("COALITION", theme.Eyebrow);
            GUILayout.Label(state.limitations, noteStyle);
            GUILayout.Label(state.canLead ? "You can found, invite, answer, leave or disband." : state.lockReason, noteStyle);
            if (string.IsNullOrEmpty(state.id))
            {
                coalitionName = GUILayout.TextField(coalitionName ?? "", 24);
                GUI.enabled = state.canLead && !processing;
                if (GUILayout.Button("Found coalition", theme.Primary)) Send(new GameCommand { type = "coalition-create", name = coalitionName });
                GUI.enabled = true;
            }
            else
            {
                GUILayout.Label(state.name + (state.founder ? " · Founding alliance" : " · Member alliance"), sectionStyle);
                if (state.members != null) foreach (var member in state.members)
                    GUILayout.Label(member.name + " · Leader " + member.leaderName + (member.founder ? " · Founder" : ""), noteStyle);
                coalitionChat = GUILayout.TextField(coalitionChat ?? "", 240);
                GUI.enabled = !processing;
                if (GUILayout.Button("Send coalition message", theme.Primary)) Send(new GameCommand { type = "chat-send", targetId = "coalition", name = coalitionChat });
                GUI.enabled = true;
                if (world.chatMessages != null) foreach (var message in world.chatMessages)
                    if (message.channel == "coalition") GUILayout.Label(message.author + ": " + message.text, theme.Small);
            }
            if (state.incoming != null) foreach (var invite in state.incoming)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label("Invitation · " + invite.name + " · " + ActivityResetText(invite.remainingSeconds), sectionStyle);
                GUI.enabled = state.canLead && !processing;
                if (GUILayout.Button("Accept invitation", theme.Primary)) Send(new GameCommand { type = "coalition-accept", targetId = invite.id });
                if (GUILayout.Button("Decline invitation")) Send(new GameCommand { type = "coalition-decline", targetId = invite.id });
                GUI.enabled = true;
                GUILayout.EndVertical();
            }
            if (state.outgoing != null) foreach (var invite in state.outgoing)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label("Outgoing invitation · " + invite.name + " · " + ActivityResetText(invite.remainingSeconds), sectionStyle);
                GUI.enabled = state.canLead && !processing;
                if (GUILayout.Button("Withdraw invitation")) Send(new GameCommand { type = "coalition-withdraw", targetId = invite.id });
                GUI.enabled = true;
                GUILayout.EndVertical();
            }
            if (state.canInvite && world.diplomacy != null && world.diplomacy.alliances != null) foreach (var alliance in world.diplomacy.alliances)
            {
                if (alliance.relationship == "coalition") continue;
                GUI.enabled = !processing;
                if (GUILayout.Button("Invite " + alliance.name)) Send(new GameCommand { type = "coalition-invite", targetId = alliance.id });
                GUI.enabled = true;
            }
            GUI.enabled = state.canLeave && !processing;
            if (state.canLeave && GUILayout.Button("Leave coalition")) Send(new GameCommand { type = "coalition-leave" });
            GUI.enabled = state.canDisband && !processing;
            if (state.canDisband && GUILayout.Button("Disband coalition")) Send(new GameCommand { type = "coalition-disband" });
            GUI.enabled = true;
        }
    }
}
