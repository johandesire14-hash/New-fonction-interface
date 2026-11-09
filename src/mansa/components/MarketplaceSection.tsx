// @ts-nocheck
import React, { useState } from "react";
import { motion } from "motion/react";
import { Search, Star, ArrowRight, Sparkles } from "lucide-react";
import { MarketplaceItem } from "../types";
import { MarketplaceCardSkeleton } from "./common/Skeleton";
import { AdaptiveDensityGrid } from "./common/AdaptiveDensityGrid";
import { CURATED_MARKETPLACE_PRODUCTS } from "../data/marketplaceData";
import { CountryFlag } from "./common/CountryFlag";

interface MarketplaceSectionProps {
  onSelectProduct: (item: MarketplaceItem) => void;
  onOpenStudio?: () => void;
  onOpenAiBuilder?: (prompt?: string, category?: string) => void;
  lang: "fr" | "en";
  user?: any;
}

export const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({
  onSelectProduct,
  onOpenAiBuilder,
  lang,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredProducts = CURATED_MARKETPLACE_PRODUCTS.filter((prod) => {
    const matchesCat =
      selectedCategory === "all" || prod.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesQuery =
      prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <section
      id="marketplace"
      className="w-full bg-[#f5f5f3] py-16 border-t border-black/10 relative"
    >
      <div className="mx-auto max-w-[1140px] px-6 sm:px-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              Offres de la communauté
            </h2>
            <p className="text-sm text-[#686868] mt-1">
              Découvrez des canaux privés sur Telegram, des formations et des logiciels proposés par
              la communauté.
            </p>
          </div>

          <div className="relative flex items-center">
            <Search className="absolute left-3.5 size-4 text-[#8a8a86]" />
            <input
              type="text"
              placeholder="Rechercher un produit, créateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 rounded-xl border border-black/10 bg-white pl-9 pr-4 py-2.5 text-xs text-[#171717] placeholder-zinc-500 focus:border-[#00D26A] focus:ring-1 focus:ring-[#00D26A] outline-none transition-all"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 pb-6">
          {[
            { id: "all", label: "Toutes les offres" },
            { id: "trading", label: "Trading & Crypto" },
            { id: "sports", label: "Paris Sportifs" },
            { id: "courses", label: "Formations" },
            { id: "software", label: "Logiciels" },
            { id: "community", label: "Communautés privées" },
            { id: "reselling", label: "Achat-Revente" },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (selectedCategory !== cat.id) {
                    setSelectedCategory(cat.id);
                  }
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white text-black shadow-md"
                    : "border border-black/10 bg-white text-[#555555] hover:text-[#171717] hover:bg-[#ecece9]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton View */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <MarketplaceCardSkeleton key={idx} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-black/10 bg-white p-8 space-y-3">
            <p className="text-base font-bold text-[#171717]">Aucune offre trouvée</p>
            <p className="text-xs text-[#686868]">
              Essayez de modifier votre recherche ou sélectionnez une autre catégorie.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="px-4 py-2 text-xs font-semibold text-[#555555] hover:text-[#171717] border border-black/10 rounded-xl bg-black/5 hover:bg-black/5 cursor-pointer inline-block mt-2"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          /* Product Cards Grid */
          <AdaptiveDensityGrid count={filteredProducts.length} lang={lang}>
            {filteredProducts.map((prod, index) => {
              return (
                <motion.div
                  key={prod.id}
                  layout
                  transition={{
                    layout: {
                      type: "spring",
                      stiffness: 320,
                      damping: 32,
                      mass: 0.85,
                      delay: Math.min(index * 0.018, 0.18),
                    },
                  }}
                  onClick={() => onSelectProduct(prod)}
                  className="group relative flex h-full flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 transition-colors duration-150 hover:border-black/20 hover:bg-[#ecece9] cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={prod.creatorAvatar}
                            alt={prod.creator}
                            className="size-11 rounded-full object-cover border border-black/10 mansa-avatar-image"
                          />
                          {prod.countryCode && (
                            <div className="absolute -bottom-1 -right-1 rounded-[2px] overflow-hidden shadow-xs border border-black/10">
                              <CountryFlag
                                countryCode={prod.countryCode}
                                className="w-4 h-3 object-cover block"
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#171717] group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {prod.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#686868] mt-0.5">
                            <span>par {prod.creator}</span>
                            {prod.countryCode && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#555555] bg-black/5 px-1.5 py-0.2 rounded border border-black/10">
                                <CountryFlag
                                  countryCode={prod.countryCode}
                                  className="w-3 h-2 rounded-[1px] object-cover"
                                />
                                {prod.countryCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="rounded-lg border border-black/10 bg-black/5 px-2.5 py-0.5 text-[10px] font-bold text-[#555555] uppercase tracking-wide">
                        {prod.category}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        <span>{prod.rating}</span>
                        <span className="text-[#8a8a86] font-normal">({prod.reviewsCount})</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#686868] leading-relaxed line-clamp-2 mb-4">
                      {prod.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {prod.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[10px] font-medium text-[#686868]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/10 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#8a8a86] block">
                        Tarif
                      </span>
                      <span className="text-sm font-extrabold text-[#171717] truncate max-w-[130px] block">
                        {prod.priceMonthly}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenAiBuilder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAiBuilder(prod.title, prod.category);
                          }}
                          className="px-3 py-1.5 text-xs text-[#555555] hover:text-[#171717] border border-black/10 bg-black/5 hover:bg-black/5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Sparkles className="size-3 text-emerald-400" />
                          <span>Cloner</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectProduct(prod)}
                        className="ui-btn-primary px-3.5 py-1.5 text-xs font-bold text-black flex items-center gap-1 cursor-pointer rounded-xl"
                      >
                        <span>Voir l'offre</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AdaptiveDensityGrid>
        )}
      </div>
    </section>
  );
};
