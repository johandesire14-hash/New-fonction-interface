import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, FileText, Pencil, Plus, Replace, Trash2, Upload, X } from "lucide-react";
import { supabase } from "../../services/supabase";
import { uploadOfferFile, deleteOfferFile } from "../../services/supabaseStorageService";
import { getUserFacingErrorMessage } from "../../utils/userFacingError";


interface FilesWorkspaceProps {
  creatorId: string;
  companyId: string;
  productIds: string[];
  products: ProductRecord[];
  onBack: () => void;
}

interface ProductDigitalFile {
  id: string;
  name?: string;
  title?: string;
  size?: string;
  type?: string;
  storageKey?: string | undefined;
  downloadUrl?: string | undefined;
  updatedAt?: string;
  isFreePreview?: boolean;
}

interface ProductRecord {
  id: string;
  name?: string;
  title?: string;
  digitalFiles?: ProductDigitalFile[];
  ebooks?: Array<{ id: string; title?: string; [key: string]: unknown }>;
  includedApps?: string[];
}

type FileItem = {
  id: string;
  name: string;
  size: string;
  type: string;
  productIds: string[];
  storageKey?: string | undefined;
  updatedAt: string;
  downloadUrl?: string;
};

type Screen = "library" | "add" | "edit";
type EditMode = "rename" | "replace";

const formatSize = (bytes: number) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};



const createInitialFiles = (products: ProductRecord[], productIds: string[]): FileItem[] => {
  const byId = new Map<string, FileItem>();
  products
    .filter((product) => productIds.includes(product.id))
    .forEach((product) => {
      (product.digitalFiles || []).forEach((file) => {
        const existing = byId.get(file.id);
        byId.set(file.id, {
          id: file.id,
          name: file.name || file.title || "Fichier sans nom",
          size: file.size || "Taille inconnue",
          type: file.type || "application/octet-stream",
          productIds: Array.from(new Set([...(existing?.productIds || []), product.id])),
          storageKey: file.storageKey || existing?.storageKey,
          updatedAt: file.updatedAt || existing?.updatedAt || new Date().toISOString(),
        });
      });
      (product.ebooks || []).forEach((ebook) => {
        const existing = byId.get(ebook.id);
        const storageKey = typeof ebook.storageKey === "string" ? ebook.storageKey : undefined;
        byId.set(ebook.id, {
          id: ebook.id,
          name: ebook.title || existing?.name || "Fichier sans nom",
          size:
            typeof ebook.fileSize === "string"
              ? ebook.fileSize
              : existing?.size || "Taille inconnue",
          type: typeof ebook.type === "string" ? ebook.type : existing?.type || "application/pdf",
          productIds: Array.from(new Set([...(existing?.productIds || []), product.id])),
          storageKey: storageKey || existing?.storageKey,
          updatedAt: existing?.updatedAt || new Date().toISOString(),
          ...(typeof ebook.downloadUrl === "string" ? { downloadUrl: ebook.downloadUrl } : {}),
        });
      });
    });
  return Array.from(byId.values());
};

const loadWorkspaceFiles = async (productIds: string[]): Promise<FileItem[]> => {
  if (!productIds.length) return [];
  const { data, error } = await supabase.from("offer_files").select("*").in("offer_id", productIds).order("created_at", { ascending: false });
  if (error) throw error;
  const byId = new Map<string, FileItem>();
  (data || []).forEach((row: any) => {
    const current = byId.get(row.id);
    byId.set(row.id, {
      id: row.id, name: row.title || row.name || "Fichier sans nom", size: row.file_size ? formatSize(row.file_size) : "Taille inconnue",
      type: row.mime_type || "application/octet-stream", productIds: Array.from(new Set([...(current?.productIds || []), row.offer_id])),
      storageKey: row.storage_path, updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    });
  });
  return Array.from(byId.values());
};

