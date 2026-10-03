import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CostChargeEvidence from './CostChargeEvidence';
jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));
jest.mock('../../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
let api;
const proposal = { proposal_key: 'proposal', charge_reference: 'CHARGE', total_scr: '12.340000' };
beforeEach(() => {
  let next = 0;
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => `intent-${++next}` } });
  api = {
    evidenceSuppliers: jest.fn().mockResolvedValue({ data: { items: [{ id: 3, label: 'Supplier' }], pages: 1, total: 1 } }),
    evidenceDocuments: jest.fn().mockResolvedValue({ data: { items: [{ id: 'document', label: 'Invoice.pdf' }], pages: 1, total: 1 } }),
    requestChargeEvidence: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { case_key: 'saved' } }),
    chargeEvidenceCases: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }),
  };
});
const setup = props => render(<CostChargeEvidence api={api} pool={{ id: 2 }} proposal={proposal} userId={4} canManage onClose={jest.fn()} {...props} />);
async function fill() {
  fireEvent.click(screen.getByRole('button', { name: 'Choose supplier' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Select Supplier' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose invoice document' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Select Invoice.pdf' }));
  for (const [label, value] of [['Invoice reference', 'INV-1'], ['Invoice date', '2026-10-03'], ['Eligible amount in source currency', '12.340000'], ['Why this expense belongs in inventory cost', 'Freight'], ['Review request reason', 'Inspect invoice']]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}
test('failed save keeps exact amounts and retry identity, and requires explicit discard', async () => {
  setup(); await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Request evidence review' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Eligible amount in source currency')).toHaveValue('12.340000');
  fireEvent.click(screen.getByRole('button', { name: 'View evidence reviews' }));
  expect(screen.getByRole('button', { name: 'Request evidence review' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Request evidence review' }));
  await screen.findByText('Evidence review requested: saved');
  expect(api.requestChargeEvidence).toHaveBeenCalledTimes(2);
  const body = api.requestChargeEvidence.mock.calls[0][2];
  expect(api.requestChargeEvidence.mock.calls[1][2]).toEqual(body);
  expect(body.declaration.eligible_amount).toBe('12.340000');
  expect(body.declaration.supplier_id).toBe(3);
  fireEvent.click(screen.getByRole('button', { name: 'View evidence reviews' }));
  await waitFor(() => expect(api.chargeEvidenceCases).toHaveBeenCalledWith(2, 'proposal', 1, 25, expect.any(AbortSignal), 'ALL'));
});
test('foreign currency requires explicit rate document and never guesses conversion', async () => {
  setup(); await fill();
  fireEvent.change(screen.getByLabelText('Source currency (3 letters)'), { target: { value: 'USD' } });
  expect(screen.getByRole('button', { name: 'Request evidence review' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Choose exchange-rate document' })).toBeInTheDocument();
  expect(api.requestChargeEvidence).not.toHaveBeenCalled();
});
test('readonly access exposes existing reviews without request controls', async () => {
  setup({ canManage: false });
  expect(screen.queryByRole('button', { name: 'Choose supplier' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Request evidence review' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View evidence reviews' }));
  await screen.findByText('No charge evidence review cases.');
});
