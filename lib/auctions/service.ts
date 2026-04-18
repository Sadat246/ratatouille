import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getInteractiveDb } from "@/db/interactive";
import {
  auctions,
  bids,
  listings,
  settlements,
} from "@/db/schema";
import {
  getNextBidAmountCents,
  getSettlementAmounts,
  hasMockCardOnFile,
} from "@/lib/auctions/pricing";
import { notifyAuctionMutation } from "@/lib/push/notify";

type InteractiveTransaction = Parameters<
  Parameters<ReturnType<typeof getInteractiveDb>["transaction"]>[0]
>[0];

type LockedAuctionRow = {
  id: string;
  listingId: string;
  businessId: string;
  status: "scheduled" | "active" | "closed" | "cancelled";
  result: "pending" | "reserve_not_met" | "winning_bid" | "buyout" | "cancelled";
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  currentBidAmountCents: number | null;
  currentLeaderBidId: string | null;
  currentLeaderUserId: string | null;
  bidCount: number;
  lastBidAt: Date | null;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date;
  endedAt: Date | null;
  winningBidId: string | null;
  listingStatus: "draft" | "scheduled" | "active" | "sold" | "expired" | "cancelled";
  listingExpiresAt: Date | null;
  listingCurrency: string;
};

export type AuctionMutationResult = {
  action:
    | "bid_accepted"
    | "auction_bought_out"
    | "auction_cancelled"
    | "auction_expired"
    | "auction_closed"
    | "auction_no_sale";
  auctionId: string;
  changed: boolean;
  closed: boolean;
  status: string;
  result: string;
  endedAt: Date | null;
  outbidUserId?: string | null;
  winningBidId?: string | null;
  winningBidUserId?: string | null;
};

export class AuctionServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function lockAuction(
  tx: InteractiveTransaction,
  auctionId: string,
): Promise<LockedAuctionRow | null> {
  const result = await tx.execute(sql<LockedAuctionRow>`
    select
      a.id,
      a.listing_id as "listingId",
      a.business_id as "businessId",
      a.status,
      a.result,
      a.reserve_price_cents as "reservePriceCents",
      a.buyout_price_cents as "buyoutPriceCents",
      a.current_bid_amount_cents as "currentBidAmountCents",
      a.current_leader_bid_id as "currentLeaderBidId",
      a.current_leader_user_id as "currentLeaderUserId",
      a.bid_count as "bidCount",
      a.last_bid_at as "lastBidAt",
      a.scheduled_start_at as "scheduledStartAt",
      a.scheduled_end_at as "scheduledEndAt",
      a.ended_at as "endedAt",
      a.winning_bid_id as "winningBidId",
      l.status as "listingStatus",
      l.expires_at as "listingExpiresAt",
      l.currency as "listingCurrency"
    from auctions a
    inner join listings l on l.id = a.listing_id
    where a.id = ${auctionId}
    for update of a, l
  `);

  return (result.rows[0] as LockedAuctionRow | undefined) ?? null;
}

async function activateAuctionIfReady(
  tx: InteractiveTransaction,
  auction: LockedAuctionRow,
  now: Date,
): Promise<LockedAuctionRow> {
  if (auction.status !== "scheduled") {
    return auction;
  }

  if (auction.scheduledStartAt && auction.scheduledStartAt > now) {
    throw new AuctionServiceError(
      "AUCTION_NOT_STARTED",
      "This auction has not opened yet.",
      409,
    );
  }

  await tx
    .update(auctions)
    .set({
      status: "active",
      updatedAt: now,
    })
    .where(eq(auctions.id, auction.id));

  return {
    ...auction,
    status: "active",
  };
}

function getTimedEndAt(auction: LockedAuctionRow) {
  return auction.scheduledEndAt;
}

function getExpiryEndAt(auction: LockedAuctionRow, now: Date) {
  return auction.listingExpiresAt ?? now;
}

