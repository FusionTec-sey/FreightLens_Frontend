import { nudgeSalesQuantity, salesQuantityError } from './salesQuantity';

test.each(['0.000001', '999999999999.999999', '00001.250000'])('accepts exact quantity %s', value => {
  expect(salesQuantityError(value)).toBeNull();
});
test.each(['', '0', '0.000000', '-1', '1e2', '1,25', '1.', '1000000000000', '1.0000001', null, 2])('rejects invalid quantity %p without coercion', value => {
  expect(salesQuantityError(value)).not.toBeNull();
});

test.each([
  ['1', 1, '2'], ['2', -1, '1'], ['0.000001', 1, '1.000001'],
  ['1.000001', -1, '0.000001'], ['2.500000', -1, '1.5'],
  ['999999999998.999999', 1, '999999999999.999999'],
  ['999999999999.999999', 1, null], ['1', -1, null], ['0.5', -1, null],
  ['', 1, null], ['0', 1, null], ['1e2', 1, null], ['1.0000001', 1, null],
  [1, 1, null], ['1', 2, null],
])('exact selected-unit nudge %p by %p', (value, direction, expected) => {
  expect(nudgeSalesQuantity(value, direction)).toBe(expected);
});
