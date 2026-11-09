import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { hasConfiguredSiteUrl, siteUrl } from "@/lib/site";

const sections = [
  {
    title: "Éditeur du site",
    paragraphs: [
      "Nom de l’entreprise : À COMPLÉTER",
      "Forme juridique : À COMPLÉTER",
      "Adresse : À COMPLÉTER",
      "Email de contact : À COMPLÉTER",
      "Numéro d’immatriculation : À COMPLÉTER",
    ],
  },
  {
    title: "Hébergeur",
    paragraphs: ["Hébergeur : À COMPLÉTER"],
  },
  {
    title: "Propriété intellectuelle",
    paragraphs: ["Les éléments du site et les contenus publiés doivent être utilisés conformément aux droits applicables et aux autorisations de leurs titulaires."],
  },
];

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — Thal" },
      { name: "description", content: "Mentions légales du site Thal." },
      { property: "og:title", content: "Mentions légales — Thal" },
      { property: "og:description", content: "Mentions légales du site Thal." },
      { property: "og:type", content: "website" },
      ...(hasConfiguredSiteUrl() ? [{ property: "og:url", content: siteUrl("/mentions-legales") }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: hasConfiguredSiteUrl() ? [{ rel: "canonical", href: siteUrl("/mentions-legales") }] : [],
  }),
  component: () => <LegalPage title="Mentions légales" intro="Informations légales relatives à Thal. Les informations signalées À COMPLÉTER doivent être renseignées avant la publication." sections={sections} />,
});
