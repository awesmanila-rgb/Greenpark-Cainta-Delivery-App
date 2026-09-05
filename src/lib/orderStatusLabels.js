// Centralized so notification text stays consistent with what each
// role's own screen calls a given status. Written from the customer's
// point of view by default; call sites needing a different framing
// (merchant/rider) can still keep their own map — this one is what
// notifications use for all roles' toast/history text since it's
// meant to be read by whoever the change affects.

export const ORDER_STATUS_LABELS = {
  placed: 'Order placed',
  merchant_accepted: 'Merchant accepted the order',
  awaiting_payment_confirmation: 'Waiting for GCash payment confirmation',
  payment_confirmed: 'Payment confirmed',
  ready_for_pickup: 'Ready for pickup',
  rider_assigned: 'A rider was assigned',
  picked_up: 'Rider picked up the order',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  rider_settled: 'Delivered',
  cancelled: 'Order cancelled',
  payment_issue: 'Payment issue flagged',
}
