import { SectionCard } from "@/components/auction/section-card";
import { SellerShell } from "@/components/auction/seller-shell";
import { getSellerFulfillments } from "@/lib/auctions/queries";
import { toIsoTimestamp } from "@/lib/datetime";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getSellerDeskData } from "@/lib/listings/queries";

export default async function SellerFulfillmentPage() {
  const session = await requireCompletedRole("business");
  const sellerDesk = await getSellerDeskData(session.user.id);

  if (!sellerDesk) {
    return (
      <SellerShell
        activeHref="/sell/fulfillment"
        badge="Seller setup issue"
        title="Storefront membership missing."
        description="Finish business onboarding again before using the fulfillment lane."
        businessName="Seller setup"
      >
        <SectionCard
          title="Seller setup issue"
          tone="border-[#ead1cb] bg-[rgba(255,241,237,0.88)] text-[#41231c]"
        >
          <p className="text-sm leading-7">
            This seller account is missing the storefront membership record that powers
            fulfillment tracking.
          </p>
        </SectionCard>
      </SellerShell>
    );
  }

  const items = await getSellerFulfillments(sellerDesk.businessId);

  return (
    <SellerShell
      activeHref="/sell/fulfillment"
      badge="Fulfillment"
      title="Pickup codes and delivery status."
      description="Rows are created when a winning payment is captured and the settlement moves to fulfillment. Track status from the database in one place."
      heroClassName="bg-[linear-gradient(145deg,#1a2e26_0%,#3d5c4f_48%,#8fbc8f_100%)] text-white shadow-[0_35px_110px_rgba(26,46,38,0.22)]"
      businessName={sellerDesk.businessName}
    >
      <SectionCard
        title={`Open fulfillments (${items.length})`}
        tone="border-[#c8ddd2] bg-[rgba(240,248,244,0.92)] text-[#142920]"
      >
        {items.length === 0 ? (
          <p className="text-sm leading-7 text-[#3d5348]">
            Nothing here yet. After an auction closes with a winning bid and payment is captured, a
            fulfillment row appears for store staff to confirm pickup or delivery.
          </p>
        ) : (
          <ul className="grid gap-3">
            {items.map((row) => (
              <li
                key={row.id}
                className="rounded-[1.4rem] border border-[#b9d0c4] bg-white/90 p-4 text-sm leading-6 text-[#1a2e24]"
              >
                <p className="font-semibold text-[#0f1f18]">{row.listing.title}</p>
                <p className="mt-1 text-[#3d5348]">
                  Fulfillment: <span className="font-medium">{row.status}</span> · Mode:{" "}
                  {row.mode}
                  {row.deliveryProvider !== "none" ? ` · ${row.deliveryProvider}` : null}
                </p>
                <p className="mt-1 text-[#3d5348]">
                  Settlement: {row.settlement.status} · Payment: {row.settlement.paymentStatus}
                </p>
                {row.pickupCode ? (
                  <p className="mt-2 font-mono text-[#0f1f18]">Pickup code: {row.pickupCode}</p>
                ) : null}
                {row.deliveredAt ? (
                  <p className="mt-1 text-xs text-[#5a6f65]">
                    Delivered {toIsoTimestamp(row.deliveredAt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </SellerShell>
  );
}
