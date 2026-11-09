// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Mail,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Download,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  X,
  MessageSquare,
  Copy,
  MapPin,
  MoreVertical,
  Ban,
  StickyNote,
  Send,
} from "lucide-react";
import { ConfirmActionModal } from "../common/ConfirmActionModal";
import { ModalOverlay } from "../common/ModalOverlay";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeToCreatorCustomers,
  createRealCustomer,
  deleteCustomerFromFirestore,
  FirestoreCustomer,
} from "../../services/dbService";
import {
  getLocalCompanyMembers,
  LOCAL_COMPANY_MEMBERS_EVENT,
  LOCAL_COMPANY_MEMBERS_PREFIX,
} from "../../utils/localCommunityStore";
import { removeSubscription } from "../../utils/subscriptionsStorage";
import { appendLocalSupportMessage } from "../../utils/localCommunityStore";
import {
  getCustomerNote,
  isCustomerBanned,
  saveCustomerNote,
  setCustomerBanned,
} from "../../utils/customerManagementStorage";
import { addUserNotification } from "../../utils/userNotifications";

interface CustomerMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  discordUsername?: string;
  productTitle: string;
  plan: string;
  totalSpent: number;
  totalSpentFormatted?: string;
  countryFlag: string;
  countryName: string;
  joinedDate: string;
  status: "active" | "trial" | "cancelled" | "past_due";
  location?: string;
  discordId?: string;
}

