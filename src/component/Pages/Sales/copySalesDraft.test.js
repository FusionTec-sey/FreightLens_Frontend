import { copySalesDraft } from './copySalesDraft';

test('copy creates new document and line identities from demand fields only', () => {
  const ids = ['new-document', 'new-line'];
  const source = { document_key: 'old-document', version: 3, status: 'DRAFT',
    customer_key: 'customer', expected_customer_version: 2, branch_id: 4,
    payment: { amount: '42' }, approvals: ['case'], collection_status: 'COLLECTED',
    lines: [{ line_key: 'old-line', product_id: 5, expected_policy_version: 7,
      quantity: '2', unit: 'BOX', base_unit: 'PCS', units: ['BOX', 'PCS'],
      reserved_quantity: '24', payment_amount: '42', approval_case: 'case' }] };
  const copied = copySalesDraft(source, () => ids.shift());
  expect(copied).toMatchObject({ document_key: 'new-document', version: 0,
    source_reference: { document_key: 'old-document', version: 3 },
    lines: [{ line_key: 'new-line', product_id: 5, quantity: '2', unit: 'BOX' }] });
  expect(JSON.stringify(copied)).not.toMatch(/old-line|reserved_quantity|payment|approval|collection/);
  expect(source.lines[0].line_key).toBe('old-line');
});

test('copy rejects anything other than a readable saved draft', () => {
  expect(() => copySalesDraft({ document_key: 'x', version: 2, status: 'PAID', lines: [] }, () => 'new')).toThrow('saved draft');
});
