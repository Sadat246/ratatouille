export * from "./identity";
export * from "./businesses";
export * from "./consumers";
export * from "./listings";
export * from "./auctions";
export * from "./payments";
export * from "./fulfillment";

import { bids, auctions } from "./auctions";
import { businesses, businessMemberships } from "./businesses";
import { consumerProfiles } from "./consumers";
import { fulfillments } from "./fulfillment";
import { accounts, sessions, users, verificationTokens } from "./identity";
import { listingImages, listings } from "./listings";
import { settlements } from "./payments";

export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  businesses,
  businessMemberships,
  consumerProfiles,
  listings,
  listingImages,
  auctions,
  bids,
  settlements,
  fulfillments,
};

export type AppSchema = typeof schema;
