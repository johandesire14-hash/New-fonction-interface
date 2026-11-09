import { supabase } from "../services/supabase";
import {
  uploadOfferFile,
  downloadOfferFile,
  getOfferFileUrl,
} from "../services/supabaseStorageService";

export interface StoredDigitalAsset {
  storageKey: string;
  companyId: string;
  name: string;
  type: string;
  size: number;
  updatedAt: string;
  blob?: Blob;
}

export function createDigitalAssetKey(companyId: string, assetId: string): string {
  return `${encodeURIComponent(companyId)}:${encodeURIComponent(assetId)}`;
}

/**
 * Enregistre un fichier binaire dans Supabase Storage (bucket privé 'offer-files')
 * Chemin obligatoire : <auth.uid()>/<id de l'offre>/<nom du fichier>
 */
export async function saveDigitalAsset(
  companyId: string,
  assetId: string,
  file: Blob & { name?: string },
  offerId?: string,
): Promise<StoredDigitalAsset> {
  if (!companyId || !assetId || !file) {
    throw new Error("Les informations du fichier sont incomplètes.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("Vous devez être connecté pour téléverser un fichier.");
  }

  const effectiveOfferId = offerId || companyId;
  const fileName = file.name || `file_${assetId}`;

  const uploadResult = await uploadOfferFile(user.id, effectiveOfferId, file, fileName);

  return {
    storageKey: uploadResult.storagePath,
    companyId,
    name: fileName,
    type: file.type || "application/octet-stream",
    size: file.size,
    updatedAt: new Date().toISOString(),
    blob: file,
  };
}

export async function getDigitalAsset(storageKey: string): Promise<StoredDigitalAsset | null> {
  if (!storageKey) return null;
  return {
    storageKey,
    companyId: storageKey.split("/")[1] || "",
    name: storageKey.split("/").pop() || "fichier",
    type: "application/octet-stream",
    size: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function downloadDigitalAsset(
  storageKey: string,
  downloadName?: string,
): Promise<void> {
  return downloadOfferFile(storageKey, downloadName);
}

export async function getDigitalAssetObjectUrl(storageKey: string): Promise<string> {
  return getOfferFileUrl(storageKey);
}
