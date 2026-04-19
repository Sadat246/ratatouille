import { format } from "date-fns";

import { SectionCard } from "@/components/auction/section-card";
import { SellerShell } from "@/components/auction/seller-shell";
import type { SellerFulfillmentItem } from "@/lib/auctions/queries";
import { getSellerFulfillments } from "@/lib/auctions/queries";
import { formatPackageLabel } from "@/lib/auctions/display";
import { coerceDate, toIsoTimestamp } from "@/lib/datetime";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getSellerDeskData } from "@/lib/listings/queries";

function pickUpByLabel(row: SellerFulfillmentItem) {
  const fromCode = coerceDate(row.pickupCodeExpiresAt);
  const fromListing = coerceDate(row.listing.expiresAt);
  const d = fromCode ?? fromListing;
  return d ? format(d, "MMM d, yyyy h:mm a") : null;
}

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
      description="Winner, pickup deadline, and codes appear after payment captures—automatically in dev (mock card) or via Stripe when configured."
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
            fulfillment row appears for store staff with the buyer and pickup window.
          </p>
        ) : (
          <ul className="grid gap-3">
            {items.map((row) => {
              const pickupBy = pickUpByLabel(row);
              return (
                <li
                  key={row.id}
                  className="rounded-[1.4rem] border border-[#b9d0c4] bg-white/90 p-4 text-sm leading-6 text-[#1a2e24]"
                >
                  <p className="font-semibold text-[#0f1f18]">{row.listing.title}</p>
                  {row.buyer ? (
                    <p className="mt-2 text-[#3d5348]">
                      <span className="font-medium text-[#0f1f18]">Winner</span>{" "}
                      {row.buyer.name ? `${row.buyer.name} · ` : null}
                      {row.buyer.email}
                    </p>
                  ) : (
                    <p className="mt-2 text-[#8a6d5c]">Winner (loading profile…)</p>
                  )}
                  <p className="mt-1 text-[#3d5348]">
                    {formatPackageLabel(row.listing.packageDate)}
                    {pickupBy ? (
                      <>
                        {" "}
                        · <span className="font-medium text-[#8a4a2d]">Pick up by {pickupBy}</span>
                      </>
                    ) : null}
                  </p>
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
              );
            })}
          </ul>
        )}
      </SectionCard>
    </SellerShell>
  );
}
