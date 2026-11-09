import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "./firebase";
import { db } from "./firebase";

export interface AffiliateProduct {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  category: string;
  status: "active";
  affiliateCommissionRate: number;
  pricingAmount: number;
  currency: string;
  coverImage?: string;
  storeUrl?: string;
}

export interface AffiliateLink {
  id: string;
  affiliateUid: string;
  productId: string;
  productName: string;
  commissionRate: number;
  code: string;
  acceptedAt?: unknown;
  createdAt?: unknown;
}

export interface PublicAffiliateProduct {
  product: AffiliateProduct;
  commissionRate: number;
}

const requireFirestore = () => {
  if (!db) {
    throw new Error("Firebase Firestore n’est pas configuré. Aucun lien affilié n’a été créé.");
  }
  return db;
};

const firestoreError = (error: unknown, operation: string): Error => {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code.includes("permission-denied") || code.includes("unauthenticated")) {
    return new Error(
      `Firestore a refusé ${operation} (règles d’accès ou authentification). Aucun lien n’a été créé. Vérifiez les règles Firestore pour les produits, affiliateLinks, affiliateCodes et affiliateLinkRefs.`,
      { cause: error },
    );
  }
  return error instanceof Error ? error : new Error(`Échec de ${operation}.`);
};

const mapProduct = (id: string, data: Record<string, unknown>): AffiliateProduct | null => {
  const rate = data["affiliateCommissionRate"];
  const creatorId = typeof data["creatorId"] === "string" ? data["creatorId"] : "";
  const name = typeof data["name"] === "string" ? data["name"].trim() : "";
  if (
    data["status"] !== "active" ||
    !creatorId ||
    !name ||
    typeof rate !== "number" ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    rate > 100
  ) {
    return null;
  }
  return {
    id,
    creatorId,
    name,
    description:
      typeof data["description"] === "string"
        ? data["description"]
        : typeof data["tagline"] === "string"
          ? data["tagline"]
          : "",
    category: typeof data["category"] === "string" ? data["category"] : "Produit",
    status: "active",
    affiliateCommissionRate: rate,
    pricingAmount: Number.isFinite(Number(data["pricingAmount"]))
      ? Number(data["pricingAmount"])
      : 0,
    currency: typeof data["currency"] === "string" ? data["currency"] : "XOF",
    ...(typeof data["coverImage"] === "string" ? { coverImage: data["coverImage"] } : {}),
    ...(typeof data["storeUrl"] === "string" ? { storeUrl: data["storeUrl"] } : {}),
  };
};

export async function getAffiliateEligibleProducts(
  affiliateUid: string,
): Promise<AffiliateProduct[]> {
  if (!affiliateUid) return [];
  const firestore = requireFirestore();
  try {
    const productsSnapshot = await getDocs(
      query(collection(firestore, "products"), where("status", "==", "active")),
    );
    return productsSnapshot.docs
      .map((snapshot) => mapProduct(snapshot.id, snapshot.data()))
      .filter(
        (product): product is AffiliateProduct =>
          product !== null && product.creatorId !== affiliateUid,
      );
  } catch (error) {
    throw firestoreError(error, "la lecture des produits affiliables");
  }
}

function createRandomAffiliateCode(): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error("Un générateur cryptographique sécurisé est nécessaire pour créer un lien.");
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function affiliateProductDocumentId(
  affiliateUid: string,
  productId: string,
): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error("Le hachage sécurisé du lien affilié n’est pas disponible dans ce navigateur.");
  }
  const input = new TextEncoder().encode(JSON.stringify([affiliateUid, productId]));
  const digest = new Uint8Array(await cryptoApi.subtle.digest("SHA-256", input));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const isValidRate = (rate: unknown): rate is number =>
  typeof rate === "number" && Number.isFinite(rate) && rate > 0 && rate <= 100;

