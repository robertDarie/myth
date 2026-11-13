# TM-077 Diplomacy and coalitions

## Non-aggression pacts

A pact is bilateral and uses alliance ids. Only the leaders of two different alliances can propose and accept it. The invited leader may decline. The proposing leader may withdraw. Either leader may end an active pact. A declined, withdrawn, or expired proposal does not create a pact.

A proposal expires 24 hours after it is created, measured on the monotonic activity clock. An alliance may have four outgoing proposals. The kingdom holds at most 64 pending proposals. One pending proposal may exist between a pair, and an active pact blocks another proposal.

Acceptance is refused while a field battle, attack order, rally, or siege is still open between the alliances. Ending that engagement does not delete troops, cargo, wounded units, or paid jobs. After the pact is active, the server rejects direct PvP, hostile rallies against the partner's beacons, forts, and occupied sacred sites. The same rule applies in both directions. Neutral and unaffiliated armies are unchanged. A pact grants no resources.

Members and officers can read the diplomacy state. Only leaders can sign or end treaties. Another alliance cannot see a proposal that does not involve it, and alliance chat stays inside the alliance.

Disbanding an alliance removes its proposals and pacts. Schema 24 stores the diplomacy book and coalitions. Schema 22 loads an empty book. Schema 23 keeps its pacts and starts with no coalitions. Protocol stays 16.

## Coalitions

A coalition is a named group of at most three existing alliances. It does not replace alliance membership. An alliance belongs to one coalition. A leader founds it, and any current member's leader may invite another alliance. The invited leader must accept. Invitations expire after 24 hours on the activity clock. The invited leader may decline, and a member leader may withdraw an open invitation. A member leader may leave. The founding alliance disbands the coalition instead of leaving it. If the founding alliance itself disbands, the coalition and its chat are removed. If another member alliance disbands, it is removed and the coalition remains while anyone is left.

Joining is refused while a field battle, attack order, rally, or siege is open between the invited alliance and a current member. That refusal does not delete troops, cargo, wounded units, or paid jobs. Members share the same combat protection as a pact, reported as "A coalition pact protects this alliance." A separate bilateral pact stays in force after a coalition ends, and ending a pact does not remove coalition membership. Protection stops as soon as an alliance leaves or the coalition is disbanded.

Coalition chat is a third channel. Only a current member alliance can read or send it. It uses the existing one-second interval, 1–240 character text, and 120-message cap. Disbanding the coalition deletes that channel's messages.

A coalition does not transfer territory, merge beacon networks or supply radii, share fog of war, open another alliance's treasury, count as one alliance for rewards, or allow a cross-alliance rally or garrison. Those permissions stay inside one alliance. Coalition map markers are not part of this package.

Members and officers can read the coalition state. Only leaders can found, invite, answer, leave, or disband.
