import { ConsumerShell } from "@/components/auction/consumer-shell";
import { SectionCard } from "@/components/auction/section-card";
import { ConsumerOrdersList } from "@/components/fulfillment/consumer-orders-list";
import { db } from "@/db/client";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getConsumerFulfillments } from "@/lib/fulfillment/queries";

export default async function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const session = await requireCompletedRole("consumer");
  const [{ focus }, profile, items] = await Promise.all([
    searchParams,
    db.query.consumerProfiles.findFirst({
      columns: {
        city: true,
        state: true,
        locationLabel: true,
      },
      where: (table, operators) => operators.eq(table.userId, session.user.id),
    }),
    getConsumerFulfillments(session.user.id),
  ]);

  const locationLabel = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile?.locationLabel || session.user.name || "Shop deals";

  const readyCount = items.filter((item) => item.status === "ready_for_pickup").length;
  const deliveryCount = items.filter(
    (item) =>
      item.status === "delivery_requested" || item.status === "out_for_delivery",
  ).length;
  const completedCount = items.filter(
    (item) => item.status === "picked_up" || item.status === "delivered",
  ).length;

  return (
    <ConsumerShell
      activeHref="/shop/orders"
      badge="Orders"
      title="Choose the handoff while the win still feels fresh."
      description="Every paid order lands here with a clear pickup code or a live delivery path, so the last mile never feels bolted on after the auction."
      heroClassName="bg-[linear-gradient(145deg,#2a1b3d_0%,#4f3f88_46%,#9bb0ff_100%)] text-white shadow-[0_35px_110px_rgba(55,43,102,0.24)]"
      locationLabel={locationLabel}
    >
      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
        <SectionCard
          title="Fulfillment board"
          tone="border-[#d8ddf3] bg-[rgba(243,245,255,0.92)] text-[#20183f]"
        >
          <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
            {[
              {
                label: "Pickup ready",
                value: String(readyCount).padStart(2, "0"),
              },
              {
                label: "On delivery",
                value: String(deliveryCount).padStart(2, "0"),
              },
              {
                label: "Completed",
                value: String(completedCount).padStart(2, "0"),
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-[1.4rem] border border-[#d8ddf3] bg-white/88 p-3"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#666b9f]">
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#211840]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <ConsumerOrdersList initialItems={items} focusAuctionId={focus} />
      </div>
    </ConsumerShell>
  );
}
