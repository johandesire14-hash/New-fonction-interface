import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AfhubLogo } from "./AfhubLogo";

interface HeaderProps {
  onOpenMarketplace: () => void;
  onOpenDocs: () => void;
  onOpenLogin: () => void;
  minimal?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMarketplace,
  onOpenDocs,
  onOpenLogin,
  minimal = false,
}) => (
  <header className="afhub-site-header sticky top-3 z-30 w-full px-3 sm:top-5 sm:px-6">
    <div className="pill-nav mx-auto flex min-h-14 max-w-[1120px] items-center justify-between gap-3 rounded-full border border-black/10 bg-white/90 px-3 py-2 shadow-[0_12px_36px_rgba(23,23,23,0.08)] backdrop-blur-xl sm:px-5">
      <a href="#home" aria-label="afhub Accueil" className="shrink-0">
        <AfhubLogo size="md" textColor="text-[#171717]" />
      </a>
      <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
        {!minimal && (
          <Button
            variant="ghost"
            onClick={onOpenMarketplace}
            className="px-3 text-xs text-[#686868] hover:text-[#171717]"
          >
            Explorer
          </Button>
        )}
        {!minimal && (
          <Button
            variant="ghost"
            onClick={onOpenDocs}
            className="px-3 text-xs text-[#686868] hover:text-[#171717]"
          >
            Documentation
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onOpenLogin}
          className="px-3 text-xs text-[#686868] hover:text-[#171717]"
        >
          Connexion
        </Button>
      </nav>
      <Button
        variant="default"
        onClick={onOpenLogin}
        className="h-10 gap-1.5 rounded-full px-4 text-xs"
      >
        Créer ma boutique
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  </header>
);
