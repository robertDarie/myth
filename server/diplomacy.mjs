import { randomUUID } from 'node:crypto';
import { activityClock } from './activity.mjs';

const DAY = 86400000;
const MAX_OUTGOING = 4;
const MAX_PROPOSALS = 64;
const empty = () => ({ proposals: [], pacts: [] });
const ordered = (a, b) => a < b ? [a, b] : [b, a];

export function ensureDiplomacy(w) {
  w.diplomacy ??= empty();
  w.coalitions ??= [];
  w.coalitionInvites ??= [];
  const { now } = activityClock(w);
  w.diplomacy.proposals = w.diplomacy.proposals.filter(proposal => proposal.expiresAt > now);
  w.coalitionInvites = w.coalitionInvites.filter(invite => invite.expiresAt > now && w.coalitions.some(coalition => coalition.id === invite.coalitionId));
}

export function pactBetween(w, a, b) {
  if (!a || !b || a === b) return null;
  const [low, high] = ordered(a, b);
  return (w.diplomacy?.pacts ?? []).find(pact => pact.low === low && pact.high === high) ?? null;
}

export function coalitionOf(w, allianceId) {
  if (!allianceId) return null;
  return (w.coalitions ?? []).find(coalition => coalition.members.includes(allianceId)) ?? null;
}

export function protectionReason(w, a, b) {
  if (!a || !b || a === b) return '';
  if (pactBetween(w, a, b)) return 'A non-aggression pact protects this alliance.';
  const left = coalitionOf(w, a), right = coalitionOf(w, b);
  if (left && right && left.id === right.id) return 'A coalition pact protects this alliance.';
  return '';
}

export function protectedAlliance(w, a, b) {
  return protectionReason(w, a, b) !== '';
}

export function engagementBetween(w, a, b) {
  if (!a || !b || a === b) return '';
  for (const battle of w.battles.values()) {
    const sides = battle.sides.map(side => w.players.get(side.playerId)?.allianceId);
    if (sides.includes(a) && sides.includes(b)) return 'A field battle is still under way between these alliances.';
  }
  for (const army of w.armies()) {
    if (army.target?.type !== 'pvp') continue;
    const other = w.army(army.target.id);
    if (!other) continue;
    const left = w.owner(army).allianceId, right = w.owner(other).allianceId;
    if ((left === a && right === b) || (left === b && right === a)) return 'A march is still ordered against that alliance.';
  }
  for (const rally of w.rallies ?? []) {
    if ((rally.allianceId === a && rally.defendingAllianceId === b) || (rally.allianceId === b && rally.defendingAllianceId === a)) return 'A rally is still committed between these alliances.';
  }
  for (const siege of w.sieges ?? []) {
    const attack = siege.report?.attackingAllianceId, defense = siege.report?.defendingAllianceId;
    if ((attack === a && defense === b) || (attack === b && defense === a)) return 'A siege is still under way between these alliances.';
  }
  return '';
}

function disbandCoalition(w, id) {
  w.coalitions = (w.coalitions ?? []).filter(coalition => coalition.id !== id);
  w.coalitionInvites = (w.coalitionInvites ?? []).filter(invite => invite.coalitionId !== id);
  if (Array.isArray(w.messages)) w.messages = w.messages.filter(message => message.coalitionId !== id);
}

export function releaseAllianceDiplomacy(w, allianceId) {
  if (!allianceId) return;
  if (w.diplomacy) {
    w.diplomacy.proposals = w.diplomacy.proposals.filter(proposal => proposal.fromId !== allianceId && proposal.toId !== allianceId);
    w.diplomacy.pacts = w.diplomacy.pacts.filter(pact => pact.low !== allianceId && pact.high !== allianceId);
  }
  w.coalitionInvites = (w.coalitionInvites ?? []).filter(invite => invite.allianceId !== allianceId);
  const coalition = coalitionOf(w, allianceId);
  if (!coalition) return;
  if (coalition.founderId === allianceId || coalition.members.length === 1) disbandCoalition(w, coalition.id);
  else coalition.members = coalition.members.filter(id => id !== allianceId);
}

function leaderOf(w, p, fail) {
  const alliance = w.alliances.get(p.allianceId);
  if (!alliance) fail('Join an alliance first.');
  if (alliance.leaderId !== p.id) fail('Only the alliance leader can change diplomacy.');
  return alliance;
}

