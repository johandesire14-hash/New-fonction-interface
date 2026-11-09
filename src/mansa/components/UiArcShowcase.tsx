import { ArrowUpRight, Check, CreditCard, LockKeyhole, MessageCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UiArcShowcaseProps {
  onOpenStudio: () => void;
}

const BENEFITS = [
  {
    icon: MessageCircle,
    title: "Canaux VIP",
    text: "Automatisez l’accès à vos communautés Telegram et Discord.",
  },
  {
    icon: CreditCard,
    title: "Mobile Money",
    text: "Encaissez avec les moyens de paiement utilisés par votre audience.",
  },
  {
    icon: Package,
    title: "Produits numériques",
    text: "Vendez formations, ebooks, templates et fichiers au même endroit.",
  },
  {
    icon: LockKeyhole,
    title: "Accès sécurisé",
    text: "Livrez le bon contenu après chaque achat, simplement.",
  },
];

export function UiArcShowcase({ onOpenStudio }: UiArcShowcaseProps) {
  return (
    <section
      id="impact"
      className="w-full bg-[#efeDE8] px-5 py-20 text-[#171717] sm:px-10 sm:py-28"
    >
      <div className="mx-auto max-w-[1120px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#007a43]">
            Un espace, plusieurs revenus
          </p>
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl">
            Tout ce qu’il faut pour vendre sans friction.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#686868] sm:text-base">
            Une expérience claire pour présenter vos offres, encaisser vos clients et gérer vos
            accès depuis un seul endroit.
          </p>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-[22px] border border-black/10 bg-white p-5 shadow-[0_14px_40px_rgba(23,23,23,0.05)]"
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#00d26a]/10 text-[#007a43]">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-extrabold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#686868]">{text}</p>
              <span className="mt-6 flex size-7 items-center justify-center rounded-full bg-[#3DDC84] text-black">
                <Check className="size-3.5 text-black" />
              </span>
            </article>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button variant="default" onClick={onOpenStudio} className="h-11 rounded-full px-6">
            Commencer maintenant <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
