export const PRODUCTS_UPDATED_EVENT = "mansa_products_updated";
export const DISCOVERABLE_PRODUCTS_UPDATED_EVENT = "mansa_discoverable_products_updated";

export function dispatchProductUpdates(): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(PRODUCTS_UPDATED_EVENT));
  window.dispatchEvent(new Event(DISCOVERABLE_PRODUCTS_UPDATED_EVENT));
}
