import { Store, del, get, set } from "idb-keyval";

import type { ListingDraftSnapshot } from "./draft-types";

const listingDraftStore = new Store("ratatouille-listing-drafts", "drafts");

function getDraftKey(businessId: string) {
  return `listing-draft:${businessId}`;
}

export async function readListingDraft(businessId: string) {
  return get<ListingDraftSnapshot>(getDraftKey(businessId), listingDraftStore);
}

export async function saveListingDraft(
  businessId: string,
  draft: ListingDraftSnapshot,
) {
  await set(getDraftKey(businessId), draft, listingDraftStore);
}

export async function clearListingDraft(businessId: string) {
  await del(getDraftKey(businessId), listingDraftStore);
}

export async function requestPersistentListingDraftStorage() {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }

  try {
    return navigator.storage.persist();
  } catch {
    return false;
  }
}