async function markPreviousLeaderOutbid(
  tx: InteractiveTransaction,
  currentLeaderBidId: string | null,
  now: Date,
) {
  if (!currentLeaderBidId) {
    return;
  }

  await tx
    .update(bids)
    .set({
      status: "outbid",
      updatedAt: now,
    })
    .where(eq(bids.id, currentLeaderBidId));
}

async function voidAuctionBids(
  tx: InteractiveTransaction,
  auctionId: string,
  now: Date,
) {
  await tx
    .update(bids)
    .set({
      status: "voided",
      updatedAt: now,
    })
    .where(
      and(
        eq(bids.auctionId, auctionId),
        sql`${bids.status} <> 'withdrawn' and ${bids.status} <> 'voided'`,
      ),
    );
}

async function closeAuctionWithWinner(
  tx: InteractiveTransaction,
  auction: LockedAuctionRow,
  {
    action,
    result,
    endedAt,
    amountCents,
    winningBidId,
    winningBidUserId,
    outbidUserId,
  }: {
    action: AuctionMutationResult["action"];
    result: "winning_bid" | "buyout";
    endedAt: Date;
    amountCents: number;
    winningBidId: string;
    winningBidUserId: string;
    outbidUserId?: string | null;
  },
): Promise<AuctionMutationResult> {
  const settlementAmounts = getSettlementAmounts(amountCents);

  await tx.insert(settlements).values({
    auctionId: auction.id,
    listingId: auction.listingId,
    businessId: auction.businessId,
    buyerUserId: winningBidUserId,
    winningBidId,
    status: "pending",
    paymentStatus: "pending_authorization",
    grossAmountCents: settlementAmounts.grossAmountCents,
    platformFeeCents: settlementAmounts.platformFeeCents,
    sellerNetAmountCents: settlementAmounts.sellerNetAmountCents,
    currency: auction.listingCurrency,
    createdAt: endedAt,
    updatedAt: endedAt,
  }).onConflictDoNothing({
    target: settlements.auctionId,
  });

  await tx
    .update(auctions)
    .set({
      status: "closed",
      result,
      currentBidAmountCents: amountCents,
      currentLeaderBidId: winningBidId,
      currentLeaderUserId: winningBidUserId,
      winningBidId,
      endedAt,
      updatedAt: endedAt,
    })
    .where(eq(auctions.id, auction.id));

  await tx
    .update(listings)
    .set({
      status: "sold",
      updatedAt: endedAt,
    })
    .where(eq(listings.id, auction.listingId));

  return {
    action,
    auctionId: auction.id,
    changed: true,
    closed: true,
    status: "closed",
    result,
    endedAt,
    outbidUserId: outbidUserId ?? null,
    winningBidId,
    winningBidUserId,
  };
}

async function closeAuctionWithoutWinner(
  tx: InteractiveTransaction,
  auction: LockedAuctionRow,
  endedAt: Date,
): Promise<AuctionMutationResult> {
  await tx
    .update(auctions)
    .set({
      status: "closed",
      result: "reserve_not_met",
      endedAt,
      updatedAt: endedAt,
    })
    .where(eq(auctions.id, auction.id));

  await tx
    .update(listings)
    .set({
      status: "expired",
      updatedAt: endedAt,
    })
    .where(eq(listings.id, auction.listingId));

  return {
    action: "auction_no_sale",
    auctionId: auction.id,
    changed: true,
    closed: true,
    status: "closed",
    result: "reserve_not_met",
    endedAt,
  };
}

