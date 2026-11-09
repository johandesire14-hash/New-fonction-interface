import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Grid2X2, LayoutGrid, Rows3 } from "lucide-react";

interface AdaptiveDensityGridProps {
  children: ReactNode;
  count: number;
  lang: "fr" | "en";
}

type Density = "spacious" | "balanced" | "compact";

const densityOptions: Array<{
  id: Density;
  label: { fr: string; en: string };
  Icon: typeof LayoutGrid;
}> = [
  { id: "spacious", label: { fr: "Aérée", en: "Spacious" }, Icon: Rows3 },
  { id: "balanced", label: { fr: "Équilibrée", en: "Balanced" }, Icon: LayoutGrid },
  { id: "compact", label: { fr: "Compacte", en: "Compact" }, Icon: Grid2X2 },
];

export function AdaptiveDensityGrid({ children, count, lang }: AdaptiveDensityGridProps) {
  const [density, setDensity] = useState<Density>("balanced");
  const labels = {
    fr: { density: "Densité", results: "offres" },
    en: { density: "Density", results: "offers" },
  }[lang];

  return (
    <section
      className="adaptive-density"
      aria-label={lang === "fr" ? "Grille des offres" : "Offer grid"}
    >
      <div className="adaptive-density__toolbar">
        <p className="adaptive-density__count" aria-live="polite">
          <span>{count}</span> {labels.results}
        </p>
        <div className="adaptive-density__controls">
          <span className="adaptive-density__label">{labels.density}</span>
          <div className="adaptive-density__switch" role="group" aria-label={labels.density}>
            {densityOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={density === id}
                aria-label={label[lang]}
                title={label[lang]}
                onClick={() => setDensity(id)}
                className={`adaptive-density__option${density === id ? " is-active" : ""}`}
              >
                <Icon aria-hidden="true" className="size-3.5" />
                <span>{label[lang]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <motion.div
        layout
        className="adaptive-density__grid"
        data-density={density}
        transition={{ layout: { type: "spring", stiffness: 320, damping: 32, mass: 0.85 } }}
      >
        {children}
      </motion.div>
    </section>
  );
}
