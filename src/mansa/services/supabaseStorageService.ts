import { supabase } from "./supabase";

const STORAGE_BUCKET = "offer-files";

export interface UploadedOfferFileResult {
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Téléverse un fichier dans le bucket privé 'offer-files'
 * Chemin obligatoire strict : <auth.uid() du créateur>/<id de l'offre>/<nom du fichier>
 */
export async function uploadOfferFile(
  creatorUid: string,
  offerId: string,
  file: File | Blob,
  fileName: string,
): Promise<UploadedOfferFileResult> {
  if (!creatorUid || !offerId || !file || !fileName) {
    throw new Error("Paramètres manquants pour le téléversement du fichier.");
  }

  // Nettoyage du nom de fichier pour préserver un chemin propre et sécurisé
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${creatorUid}/${offerId}/${sanitizedFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    console.error("Erreur téléversement Storage Supabase:", uploadError);
    throw new Error("Impossible de téléverser le fichier : " + uploadError.message);
  }

  // Générer une URL signée valable 24h
  let downloadUrl = "";
  try {
    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24);

    if (!signError && signedData?.signedUrl) {
      downloadUrl = signedData.signedUrl;
    }
  } catch {
    // Si la création d'URL signée échoue, fallback sur chemin
    downloadUrl = "";
  }

  return {
    storagePath,
    downloadUrl,
    fileName,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}

/**
 * Télécharge un fichier depuis le bucket Storage 'offer-files'
 */
export async function downloadOfferFile(
  storagePath: string,
  downloadName?: string,
): Promise<void> {
  if (!storagePath) {
    throw new Error("Chemin de fichier manquant.");
  }

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error || !data) {
    console.error("Erreur téléchargement Storage:", error);
    throw new Error("Impossible de télécharger le fichier : " + (error?.message || "introuvable"));
  }

  if (typeof window !== "undefined") {
    const objectUrl = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = downloadName || storagePath.split("/").pop() || "fichier";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }
}

/**
 * Récupère une URL d'accès sécurisée (signée) pour un fichier
 */
export async function getOfferFileUrl(storagePath: string): Promise<string> {
  if (!storagePath) return "";
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 6); // 6 heures

  if (error || !data?.signedUrl) {
    console.warn("Impossible d'obtenir l'URL signée pour:", storagePath, error);
    return "";
  }
  return data.signedUrl;
}

/**
 * Supprime un fichier du bucket 'offer-files'
 */
export async function deleteOfferFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  if (error) {
    console.warn("Notice: suppression fichier Storage Supabase:", error);
  }
}