async function cancelAuctionInternally(
  tx: InteractiveTransaction,
  auction: LockedAuctionRow,
  {
    endedAt,
    listingStatus,
    action,
  }: {
    endedAt: Date;
    listingStatus: "cancelled" | "expired";
    action: "auction_cancelled" | "auction_expired";
  },
): Promise<AuctionMutationResult> {
  await voidAuctionBids(tx, auction.id, endedAt);

  await tx
    .update(auctions)
    .set({
      status: "cancelled",
      result: "cancelled",
      currentBidAmountCents: null,
      currentLeaderBidId: null,
      currentLeaderUserId: null,
      winningBidId: null,
      endedAt,
      updatedAt: endedAt,
    })
    .where(eq(auctions.id, auction.id));

  await tx
    .update(listings)
    .set({
      status: listingStatus,
      updatedAt: endedAt,
    })
    .where(eq(listings.id, auction.listingId));

  return {
    action,
    auctionId: auction.id,
    changed: true,
    closed: true,
    status: "cancelled",
    result: "cancelled",
    endedAt,
  };
}

async function closeAuctionIfDue(
  tx: InteractiveTransaction,
  auction: LockedAuctionRow,
  now: Date,
): Promise<AuctionMutationResult | null> {
  if (auction.listingExpiresAt && auction.listingExpiresAt <= now) {
    return cancelAuctionInternally(tx, auction, {
      endedAt: getExpiryEndAt(auction, now),
      listingStatus: "expired",
      action: "auction_expired",
    });
  }

  if (auction.scheduledEndAt > now) {
    return null;
  }

  if (
    auction.currentLeaderBidId &&
    auction.currentLeaderUserId &&
    auction.currentBidAmountCents !== null
  ) {
    return closeAuctionWithWinner(tx, auction, {
      action: "auction_closed",
      result: "winning_bid",
      endedAt: getTimedEndAt(auction),
      amountCents: auction.currentBidAmountCents,
      winningBidId: auction.currentLeaderBidId,
      winningBidUserId: auction.currentLeaderUserId,
    });
  }

  return closeAuctionWithoutWinner(tx, auction, getTimedEndAt(auction));
}

function getClosedAuctionError(result: AuctionMutationResult) {
  if (result.action === "auction_expired") {
    return new AuctionServiceError(
      "LISTING_EXPIRED",
      "This listing expired before the auction could finish.",
      409,
    );
  }

  return new AuctionServiceError(
    "AUCTION_NOT_OPEN",
    "This auction is no longer open for new bids.",
    409,
  );
}

