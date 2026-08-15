import { db } from './db';

/* ── Groups: πελάτες = αυτόνομες καταχωρήσεις που "φαίνονται" και στο group τους ── */

export const GROUP_CAP = 2;                 // κλειδώνει στα 2 άτομα
export const firstName = (name) => (name || '').trim().split(/\s+/)[0] || 'Πελάτης';

/* Το group ονομάζεται από τα μικρά ονόματα των μελών: π.χ. "Χριστίνα-Σοφία" */
export const groupDisplayName = (group, clients) => {
  const members = (group?.member_ids || []).map(id => clients.find(c => c.id === id)).filter(Boolean);
  if (!members.length) return 'Νέο group';
  return members.map(m => firstName(m.name)).join('-');
};

export const isGroupService = (svc) => svc === 'group_training' || svc === 'group_training_nutrition';
export const isIndividual   = (c)   => !c.group_id && !isGroupService(c.services);
const hasNutritionSvc = (svc) => svc === 'personal_training_nutrition' || svc === 'nutrition_only' || svc === 'group_training_nutrition';

const toGroupService = (svc) => hasNutritionSvc(svc) ? 'group_training_nutrition' : 'group_training';
const toIndivService = (svc) => svc === 'group_training_nutrition' ? 'personal_training_nutrition' : 'personal_training';

async function memberObjects(ids, clients) {
  const out = [];
  for (const id of ids) out.push(clients.find(c => c.id === id) || await db.Client.get(id));
  return out.filter(Boolean);
}

export async function createEmptyGroup() {
  return db.Group.create({ name: 'Νέο group', member_ids: [], locked: false, created_date: new Date().toISOString() });
}

/* Προσθήκη μέλους: ενημερώνει member_ids + κλείδωμα + όνομα, και αλλάζει την ΚΑΡΤΕΛΑ του
   πελάτη σε group service (κρατώντας τη διατροφή αν είχε). */
export async function addMemberToGroup(group, clientId, clients) {
  const existing = group.member_ids || [];
  if (existing.includes(clientId) || existing.length >= GROUP_CAP) return group;
  const client = clients.find(c => c.id === clientId) || await db.Client.get(clientId);
  const ids = [...existing, clientId];
  const members = await memberObjects(ids, clients);
  const name = members.map(m => firstName(m.name)).join('-');
  const locked = ids.length >= GROUP_CAP;
  await db.Group.update(group.id, { member_ids: ids, locked, name });
  await db.Client.update(clientId, { group_id: group.id, services: toGroupService(client.services) });
  return { ...group, member_ids: ids, locked, name };
}

/* Αφαίρεση μέλους: επαναφέρει τον πελάτη σε individual (κρατώντας τη διατροφή αν είχε). */
export async function removeMemberFromGroup(group, clientId, clients) {
  const ids = (group.member_ids || []).filter(x => x !== clientId);
  const members = await memberObjects(ids, clients);
  const name = ids.length ? members.map(m => firstName(m.name)).join('-') : 'Νέο group';
  await db.Group.update(group.id, { member_ids: ids, locked: ids.length >= GROUP_CAP, name });
  const client = clients.find(c => c.id === clientId) || await db.Client.get(clientId);
  if (client) await db.Client.update(clientId, { group_id: '', services: toIndivService(client.services) });
  return { ...group, member_ids: ids, locked: false, name };
}

/* Διαγραφή group: επαναφέρει όλα τα μέλη σε individuals και μετά σβήνει το group. */
export async function deleteGroup(group, clients) {
  for (const id of group.member_ids || []) {
    const client = clients.find(c => c.id === id) || await db.Client.get(id);
    if (client) await db.Client.update(id, { group_id: '', services: toIndivService(client.services) });
  }
  await db.Group.delete(group.id);
}
