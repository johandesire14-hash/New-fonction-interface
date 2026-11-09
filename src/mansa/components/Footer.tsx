import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AfhubLogo } from "./AfhubLogo";

interface FooterProps {
  onOpenStudio?: () => void;
  onOpenAiBuilder?: () => void;
  lang: "fr" | "en";
}

export const Footer: React.FC<FooterProps> = ({ onOpenStudio, onOpenAiBuilder }) => (
  <footer className="w-full bg-[#171717] text-white">
    <div className="mx-auto flex max-w-[1120px] flex-col items-center px-5 py-24 text-center sm:px-10 sm:py-32">
      <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#3DDC84]">
        Votre prochaine offre commence ici
      </p>
      <h2 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-7xl">
        Construisez une activité qui vous ressemble.
      </h2>
      <Button
        variant="default"
        size="lg"
        onClick={onOpenStudio || onOpenAiBuilder}
        className="mt-9 h-12 rounded-full px-7"
      >
        Créer ma boutique <ArrowUpRight className="size-4" />
      </Button>
    </div>
    <div className="border-t border-white/15">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-5 px-5 py-6 sm:px-10">
        <AfhubLogo size="sm" textColor="text-white" />
        <nav
          aria-label="Liens de pied de page"
          className="flex w-full flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/60 sm:w-auto"
        >
          <a href="#marketplace" className="hover:text-white">
            Marketplace
          </a>
          <a href="/mentions-legales" className="hover:text-white">
            Mentions légales
          </a>
          <a href="/privacy" className="hover:text-white">
            Confidentialité
          </a>
          <a href="/cgu" className="hover:text-white">
            CGU
          </a>
          <a href="/documentation" className="hover:text-white">
            Documentation
          </a>
          <a href="#faq" className="hover:text-white">
            FAQ
          </a>
        </nav>
        <span className="w-full text-center text-xs text-white/50 sm:w-auto">© 2026 afhub</span>
      </div>
    </div>
  </footer>
);
