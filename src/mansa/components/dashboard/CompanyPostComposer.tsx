import React, { useEffect, useRef, useState } from "react";
import { BarChart3, Image as ImageIcon, Smile, X } from "lucide-react";
import {
  uploadCompanyPostMedia,
  validateCompanyPostMedia,
} from "../../services/companyAssetStorage";
import type { CompanyPostMedia, CompanyPostPoll } from "../../utils/companyPostsStorage";

export interface CompanyPostDraft {
  content: string;
  media?: CompanyPostMedia;
  poll?: CompanyPostPoll;
}

interface CompanyPostComposerProps {
  companyId: string;
  companyName: string;
  avatarInitials?: string;
  onClose: () => void;
  onPublish: (draft: CompanyPostDraft) => void | Promise<void>;
}

const EMOJIS = ["😀", "😂", "😍", "🔥", "👏", "🎉", "❤️", "✨", "👍", "🙏", "🚀", "💡"];
const MAX_POLL_OPTIONS = 6;

export const CompanyPostComposer: React.FC<CompanyPostComposerProps> = ({
  companyId,
  companyName,
  avatarInitials,
  onClose,
  onPublish,
}) => {
  const [content, setContent] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrlRef.current && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  const normalizedOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
  const pollIsValid = Boolean(pollQuestion.trim() && normalizedOptions.length >= 2);
  const canPublish =
    !isPublishing &&
    (!pollEnabled || pollIsValid) &&
    Boolean(content.trim() || mediaFile || (pollEnabled && pollIsValid));

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const validationError = validateCompanyPostMedia(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (previewUrlRef.current && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current =
      typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
    setMediaFile(file);
    setError("");
  };

  const removeMedia = () => {
    if (previewUrlRef.current && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = null;
    setMediaFile(null);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const nextContent = `${content.slice(0, start)}${emoji}${content.slice(end)}`;
    setContent(nextContent);
    setEmojiPickerOpen(false);
    if (typeof requestAnimationFrame === "function")
      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(start + emoji.length, start + emoji.length);
      });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canPublish) return;
    setError("");
    setIsPublishing(true);
    try {
      let media: CompanyPostMedia | undefined;
      if (mediaFile) {
        const url = await uploadCompanyPostMedia(
          companyId,
          `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          mediaFile,
        );
        media = { url, name: mediaFile.name, type: mediaFile.type };
      }
      const poll: CompanyPostPoll | undefined = pollEnabled
        ? {
            question: pollQuestion.trim(),
            options: normalizedOptions,
            votes: normalizedOptions.map(() => 0),
          }
        : undefined;
      await onPublish({ content: content.trim(), media, poll });
      onClose();
    } catch (publishError) {
      console.error("Company post publishing failed:", publishError);
      setError("La publication n’a pas pu être envoyée. Réessayez.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-composer-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-full mansa-profile-avatar text-xs font-bold">
              {avatarInitials || companyName.slice(0, 2).toUpperCase() || "CO"}
            </div>
            <div>
              <h2 id="post-composer-title" className="text-sm font-bold text-white">
                Créer une publication
              </h2>
              <p className="text-[11px] text-zinc-500">Publication officielle de {companyName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre de publication"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-4 p-5">
            <textarea
              ref={textareaRef}
              autoFocus
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="À quoi pensez-vous ?"
              aria-label="Texte de la publication"
              className="min-h-[150px] w-full resize-none rounded-xl border border-white/10 bg-[#0b0c0e] p-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-blue-500/70"
            />

            {emojiPickerOpen && (
              <div
                aria-label="Sélecteur d’émojis"
                className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#0b0c0e] p-2"
              >
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    aria-label={`Insérer ${emoji}`}
                    className="rounded-lg p-2 text-xl transition-colors hover:bg-white/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {mediaFile && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b0c0e] p-3">
                {previewUrlRef.current && mediaFile.type.startsWith("image/") ? (
                  <img
                    src={previewUrlRef.current}
                    alt="Aperçu du média sélectionné"
                    className="size-14 rounded-lg object-cover"
                  />
                ) : previewUrlRef.current && mediaFile.type.startsWith("video/") ? (
                  <video
                    src={previewUrlRef.current}
                    aria-label="Aperçu de la vidéo sélectionnée"
                    className="size-14 rounded-lg object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                  {mediaFile.name}
                </span>
                <button
                  type="button"
                  onClick={removeMedia}
                  aria-label="Retirer le média"
                  className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  Retirer
                </button>
              </div>
            )}

            {pollEnabled && (
              <section
                aria-label="Créer un sondage"
                className="space-y-3 rounded-xl border border-white/10 bg-[#0b0c0e] p-4"
              >
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-300">Question du sondage</span>
                  <input
                    value={pollQuestion}
                    onChange={(event) => setPollQuestion(event.target.value)}
                    placeholder="Posez votre question"
                    className="w-full rounded-lg border border-white/10 bg-[#161822] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
                <div className="space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={option}
                        onChange={(event) =>
                          setPollOptions((current) =>
                            current.map((value, optionIndex) =>
                              optionIndex === index ? event.target.value : value,
                            ),
                          )
                        }
                        aria-label={`Option du sondage ${index + 1}`}
                        placeholder={`Option ${index + 1}`}
                        className="w-full rounded-lg border border-white/10 bg-[#161822] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPollOptions((current) => current.filter((_, i) => i !== index))
                          }
                          aria-label={`Supprimer l’option ${index + 1}`}
                          className="rounded-lg p-2 text-zinc-500 hover:bg-white/10 hover:text-white"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPollOptions((current) => [...current, ""])}
                  disabled={pollOptions.length >= MAX_POLL_OPTIONS}
                  className="rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-blue-400/50 disabled:opacity-40"
                >
                  + Ajouter une option
                </button>
              </section>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              aria-label="Importer un média"
              className="sr-only"
              onChange={handleMediaChange}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              title="Ajouter un média"
              aria-label="Ajouter un média"
              className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10"
            >
              <ImageIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setEmojiPickerOpen((open) => !open)}
              title="Ajouter un emoji"
              aria-label="Ajouter un emoji"
              aria-pressed={emojiPickerOpen}
              className={`rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10 ${emojiPickerOpen ? "bg-blue-400/10" : ""}`}
            >
              <Smile className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setPollEnabled((enabled) => !enabled)}
              title="Créer un sondage"
              aria-label="Créer un sondage"
              aria-pressed={pollEnabled}
              className={`rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10 ${pollEnabled ? "bg-blue-400/10" : ""}`}
            >
              <BarChart3 className="size-5" />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!canPublish}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPublishing ? "Publication…" : "Publier"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
