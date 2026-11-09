import React from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import wallet from "@/assets/hero-wallet.webp";
import storefront from "@/assets/hero-storefront.webp";
import megaphone from "@/assets/hero-megaphone.webp";

interface HeroSectionProps {
  onOpenStudio: (category?: string) => void;
  lang: "fr" | "en";
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenStudio }) => (
  <section className="afhub-home-hero relative flex min-h-[82svh] flex-col items-center justify-center overflow-hidden px-5 pb-14 pt-24 text-center text-white sm:px-10 sm:pt-28">
    <div className="afhub-grid-overlay absolute inset-0 opacity-25" aria-hidden="true" />
    <div className="relative z-10 mx-auto flex w-full max-w-[960px] flex-col items-center">
      <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.065em] sm:text-7xl md:text-[6.2rem]">
        Transformez votre audience en revenus récurrents.
      </h1>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="default"
          size="lg"
          onClick={() => onOpenStudio()}
          className="h-12 rounded-full px-7"
        >
          Créer ma boutique
        </Button>
        <a
          href="#solutions"
          className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Découvrir afhub
          <ArrowDown className="size-4" />
        </a>
      </div>
      <div
        className="afhub-hero-carousel mt-8 aspect-[3/2] w-full max-w-[620px] sm:mt-2"
        role="region"
        aria-label="Les outils afhub"
        aria-roledescription="carrousel"
      >
        <div className="afhub-hero-carousel-track" aria-live="off">
          {[
            { name: "Portefeuille", image: wallet },
            { name: "Boutique", image: storefront },
            { name: "Mégaphone", image: megaphone },
            { name: "Portefeuille", image: wallet },
            { name: "Boutique", image: storefront },
            { name: "Mégaphone", image: megaphone },
          ].map(({ name, image }, index) => (
            <div
              className="afhub-hero-carousel-slide"
              key={`${name}-${index}`}
              aria-hidden={index > 2}
              style={{ "--focus-delay": `${index * 6}s` } as React.CSSProperties}
            >
              <img
                src={image}
                alt={index < 3 ? name : ""}
                aria-hidden={index > 2}
                draggable={false}
                fetchPriority={index === 0 ? "high" : "auto"}
                className="afhub-hero-carousel-object"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