export function diplomacyCommand(w, p, c, fail) {
  if (!['diplomacy-propose', 'diplomacy-accept', 'diplomacy-decline', 'diplomacy-withdraw', 'diplomacy-terminate'].includes(c.type)) return false;
  ensureDiplomacy(w);
  const mine = leaderOf(w, p, fail);
  if (c.type === 'diplomacy-propose') {
    const other = w.alliances.get(c.targetId);
    if (!other || other.id === mine.id) fail('Choose another existing alliance.');
    if (pactBetween(w, mine.id, other.id)) fail('These alliances already share a non-aggression pact.');
    if (w.diplomacy.proposals.some(proposal => (proposal.fromId === mine.id && proposal.toId === other.id) || (proposal.fromId === other.id && proposal.toId === mine.id))) fail('A proposal is already waiting between these alliances.');
    if (w.diplomacy.proposals.filter(proposal => proposal.fromId === mine.id).length >= MAX_OUTGOING) fail('This alliance already has four pending proposals.');
    if (w.diplomacy.proposals.length >= MAX_PROPOSALS) fail('The kingdom cannot hold more pending proposals.');
    const { now } = activityClock(w);
    w.diplomacy.proposals.push({ id: randomUUID(), fromId: mine.id, toId: other.id, createdAt: now, expiresAt: now + DAY });
    return true;
  }
  if (c.type === 'diplomacy-terminate') {
    const pact = w.diplomacy.pacts.find(item => item.id === c.targetId && (item.low === mine.id || item.high === mine.id));
    if (!pact) fail('That pact is no longer active.');
    w.diplomacy.pacts = w.diplomacy.pacts.filter(item => item.id !== pact.id);
    return true;
  }
  const proposal = w.diplomacy.proposals.find(item => item.id === c.targetId);
  if (!proposal || proposal.expiresAt <= activityClock(w).now) fail('That proposal is no longer open.');
  if (c.type === 'diplomacy-withdraw') {
    if (proposal.fromId !== mine.id) fail('Only the proposing leader can withdraw this offer.');
    w.diplomacy.proposals = w.diplomacy.proposals.filter(item => item.id !== proposal.id);
    return true;
  }
  if (proposal.toId !== mine.id) fail('Only the invited alliance leader can answer this offer.');
  if (c.type === 'diplomacy-decline') {
    w.diplomacy.proposals = w.diplomacy.proposals.filter(item => item.id !== proposal.id);
    return true;
  }
  const conflict = engagementBetween(w, proposal.fromId, proposal.toId);
  if (conflict) fail(conflict + ' End it before the pact can begin.');
  if (!w.alliances.has(proposal.fromId) || pactBetween(w, proposal.fromId, proposal.toId)) fail('That proposal is no longer open.');
  const [low, high] = ordered(proposal.fromId, proposal.toId);
  w.diplomacy.pacts.push({ id: randomUUID(), low, high, since: activityClock(w).now });
  w.diplomacy.proposals = w.diplomacy.proposals.filter(item => item.id !== proposal.id);
  return true;
}

function offer(w, proposal, allianceId) {
  const alliance = w.alliances.get(allianceId);
  const { now } = activityClock(w);
  return { id: proposal.id, allianceId, allianceName: alliance?.name ?? 'Former alliance', remainingSeconds: Math.max(0, Math.ceil((proposal.expiresAt - now) / 1000)), expiresUtc: new Date(proposal.expiresAt).toISOString() };
}

export function diplomacySnapshot(w, p) {
  if (!p?.allianceId || !w.alliances.has(p.allianceId)) return null;
  ensureDiplomacy(w);
  const mine = p.allianceId;
  const alliance = w.alliances.get(mine);
  const role = alliance.leaderId === p.id ? 'Leader' : alliance.officers.includes(p.id) ? 'Officer' : 'Member';
  const canLead = role === 'Leader';
  return {
    canLead, role,
    lockReason: canLead ? '' : 'Only the alliance leader can sign or end a treaty.',
    alliances: [...w.alliances.values()].filter(alliance => alliance.id !== mine).map(alliance => ({
      id: alliance.id, name: alliance.name, relationship: pactBetween(w, mine, alliance.id) ? 'pact' : coalitionOf(w, mine)?.id === coalitionOf(w, alliance.id)?.id && coalitionOf(w, mine) ? 'coalition' : 'neutral',
      leaderName: w.players.get(alliance.leaderId)?.name ?? 'Unknown'
    })),
    incoming: w.diplomacy.proposals.filter(proposal => proposal.toId === mine).map(proposal => offer(w, proposal, proposal.fromId)),
    outgoing: w.diplomacy.proposals.filter(proposal => proposal.fromId === mine).map(proposal => offer(w, proposal, proposal.toId)),
    pacts: w.diplomacy.pacts.filter(pact => pact.low === mine || pact.high === mine).map(pact => {
      const allianceId = pact.low === mine ? pact.high : pact.low;
      return { id: pact.id, allianceId, allianceName: w.alliances.get(allianceId)?.name ?? 'Former alliance' };
    })
  };
}

