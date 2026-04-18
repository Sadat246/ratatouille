import { AuctionCard } from "@/components/auction/auction-card";
import type { MyBidAuctionItem } from "@/lib/auctions/queries";
import {
  formatCurrency,
  formatLocationLabel,
  formatPackageLabel,
  formatParticipationLabel,
} from "@/lib/auctions/display";

type MyBidsListProps = {
  items: MyBidAuctionItem[];
};

const participationTone = {
  winning: "green",
  outbid: "amber",
  won: "green",
  lost: "slate",
  cancelled: "slate",
} as const;

export function MyBidsList({ items }: MyBidsListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-[#d8e6de] bg-[rgba(241,248,244,0.9)] p-5">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#183227]">
          No bids yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#476456]">
          The moment you place a bid, this lane becomes your one-tap view for
          winning, outbid, and closed-auction outcomes.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <AuctionCard
          key={item.id}
          href={`/shop/${item.id}`}
          eyebrow={item.business.name}
          title={item.listing.title}
          description={`Your top bid ${formatCurrency(item.myTopBidAmountCents)} across ${item.myBidCount} ${item.myBidCount === 1 ? "move" : "moves"}.`}
          imageUrl={item.listing.imageUrl}
          metrics={[
            {
              label: "Your top",
              value: formatCurrency(item.myTopBidAmountCents),
            },
            {
              label: "Live price",
              value: formatCurrency(item.currentBidAmountCents),
            },
            {
              label: "Buyout",
              value: formatCurrency(item.buyoutPriceCents),
            },
          ]}
          footerLines={[
            formatLocationLabel(item.business.city, item.business.state),
            formatPackageLabel(item.listing.packageDate),
          ]}
          endsAt={item.scheduledEndAt}
          endedAt={item.endedAt}
          status={item.status}
          result={item.result}
          badge={{
            label: formatParticipationLabel(item.participationState),
            tone: participationTone[item.participationState],
          }}
        />
      ))}
    </div>
  );
}
