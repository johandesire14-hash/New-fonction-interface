// @ts-nocheck
import React, { useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const FAQ_ITEMS = [
  {
    id: "faq-1",
    question: "Comment fonctionne l'automatisation Telegram et Discord ?",
    answer:
      "Dès qu'un client paie, votre système peut générer un lien d'invitation sécurisé ou lui attribuer automatiquement le rôle VIP. En cas d'annulation, l'accès peut être révoqué.",
  },
  {
    id: "faq-2",
    question: "Quels sont les moyens de paiement acceptés ?",
    answer:
      "Vos clients peuvent régler via Wave, Orange Money, MTN MoMo, Moov Money, Airtel Money ainsi que par carte bancaire selon votre configuration.",
  },
  {
    id: "faq-3",
    question: "Puis-je vendre des formations ou des fichiers ?",
    answer:
      "Oui. Vous pouvez proposer des vidéos de formation, ebooks PDF, modèles Notion ou autres ressources numériques avec une livraison sécurisée.",
  },
  {
    id: "faq-4",
    question: "Puis-je gérer plusieurs types d’offres ?",
    answer:
      "Oui. Votre boutique peut réunir des abonnements communautaires et des produits numériques dans une même expérience.",
  },
];

export const FaqSection: React.FC<{ lang?: "fr" | "en"; onOpenStudio?: () => void }> = ({
  onOpenStudio,
}) => {
  const [openIds, setOpenIds] = useState<string[]>(["faq-1"]);
  return (
    <section id="faq" className="w-full bg-[#efeDE8] px-5 py-20 text-[#171717] sm:px-10 sm:py-28">
      <div className="mx-auto max-w-[820px]">
        <div className="text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d94322]">
            Questions fréquentes
          </p>
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl">
            Questions answered.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#686868]">
            Tout ce qu’il faut savoir pour lancer vos offres et encaisser sans friction.
          </p>
        </div>
        <div className="mt-10 space-y-3">
          {FAQ_ITEMS.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-[18px] border border-black/10 bg-white"
              >
                <button
                  onClick={() =>
                    setOpenIds((prev) =>
                      isOpen ? prev.filter((id) => id !== faq.id) : [...prev, faq.id],
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-bold sm:text-base">{faq.question}</span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-[#d94322] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <p className="border-t border-black/10 px-5 pb-5 pt-4 text-sm leading-relaxed text-[#686868]">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => onOpenStudio?.()}
          className="mx-auto mt-10 flex items-center gap-2 text-sm font-bold hover:text-[#d94322]"
        >
          Créer votre première boutique <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  );
};
