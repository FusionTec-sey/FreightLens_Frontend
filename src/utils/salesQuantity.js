/* global BigInt */
// UI nudges only. Server unit-policy validation remains authoritative.
const scale = BigInt(1000000);
const maximum = BigInt('999999999999999999');
export function salesQuantityError(value) {
  if (typeof value !== 'string' || !/^\d{1,12}(?:\.\d{1,6})?$/.test(value)) {
    return 'Enter a decimal quantity with up to 12 whole digits and 6 decimal places.';
  }
  return /[1-9]/.test(value) ? null : 'Quantity must be greater than zero.';
}
export function nudgeSalesQuantity(value, direction) {
  if (salesQuantityError(value) ||
      (direction !== 1 && direction !== -1)) return null;
  const [whole, fraction = ''] = value.split('.');
  const current = BigInt(whole) * scale + BigInt(fraction.padEnd(6, '0'));
  if (current <= BigInt(0)) return null;
  const next = current + BigInt(direction) * scale;
  if (next <= BigInt(0) || next > maximum) return null;
  const decimals = (next % scale).toString().padStart(6, '0').replace(/0+$/, '');
  return `${next / scale}${decimals ? `.${decimals}` : ''}`;
}