export function validateDiplomacy(w) {
  const book = w.diplomacy;
  if (!book || !Array.isArray(book.proposals) || !Array.isArray(book.pacts) || book.proposals.length > MAX_PROPOSALS || book.pacts.length > 64) throw new Error('Invalid saved diplomacy.');
  const seen = new Set();
  for (const proposal of book.proposals) {
    if (!proposal || typeof proposal.id !== 'string' || !w.alliances.has(proposal.fromId) || !w.alliances.has(proposal.toId) || proposal.fromId === proposal.toId || !Number.isSafeInteger(proposal.createdAt) || proposal.expiresAt !== proposal.createdAt + DAY || proposal.createdAt < 0) throw new Error('Invalid saved diplomacy.');
    const key = ordered(proposal.fromId, proposal.toId).join('|');
    if (seen.has(proposal.id) || seen.has(key)) throw new Error('Invalid saved diplomacy.');
    seen.add(proposal.id); seen.add(key);
  }
  const pairs = new Set();
  for (const pact of book.pacts) {
    if (!pact || typeof pact.id !== 'string' || !w.alliances.has(pact.low) || !w.alliances.has(pact.high) || pact.low >= pact.high || !Number.isSafeInteger(pact.since) || pact.since < 0) throw new Error('Invalid saved diplomacy.');
    const key = pact.low + '|' + pact.high;
    if (pairs.has(pact.id) || pairs.has(key) || seen.has(key)) throw new Error('Invalid saved diplomacy.');
    pairs.add(pact.id); pairs.add(key);
  }
  for (const alliance of w.alliances.values()) if (book.proposals.filter(proposal => proposal.fromId === alliance.id).length > MAX_OUTGOING) throw new Error('Invalid saved diplomacy.');
}

export function coalitionCommand(w, p, c, fail) {
  if (!['coalition-create', 'coalition-invite', 'coalition-accept', 'coalition-decline', 'coalition-withdraw', 'coalition-leave', 'coalition-disband'].includes(c.type)) return false;
  ensureDiplomacy(w);
  const mine = leaderOf(w, p, fail);
  const current = coalitionOf(w, mine.id);
  if (c.type === 'coalition-create') {
    if (current) fail('This alliance already belongs to a coalition.');
    if (typeof c.name !== 'string' || !c.name.trim() || c.name.trim().length > 24) fail('Coalition names contain 1–24 characters.');
    if (w.coalitions.some(coalition => coalition.name.toLowerCase() === c.name.trim().toLowerCase())) fail('That coalition name is already used.');
    w.coalitions.push({ id: randomUUID(), name: c.name.trim(), founderId: mine.id, members: [mine.id], since: activityClock(w).now });
    return true;
  }
  if (c.type === 'coalition-disband') {
    if (!current || current.founderId !== mine.id) fail('Only the founding alliance leader can disband the coalition.');
    disbandCoalition(w, current.id);
    return true;
  }
  if (c.type === 'coalition-leave') {
    if (!current) fail('This alliance is not in a coalition.');
    if (current.founderId === mine.id) fail('The founding alliance disbands the coalition instead of leaving it.');
    current.members = current.members.filter(id => id !== mine.id);
    return true;
  }
  if (c.type === 'coalition-invite') {
    if (!current) fail('Found a coalition before inviting an alliance.');
    if (current.members.length >= 3) fail('A coalition holds at most three alliances.');
    const other = w.alliances.get(c.targetId);
    if (!other || other.id === mine.id) fail('Choose another existing alliance.');
    if (coalitionOf(w, other.id)) fail('That alliance already belongs to a coalition.');
    if (w.coalitionInvites.some(invite => invite.allianceId === other.id || (invite.coalitionId === current.id && invite.allianceId === other.id))) fail('That alliance already has a coalition invitation.');
    if (w.coalitionInvites.length >= 64) fail('The kingdom cannot hold more coalition invitations.');
    const { now } = activityClock(w);
    w.coalitionInvites.push({ id: randomUUID(), coalitionId: current.id, allianceId: other.id, createdAt: now, expiresAt: now + DAY });
    return true;
  }
  const invite = w.coalitionInvites.find(item => item.id === c.targetId);
  if (c.type === 'coalition-withdraw') {
    if (!invite || !current || invite.coalitionId !== current.id) fail('That invitation is no longer open.');
    w.coalitionInvites = w.coalitionInvites.filter(item => item.id !== invite.id);
    return true;
  }
  if (!invite || invite.allianceId !== mine.id) fail('That invitation is no longer open.');
  if (c.type === 'coalition-decline') {
    w.coalitionInvites = w.coalitionInvites.filter(item => item.id !== invite.id);
    return true;
  }
  const coalition = w.coalitions.find(item => item.id === invite.coalitionId);
  if (!coalition || coalition.members.length >= 3 || current) fail('That invitation is no longer open.');
  for (const member of coalition.members) {
    const conflict = engagementBetween(w, mine.id, member);
    if (conflict) fail(conflict + ' End it before joining the coalition.');
  }
  coalition.members.push(mine.id);
  w.coalitionInvites = w.coalitionInvites.filter(item => item.id !== invite.id || item.allianceId !== mine.id);
  w.coalitionInvites = w.coalitionInvites.filter(item => item.allianceId !== mine.id);
  return true;
}

