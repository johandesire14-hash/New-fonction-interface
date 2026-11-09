export interface LocalCompanyMember {
  memberId: string;
  email: string;
  name: string;
  joinedAt: string;
}

export interface LocalSupportMessage {
  id: string;
  sender: "member" | "creator";
  text: string;
  time: string;
}

export interface LocalSupportConversation {
  id: string;
  companyId: string;
  memberName: string;
  memberEmail: string;
  messages: LocalSupportMessage[];
}

export interface LocalPrivateMessage {
  id: string;
  sender: "member" | "creator";
  text: string;
  time: string;
}

export interface LocalPrivateConversation {
  id: string;
  companyId: string;
  memberName: string;
  memberEmail: string;
  messages: LocalPrivateMessage[];
}

export const LOCAL_COMPANY_MEMBERS_PREFIX = "mansa_local_company_members_";
export const LOCAL_SUPPORT_CONVERSATIONS_PREFIX = "mansa_local_support_conversations_";
export const LOCAL_COMPANY_MEMBERS_EVENT = "mansa_local_company_members_updated";
export const LOCAL_SUPPORT_CONVERSATIONS_EVENT = "mansa_support_conversations_updated";
export const LOCAL_PRIVATE_CONVERSATIONS_PREFIX = "mansa_private_conversations_";
export const LOCAL_PRIVATE_CONVERSATIONS_EVENT = "mansa_private_conversations_updated";

// In-memory caches to avoid localStorage
const inMemoryMembers = new Map<string, LocalCompanyMember[]>();
const inMemorySupport = new Map<string, LocalSupportConversation[]>();
const inMemoryPrivate = new Map<string, LocalPrivateConversation[]>();

// Cleanup legacy localStorage
if (typeof window !== "undefined") {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (
        key.startsWith(LOCAL_COMPANY_MEMBERS_PREFIX) ||
        key.startsWith("mansa_enterprise_subscriptions_")
      ) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {}
}

function dispatchLocalUpdate(eventName: string, companyId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail: { companyId } }));
}

function makeId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
}

export function getLocalCompanyMembers(
  companyId: string,
  _companyName?: string,
): LocalCompanyMember[] {
  if (!companyId) return [];
  return inMemoryMembers.get(companyId) || [];
}

export function getLocalCompanyMemberCount(companyId: string, companyName?: string): number {
  return getLocalCompanyMembers(companyId, companyName).length;
}

export function registerLocalCompanyMember(
  companyId: string,
  member: { memberId: string; email?: string; name?: string },
): LocalCompanyMember[] {
  if (!companyId || !member.memberId) return [];
  const current = inMemoryMembers.get(companyId) || [];
  const existing = current.find((item) => item.memberId === member.memberId);
  const entry: LocalCompanyMember = {
    memberId: member.memberId,
    email: member.email || existing?.email || "",
    name: member.name || existing?.name || member.email || "Membre",
    joinedAt: existing?.joinedAt || new Date().toISOString(),
  };
  const updated = existing
    ? current.map((item) => (item.memberId === member.memberId ? entry : item))
    : [...current, entry];

  inMemoryMembers.set(companyId, updated);
  dispatchLocalUpdate(LOCAL_COMPANY_MEMBERS_EVENT, companyId);
  dispatchLocalUpdate("mansa_discoverable_companies_updated", companyId);
  return updated;
}

export function unregisterLocalCompanyMember(companyId: string, memberId: string): void {
  if (!companyId || !memberId) return;
  const current = inMemoryMembers.get(companyId) || [];
  const updated = current.filter((item) => item.memberId !== memberId);
  inMemoryMembers.set(companyId, updated);
  dispatchLocalUpdate(LOCAL_COMPANY_MEMBERS_EVENT, companyId);
  dispatchLocalUpdate("mansa_discoverable_companies_updated", companyId);
}

