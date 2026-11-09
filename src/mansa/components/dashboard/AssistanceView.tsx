import React, { useEffect, useState } from "react";
import { Bot, CheckCircle2, Loader2, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Company } from "../../types";
import {
  appendLocalSupportMessage,
  getLocalSupportConversations,
  LOCAL_SUPPORT_CONVERSATIONS_EVENT,
  LOCAL_SUPPORT_CONVERSATIONS_PREFIX,
} from "../../utils/localCommunityStore";
import { getSavedCompanies, updateCompanyAutoReply } from "../../utils/companyStorage";
import { getUserFacingErrorMessage } from "../../utils/userFacingError";
import {
  SupportInboxConversation,
  SupportInboxView,
} from "./SupportInboxView";

interface AssistanceViewProps {
  lang?: "fr" | "en";
  activeCompany?: Company | null;
  companies?: Company[];
  isPersonalWorkspace?: boolean;
  onNavigateToClients?: () => void;
}

const DEFAULT_MESSAGE =
  "Bonjour ! Merci d'avoir contacté notre équipe. Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.";

export const AssistanceView: React.FC<AssistanceViewProps> = ({
  activeCompany,
  companies = [],
  isPersonalWorkspace = false,
}) => {
  const { user } = useAuth();
  const userKey = user?.uid || user?.email || "default";
  const companyId = isPersonalWorkspace ? "" : activeCompany?.id || "";
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [conversations, setConversations] = useState<SupportInboxConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isCreator = !isPersonalWorkspace && Boolean(activeCompany?.id);
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) || null;

  useEffect(() => {
    setSelectedConversationId(null);
    setIsSettingsOpen(false);
  }, [activeCompany?.id, isPersonalWorkspace]);

  useEffect(() => {
    if (!companyId) {
      setEnabled(true);
      setMessage(DEFAULT_MESSAGE);
      setFeedback(null);
      setConversations([]);
      return;
    }
    const current =
      getSavedCompanies(userKey).find((company) => company.id === companyId) ||
      companies.find((company) => company.id === companyId) ||
      activeCompany;
    setEnabled(current?.supportAutoReplyEnabled ?? true);
    setMessage(current?.supportAutoReplyMessage || DEFAULT_MESSAGE);
    setFeedback(null);
  }, [companyId, userKey, companies, activeCompany]);

  useEffect(() => {
    if (!companyId || isPersonalWorkspace) return;
    const refresh = () => {
      const next = getLocalSupportConversations(companyId);
      setConversations(next);
      setSelectedConversationId((current) =>
        current && next.some((item) => item.id === current) ? current : next[0]?.id || null,
      );
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(LOCAL_SUPPORT_CONVERSATIONS_PREFIX)) refresh();
    };
    refresh();
    window.addEventListener(LOCAL_SUPPORT_CONVERSATIONS_EVENT, refresh);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(LOCAL_SUPPORT_CONVERSATIONS_EVENT, refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, [companyId, isPersonalWorkspace]);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !activeCompany?.id || !message.trim()) {
      setFeedback("Sélectionnez une entreprise et renseignez un message.");
      return;
    }
    setIsSaving(true);
    try {
      updateCompanyAutoReply(userKey, companyId, { enabled, message: message.trim() });
      setFeedback("Message automatique enregistré.");
    } catch (error: any) {
      console.error("Automatic reply save failed:", error);
      setFeedback(getUserFacingErrorMessage(error, "Impossible d’enregistrer le message. Réessayez."));
    } finally {
      setIsSaving(false);
    }
  };

  const sendReply = (conversation: SupportInboxConversation, text: string) => {
    appendLocalSupportMessage({
      companyId: conversation.companyId,
      memberEmail: conversation.memberEmail,
      memberName: conversation.memberName,
      sender: "creator",
      text,
    });
  };

  const headerAction = isCreator ? (
    <button
      type="button"
      onClick={() => setIsSettingsOpen((open) => !open)}
      className={`rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white ${isSettingsOpen ? "bg-white/[0.08] text-white" : ""}`}
      aria-label="Paramètres du message automatique"
      aria-expanded={isSettingsOpen}
    >
      <Settings className="size-4" />
    </button>
  ) : null;

  const settingsContent = isSettingsOpen && isCreator ? (
    <form
      onSubmit={save}
      className="shrink-0 space-y-3 border-b border-white/10 bg-[#101114] p-4 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-blue-400" />
        <h2 className="text-sm font-bold text-white">Message automatique</h2>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-[11px] text-zinc-400">
          Message envoyé
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            maxLength={5000}
            className="mt-1 resize-none rounded-xl border border-white/10 bg-[#0c0d0e] p-3 text-xs text-white outline-none focus:border-blue-400"
          />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="size-4 accent-blue-500"
          />
          Activer
        </label>
        <button
          type="submit"
          disabled={isSaving}
          className="ui-btn-primary inline-flex items-center justify-center gap-2 px-4 py-3 text-xs"
        >
          {isSaving && <Loader2 className="size-3.5 animate-spin" />}
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      {feedback && (
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="size-3.5" />
          {feedback}
        </div>
      )}
    </form>
  ) : null;

  return (
    <SupportInboxView
      mode={isPersonalWorkspace ? "personal" : "creator"}
      companyName={activeCompany?.name || ""}
      conversations={conversations}
      selectedConversationId={selectedConversationId}
      onSelectConversation={setSelectedConversationId}
      onSendMessage={sendReply}
      headerAction={headerAction}
      settingsContent={settingsContent}
    />
  );
};
