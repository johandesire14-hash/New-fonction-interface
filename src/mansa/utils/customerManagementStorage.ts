const CUSTOMER_NOTES_PREFIX = "mansa_customer_notes_";
const CUSTOMER_BANS_PREFIX = "mansa_customer_bans_";

function readObject<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getCustomerNote(companyId: string, email: string): string {
  const notes = readObject<Record<string, string>>(`${CUSTOMER_NOTES_PREFIX}${companyId}`, {});
  return notes[email.trim().toLowerCase()] || "";
}

export function saveCustomerNote(companyId: string, email: string, note: string): void {
  if (!companyId || !email.trim() || typeof window === "undefined") return;
  const key = `${CUSTOMER_NOTES_PREFIX}${companyId}`;
  const notes = readObject<Record<string, string>>(key, {});
  const normalizedEmail = email.trim().toLowerCase();
  if (note.trim()) notes[normalizedEmail] = note.trim();
  else delete notes[normalizedEmail];
  window.localStorage.setItem(key, JSON.stringify(notes));
  window.dispatchEvent(
    new CustomEvent("mansa_customer_management_updated", { detail: { companyId } }),
  );
}

export function isCustomerBanned(companyId: string, email: string): boolean {
  const banned = readObject<string[]>(`${CUSTOMER_BANS_PREFIX}${companyId}`, []);
  return banned.includes(email.trim().toLowerCase());
}

export function setCustomerBanned(companyId: string, email: string, value: boolean): void {
  if (!companyId || !email.trim() || typeof window === "undefined") return;
  const key = `${CUSTOMER_BANS_PREFIX}${companyId}`;
  const normalizedEmail = email.trim().toLowerCase();
  const banned = new Set(readObject<string[]>(key, []));
  if (value) banned.add(normalizedEmail);
  else banned.delete(normalizedEmail);
  window.localStorage.setItem(key, JSON.stringify([...banned]));
  window.dispatchEvent(
    new CustomEvent("mansa_customer_management_updated", { detail: { companyId } }),
  );
}
