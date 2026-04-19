export type FulfillmentTone = "warm" | "green" | "amber" | "slate" | "rose";

export function canChoosePickup(status: string): boolean {
  return (
    status === "pending_choice" ||
    status === "ready_for_pickup" ||
    status === "failed"
  );
}

export function canChooseDelivery(status: string): boolean {
  return (
    status === "pending_choice" ||
    status === "ready_for_pickup" ||
    status === "failed"
  );
}

export function getConsumerFulfillmentStatusLabel(
  status: string,
  mode: string,
): string {
  switch (status) {
    case "pending_choice":
      return "Choose pickup or delivery";
    case "ready_for_pickup":
      return "Ready for pickup";
    case "picked_up":
      return "Picked up";
    case "delivery_requested":
      return "Pending delivery";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "failed":
      return mode === "delivery" ? "Delivery failed" : "Fulfillment failed";
    case "cancelled":
      return "Cancelled";
    case "awaiting_business":
      return "Awaiting business";
    default:
      return status.replaceAll("_", " ");
  }
}

export function getSellerFulfillmentStatusLabel(
  status: string,
  mode: string,
): string {
  switch (status) {
    case "pending_choice":
      return "Waiting on buyer";
    case "ready_for_pickup":
      return "Pending pickup";
    case "picked_up":
      return "Picked up";
    case "delivery_requested":
    case "out_for_delivery":
      return "Pending delivery";
    case "delivered":
      return "Delivered";
    case "failed":
      return mode === "delivery" ? "Failed delivery" : "Failed";
    case "cancelled":
      return "Cancelled";
    case "awaiting_business":
      return "Awaiting business";
    default:
      return status.replaceAll("_", " ");
  }
}

export function getFulfillmentTone(status: string): FulfillmentTone {
  switch (status) {
    case "ready_for_pickup":
    case "delivery_requested":
    case "out_for_delivery":
      return "amber";
    case "picked_up":
    case "delivered":
      return "green";
    case "failed":
    case "cancelled":
      return "rose";
    case "pending_choice":
    case "awaiting_business":
      return "warm";
    default:
      return "slate";
  }
}

export function mapUberDirectStatusToFulfillmentStatus(
  status: string | null | undefined,
): "delivery_requested" | "out_for_delivery" | "delivered" | "failed" {
  const normalized = status?.trim().toLowerCase();

  switch (normalized) {
    case "scheduled":
    case "pending":
    case "en_route_to_pickup":
    case "arrived_at_pickup":
    case "pickup":
    case "pickup_complete":
      return "delivery_requested";
    case "en_route_to_dropoff":
    case "arrived_at_dropoff":
    case "dropoff":
      return "out_for_delivery";
    case "completed":
    case "delivered":
      return "delivered";
    case "failed":
    case "canceled":
    case "cancelled":
    case "returned":
      return "failed";
    default:
      return "delivery_requested";
  }
}
