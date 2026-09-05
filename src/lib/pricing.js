// Mirrors the defaults set in supabase/schema.sql. If you change the
// numbers there, change them here too — the schema stores the
// per-rider COD cap; these are the customer-facing pricing rules.

export const DELIVERY_FEES = {
  walk: 15,
  bicycle_motorcycle: 25,
}

export const COD_SURCHARGE = 15
export const COD_MAX_ORDER_VALUE = 750 // matches riders.max_cod_order_value default

export function calcTotals({ subtotal, deliveryMode, paymentMethod }) {
  const deliveryFee = DELIVERY_FEES[deliveryMode] ?? 0
  const codSurcharge = paymentMethod === 'cod' ? COD_SURCHARGE : 0
  const total = subtotal + deliveryFee + codSurcharge
  return { deliveryFee, codSurcharge, total }
}

export function isCodAllowed(subtotal) {
  return subtotal <= COD_MAX_ORDER_VALUE
}
