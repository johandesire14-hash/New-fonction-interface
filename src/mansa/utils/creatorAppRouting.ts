export type CreatorAppWorkspace = "courses" | "files";

export interface CreatorAppOffer {
  id: string;
  title?: string;
  includedApps?: string[];
  digitalFiles?: unknown[];
  ebooks?: unknown[];
  courses?: unknown[];
  courseModules?: unknown[];
}

const APP_KEYWORDS: Record<CreatorAppWorkspace, string[]> = {
  courses: ["cours", "course", "formation", "masterclass"],
  files: ["fichier", "file", "ebook", "template"],
};

/**
 * Return the product scope for a creator workspace. In product preview, keep
 * the selected product; otherwise scope to offers that explicitly expose the
 * app or contain its resources, falling back to all company offers only when
 * the app is configured at company level and no offer-level metadata exists.
 */
export function getCreatorAppProductIds(
  app: CreatorAppWorkspace,
  offers: CreatorAppOffer[],
  selectedPreviewOfferId?: string | null,
): string[] {
  if (selectedPreviewOfferId && offers.some((offer) => offer.id === selectedPreviewOfferId)) {
    return [selectedPreviewOfferId];
  }

  const keywords = APP_KEYWORDS[app];
  const matchingOffers = offers
    .filter((offer) => {
      const appNames = offer.includedApps ?? [];
      const namesApp = appNames.some((name) =>
        keywords.some((keyword) => name.toLowerCase().includes(keyword)),
      );
      const titleNamesApp = keywords.some((keyword) =>
        (offer.title ?? "").toLowerCase().includes(keyword),
      );
      const hasResources =
        app === "files"
          ? Boolean(offer.digitalFiles?.length || offer.ebooks?.length)
          : Boolean(offer.courses?.length || offer.courseModules?.length);

      return namesApp || titleNamesApp || hasResources;
    })
    .map((offer) => offer.id);

  return matchingOffers.length > 0 ? matchingOffers : offers.map((offer) => offer.id);
}
