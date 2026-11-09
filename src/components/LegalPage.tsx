import { Link } from "@tanstack/react-router";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalPageProps = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-store-background px-5 py-12 text-store-foreground sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[900px]">
        <Link to="/" className="text-xs font-semibold text-store-muted transition-colors hover:text-store-foreground">
          ← Retour à l’accueil
        </Link>
        <article className="mt-8 rounded-2xl border border-store-border bg-[#121316] p-6 sm:p-10">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-store-muted">{intro}</p>
          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-bold text-store-foreground">{section.title}</h2>
                <div className="mt-2 space-y-3 text-sm leading-7 text-store-muted">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
