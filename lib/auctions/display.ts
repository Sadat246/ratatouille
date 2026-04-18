const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(cents: number | null) {
  if (cents === null) {
    return "—";
  }

  return usdFormatter.format(cents / 100);
}

export function formatLocationLabel(city: string | null, state: string | null) {
  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || "Nearby pickup";
}

export function formatPackageLabel(packageDate: string | null) {
  return packageDate ? `Use by ${packageDate}` : "Expiry confirmed";
}

export function formatAuctionResultLabel(status: string, result: string) {
  if (status === "active" || status === "scheduled") {
    return "Live";
  }

  if (status === "cancelled" || result === "cancelled") {
    return "Cancelled";
  }

  if (result === "winning_bid" || result === "buyout") {
    return "Sold";
  }

  if (result === "reserve_not_met") {
    return "No sale";
  }

  return "Ended";
}

export function formatParticipationLabel(
  state: "winning" | "outbid" | "won" | "lost" | "cancelled",
) {
  switch (state) {
    case "winning":
      return "Winning";
    case "outbid":
      return "Outbid";
    case "won":
      return "Won";
    case "lost":
      return "Lost";
    case "cancelled":
      return "Cancelled";
  }
}
