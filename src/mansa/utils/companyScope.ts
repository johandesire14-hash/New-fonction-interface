export interface CompanyScopedRecord {
  companyId?: string | null;
}

export interface PersonalTransactionRecord extends CompanyScopedRecord {
  type?: string;
}

/**
 * Restrict company-owned records to one exact company identifier.
 * Missing company IDs are intentionally excluded; names are not authorization keys.
 */
export function filterByCompanyId<T extends CompanyScopedRecord>(
  records: readonly T[],
  companyId: string | null | undefined,
): T[] {
  if (!companyId) return [];
  return records.filter((record) => record.companyId === companyId);
}

/** Personal is a separate scope, not a roll-up of every company. */
export function filterPersonalTransactions<T extends PersonalTransactionRecord>(
  records: readonly T[],
): T[] {
  return records.filter(
    (record) => !record.companyId && (record.type === "affiliate" || record.type === "other"),
  );
}