export function coalitionSnapshot(w, p) {
  if (!p?.allianceId || !w.alliances.has(p.allianceId)) return null;
  ensureDiplomacy(w);
  const mine = p.allianceId;
  const alliance = w.alliances.get(mine);
  const canLead = alliance.leaderId === p.id;
  const coalition = coalitionOf(w, mine);
  const card = item => ({ allianceId: item, name: w.alliances.get(item)?.name ?? 'Former alliance', leaderName: w.players.get(w.alliances.get(item)?.leaderId)?.name ?? 'Unknown', founder: coalition?.founderId === item });
  return {
    id: coalition?.id ?? '', name: coalition?.name ?? '', founder: coalition?.founderId === mine, canLead,
    canInvite: !!coalition && canLead && coalition.members.length < 3,
    canDisband: !!coalition && canLead && coalition.founderId === mine,
    canLeave: !!coalition && canLead && coalition.founderId !== mine,
    lockReason: canLead ? '' : 'Only an alliance leader can create, invite, leave or disband a coalition.',
    limitations: 'Coalition protection does not merge territory, share vision, open another treasury, or allow cross-alliance rallies and garrisons.',
    members: coalition ? coalition.members.map(card) : [],
    incoming: w.coalitionInvites.filter(invite => invite.allianceId === mine).map(invite => ({ id: invite.id, coalitionId: invite.coalitionId, name: w.coalitions.find(item => item.id === invite.coalitionId)?.name ?? 'Coalition', remainingSeconds: Math.max(0, Math.ceil((invite.expiresAt - activityClock(w).now) / 1000)) })),
    outgoing: coalition ? w.coalitionInvites.filter(invite => invite.coalitionId === coalition.id).map(invite => ({ id: invite.id, allianceId: invite.allianceId, name: w.alliances.get(invite.allianceId)?.name ?? 'Former alliance', remainingSeconds: Math.max(0, Math.ceil((invite.expiresAt - activityClock(w).now) / 1000)) })) : []
  };
}

export function validateCoalitions(w) {
  if (!Array.isArray(w.coalitions) || !Array.isArray(w.coalitionInvites) || w.coalitions.length > 32 || w.coalitionInvites.length > 64) throw new Error('Invalid saved coalition.');
  const membership = new Set();
  for (const coalition of w.coalitions) {
    if (!coalition || typeof coalition.id !== 'string' || typeof coalition.name !== 'string' || coalition.name.length < 1 || coalition.name.length > 24 || !Array.isArray(coalition.members) || coalition.members.length < 1 || coalition.members.length > 3 || !coalition.members.includes(coalition.founderId) || new Set(coalition.members).size !== coalition.members.length || !Number.isSafeInteger(coalition.since) || coalition.since < 0) throw new Error('Invalid saved coalition.');
    for (const id of coalition.members) {
      if (!w.alliances.has(id) || membership.has(id)) throw new Error('Invalid saved coalition.');
      membership.add(id);
    }
  }
  const invited = new Set();
  for (const invite of w.coalitionInvites) {
    const coalition = w.coalitions.find(item => item.id === invite.coalitionId);
    if (!invite || typeof invite.id !== 'string' || !coalition || !w.alliances.has(invite.allianceId) || coalition.members.includes(invite.allianceId) || membership.has(invite.allianceId) || invite.expiresAt !== invite.createdAt + DAY || invited.has(invite.allianceId) || invited.has(invite.id)) throw new Error('Invalid saved coalition.');
    invited.add(invite.id); invited.add(invite.allianceId);
  }
}
