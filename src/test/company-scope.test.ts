import { describe, expect, it } from "vitest";
import { filterByCompanyId, filterPersonalTransactions } from "@/mansa/utils/companyScope";

describe("filterByCompanyId", () => {
  const records = [
    { id: "product-a", companyId: "company-a", companyName: "Same Name" },
    { id: "product-b", companyId: "company-b", companyName: "Same Name" },
    { id: "legacy", companyName: "Same Name" },
  ];

  it("returns only records with the exact active company ID", () => {
    expect(filterByCompanyId(records, "company-a").map((record) => record.id)).toEqual([
      "product-a",
    ]);
  });

  it("excludes legacy records without an ID and returns nothing without a company", () => {
    expect(filterByCompanyId(records, undefined)).toEqual([]);
    expect(filterByCompanyId(records, "company-missing")).toEqual([]);
  });

  it("keeps company sales out of the separate personal scope", () => {
    expect(
      filterPersonalTransactions([
        { id: "sale", companyId: "company-a", type: "sale" },
        { id: "affiliate", type: "affiliate" },
        { id: "other", type: "other" },
        { id: "unknown-legacy", type: "sale" },
      ]).map((record) => record.id),
    ).toEqual(["affiliate", "other"]);
  });
});
