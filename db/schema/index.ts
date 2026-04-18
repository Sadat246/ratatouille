export * from "./identity";
export * from "./businesses";
export * from "./listings";
export * from "./auctions";
export * from "./payments";
export * from "./fulfillment";

import { bids, auctions } from "./auctions";
import { businesses, businessMemberships } from "./businesses";
import { fulfillments } from "./fulfillment";
import { users } from "./identity";
import { listingImages, listings } from "./listings";
import { settlements } from "./payments";

export const schema = {
  users,
  businesses,
  businessMemberships,
  listings,
  listingImages,
  auctions,
  bids,
  settlements,
  fulfillments,
};

export type AppSchema = typeof schema;
