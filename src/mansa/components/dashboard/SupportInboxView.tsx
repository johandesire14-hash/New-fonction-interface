import React, { useMemo, useState } from "react";
import { ArrowLeft, MessageSquare, Search, Send, UserRound } from "lucide-react";

export interface SupportInboxMessage {
  id: string;
  sender: "member" | "creator";
  text: string;
  time: string;
}

export interface SupportInboxConversation {
  id: string;
  companyId: string;
  memberName: string;
  memberEmail: string;
  messages: SupportInboxMessage[];
}

interface SupportInboxViewProps {
  mode: "creator" | "member" | "personal";
  companyName?: string;
  conversations: SupportInboxConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  onSendMessage: (conversation: SupportInboxConversation, text: string) => void;
  mobileConversationOpen?: boolean;
  onBack?: () => void;
  headerAction?: React.ReactNode;
  settingsContent?: React.ReactNode;
  safeArea?: boolean;
}

export const SupportInboxView: React.FC<SupportInboxViewProps> = ({
  mode,
  companyName,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onSendMessage,
  mobileConversationOpen,
  onBack,
  headerAction,
  settingsContent,
  safeArea = false,
}) => {
  const [reply, setReply] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");
  const isMember = mode === "member";
  const isPersonal = mode === "personal";
  const visibleConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations
      .filter(
        (conversation) =>
          !query ||
          `${conversation.memberName} ${conversation.memberEmail} ${conversation.messages.at(-1)?.text || ""}`
            .toLowerCase()
            .includes(query),
      )
      .sort((a, b) => {
        const aLast = a.messages.at(-1)?.id || "";
        const bLast = b.messages.at(-1)?.id || "";
        return sortOrder === "recent"
          ? bLast.localeCompare(aLast)
          : aLast.localeCompare(bLast);
      });
  }, [conversations, searchQuery, sortOrder]);
  const selectedConversation =
    visibleConversations.find((conversation) => conversation.id === selectedConversationId) || null;
  const isConversationOpenOnMobile =
    mobileConversationOpen ?? Boolean(selectedConversation);
  const heightClass = "h-[calc(100dvh-140px)] min-h-0";
  const safeAreaClass = safeArea ? "mansa-keyboard-scroll mansa-safe-bottom" : "";
  const heading = isPersonal ? "Assistance" : "Chats de support";
  const subtitle = isPersonal
    ? "Vos demandes d’assistance"
    : `Assistance de ${companyName || "votre entreprise"}`;

  const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = reply.trim();
    if (!selectedConversation || !text) return;
    onSendMessage(selectedConversation, text);
    setReply("");
  };

  return (
    <div
      className={`${safeAreaClass} mx-auto flex w-full ${heightClass} max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121316] animate-in fade-in duration-200`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#16171b] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              aria-label="Retour"
            >
              <ArrowLeft className="size-4" />
              <span>Retour</span>
            </button>
          )}
          <div className="flex size-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{heading}</h1>
            <p className="text-[11px] text-zinc-500">{subtitle}</p>
          </div>
        </div>
        {headerAction}
      </header>
      {settingsContent}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[300px_1fr]">
        <aside
          className={`min-h-0 border-b border-white/10 lg:border-b-0 lg:border-r ${isConversationOpenOnMobile ? "hidden lg:block" : "block"}`}
        >
          <div className="space-y-2 border-b border-white/10 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher…"
                className="w-full rounded-xl border border-white/10 bg-[#0c0d0e] py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-blue-400"
              />
            </div>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as "recent" | "oldest")}
              className="rounded-lg border border-white/10 bg-[#0c0d0e] px-2.5 py-2 text-[11px] text-zinc-300 outline-none"
              aria-label="Trier les conversations"
            >
              <option value="recent">Dernière activité</option>
              <option value="oldest">Plus ancienne</option>
            </select>
          </div>
          <div className="max-h-56 overflow-y-auto lg:max-h-none">
            {visibleConversations.length === 0 ? (
              <div className="p-5 text-xs leading-relaxed text-zinc-500">
                {isPersonal
                  ? "Vos demandes d’assistance apparaîtront ici."
                  : "Les demandes des membres apparaîtront ici."}
              </div>
            ) : (
              visibleConversations.map((conversation) => {
                const last = conversation.messages.at(-1);
                const isSelected = selectedConversationId === conversation.id;
                return (
                  <button
                    type="button"
                    key={conversation.id}
                    onClick={() => {
                      onSelectConversation(conversation.id);
                      setReply("");
                    }}
                    className={`flex w-full items-start gap-3 border-b border-white/[0.06] p-4 text-left ${isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full mansa-profile-avatar text-xs font-bold">
                      {isMember ? (
                        conversation.memberName.charAt(0).toUpperCase()
                      ) : (
                        <UserRound className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-white">
                        {isMember ? companyName : conversation.memberName}
                      </div>
                      <div className="truncate text-[11px] text-zinc-500">
                        {isMember ? "Assistance officielle" : conversation.memberEmail}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-zinc-400">
                        {last?.text || "Nouvelle conversation"}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
        <main
          className={`min-h-0 flex-1 flex-col ${isConversationOpenOnMobile ? "flex" : "hidden lg:flex"}`}
        >
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-zinc-500">
              Sélectionnez une conversation pour consulter le chat.
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => onSelectConversation(null)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
                  aria-label="Retour à la liste"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex size-9 items-center justify-center rounded-full mansa-profile-avatar text-xs font-bold">
                  {isMember ? (
                    companyName?.charAt(0).toUpperCase() || "A"
                  ) : (
                    <UserRound className="size-4" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {isMember ? companyName : selectedConversation.memberName}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {isMember ? "Assistance officielle" : selectedConversation.memberEmail}
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                {selectedConversation.messages.map((item) => {
                  const isOutgoing = isMember
                    ? item.sender === "member"
                    : item.sender === "creator";
                  return (
                    <div
                      key={item.id}
                      className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${isOutgoing ? "bg-blue-500 text-white" : "bg-white/[0.06] text-zinc-200"}`}
                      >
                        <div>{item.text}</div>
                        <div
                          className={`mt-1 text-[10px] ${isOutgoing ? "text-blue-100" : "text-zinc-500"}`}
                        >
                          {item.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={handleSend}
                className={`flex shrink-0 gap-2 border-t border-white/10 p-3 sm:p-4 ${safeArea ? "mansa-safe-bottom" : ""}`}
              >
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={2}
                  placeholder="Écrire un message…"
                  className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-[#101114] p-3 text-xs text-white outline-none focus:border-blue-400"
                  aria-label="Écrire un message"
                />
                <button
                  type="submit"
                  disabled={!reply.trim()}
                  aria-label="Envoyer"
                  className="ui-btn-primary self-end px-4 py-2.5 text-xs disabled:opacity-50"
                >
                  <Send className="size-3.5" />
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