interface CustomersViewProps {
  lang?: "fr" | "en";
  activeCompanyId?: string;
  activeCompanyName?: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  lang = "fr",
  activeCompanyId,
  activeCompanyName,
}) => {
  const { user, profile } = useAuth();
  const [customers, setCustomers] = useState<CustomerMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "cancelled">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMember | null>(null);
  const [customerToRevoke, setCustomerToRevoke] = useState<CustomerMember | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberProduct, setNewMemberProduct] = useState("Pass VIP Mansa");
  const [isDetailsMenuOpen, setIsDetailsMenuOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [toast, setToast] = useState("");
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    if (!activeCompanyId) {
      setCustomers([]);
      return;
    }
    const creatorKey = profile?.uid || user?.email || "creator-default";
    let remoteCustomers: CustomerMember[] = [];
    const refreshCustomers = () => {
      const knownEmails = new Set(
        remoteCustomers.map((customer) => customer.email.trim().toLowerCase()),
      );
      const localMembers: CustomerMember[] = getLocalCompanyMembers(activeCompanyId, activeCompanyName)
        .map((member) => {
          const email = member.email || member.memberId;
          const displayName = member.name || email;
          const joinedDate = member.joinedAt
            ? new Date(member.joinedAt).toLocaleDateString("fr-FR")
            : new Date().toLocaleDateString("fr-FR");
          return {
            id: `local-member-${member.memberId}`,
            name: displayName,
            email,
            avatar: displayName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            productTitle: "Adhésion gratuite",
            plan: "0 FCFA",
            totalSpent: 0,
            totalSpentFormatted: "0 FCFA",
            countryFlag: "🇨🇮",
            countryName: "Côte d’Ivoire",
            joinedDate,
            status: "active",
          };
        })
        .filter((member) => !knownEmails.has(member.email.trim().toLowerCase()));
      setCustomers([...remoteCustomers, ...localMembers]);
    };
    const unsub = subscribeToCreatorCustomers(
      creatorKey,
      (dbCusts) => {
        remoteCustomers = dbCusts.map((c) => {
          const initials = (c.name || "MB")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            avatar: initials,
            discordUsername: c.discordUsername || "",
            productTitle: c.productName || "Accès Mansa",
            plan: `${c.totalSpentFormatted || "0 FCFA"}`,
            totalSpent: c.totalSpent || 0,
            totalSpentFormatted: c.totalSpentFormatted,
            countryFlag: c.countryFlag || "🇨🇮",
            countryName: c.countryName || "Côte d'Ivoire",
            location: c.countryName || c.country || "Non renseigné",
            discordId: c.discordId || "",
            joinedDate: c.joinedDate || new Date().toLocaleDateString("fr-FR"),
            status: c.status || "active",
          };
        });
        refreshCustomers();
      },
      activeCompanyId,
    );
    const handleLocalMembersUpdated = (event: Event) => {
      const companyId = (event as CustomEvent<{ companyId?: string }>).detail?.companyId;
      if (!companyId || companyId === activeCompanyId || activeCompanyName) refreshCustomers();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(LOCAL_COMPANY_MEMBERS_PREFIX)) refreshCustomers();
    };
    window.addEventListener(LOCAL_COMPANY_MEMBERS_EVENT, handleLocalMembersUpdated);
    window.addEventListener("storage", handleStorage);
    refreshCustomers();

    return () => {
      unsub();
      window.removeEventListener(LOCAL_COMPANY_MEMBERS_EVENT, handleLocalMembersUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [profile?.uid, user?.email, activeCompanyId, activeCompanyName]);

  const filtered = customers.filter((c) => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.discordUsername && c.discordUsername.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;
    const creatorKey = profile?.uid || user?.email || "creator-default";
    await createRealCustomer(creatorKey, {
      name: newMemberName,
      email: newMemberEmail,
      productName: newMemberProduct,
      companyId: activeCompanyId,
      companyName: activeCompanyName,
      totalSpent: 0,
      totalSpentFormatted: "0 FCFA",
      countryFlag: "🇨🇮",
      countryName: "Côte d'Ivoire (Abidjan)",
      status: "active",
    });

    setIsAddMemberOpen(false);
    setNewMemberEmail("");
    setNewMemberName("");
  };

  const openCustomerDetails = (customer: CustomerMember) => {
    setSelectedCustomer(customer);
    setNoteDraft(activeCompanyId ? getCustomerNote(activeCompanyId, customer.email) : "");
    setIsDetailsMenuOpen(false);
  };

  const copyValue = async (value: string, field: string) => {
    if (!value || value === "Non renseigné") return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(""), 1600);
    } catch {
      setToast("Impossible de copier cette information.");
      window.setTimeout(() => setToast(""), 2500);
    }
  };

  const saveNote = () => {
    if (!activeCompanyId || !selectedCustomer) return;
    saveCustomerNote(activeCompanyId, selectedCustomer.email, noteDraft);
    setIsNoteModalOpen(false);
    setToast("Note enregistrée sur cet appareil.");
    window.setTimeout(() => setToast(""), 2500);
  };

  const sendCustomerMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeCompanyId || !selectedCustomer || !messageDraft.trim()) return;
    const conversation = appendLocalSupportMessage({
      companyId: activeCompanyId,
      memberEmail: selectedCustomer.email,
      memberName: selectedCustomer.name,
      sender: "creator",
      text: messageDraft,
    });
    if (!conversation) {
      setToast("Le message local n’a pas pu être enregistré.");
      window.setTimeout(() => setToast(""), 2500);
      return;
    }
    setMessageDraft("");
    setIsMessageModalOpen(false);
    setToast("Message ajouté à la conversation d’assistance.");
    window.setTimeout(() => setToast(""), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {lang === "fr" ? "Clients & Membres" : "Customers & Members"}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {lang === "fr"
              ? "Gérez les abonnements, rôles Discord synchronisés, historiques d'achats et accès de vos membres."
              : "Manage member memberships, synchronized Discord roles, lifetime value and access rights."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const data = JSON.stringify(customers, null, 2);
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "clients_mansa.json";
              a.click();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#16181f] hover:bg-[#1f222b] px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>Exporter</span>
          </button>

          <button
            onClick={() => setIsAddMemberOpen(true)}
            disabled={!activeCompanyId}
            className="flex items-center gap-2 rounded-xl bg-[#0055ff] hover:bg-[#0047d6] text-white px-4 py-2 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="size-4" />
            <span>{lang === "fr" ? "Accorder un accès" : "Grant Access"}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-4 space-y-4">
        {/* Filters and search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: "all", label: "Tous les membres" },
              { id: "active", label: "Actifs" },
              { id: "trial", label: "Essais" },
              { id: "cancelled", label: "Annulés" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === t.id
                    ? "bg-[#0055ff] text-white"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 size-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, email, Discord..."
              className="w-full rounded-xl border border-white/10 bg-[#16181f] pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#0055ff]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-400">
                <th className="py-3.5 px-3">Membre</th>
                <th className="py-3.5 px-3">Produit & Formule</th>
                <th className="py-3.5 px-3">Discord / Telegram</th>
                <th className="py-3.5 px-3">Dépenses Cumulées</th>
                <th className="py-3.5 px-3">Date d'inscription</th>
                <th className="py-3.5 px-3">Statut</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Users className="size-10 mx-auto mb-3 opacity-30 text-[#3DDC84]" />
                    <p className="text-sm font-semibold text-white">
                      Aucun client ou membre pour l'instant
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                      Dès qu'un client effectue un achat via Wave, MoMo ou Carte bancaire, il
                      apparaîtra ici automatiquement en temps réel.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2.5">
                      <button
                        onClick={() => setIsAddMemberOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3DDC84]/10 hover:bg-[#3DDC84]/20 text-[#3DDC84] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Ajouter manuellement un membre</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openCustomerDetails(c)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    {/* Name & Email with Avatar and Country Flag */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="flex size-8 items-center justify-center rounded-full mansa-profile-avatar border border-white/10 text-xs font-bold shrink-0">
                            {c.avatar}
                          </div>
                          <span className="absolute -bottom-1 -right-1 text-xs leading-none">
                            {c.countryFlag}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{c.name}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <span>{c.email}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="text-zinc-400 font-mono">{c.countryName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Product & plan */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-zinc-200">{c.productTitle}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{c.plan}</div>
                    </td>

                    {/* Discord handle */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-mono text-zinc-300">
                      {c.discordUsername ? (
                        <span className="inline-flex items-center gap-1 text-zinc-300">
                          <span className="size-1.5 rounded-full bg-[#3DDC84]" />
                          {c.discordUsername}
                        </span>
                      ) : (
                        <span className="text-zinc-600">Non lié</span>
                      )}
                    </td>

                    {/* Total spent */}
                    <td className="py-3.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                      {c.totalSpentFormatted || `${c.totalSpent.toLocaleString("fr-FR")} FCFA`}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-3 text-zinc-400 whitespace-nowrap font-mono text-[11px]">
                      {c.joinedDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {c.status === "active" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#3DDC84]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3DDC84]">
                          <CheckCircle2 className="size-3" />
                          <span>Actif</span>
                        </span>
                      )}
                      {c.status === "trial" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                          <span>Essai 7j</span>
                        </span>
                      )}
                      {c.status === "cancelled" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                          <span>Annulé</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCustomerDetails(c);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-zinc-300 text-xs font-semibold transition-colors"
                      >
                        Gérer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GRANT ACCESS / ADD MEMBER MODAL */}
      <ModalOverlay
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        contentClassName="max-w-md mx-auto"
      >
        <div className="w-full rounded-2xl border border-white/10 bg-[#151515] p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-[#3DDC84]" />
              <h3 className="text-base font-bold text-white font-heading">
                Accorder un Accès Gratuit / VIP
              </h3>
            </div>
            <button
              onClick={() => setIsAddMemberOpen(false)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[#B6B5B0] font-semibold mb-1">Nom complet</label>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="ex: Jean Dupont"
                className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white outline-none focus:border-[#3DDC84]"
                required
              />
            </div>

            <div>
              <label className="block text-[#B6B5B0] font-semibold mb-1">Email du membre</label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="jean@exemple.fr"
                className="w-full rounded-xl border border-white/10 bg-[#16181f] p-2.5 text-white outline-none focus:border-[#0055ff]"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Produit à débloquer</label>
              <select
                value={newMemberProduct}
                onChange={(e) => setNewMemberProduct(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#16181f] p-2.5 text-white outline-none cursor-pointer"
              >
                <option value="victory_odds">victory_odds · Accès Privé VIP</option>
                <option value="trading_bot">Victory Trading Bot & Signals</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#0055ff] hover:bg-[#0047d6] text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Valider l'accès
              </button>
            </div>
          </form>
        </div>
      </ModalOverlay>

      {/* CUSTOMER DETAILS MODAL */}
      <ModalOverlay
        isOpen={!!selectedCustomer}
        onClose={() => {
          setSelectedCustomer(null);
          setIsDetailsMenuOpen(false);
        }}
        contentClassName="max-w-xl mx-auto"
      >
        {selectedCustomer && (
          <div className="max-h-[88dvh] w-full overflow-y-auto rounded-3xl border border-white/10 bg-[#111214] p-4 shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full mansa-profile-avatar border border-white/10 text-xl font-medium">
                  {selectedCustomer.avatar || selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-semibold text-white">
                    {selectedCustomer.name}
                  </h2>
                  <p className="truncate text-sm text-zinc-400">
                    @{selectedCustomer.discordUsername || selectedCustomer.email.split("@")[0]}
                  </p>
                  {activeCompanyId && isCustomerBanned(activeCompanyId, selectedCustomer.email) && (
                    <span className="mt-1 inline-flex rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300">
                      Banni
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMessageDraft("");
                    setIsMessageModalOpen(true);
                  }}
                  className="rounded-xl border border-white/10 bg-[#242529] px-4 py-3 text-sm font-semibold text-white hover:bg-[#303136]"
                >
                  Message
                </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Plus d’actions"
                    aria-expanded={isDetailsMenuOpen}
                    onClick={() => setIsDetailsMenuOpen((open) => !open)}
                    className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-[#242529] text-white hover:bg-[#303136]"
                  >
                    <MoreVertical className="size-5" />
                  </button>
                  {isDetailsMenuOpen && (
                    <div className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1d1e21] p-1 shadow-2xl">
                      <button
                        type="button"
                        onClick={() => {
                          setNoteDraft(
                            activeCompanyId
                              ? getCustomerNote(activeCompanyId, selectedCustomer.email)
                              : "",
                          );
                          setIsNoteModalOpen(true);
                          setIsDetailsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/5"
                      >
                        <StickyNote className="size-4" /> Ajouter une note
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerToRevoke(selectedCustomer);
                          setIsDetailsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-500/10"
                      >
                        <Ban className="size-4" /> Bannir ce membre
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Fermer la fiche"
                  onClick={() => setSelectedCustomer(null)}
                  className="ml-1 flex size-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#222326]">
                <div className="border-b border-white/5 px-5 py-4">
                  <div className="text-sm text-zinc-400">Dépenses</div>
                  <div className="mt-1 text-lg font-medium text-white">
                    {selectedCustomer.totalSpentFormatted ||
                      `${selectedCustomer.totalSpent.toLocaleString("fr-FR")} FCFA`}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="text-sm text-zinc-400">Rejoint</div>
                  <div className="mt-1 text-lg font-medium text-white">
                    {selectedCustomer.joinedDate}
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#222326]">
                <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-400">E-mail</div>
                    <div className="mt-1 break-all text-base text-white">
                      {selectedCustomer.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Copier l’e-mail"
                    onClick={() => void copyValue(selectedCustomer.email, "email")}
                    className="shrink-0 p-2 text-zinc-400 hover:text-white"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="text-sm text-zinc-400">Emplacement</div>
                    <div className="mt-1 text-base text-white">
                      {selectedCustomer.location || selectedCustomer.countryName || "Non renseigné"}
                    </div>
                  </div>
                  <MapPin className="size-4 shrink-0 text-zinc-500" />
                </div>
              </section>

              <section className="rounded-2xl border border-white/5 bg-[#222326] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-base font-medium text-white">Équipe</span>
                  <span className="rounded-md bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300">
                    {selectedCustomer.status === "active" ? "Membre" : selectedCustomer.status}
                  </span>
                </div>
                <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#17181a] px-4 py-3 text-sm text-white">
                  <span>{selectedCustomer.productTitle || "Membre"}</span>
                  <span className="text-zinc-500">{selectedCustomer.plan}</span>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#222326]">
                <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
                  <div>
                    <div className="text-sm text-zinc-400">Discord</div>
                    <div className="mt-1 text-base text-white">
                      {selectedCustomer.discordUsername || "Non lié"}
                    </div>
                  </div>
                  {selectedCustomer.discordUsername && (
                    <button
                      type="button"
                      aria-label="Copier le nom Discord"
                      onClick={() =>
                        void copyValue(selectedCustomer.discordUsername || "", "discord")
                      }
                      className="p-2 text-zinc-400 hover:text-white"
                    >
                      <Copy className="size-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="text-sm text-zinc-400">ID Discord</div>
                    <div className="mt-1 text-base text-white">
                      {selectedCustomer.discordId || "Non renseigné"}
                    </div>
                  </div>
                  {selectedCustomer.discordId && (
                    <button
                      type="button"
                      aria-label="Copier l’ID Discord"
                      onClick={() => void copyValue(selectedCustomer.discordId || "", "discord-id")}
                      className="p-2 text-zinc-400 hover:text-white"
                    >
                      <Copy className="size-4" />
                    </button>
                  )}
                </div>
              </section>

              {activeCompanyId && getCustomerNote(activeCompanyId, selectedCustomer.email) && (
                <section className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-amber-200">
                    <StickyNote className="size-3.5" /> Note privée
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">
                    {getCustomerNote(activeCompanyId, selectedCustomer.email)}
                  </p>
                </section>
              )}
            </div>
            {copiedField && <div className="mt-3 text-center text-xs text-emerald-300">Copié</div>}
          </div>
        )}
      </ModalOverlay>

      <ModalOverlay
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        contentClassName="mx-auto max-w-md"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveNote();
          }}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#17181a] p-5 shadow-2xl"
        >
          <div>
            <h3 className="text-lg font-bold text-white">Note privée</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Visible uniquement dans l’espace créateur de cette entreprise.
            </p>
          </div>
          <textarea
            autoFocus
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Ajouter une information à retenir…"
            className="w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </ModalOverlay>

      <ModalOverlay
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        contentClassName="mx-auto max-w-md"
      >
        <form
          onSubmit={sendCustomerMessage}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#17181a] p-5 shadow-2xl"
        >
          <div>
            <h3 className="text-lg font-bold text-white">Message à {selectedCustomer?.name}</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Le message sera ajouté à sa conversation d’assistance.
            </p>
          </div>
          <textarea
            autoFocus
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
            rows={4}
            placeholder="Écrire un message…"
            className="w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsMessageModalOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!messageDraft.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <Send className="size-4" />
              Envoyer
            </button>
          </div>
        </form>
      </ModalOverlay>

      {/* CONFIRM CUSTOMER ACCESS REVOCATION MODAL */}
      {customerToRevoke && (
        <ConfirmActionModal
          isOpen={!!customerToRevoke}
          onClose={() => setCustomerToRevoke(null)}
          onConfirm={() => {
            if (activeCompanyId) {
              setCustomerBanned(activeCompanyId, customerToRevoke.email, true);
              addUserNotification(customerToRevoke.email.trim().toLowerCase(), {
                type: "ban",
                title: "Accès révoqué",
                message: `Vous avez été banni de ${activeCompanyName || "cette entreprise"}.`,
                companyId: activeCompanyId,
              });
            }
            if (customerToRevoke.id.startsWith("local-member-") && activeCompanyId) {
              removeSubscription(
                customerToRevoke.id.slice("local-member-".length),
                activeCompanyId,
              );
            } else {
              void deleteCustomerFromFirestore(customerToRevoke.id);
            }
            setCustomers((prev) => prev.filter((c) => c.id !== customerToRevoke.id));
            if (selectedCustomer?.id === customerToRevoke.id) {
              setSelectedCustomer(null);
            }
            setCustomerToRevoke(null);
          }}
          title={lang === "fr" ? "Bannir ce membre ?" : "Ban this member?"}
          description={
            lang === "fr"
              ? `L’accès de ${customerToRevoke.name} à cette entreprise sera révoqué. Cette exclusion sera enregistrée sur cet appareil uniquement.`
              : `Access for ${customerToRevoke.name} will be revoked. This exclusion is saved on this device only.`
          }
          itemName={customerToRevoke.name}
          itemType={lang === "fr" ? "Client / Membre VIP" : "Customer / VIP Member"}
          itemDetails={[
            { label: "Email", value: customerToRevoke.email },
            { label: "Produit", value: customerToRevoke.productTitle },
            {
              label: "Pays",
              value: `${customerToRevoke.countryFlag} ${customerToRevoke.countryName}`,
            },
            {
              label: "Total dépensé",
              value: customerToRevoke.totalSpentFormatted || `$${customerToRevoke.totalSpent}`,
            },
          ]}
          consequences={[
            lang === "fr"
              ? "Son adhésion à cette entreprise sera retirée et il n’apparaîtra plus dans la liste des membres actifs."
              : "Their membership in this company will be removed and they will no longer appear in the active member list.",
            lang === "fr"
              ? "La liste des membres exclus est enregistrée sur cet appareil uniquement."
              : "The excluded members list is saved on this device only.",
          ]}
          confirmButtonText={lang === "fr" ? "Bannir et révoquer l’accès" : "Ban and revoke access"}
          cancelButtonText={lang === "fr" ? "Annuler" : "Cancel"}
          variant="danger"
          lang={lang}
        />
      )}
    </div>
  );
};