export const FilesWorkspace: React.FC<FilesWorkspaceProps> = ({
  creatorId,
  companyId,
  productIds,
  products,
  onBack,
}) => {
  const [screen, setScreen] = useState<Screen>("library");
  const [editMode, setEditMode] = useState<EditMode>("rename");
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadWorkspaceFiles(productIds).then((loaded) => { if (!cancelled) setFiles(loaded); }).catch((error) => { if (!cancelled) setSaveError(error instanceof Error ? error.message : String(error)); });
    return () => { cancelled = true; };
  }, [productIds]);

  const linkedProductNames = useMemo(
    () =>
      productIds.map(
        (id) =>
          products.find((product) => product.id === id)?.title ||
          products.find((product) => product.id === id)?.name ||
          "Offre sélectionnée",
      ),
    [productIds, products],
  );

  const persistFiles = async (nextFiles: FileItem[]) => {
    const scoped = nextFiles.filter((file) => file.productIds.some((id) => productIds.includes(id)));
    const { error: removeError } = await supabase.from("offer_files").delete().in("offer_id", productIds);
    if (removeError) throw removeError;
    const rows = scoped.flatMap((file) => productIds.filter((offerId) => file.productIds.includes(offerId)).map((offerId) => ({ id: file.id, offer_id: offerId, title: file.name, storage_path: file.storageKey, file_size: Number.parseInt(file.size) || null, mime_type: file.type })));
    if (rows.length) { const { error } = await supabase.from("offer_files").insert(rows); if (error) throw error; }
  };

  const handleAddFile = async () => {
    if (isSaving) return;
    if (!companyId || productIds.length === 0) {
      setSaveError("Associez le fichier à au moins une offre avant de l’enregistrer.");
      return;
    }
    if (!selectedFile) return;
    setIsSaving(true);
    setSaveError(null);
    const id = `file-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`;
    try {
      const stored = await uploadOfferFile(creatorId, productIds[0], selectedFile, `${id}-${selectedFile.name}`);
      const newFile: FileItem = {
        id,
        name: fileName.trim() || selectedFile.name,
        size: formatSize(selectedFile.size),
        type: selectedFile.type || "application/octet-stream",
        productIds: [...productIds],
        storageKey: stored.storagePath,
        updatedAt: stored.updatedAt,
      };
      const nextFiles = [...files, newFile];
      await persistFiles(nextFiles);
      setFiles(nextFiles);
      setFileName("");
      setSelectedFile(null);
      setScreen("library");
    } catch (error) {
      console.error("File save failed:", error);
      setSaveError(getUserFacingErrorMessage(error, "Le fichier n’a pas pu être enregistré. Réessayez."));
    } finally {
      setIsSaving(false);
    }
  };

  const beginEdit = (file: FileItem, mode: EditMode) => {
    setEditingFile(file);
    setEditMode(mode);
    setFileName(file.name);
    setSelectedFile(null);
    setSaveError(null);
    setScreen("edit");
  };

  const handleSaveEdit = async () => {
    if (isSaving || !editingFile) return;
    if (editMode === "rename" && !fileName.trim()) {
      setSaveError("Saisissez un nom de fichier.");
      return;
    }
    if (editMode === "replace" && !selectedFile) {
      setSaveError("Sélectionnez un nouveau fichier à téléverser.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      let updatedFile: FileItem = {
        ...editingFile,
        name: fileName.trim() || editingFile.name,
        updatedAt: new Date().toISOString(),
      };
      if (editMode === "replace" && selectedFile) {
        const replacementAssetId = `${editingFile.id}-replacement-${Date.now()}`;
        const stored = await uploadOfferFile(creatorId, productIds[0], selectedFile, `${replacementAssetId}-${selectedFile.name}`);
        updatedFile = {
          ...updatedFile,
          name: fileName.trim() || selectedFile.name,
          size: formatSize(selectedFile.size),
          type: selectedFile.type || "application/octet-stream",
          storageKey: stored.storagePath,
          updatedAt: stored.updatedAt,
        };
      }
      const nextFiles = files.map((file) => (file.id === editingFile.id ? updatedFile : file));
      await persistFiles(nextFiles);
      setFiles(nextFiles);
      setEditingFile(null);
      setSelectedFile(null);
      setFileName("");
      setScreen("library");
    } catch (error) {
      console.error("File update failed:", error);
      setSaveError(getUserFacingErrorMessage(error, "Les modifications n’ont pas pu être enregistrées. Réessayez."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    if (isSaving) return;
    const confirmed = window.confirm(
      `Supprimer « ${file.name} » des offres liées ? Cette action est irréversible.`,
    );
    if (!confirmed) return;
    setIsSaving(true);
    setSaveError(null);
    const nextFiles = files.filter((entry) => entry.id !== file.id);
    try {
      persistFiles(nextFiles);
      if (file.storageKey) { const { data: refs } = await supabase.from("offer_files").select("id").eq("storage_path", file.storageKey); if (!refs?.length) await deleteOfferFile(file.storageKey); }
      setFiles(nextFiles);
    } catch (error) {
      try {
        await persistFiles(files);
      } catch {
        // Keep the failure visible if metadata rollback itself is unavailable.
      }
      console.error("File deletion failed:", error);
      setSaveError(getUserFacingErrorMessage(error, "Le fichier n’a pas pu être supprimé. Réessayez."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 transition-colors hover:text-white"
        >
          <ChevronLeft className="size-5" /> Retour aux applications
        </button>
        <span className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-300">
          Fichiers
        </span>
      </div>

      {screen === "library" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Application Fichiers
              </div>
              <h1 className="mt-1 text-2xl font-bold text-white">Fichiers du produit</h1>
              <p className="mt-1 text-xs text-zinc-400">
                Gérez les ressources téléchargeables liées aux offres sélectionnées.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setScreen("add");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-blue-500"
            >
              <Plus className="size-4" /> Ajouter un fichier
            </button>
          </div>
          <p
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200"
            role="note"
          >
            Les fichiers sont enregistrés dans votre bibliothèque Supabase et restent disponibles sur vos appareils.
          </p>
          <div className="flex flex-wrap gap-2">
            {linkedProductNames.map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-300"
              >
                Lié à {name}
              </span>
            ))}
          </div>
          {saveError && (
            <p role="alert" className="text-xs text-red-300">
              {saveError}
            </p>
          )}
          {files.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#0c0d0e] px-6 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl">
                📁
              </div>
              <h2 className="text-sm font-bold text-white">Aucun fichier ajouté</h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
                Ajoutez un PDF, un ebook, un template, un logiciel ou une archive à distribuer avec
                cette offre.
              </p>
              <button
                type="button"
                onClick={() => setScreen("add")}
                className="mt-5 rounded-xl border border-blue-500/40 px-4 py-2 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/10"
              >
                Ajouter le premier fichier
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0c0d0e] px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{file.name}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {file.size} · {file.type || "Fichier"} ·{" "}
                        {file.productIds
                          .map(
                            (id) =>
                              products.find((product) => product.id === id)?.title ||
                              products.find((product) => product.id === id)?.name ||
                              id,
                          )
                          .join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-zinc-500/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-300">
                      Ressource liée
                    </span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => beginEdit(file, "rename")}
                      aria-label={`Renommer ${file.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                    >
                      <Pencil className="size-3.5" /> Renommer
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => beginEdit(file, "replace")}
                      aria-label={`Remplacer ${file.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                    >
                      <Replace className="size-3.5" /> Remplacer
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handleDeleteFile(file)}
                      aria-label={`Supprimer ${file.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" /> Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : screen === "add" ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setScreen("library")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="size-4" /> Retour aux fichiers
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Ajouter un fichier</h1>
            <p className="mt-1 text-xs text-zinc-400">
              Sélectionnez la ressource qui sera disponible après l’achat de l’offre.
            </p>
          </div>
          <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-500/40 bg-blue-500/5 px-6 text-center transition-colors hover:bg-blue-500/10">
            <input
              type="file"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setSelectedFile(file);
                if (file) setFileName(file.name);
                setSaveError(null);
              }}
            />
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
              <Upload className="size-6" />
            </div>
            <span className="text-sm font-bold text-white">
              Cliquez pour sélectionner un fichier
            </span>
            <span className="mt-1 text-[11px] text-zinc-500">
              PDF, ePub, ZIP, DOCX, MP3, logiciels et templates
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-300">Nom du fichier</span>
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="Ex. Guide PDF premium"
              className="w-full rounded-xl border border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </label>
          {selectedFile && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-300">
              <span className="truncate">{selectedFile.name}</span>
              <span className="ml-3 shrink-0 text-[10px]">{formatSize(selectedFile.size)}</span>
            </div>
          )}
          {saveError && (
            <p role="alert" className="text-xs text-red-300">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setScreen("library")}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!selectedFile || isSaving}
              onClick={() => void handleAddFile()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? "Enregistrement…" : "Ajouter le fichier"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setScreen("library")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="size-4" /> Retour aux fichiers
          </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {editMode === "rename" ? "Renommer le fichier" : "Remplacer le fichier"}
              </h1>
              <p className="mt-1 text-xs text-zinc-400">{editingFile?.name}</p>
            </div>
            <button
              type="button"
              aria-label="Annuler"
              onClick={() => setScreen("library")}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
          {editMode === "replace" && (
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-500/40 bg-blue-500/5 px-6 text-center transition-colors hover:bg-blue-500/10">
              <input
                type="file"
                className="sr-only"
                aria-label="Choisir le nouveau fichier réel"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setSaveError(null);
                }}
              />
              <Upload className="mb-3 size-6 text-blue-300" />
              <span className="text-sm font-bold text-white">Sélectionner le nouveau fichier</span>
              <span className="mt-1 text-[11px] text-zinc-500">
                Choisissez un fichier depuis votre appareil
              </span>
            </label>
          )}
          {editMode === "replace" && selectedFile && (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-300">
              {selectedFile.name} · {formatSize(selectedFile.size)}
            </p>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-300">Nom affiché</span>
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </label>
          {saveError && (
            <p role="alert" className="text-xs text-red-300">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setScreen("library")}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSaving || (editMode === "replace" && !selectedFile)}
              onClick={() => void handleSaveEdit()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving
                ? "Enregistrement…"
                : editMode === "rename"
                  ? "Enregistrer le nom"
                  : "Remplacer le fichier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
