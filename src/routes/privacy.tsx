import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { hasConfiguredSiteUrl, siteUrl } from "@/lib/site";

const sections = [
  {
    title: "Données collectées",
    paragraphs: [
      "Selon les fonctionnalités utilisées, Thal peut traiter votre adresse email, votre numéro de téléphone, votre numéro Mobile Money, les pièces d’identité nécessaires à la vérification KYC et votre historique de paiements.",
      "Les informations sont utilisées pour créer et sécuriser le compte, fournir les services, traiter les paiements, effectuer les vérifications nécessaires, prévenir la fraude et répondre aux demandes de support.",
    ],
  },
  {
    title: "Paiements et prestataires",
    paragraphs: ["Les paiements peuvent passer par Wave et KPay. Les données nécessaires au traitement d’un paiement peuvent être transmises au prestataire concerné selon ses propres conditions et règles de confidentialité."],
  },
  {
    title: "Durées et droits",
    paragraphs: ["Durées de conservation, responsable du traitement, base légale, modalités d’exercice des droits et email de contact : À COMPLÉTER."],
  },
  {
    title: "Cookies",
    paragraphs: ["Le site affiche un bandeau de consentement. Aucun outil de mesure ne doit être chargé avant l’acceptation du visiteur."],
  },
];

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Thal" },
      { name: "description", content: "Politique de confidentialité du site Thal." },
      { property: "og:title", content: "Politique de confidentialité — Thal" },
      { property: "og:description", content: "Politique de confidentialité du site Thal." },
      { property: "og:type", content: "website" },
      ...(hasConfiguredSiteUrl() ? [{ property: "og:url", content: siteUrl("/privacy") }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: hasConfiguredSiteUrl() ? [{ rel: "canonical", href: siteUrl("/privacy") }] : [],
  }),
  component: () => <LegalPage title="Politique de confidentialité" intro="Cette page décrit les données susceptibles d’être traitées par Thal. Les éléments signalés À COMPLÉTER doivent être validés avant publication." sections={sections} />,
});