export function getLocalSupportConversations(companyId: string): LocalSupportConversation[] {
  if (!companyId) return [];
  return inMemorySupport.get(companyId) || [];
}

export function getLocalSupportConversation(
  companyId: string,
  memberEmail: string,
): LocalSupportConversation | null {
  const normalizedEmail = memberEmail.trim().toLowerCase();
  return (
    getLocalSupportConversations(companyId).find(
      (conversation) => conversation.memberEmail.trim().toLowerCase() === normalizedEmail,
    ) || null
  );
}

export function appendLocalSupportMessage(input: {
  companyId: string;
  memberEmail: string;
  memberName: string;
  sender: LocalSupportMessage["sender"];
  text: string;
}): LocalSupportConversation | null {
  if (!input.companyId || !input.memberEmail || !input.text.trim()) {
    return null;
  }
  const conversations = getLocalSupportConversations(input.companyId);
  const existing = conversations.find(
    (conversation) =>
      conversation.memberEmail.trim().toLowerCase() === input.memberEmail.trim().toLowerCase(),
  );
  const nextMessage: LocalSupportMessage = {
    id: makeId(input.sender),
    sender: input.sender,
    text: input.text.trim(),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  const nextConversation: LocalSupportConversation = existing
    ? {
        ...existing,
        memberName: input.memberName || existing.memberName,
        messages: [...existing.messages, nextMessage],
      }
    : {
        id: `${input.companyId}:${input.memberEmail.trim().toLowerCase()}`,
        companyId: input.companyId,
        memberName: input.memberName || "Membre",
        memberEmail: input.memberEmail.trim().toLowerCase(),
        messages: [nextMessage],
      };
  const updated = existing
    ? conversations.map((conversation) =>
        conversation.id === existing.id ? nextConversation : conversation,
      )
    : [...conversations, nextConversation];

  inMemorySupport.set(input.companyId, updated);
  dispatchLocalUpdate(LOCAL_SUPPORT_CONVERSATIONS_EVENT, input.companyId);
  return nextConversation;
}

export function getLocalPrivateConversations(companyId: string): LocalPrivateConversation[] {
  if (!companyId) return [];
  return inMemoryPrivate.get(companyId) || [];
}

export function getAllLocalPrivateConversations(): LocalPrivateConversation[] {
  const all: LocalPrivateConversation[] = [];
  for (const list of inMemoryPrivate.values()) {
    all.push(...list);
  }
  return all;
}

export function appendLocalPrivateMessage(input: {
  companyId: string;
  memberEmail: string;
  memberName: string;
  sender: LocalPrivateMessage["sender"];
  text: string;
}): LocalPrivateConversation | null {
  if (!input.companyId || !input.memberEmail || !input.text.trim()) {
    return null;
  }
  const conversations = getLocalPrivateConversations(input.companyId);
  const normalizedEmail = input.memberEmail.trim().toLowerCase();
  const existing = conversations.find(
    (conversation) => conversation.memberEmail.trim().toLowerCase() === normalizedEmail,
  );
  const nextMessage: LocalPrivateMessage = {
    id: makeId(input.sender),
    sender: input.sender,
    text: input.text.trim(),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  const nextConversation: LocalPrivateConversation = existing
    ? {
        ...existing,
        memberName: input.memberName || existing.memberName,
        messages: [...existing.messages, nextMessage],
      }
    : {
        id: `${input.companyId}:${normalizedEmail}`,
        companyId: input.companyId,
        memberName: input.memberName || "Membre",
        memberEmail: normalizedEmail,
        messages: [nextMessage],
      };
  const updated = existing
    ? conversations.map((conversation) =>
        conversation.id === existing.id ? nextConversation : conversation,
      )
    : [...conversations, nextConversation];

  inMemoryPrivate.set(input.companyId, updated);
  dispatchLocalUpdate(LOCAL_PRIVATE_CONVERSATIONS_EVENT, input.companyId);
  return nextConversation;
}