export async function placeBid({
  auctionId,
  consumerUserId,
}: {
  auctionId: string;
  consumerUserId: string;
}) {
  const result = await getInteractiveDb().transaction(async (tx) => {
    const now = new Date();
    const lockedAuction = await lockAuction(tx, auctionId);

    if (!lockedAuction) {
      throw new AuctionServiceError(
        "AUCTION_NOT_FOUND",
        "This auction could not be found.",
        404,
      );
    }

    if (lockedAuction.status === "closed" || lockedAuction.status === "cancelled") {
      throw new AuctionServiceError(
        "AUCTION_NOT_OPEN",
        "This auction is no longer open for new bids.",
        409,
      );
    }

    const terminalState = await closeAuctionIfDue(tx, lockedAuction, now);

    if (terminalState) {
      throw getClosedAuctionError(terminalState);
    }

    const auction = await activateAuctionIfReady(tx, lockedAuction, now);

    if (auction.status !== "active") {
      throw new AuctionServiceError(
        "AUCTION_NOT_OPEN",
        "This auction is no longer open for new bids.",
        409,
      );
    }

    const consumerProfile = await tx.query.consumerProfiles.findFirst({
      columns: {
        hasMockCardOnFile: true,
        mockCardBrand: true,
        mockCardLast4: true,
      },
      where: (table, operators) => operators.eq(table.userId, consumerUserId),
    });

    if (!consumerProfile || !hasMockCardOnFile(consumerProfile)) {
      throw new AuctionServiceError(
        "MOCK_CARD_REQUIRED",
        "Add a mock card before placing bids.",
        409,
      );
    }

    if (auction.currentLeaderUserId === consumerUserId) {
      throw new AuctionServiceError(
        "ALREADY_LEADING",
        "You already hold the leading bid.",
        409,
      );
    }

    const nextBidAmountCents = getNextBidAmountCents({
      currentBidAmountCents: auction.currentBidAmountCents,
      reservePriceCents: auction.reservePriceCents,
    });

    if (
      auction.buyoutPriceCents !== null &&
      nextBidAmountCents >= auction.buyoutPriceCents
    ) {
      throw new AuctionServiceError(
        "BUYOUT_REQUIRED",
        "The next bid would meet the buyout price. Use buyout instead.",
        409,
      );
    }

    const outbidUserId =
      auction.currentLeaderUserId && auction.currentLeaderUserId !== consumerUserId
        ? auction.currentLeaderUserId
        : null;

    await markPreviousLeaderOutbid(tx, auction.currentLeaderBidId, now);

    const [createdBid] = await tx
      .insert(bids)
      .values({
        auctionId: auction.id,
        consumerUserId,
        kind: "standard",
        status: "winning",
        amountCents: nextBidAmountCents,
        placedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: bids.id });

    await tx
      .update(auctions)
      .set({
        currentBidAmountCents: nextBidAmountCents,
        currentLeaderBidId: createdBid.id,
        currentLeaderUserId: consumerUserId,
        bidCount: auction.bidCount + 1,
        lastBidAt: now,
        updatedAt: now,
      })
      .where(eq(auctions.id, auction.id));

    return {
      action: "bid_accepted",
      auctionId: auction.id,
      changed: true,
      closed: false,
      status: "active",
      result: "pending",
      endedAt: null,
      outbidUserId,
      winningBidId: createdBid.id,
      winningBidUserId: consumerUserId,
    } satisfies AuctionMutationResult;
  });

  await notifyAuctionMutation(result);

  return result;
}

export async function buyoutAuction({
  auctionId,
  consumerUserId,
}: {
  auctionId: string;
  consumerUserId: string;
}) {
  const result = await getInteractiveDb().transaction(async (tx) => {
    const now = new Date();
    const lockedAuction = await lockAuction(tx, auctionId);

    if (!lockedAuction) {
      throw new AuctionServiceError(
        "AUCTION_NOT_FOUND",
        "This auction could not be found.",
        404,
      );
    }

    if (lockedAuction.status === "closed" || lockedAuction.status === "cancelled") {
      throw new AuctionServiceError(
        "AUCTION_NOT_OPEN",
        "This auction is no longer open for buyout.",
        409,
      );
    }

    const terminalState = await closeAuctionIfDue(tx, lockedAuction, now);

    if (terminalState) {
      throw getClosedAuctionError(terminalState);
    }

    const auction = await activateAuctionIfReady(tx, lockedAuction, now);

    if (auction.status !== "active") {
      throw new AuctionServiceError(
        "AUCTION_NOT_OPEN",
        "This auction is no longer open for buyout.",
        409,
      );
    }

    const consumerProfile = await tx.query.consumerProfiles.findFirst({
      columns: {
        hasMockCardOnFile: true,
        mockCardBrand: true,
        mockCardLast4: true,
      },
      where: (table, operators) => operators.eq(table.userId, consumerUserId),
    });

    if (!consumerProfile || !hasMockCardOnFile(consumerProfile)) {
      throw new AuctionServiceError(
        "MOCK_CARD_REQUIRED",
        "Add a mock card before using buyout.",
        409,
      );
    }

    if (auction.buyoutPriceCents === null) {
      throw new AuctionServiceError(
        "BUYOUT_UNAVAILABLE",
        "This auction does not offer buyout.",
        409,
      );
    }

    const outbidUserId =
      auction.currentLeaderUserId && auction.currentLeaderUserId !== consumerUserId
        ? auction.currentLeaderUserId
        : null;

    await markPreviousLeaderOutbid(tx, auction.currentLeaderBidId, now);

    const [createdBid] = await tx
      .insert(bids)
      .values({
        auctionId: auction.id,
        consumerUserId,
        kind: "buyout",
        status: "winning",
        amountCents: auction.buyoutPriceCents,
        placedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: bids.id });

    return closeAuctionWithWinner(tx, auction, {
      action: "auction_bought_out",
      result: "buyout",
      endedAt: now,
      amountCents: auction.buyoutPriceCents,
      winningBidId: createdBid.id,
      winningBidUserId: consumerUserId,
      outbidUserId,
    });
  });

  await notifyAuctionMutation(result);

  return result;
}

