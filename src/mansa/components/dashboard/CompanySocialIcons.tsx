import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandX,
  IconBrandYoutube,
  IconWorld,
} from "@tabler/icons-react";
import type { CompanySocialLinks } from "../../types";

const SOCIAL_NETWORKS = [
  { key: "tiktok", label: "TikTok", Icon: IconBrandTiktok },
  { key: "instagram", label: "Instagram", Icon: IconBrandInstagram },
  { key: "facebook", label: "Facebook", Icon: IconBrandFacebook },
  { key: "twitter", label: "X / Twitter", Icon: IconBrandX },
  { key: "website", label: "Site web", Icon: IconWorld },
  { key: "youtube", label: "YouTube", Icon: IconBrandYoutube },
  { key: "linkedin", label: "LinkedIn", Icon: IconBrandLinkedin },
] as const;

export function CompanySocialIcons({ socialLinks }: { socialLinks?: CompanySocialLinks }) {
  const links = SOCIAL_NETWORKS.flatMap(({ key, label, Icon }) => {
    const url = socialLinks?.[key]?.trim();
    return url ? [{ key, label, Icon, url }] : [];
  });

  if (!links.length) return null;

  return (
    <div className="inline-flex items-center gap-1 pl-1" role="group" aria-label="Réseaux sociaux">
      {links.map(({ key, label, Icon, url }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
