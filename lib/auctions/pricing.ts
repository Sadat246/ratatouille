import "server-only";

export const AUCTION_BID_INCREMENT_CENTS = 50;
export const AUCTION_PLATFORM_FEE_BPS = 1_000;
export const AUCTION_SWEEP_INTERVAL_MS = 15_000;
export const AUCTION_SWEEP_BATCH_SIZE = 12;
export const AUCTION_ENDING_SOON_WINDOW_MS = 10 * 60 * 1_000;

export function getNextBidAmountCents({
  currentBidAmountCents,
  reservePriceCents,
}: {
  currentBidAmountCents: number | null;
  reservePriceCents: number;
}) {
  if (currentBidAmountCents === null) {
    return reservePriceCents;
  }

  return currentBidAmountCents + AUCTION_BID_INCREMENT_CENTS;
}

export function getSettlementAmounts(grossAmountCents: number) {
  const platformFeeCents = Math.round(
    (grossAmountCents * AUCTION_PLATFORM_FEE_BPS) / 10_000,
  );

  return {
    grossAmountCents,
    platformFeeCents,
    sellerNetAmountCents: grossAmountCents - platformFeeCents,
  };
}

export function hasMockCardOnFile(profile: {
  hasMockCardOnFile: boolean;
  mockCardBrand: string | null;
  mockCardLast4: string | null;
}) {
  return (
    profile.hasMockCardOnFile &&
    Boolean(profile.mockCardBrand) &&
    Boolean(profile.mockCardLast4)
  );
}
