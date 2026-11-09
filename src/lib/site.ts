const rawSiteUrl =
  (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_SITE_URL : "") ||
  (typeof process !== "undefined" && process?.env?.VITE_SITE_URL ? process.env.VITE_SITE_URL : "") ||
  "";

export const SITE_URL = String(rawSiteUrl || "").replace(/\/$/, "");

export function siteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return SITE_URL ? `${SITE_URL}${normalizedPath}` : normalizedPath;
}

export function hasConfiguredSiteUrl(): boolean {
  return Boolean(SITE_URL);
}
