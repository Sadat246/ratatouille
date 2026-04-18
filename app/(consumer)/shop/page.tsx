import { ConsumerShell } from "@/components/auction/consumer-shell";
import { AuctionCard } from "@/components/auction/auction-card";
import { SectionCard } from "@/components/auction/section-card";
import { db } from "@/db/client";
import {
  formatCurrency,
  formatLocationLabel,
  formatPackageLabel,
} from "@/lib/auctions/display";
import { getAuctionFeed } from "@/lib/auctions/queries";
import { AUCTION_SWEEP_BATCH_SIZE } from "@/lib/auctions/pricing";
import { sweepOverdueAuctions } from "@/lib/auctions/service";
import { requireCompletedRole } from "@/lib/auth/onboarding";

const shopperNotes = [
  "Reserve is the first legal bid, so the opening move is always explicit.",
  "Buyout stays visible next to the live price instead of hiding behind a secondary flow.",
  "Winning and outbid state follow the server, not the browser clock.",
];

export default async function ShopPage() {
  const session = await requireCompletedRole("consumer");
  const profile = await db.query.consumerProfiles.findFirst({
    columns: {
      city: true,
      state: true,
      locationLabel: true,
    },
    where: (table, operators) => operators.eq(table.userId, session.user.id),
  });

  await sweepOverdueAuctions(AUCTION_SWEEP_BATCH_SIZE);
  const auctions = await getAuctionFeed(24, session.user.id);

  const uniqueBusinessCount = new Set(auctions.map((auction) => auction.business.id)).size;
  const activeLotCount = auctions.length;
  const leadingCount = auctions.filter((auction) => auction.viewerIsLeading).length;
  const locationLabel = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile?.locationLabel || session.user.name || "Shop deals";

  return (
    <ConsumerShell
      activeHref="/shop"
      badge="Live shopper lane"
      title="Bids, buyouts, and zero dead air."
      description="The feed is now real server state: current price, buyout pressure, ending-soon urgency, and your leading positions in one thumb-first lane."
      locationLabel={locationLabel}
    >
      <SectionCard
        title="Rescue pulse"
        tone="border-white/70 bg-[rgba(255,248,241,0.84)] text-[#241610]"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Nearby stores", value: String(uniqueBusinessCount).padStart(2, "0") },
            { label: "Active lots", value: String(activeLotCount).padStart(2, "0") },
            { label: "You’re leading", value: String(leadingCount).padStart(2, "0") },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.4rem] border border-[#f2d0bd] bg-white/85 p-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#9a5437]">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#1d120e]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Live right now"
        tone="border-[#ffd7c7] bg-[rgba(255,241,233,0.88)] text-[#301a13]"
      >
        {auctions.length === 0 ? (
          <div className="rounded-[1.7rem] bg-white/92 p-5">
            <p className="text-base font-semibold text-[#221511]">
              No active auctions are live near this shopper yet.
            </p>
            <p className="mt-2 text-sm leading-6 text-[#664e42]">
              As soon as a seller publishes a lot, it will appear here with its
              timer, reserve, buyout, and detail route.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {auctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                href={`/shop/${auction.id}`}
                eyebrow={auction.business.name}
                title={auction.listing.title}
                description={auction.listing.description}
                imageUrl={auction.listing.imageUrl}
                metrics={[
                  {
                    label: "Current",
                    value: formatCurrency(
                      auction.currentBidAmountCents ?? auction.reservePriceCents,
                    ),
                  },
                  {
                    label: "Reserve",
                    value: formatCurrency(auction.reservePriceCents),
                  },
                  {
                    label: "Buyout",
                    value: formatCurrency(auction.buyoutPriceCents),
                  },
                ]}
                footerLines={[
                  formatLocationLabel(auction.business.city, auction.business.state),
                  formatPackageLabel(auction.listing.packageDate),
                ]}
                endsAt={auction.scheduledEndAt}
                status={auction.status}
                result={auction.result}
                badge={
                  auction.viewerIsLeading
                    ? {
                        label: "Winning",
                        tone: "green",
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Why this feels faster now"
        tone="border-[#d6e6da] bg-[rgba(236,245,239,0.84)] text-[#183227]"
      >
        <div className="grid gap-3">
          {shopperNotes.map((note) => (
            <p
              key={note}
              className="rounded-[1.4rem] border border-[#c9ddd0] bg-white/70 px-4 py-3 text-sm leading-7 text-[#315343]"
            >
              {note}
            </p>
          ))}
        </div>
      </SectionCard>
    </ConsumerShell>
  );
}
