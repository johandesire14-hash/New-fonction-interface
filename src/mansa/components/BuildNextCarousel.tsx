// @ts-nocheck
import React from "react";
import { ArrowRight, Send, BookOpen, PackageCheck } from "lucide-react";
import { CategoryCardItem } from "../types";

interface BuildNextCarouselProps {
  onSelectCategory: (cat: CategoryCardItem) => void;
  onOpenStudio: (category?: string) => void;
  lang: "fr" | "en";
}

const CATEGORIES_DATA: CategoryCardItem[] = [
  {
    id: "community",
    categoryKey: "community",
    title: "Communauté payante",
    subtitle: "Vendez des abonnements et automatisez l’invitation de vos membres après paiement.",
    samplePrompt: "Canal Telegram privé avec invitation après paiement",
    icon: Send,
    colorGradient: "",
  },
  {
    id: "courses",
    categoryKey: "courses",
    title: "Formations & ebooks",
    subtitle: "Partagez vos connaissances avec des accès directs et sécurisés pour vos acheteurs.",
    samplePrompt: "Formation vidéo et masterclass privée",
    icon: BookOpen,
    colorGradient: "",
  },
  {
    id: "digital",
    categoryKey: "digital",
    title: "Templates & fichiers",
    subtitle: "Mettez vos ressources numériques en vente et livrez-les automatiquement.",
    samplePrompt: "Templates Notion & Design",
    icon: PackageCheck,
    colorGradient: "",
  },
];

export const BuildNextCarousel: React.FC<BuildNextCarouselProps> = ({
  onSelectCategory,
  onOpenStudio,
}) => (
  <section
    id="solutions"
    className="w-full bg-[#f5f5f3] px-5 py-20 text-[#171717] sm:px-10 sm:py-28"
  >
    <div className="mx-auto max-w-[1120px]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#007a43]">
            Nos solutions
          </p>
          <h2 className="max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl">
            Vendez ce que vous savez faire.
          </h2>
        </div>
        <button
          onClick={() => onOpenStudio()}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#171717] hover:text-[#007a43]"
        >
          Créer sur mesure <ArrowRight className="size-4" />
        </button>
      </div>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {CATEGORIES_DATA.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat)}
              className="group flex min-h-[280px] flex-col justify-between rounded-[24px] border border-black/10 bg-white p-6 text-left shadow-[0_14px_40px_rgba(23,23,23,0.04)] transition-all hover:-translate-y-1 hover:border-[#00d26a]/40 hover:shadow-[0_18px_48px_rgba(23,23,23,0.09)]"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#00d26a]/10 text-[#007a43]">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="mt-10 block text-xl font-extrabold tracking-tight">
                  {cat.title}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-[#686868]">
                  {cat.subtitle}
                </span>
              </span>
              <span className="mt-8 flex items-center gap-2 text-xs font-bold">
                Explorer{" "}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  </section>
);
