import { requireActiveSupabaseSession, supabase } from "./supabase";

export interface PrivateConversationRow {
  id: string;
  community_id: string;
  creator_id: string;
  member_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  archived_by_creator: boolean;
  archived_by_member: boolean;
}

export interface PrivateMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
}

export interface PrivateConversation extends PrivateConversationRow {
  messages: PrivateMessageRow[];
  participantName?: string;
  participantUsername?: string;
  participantAvatarUrl?: string | null;
  communityName?: string;
  unreadCount: number;
}

const throwSupabaseError = (resource: string, error: { message?: string } | null): never => {
  throw new Error(
    `Impossible de ${resource} dans Supabase : ${error?.message || "erreur inconnue"}`,
  );
};

export async function fetchPrivateConversations(): Promise<PrivateConversation[]> {
  const session = await requireActiveSupabaseSession();
  const { data: conversations, error } = await supabase
    .from("private_conversations")
    .select("*")
    .or(`creator_id.eq.${session.user.id},member_id.eq.${session.user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throwSupabaseError("charger vos conversations privées", error);

  const rows = (conversations || []) as PrivateConversationRow[];
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const participantIds = [...new Set(rows.flatMap((row) => [row.creator_id, row.member_id]))];
  const communityIds = [...new Set(rows.map((row) => row.community_id))];
  const [{ data: profiles }, { data: communities }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, handle, email, avatar_url")
      .in("id", participantIds),
    supabase.from("communities").select("id, name").in("id", communityIds),
  ]);
  const profileById = new Map(
    (
      (profiles || []) as Array<{
        id: string;
        display_name?: string | null;
        handle?: string | null;
        email?: string | null;
        avatar_url?: string | null;
      }>
    ).map((profile) => [profile.id, profile]),
  );
  const communityById = new Map(
    ((communities || []) as Array<{ id: string; name?: string | null }>).map((community) => [
      community.id,
      community,
    ]),
  );
  const { data: messages, error: messageError } = await supabase
    .from("private_messages")
    .select("*")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });
  if (messageError) throwSupabaseError("charger vos messages privés", messageError);

  const messagesByConversation = new Map<string, PrivateMessageRow[]>();
  for (const message of (messages || []) as PrivateMessageRow[]) {
    const list = messagesByConversation.get(message.conversation_id) || [];
    list.push(message);
    messagesByConversation.set(message.conversation_id, list);
  }
  return rows.map((row) => {
    const conversationMessages = messagesByConversation.get(row.id) || [];
    const participantId = row.creator_id === session.user.id ? row.member_id : row.creator_id;
    const participant = profileById.get(participantId);
    return {
      ...row,
      messages: conversationMessages,
      participantName:
        participant?.display_name || participant?.handle?.replace(/^@/, "") || participant?.email || participantId,
      participantUsername: participant?.handle || participant?.email || participantId,
      ...(participant?.avatar_url !== undefined
        ? { participantAvatarUrl: participant.avatar_url }
        : {}),
      communityName: communityById.get(row.community_id)?.name || row.community_id,
      unreadCount: conversationMessages.filter(
        (message) =>
          message.sender_id !== session.user.id && !message.read_at && !message.deleted_at,
      ).length,
    };
  });
}

export async function findPrivateConversation(input: {
  communityId: string;
  creatorId: string;
  memberId: string;
}): Promise<PrivateConversation | null> {
  const { data, error } = await supabase
    .from("private_conversations")
    .select("*")
    .eq("community_id", input.communityId)
    .eq("creator_id", input.creatorId)
    .eq("member_id", input.memberId)
    .maybeSingle();
  if (error) throwSupabaseError("rechercher la conversation privée", error);
  if (!data) return null;
  const all = await fetchPrivateConversations();
  return all.find((conversation) => conversation.id === data.id) || null;
}

export async function createPrivateConversation(input: {
  communityId: string;
  creatorId: string;
  memberId: string;
}): Promise<PrivateConversation> {
  await requireActiveSupabaseSession();
  const { data, error } = await supabase
    .from("private_conversations")
    .upsert(
      { community_id: input.communityId, creator_id: input.creatorId, member_id: input.memberId },
      { onConflict: "community_id,creator_id,member_id" },
    )
    .select("*")
    .single();
  if (error) throwSupabaseError("créer la conversation privée", error);
  const conversation = await findPrivateConversation({ ...input });
  if (conversation) return conversation;
  return { ...(data as PrivateConversationRow), messages: [], unreadCount: 0 };
}

export async function sendPrivateMessage(input: {
  conversationId: string;
  body: string;
}): Promise<PrivateMessageRow> {
  const session = await requireActiveSupabaseSession();
  const body = input.body.trim();
  if (!body) throw new Error("Le message ne peut pas être vide.");
  const { data, error } = await supabase
    .from("private_messages")
    .insert({ conversation_id: input.conversationId, sender_id: session.user.id, body })
    .select("*")
    .single();
  if (error) throwSupabaseError("envoyer le message privé", error);
  return data as PrivateMessageRow;
}

export async function markPrivateConversationAsRead(conversationId: string): Promise<void> {
  const session = await requireActiveSupabaseSession();
  const { error } = await supabase
    .from("private_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", session.user.id)
    .is("read_at", null);
  if (error) throwSupabaseError("marquer les messages privés comme lus", error);
}