export async function createOrGetAffiliateLink(
  affiliateUid: string,
  product: Pick<AffiliateProduct, "id" | "affiliateCommissionRate">,
): Promise<AffiliateLink> {
  if (!affiliateUid) throw new Error("Une session utilisateur est requise.");
  const firestore = requireFirestore();
  try {
    const linkId = await affiliateProductDocumentId(affiliateUid, product.id);
    const productRef = doc(firestore, "products", product.id);
    const linkRef = doc(firestore, "affiliateLinks", linkId);

    // Each attempt reserves a fresh code, while the link document ID is stable per UID/product.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = createRandomAffiliateCode();
      const publicRef = createRandomAffiliateCode();
      const candidateCodeRef = doc(firestore, "affiliateCodes", code);
      const candidatePublicRef = doc(firestore, "affiliateLinkRefs", publicRef);
      const result = await runTransaction(firestore, async (transaction) => {
        const [productSnapshot, linkSnapshot, candidateCodeSnapshot, candidatePublicRefSnapshot] =
          await Promise.all([
            transaction.get(productRef),
            transaction.get(linkRef),
            transaction.get(candidateCodeRef),
            transaction.get(candidatePublicRef),
          ]);
        if (!productSnapshot.exists()) throw new Error("Ce produit n’existe plus dans Firebase.");
        const currentProduct = mapProduct(productSnapshot.id, productSnapshot.data());
        if (!currentProduct || currentProduct.creatorId === affiliateUid) {
          throw new Error("Ce produit n’est plus éligible au programme d’affiliation.");
        }
        if (currentProduct.affiliateCommissionRate !== product.affiliateCommissionRate) {
          throw new Error(
            "Le créateur a modifié le taux depuis l’affichage des conditions. Rechargez les produits et acceptez le taux actuel.",
          );
        }

        if (linkSnapshot.exists()) {
          const saved = linkSnapshot.data();
          if (
            saved["affiliateUid"] !== affiliateUid ||
            saved["productId"] !== currentProduct.id ||
            saved["creatorUid"] !== currentProduct.creatorId ||
            typeof saved["code"] !== "string" ||
            !isValidRate(Number(saved["commissionRate"]))
          ) {
            throw new Error("Le lien affilié existant ne correspond pas à ce compte et produit.");
          }
          const savedCode = saved["code"];
          const savedCodeRef = doc(firestore, "affiliateCodes", savedCode);
          const savedCodeSnapshot =
            savedCode === code ? candidateCodeSnapshot : await transaction.get(savedCodeRef);
          if (!savedCodeSnapshot.exists()) {
            throw new Error("Le code public du lien affilié est absent ou incohérent.");
          }
          const savedRate = Number(saved["commissionRate"]);
          const codeData = savedCodeSnapshot.data();
          const acceptedRate = currentProduct.affiliateCommissionRate;
          const savedPublicRef =
            typeof saved["publicRef"] === "string" && /^[A-Za-z0-9_-]{32}$/.test(saved["publicRef"])
              ? saved["publicRef"]
              : typeof codeData["publicRef"] === "string" &&
                  /^[A-Za-z0-9_-]{32}$/.test(codeData["publicRef"])
                ? codeData["publicRef"]
                : publicRef;
          const savedPublicRefDoc = doc(firestore, "affiliateLinkRefs", savedPublicRef);
          const savedPublicRefSnapshot =
            savedPublicRef === publicRef
              ? candidatePublicRefSnapshot
              : await transaction.get(savedPublicRefDoc);
          const referenceData = savedPublicRefSnapshot.exists()
            ? savedPublicRefSnapshot.data()
            : null;
          const validPrivateReference =
            referenceData?.["linkId"] === linkId &&
            referenceData?.["affiliateUid"] === affiliateUid &&
            referenceData?.["productId"] === currentProduct.id;
          const legacyCodeMatches = codeData["linkId"] === linkId && !saved["publicRef"];
          if (!validPrivateReference && !legacyCodeMatches) {
            throw new Error("Le code public du lien affilié est absent ou incohérent.");
          }
          if (
            savedPublicRef === publicRef &&
            savedPublicRefSnapshot.exists() &&
            !validPrivateReference
          ) {
            return null;
          }
          if (
            codeData["publicRef"] !== savedPublicRef ||
            codeData["productId"] !== currentProduct.id ||
            Number(codeData["commissionRate"]) !== acceptedRate ||
            "linkId" in codeData
          ) {
            transaction.set(savedCodeRef, {
              publicRef: savedPublicRef,
              productId: currentProduct.id,
              commissionRate: acceptedRate,
              createdAt: codeData["createdAt"] ?? serverTimestamp(),
            });
          }
          if (!savedPublicRefSnapshot.exists()) {
            transaction.set(savedPublicRefDoc, {
              linkId,
              affiliateUid,
              productId: currentProduct.id,
            });
          }
          if (savedPublicRef !== saved["publicRef"] || savedRate !== acceptedRate) {
            const linkUpdate: Record<string, unknown> = { publicRef: savedPublicRef };
            if (savedRate !== acceptedRate) {
              linkUpdate["commissionRate"] = acceptedRate;
              linkUpdate["acceptedAt"] = serverTimestamp();
            }
            transaction.update(linkRef, linkUpdate);
          }
          return {
            id: linkId,
            affiliateUid,
            productId: currentProduct.id,
            productName: currentProduct.name,
            commissionRate: acceptedRate,
            code: savedCode,
            acceptedAt: savedRate === acceptedRate ? saved["acceptedAt"] : undefined,
            createdAt: saved["createdAt"],
          } satisfies AffiliateLink;
        }

        if (candidateCodeSnapshot.exists() || candidatePublicRefSnapshot.exists()) return null;
        transaction.set(candidateCodeRef, {
          publicRef,
          productId: currentProduct.id,
          commissionRate: currentProduct.affiliateCommissionRate,
          createdAt: serverTimestamp(),
        });
        transaction.set(candidatePublicRef, {
          linkId,
          affiliateUid,
          productId: currentProduct.id,
        });
        transaction.set(linkRef, {
          affiliateUid,
          productId: currentProduct.id,
          productName: currentProduct.name,
          creatorUid: currentProduct.creatorId,
          publicRef,
          commissionRate: currentProduct.affiliateCommissionRate,
          code,
          acceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        return {
          id: linkId,
          affiliateUid,
          productId: currentProduct.id,
          productName: currentProduct.name,
          commissionRate: currentProduct.affiliateCommissionRate,
          code,
        } satisfies AffiliateLink;
      });
      if (result) return result;
    }
    throw new Error("Impossible de réserver un code unique après plusieurs tentatives.");
  } catch (error) {
    throw firestoreError(error, "la création du lien affilié");
  }
}

export async function getAffiliateLinksForUser(affiliateUid: string): Promise<AffiliateLink[]> {
  if (!affiliateUid) return [];
  const firestore = requireFirestore();
  try {
    const linksSnapshot = await getDocs(
      query(collection(firestore, "affiliateLinks"), where("affiliateUid", "==", affiliateUid)),
    );
    return linksSnapshot.docs.map((snapshot) => {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        affiliateUid: String(data["affiliateUid"]),
        productId: String(data["productId"]),
        productName: String(data["productName"] || "Produit"),
        commissionRate: Number(data["commissionRate"]),
        code: String(data["code"]),
        acceptedAt: data["acceptedAt"],
        createdAt: data["createdAt"],
      };
    });
  } catch (error) {
    throw firestoreError(error, "la lecture de vos liens affiliés");
  }
}

export async function resolvePublicAffiliateCode(
  code: string,
): Promise<PublicAffiliateProduct | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(code)) return null;
  const firestore = requireFirestore();
  try {
    // This is the only affiliate document readable without authentication. It contains
    // only an opaque random reference and the public product/rate needed by the landing page.
    const codeSnapshot = await getDoc(doc(firestore, "affiliateCodes", code));
    if (!codeSnapshot.exists()) return null;
    const codeData = codeSnapshot.data();
    const publicRef = codeData["publicRef"];
    const productId = codeData["productId"];
    const commissionRate = Number(codeData["commissionRate"]);
    if (
      typeof publicRef !== "string" ||
      !/^[A-Za-z0-9_-]{32}$/.test(publicRef) ||
      typeof productId !== "string" ||
      !productId ||
      !isValidRate(commissionRate)
    ) {
      return null;
    }
    const productSnapshot = await getDoc(doc(firestore, "products", productId));
    if (!productSnapshot.exists()) return null;
    const product = mapProduct(productSnapshot.id, productSnapshot.data());
    if (!product) return null;
    return { product, commissionRate };
  } catch (error) {
    throw firestoreError(error, "la résolution du lien affilié public");
  }
}
