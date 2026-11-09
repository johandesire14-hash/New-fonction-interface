import { describe, expect, it, vi } from "vitest";
import {
  DISCOVERABLE_PRODUCTS_UPDATED_EVENT,
  dispatchProductUpdates,
  PRODUCTS_UPDATED_EVENT,
} from "@/mansa/utils/productUpdateEvents";

describe("product update events", () => {
  it("notifies the company menu and discoverable catalog in the same tab", () => {
    const menuListener = vi.fn();
    const catalogListener = vi.fn();
    window.addEventListener(PRODUCTS_UPDATED_EVENT, menuListener);
    window.addEventListener(DISCOVERABLE_PRODUCTS_UPDATED_EVENT, catalogListener);

    try {
      dispatchProductUpdates();

      expect(menuListener).toHaveBeenCalledTimes(1);
      expect(catalogListener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, menuListener);
      window.removeEventListener(DISCOVERABLE_PRODUCTS_UPDATED_EVENT, catalogListener);
    }
  });
});
