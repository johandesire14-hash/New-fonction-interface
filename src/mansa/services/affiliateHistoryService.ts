import { collection, getDocs, query, where } from "./firebase";
import { db } from "./firebase";

export interface AffiliateInvitation {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  productId: string;
  productName: string;
  status: "pending" | "registered" | "converted" | "cancelled";
  createdAt?: unknown;
  amount?: number;
  currency?: string;
}

export async function getAffiliateInvitationHistory(
  affiliateUid: string,
): Promise<AffiliateInvitation[]> {
  if (!affiliateUid || !db) return [];
  const snapshot = await getDocs(
    query(collection(db, "transactions"), where("creatorId", "==", affiliateUid)),
  );
  return snapshot.docs
    .map((document) => {
      const raw = document.data() as Record<string, unknown>;
      const isAffiliateEvent =
        raw["type"] === "affiliate" ||
        typeof raw["referralCode"] === "string" ||
        typeof raw["referralProductId"] === "string";
      if (!isAffiliateEvent) return null;
      const status: AffiliateInvitation["status"] =
        raw["status"] === "failed"
          ? "cancelled"
          : raw["status"] === "pending"
            ? "pending"
            : "converted";
      const amount = Number(raw["amountNumber"] ?? raw["amount"]);
      return {
        id: document.id,
        inviteeName: String(raw["buyerName"] || raw["customerName"] || "Invité sans nom"),
        inviteeEmail: String(raw["buyerEmail"] || raw["customerEmail"] || ""),
        productId: String(raw["productId"] || raw["referralProductId"] || ""),
        productName: String(raw["productName"] || "Produit affilié"),
        status,
        createdAt: raw["timestamp"] || raw["createdAt"],
        ...(Number.isFinite(amount) ? { amount } : {}),
        ...(typeof raw["currency"] === "string" ? { currency: raw["currency"] } : {}),
      } satisfies AffiliateInvitation;
    })
    .filter((item): item is AffiliateInvitation => item !== null)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}
