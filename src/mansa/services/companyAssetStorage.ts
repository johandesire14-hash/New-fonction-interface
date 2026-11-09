import { getDownloadURL, ref, storage, uploadBytes } from "./firebase";

export type CompanyBrandingAsset = "banner" | "logo";
export const COMPANY_BRANDING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const COMPANY_POST_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export function validateCompanyBrandingImage(file: File | null | undefined): string | null {
  if (!file || !file.type.startsWith("image/")) return "Choisissez un fichier image.";
  // storage.rules impose strictement moins de 5 Mio; refuser l'égalité côté client évite un upload refusé.
  if (file.size >= COMPANY_BRANDING_IMAGE_MAX_BYTES) {
    return "L’image doit faire moins de 5 Mo.";
  }
  return null;
}

export function validateCompanyPostMedia(file: File | null | undefined): string | null {
  if (!file || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
    return "Choisissez une image ou une vidéo.";
  }
  if (file.size >= COMPANY_POST_MEDIA_MAX_BYTES) {
    return "Le média doit faire moins de 25 Mo.";
  }
  return null;
}

export async function uploadCompanyBrandingAsset(
  companyId: string,
  kind: CompanyBrandingAsset,
  file: File,
): Promise<string> {
  if (!companyId.trim() || !file) throw new Error("Choisissez une image valide.");
  if (!storage) {
    throw new Error(
      "Firebase Storage n’est pas configuré. Définissez VITE_FIREBASE_STORAGE_BUCKET puis déployez les règles Storage.",
    );
  }
  const validationError = validateCompanyBrandingImage(file);
  if (validationError) throw new Error(validationError);

  const extension = file.name.includes(".")
    ? file.name
        .split(".")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "") || "img"
    : "img";
  const objectPath = `company-branding/${encodeURIComponent(companyId)}/${kind}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const objectRef = ref(storage, objectPath);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

export async function uploadCompanyPostMedia(
  companyId: string,
  mediaId: string,
  file: File,
): Promise<string> {
  if (!companyId.trim() || !mediaId.trim() || !file) {
    throw new Error("Choisissez un média valide.");
  }
  if (!storage) {
    throw new Error("Le téléversement de médias n’est pas disponible actuellement.");
  }
  const validationError = validateCompanyPostMedia(file);
  if (validationError) throw new Error(validationError);

  const extension = file.name.includes(".")
    ? file.name
        .split(".")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "") || "media"
    : "media";
  const objectPath = `company-post-media/${encodeURIComponent(companyId)}/${encodeURIComponent(mediaId)}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const objectRef = ref(storage, objectPath);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}
