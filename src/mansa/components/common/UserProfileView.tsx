// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  DollarSign,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { getUserProfile, subscribeToCreatorTransactions } from "../../services/dbService";
import { supabase } from "../../services/supabase";

interface UserProfileViewProps {
  userId: string;
  fallbackName?: string;
  fallbackEmail?: string;
  onBack: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userId,
  fallbackName,
  fallbackEmail,
  onBack,
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [ownedSpaces, setOwnedSpaces] = useState<any[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!userId) return;
      const [loadedProfile, ownedResult, membershipsResult] = await Promise.all([
        getUserProfile(userId),
        supabase.from("communities").select("id, name, description, logo_url").eq("owner_id", userId),
        supabase.from("community_members").select("community_id").eq("member_id", userId),
      ]);
      const ids = (membershipsResult.data || []).map((row) => row.community_id).filter(Boolean);
      const joinedResult = ids.length
        ? await supabase.from("communities").select("id, name, description, logo_url").in("id", ids)
        : { data: [] };
      if (!mounted) return;
      setProfile(loadedProfile);
      setOwnedSpaces(ownedResult.data || []);
      setJoinedCommunities(joinedResult.data || []);
      setLoading(false);
    };
    void load().catch((error) => {
      console.error("Impossible de charger le profil consulté:", error);
      if (mounted) setLoading(false);
    });
    const unsubscribe = subscribeToCreatorTransactions(userId, (transactions) => {
      if (!mounted) return;
      setTotalEarned(
        transactions
          .filter((transaction) => transaction.status === "completed")
          .reduce((sum, transaction) => sum + Number(transaction.amountNumber || 0), 0),
      );
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [userId]);

  const displayName = profile?.displayName || fallbackName || fallbackEmail || "Utilisateur";
  const handle = profile?.handle || (fallbackEmail ? `@${fallbackEmail.split("@")[0]}` : "");
  const canShowEarned = profile?.showTotalEarned !== false;
  const canShowLocation = profile?.showLocation !== false;
  const canShowOwned = profile?.showOwnedBusinesses !== false && profile?.showOwnedWhops !== false;
  const canShowJoined = profile?.showJoinedWhops !== false;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#101114]">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          aria-label="Retour à la conversation"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-white">Profil</h2>
          <p className="text-[11px] text-zinc-500">Informations publiques</p>
        </div>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs text-zinc-400">
          <Loader2 className="size-4 animate-spin text-emerald-400" /> Chargement du profil…
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-[#181a1f] p-5">
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-2xl font-bold text-emerald-300">
                  {displayName[0]?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-white">{displayName}</h1>
                  <p className="truncate text-sm text-emerald-300">{handle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {profile?.bio || "Aucune bio renseignée."}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              {canShowEarned && (
                <div className="rounded-2xl border border-white/10 bg-[#181a1f] p-4">
                  <DollarSign className="mb-2 size-5 text-emerald-400" />
                  <p className="text-xs text-zinc-500">Total gagné</p>
                  <p className="mt-1 text-base font-bold text-white">{totalEarned.toLocaleString("fr-FR")} {profile?.currency || "XOF"}</p>
                </div>
              )}
              {canShowLocation && (
                <div className="rounded-2xl border border-white/10 bg-[#181a1f] p-4">
                  <MapPin className="mb-2 size-5 text-emerald-400" />
                  <p className="text-xs text-zinc-500">Emplacement</p>
                  <p className="mt-1 text-base font-bold text-white">{profile?.country || "Non renseigné"}</p>
                </div>
              )}
            </div>

            {canShowOwned && (
              <section className="rounded-2xl border border-white/10 bg-[#181a1f] p-4">
                <div className="mb-3 flex items-center gap-2"><BriefcaseBusiness className="size-5 text-emerald-400" /><h2 className="font-bold text-white">Espaces / Boutiques possédés</h2></div>
                {ownedSpaces.length ? ownedSpaces.map((space) => <div key={space.id} className="border-t border-white/[0.06] py-3 text-sm text-zinc-300">{space.name}</div>) : <p className="text-sm text-zinc-500">Aucun espace public.</p>}
              </section>
            )}

            {canShowJoined && (
              <section className="rounded-2xl border border-white/10 bg-[#181a1f] p-4">
                <div className="mb-3 flex items-center gap-2"><Users className="size-5 text-emerald-400" /><h2 className="font-bold text-white">Communautés rejointes</h2></div>
                {joinedCommunities.length ? joinedCommunities.map((community) => <div key={community.id} className="border-t border-white/[0.06] py-3 text-sm text-zinc-300">{community.name}</div>) : <p className="text-sm text-zinc-500">Aucune communauté publique.</p>}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