export async function cancelAuction({
  auctionId,
  businessId,
}: {
  auctionId: string;
  businessId: string;
}) {
  const result = await getInteractiveDb().transaction(async (tx) => {
    const now = new Date();
    const lockedAuction = await lockAuction(tx, auctionId);

    if (!lockedAuction) {
      throw new AuctionServiceError(
        "AUCTION_NOT_FOUND",
        "This auction could not be found.",
        404,
      );
    }

    if (lockedAuction.businessId !== businessId) {
      throw new AuctionServiceError(
        "AUCTION_FORBIDDEN",
        "Only the seller that owns this auction can cancel it.",
        403,
      );
    }

    if (lockedAuction.status === "cancelled") {
      return {
        action: "auction_cancelled",
        auctionId: lockedAuction.id,
        changed: false,
        closed: true,
        status: "cancelled",
        result: "cancelled",
        endedAt: lockedAuction.endedAt,
      } satisfies AuctionMutationResult;
    }

    if (lockedAuction.status === "closed") {
      throw new AuctionServiceError(
        "AUCTION_ALREADY_CLOSED",
        "This auction has already finished.",
        409,
      );
    }

    return cancelAuctionInternally(tx, lockedAuction, {
      endedAt: now,
      listingStatus: "cancelled",
      action: "auction_cancelled",
    });
  });

  if (result.changed) {
    await notifyAuctionMutation(result);
  }

  return result;
}

export async function refreshAuctionIfOverdue(auctionId: string) {
  const result = await getInteractiveDb().transaction(async (tx) => {
    const now = new Date();
    const lockedAuction = await lockAuction(tx, auctionId);

    if (!lockedAuction) {
      return null;
    }

    if (lockedAuction.status === "closed" || lockedAuction.status === "cancelled") {
      return null;
    }

    const terminalState = await closeAuctionIfDue(tx, lockedAuction, now);

    if (terminalState) {
      return terminalState;
    }

    return activateAuctionIfReady(tx, lockedAuction, now).then(() => null);
  });

  if (result) {
    await notifyAuctionMutation(result);
  }

  return result;
}

export async function sweepOverdueAuctions(limit = 12) {
  const results = await getInteractiveDb().transaction(async (tx) => {
    const overdueAuctionIds = await tx.execute(sql<{ id: string }>`
      select a.id
      from auctions a
      inner join listings l on l.id = a.listing_id
      where a.status in ('active', 'scheduled')
        and (
          a.scheduled_end_at <= now()
          or (l.expires_at is not null and l.expires_at <= now())
        )
      for update of a, l skip locked
      limit ${limit}
    `);

    const closedAuctions: AuctionMutationResult[] = [];
    const now = new Date();

    for (const row of overdueAuctionIds.rows as Array<{ id: string }>) {
      const lockedAuction = await lockAuction(tx, row.id);

      if (!lockedAuction) {
        continue;
      }

      if (lockedAuction.status === "closed" || lockedAuction.status === "cancelled") {
        continue;
      }

      const terminalState = await closeAuctionIfDue(tx, lockedAuction, now);

      if (terminalState) {
        closedAuctions.push(terminalState);
      }
    }

    return closedAuctions;
  });

  await Promise.all(results.map((result) => notifyAuctionMutation(result)));

  return results;
}
