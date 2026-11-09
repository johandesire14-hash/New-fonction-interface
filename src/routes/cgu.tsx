import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { hasConfiguredSiteUrl, siteUrl } from "@/lib/site";

const sections = [
  {
    title: "Accès et compte",
    paragraphs: ["L’utilisateur est responsable de l’exactitude des informations fournies, de la sécurité de ses identifiants et de l’utilisation de son compte."],
  },
  {
    title: "Commission de la plateforme",
    paragraphs: ["Taux et modalités de la commission de la plateforme : À COMPLÉTER."],
  },
  {
    title: "Revenus et disponibilité",
    paragraphs: ["Les revenus deviennent disponibles après un délai de 48h, sous réserve des contrôles applicables et de la confirmation du paiement."],
  },
  {
    title: "Remboursements et retraits",
    paragraphs: ["Politique de remboursements : À COMPLÉTER.", "Conditions, frais et délais de retrait : À COMPLÉTER."],
  },
  {
    title: "Vérification d’identité",
    paragraphs: ["Une vérification d’identité peut être demandée avant certaines opérations, notamment pour la sécurité, la prévention de la fraude ou les retraits."],
  },
  {
    title: "Contact et droit applicable",
    paragraphs: ["Email de contact et droit applicable : À COMPLÉTER."],
  },
];

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions générales d’utilisation — Thal" },
      { name: "description", content: "Conditions générales d’utilisation du site Thal." },
      { property: "og:title", content: "Conditions générales d’utilisation — Thal" },
      { property: "og:description", content: "Conditions générales d’utilisation du site Thal." },
      { property: "og:type", content: "website" },
      ...(hasConfiguredSiteUrl() ? [{ property: "og:url", content: siteUrl("/cgu") }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: hasConfiguredSiteUrl() ? [{ rel: "canonical", href: siteUrl("/cgu") }] : [],
  }),
  component: () => <LegalPage title="Conditions générales d’utilisation" intro="Les présentes conditions encadrent l’utilisation de Thal. Les champs signalés À COMPLÉTER doivent être validés avant publication." sections={sections} />,
});
