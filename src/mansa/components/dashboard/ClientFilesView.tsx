import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  File,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Lock,
  Search,
  X,
} from "lucide-react";
import type { CreatorPlatformOffer, EbookResourceItem } from "../../types";

interface ClientFile extends EbookResourceItem {
  type?: string;
  fileSize?: string;
  updatedAt?: string;
}

interface ClientFilesViewProps {
  companyName: string;
  loading?: boolean;
  files: ClientFile[];
  lockedFiles: Array<{ ebook: ClientFile; requiredOffer: CreatorPlatformOffer }>;
  onBack: () => void;
  onDownload: (file: ClientFile) => void;
  onUnlockFile: (offer: CreatorPlatformOffer) => void;
}

const iconForFile = (file: ClientFile) => {
  const type = `${file.type || ""} ${file.title || ""}`.toLowerCase();
  if (type.includes("zip") || type.includes("archive")) return <FileArchive className="size-5" />;
  if (type.includes("image") || type.includes("png") || type.includes("jpg"))
    return <ImageIcon className="size-5" />;
  if (type.includes("pdf") || type.includes("document") || type.includes("ebook"))
    return <FileText className="size-5" />;
  return <File className="size-5" />;
};

export const ClientFilesView: React.FC<ClientFilesViewProps> = ({
  companyName,
  loading = false,
  files,
  lockedFiles,
  onBack,
  onDownload,
  onUnlockFile,
}) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pdf" | "other">("all");
  const [showLocked, setShowLocked] = useState(false);
  const filteredFiles = useMemo(
    () =>
      files.filter((file) => {
        const text =
          `${file.title || ""} ${file.description || ""} ${file.type || ""}`.toLowerCase();
        const matchesQuery = text.includes(query.toLowerCase());
        const isPdf = text.includes("pdf") || text.includes("ebook");
        return (
          matchesQuery &&
          (filter === "all" || (filter === "pdf" && isPdf) || (filter === "other" && !isPdf))
        );
      }),
    [files, filter, query],
  );

  return (
    <div className="fixed inset-0 z-[75] flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080a0f] text-white animate-in fade-in">
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0c0f16]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl p-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            aria-label="Retour à l’entreprise"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black sm:text-base">Fichiers</h1>
            <p className="truncate text-[11px] text-zinc-400">{companyName} · Votre bibliothèque</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                Ressources disponibles
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Votre bibliothèque</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Retrouvez vos documents et téléchargez-les quand vous en avez besoin.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un fichier"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-blue-400/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-zinc-400">
              <span className="size-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />{" "}
              Chargement de votre bibliothèque…
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
                {(["all", "pdf", "other"] as const).map((value) => {
                  const label =
                    value === "all" ? "Tous" : value === "pdf" ? "Documents" : "Autres fichiers";
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition ${filter === value ? "bg-blue-500 text-white" : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"}`}
                    >
                      {label}
                    </button>
                  );
                })}
                <span className="ml-auto text-xs text-zinc-500">
                  {filteredFiles.length} fichier{filteredFiles.length > 1 ? "s" : ""}
                </span>
              </div>

              {filteredFiles.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredFiles.map((file) => (
                    <article
                      key={file.id}
                      className="group rounded-2xl border border-white/[0.08] bg-[#10131b] p-4 transition hover:-translate-y-0.5 hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-950/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/12 text-blue-300">
                          {iconForFile(file)}
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="size-3" /> Disponible
                        </span>
                      </div>
                      <h3 className="mt-4 line-clamp-2 min-h-10 text-sm font-black">
                        {file.title || "Fichier sans titre"}
                      </h3>
                      <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-5 text-zinc-400">
                        {file.description || "Ressource incluse dans votre accès."}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500">
                        <span>{file.type || "Document"}</span>
                        {file.fileSize && (
                          <>
                            <span>·</span>
                            <span>{file.fileSize}</span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDownload(file)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-black text-white hover:bg-blue-400"
                      >
                        <Download className="size-3.5" /> Télécharger
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-16 text-center">
                  <FileText className="mx-auto size-10 text-blue-300" />
                  <h3 className="mt-4 text-lg font-bold">Votre bibliothèque est vide</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                    Les fichiers disponibles apparaîtront ici dès qu’ils seront associés à votre
                    accès.
                  </p>
                </div>
              )}

              {lockedFiles.length > 0 && (
                <section className="mt-10">
                  <button
                    type="button"
                    onClick={() => setShowLocked((value) => !value)}
                    className="flex items-center gap-2 text-sm font-black text-zinc-300 hover:text-white"
                  >
                    <Lock className="size-4 text-amber-300" /> Ressources supplémentaires{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      ({lockedFiles.length})
                    </span>
                  </button>
                  {showLocked && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {lockedFiles.map(({ ebook, requiredOffer }) => (
                        <div
                          key={ebook.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4"
                        >
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-bold text-zinc-200">
                              {ebook.title || "Ressource"}
                            </h4>
                            <p className="mt-1 text-xs text-zinc-500">
                              Cette ressource nécessite une autre offre.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onUnlockFile(requiredOffer)}
                            className="shrink-0 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[11px] font-black text-amber-200 hover:bg-amber-400/20"
                          >
                            Débloquer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
