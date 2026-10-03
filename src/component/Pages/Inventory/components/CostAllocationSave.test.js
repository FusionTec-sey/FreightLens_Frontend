import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CostAllocationSave from './CostAllocationSave';
jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));
beforeEach(() => Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: jest.fn(() => 'stable-key') } }));
test('failed save retains exact evidence and operation key for retry', async () => {
  const api = { saveCostAllocation: jest.fn().mockRejectedValueOnce({ response: { data: { detail: 'Temporary failure' } } })
    .mockResolvedValue({ data: { proposal_key: 'saved-key' } }) };
  render(<CostAllocationSave api={api} poolId={2} ids={[4, 3]} result={{ total_scr: '0.000001', basis: 'GOODS_VALUE' }} onBusy={jest.fn()} onDirty={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Charge reference'), { target: { value: 'FREIGHT-1' } });
  fireEvent.change(screen.getByLabelText('Allocation reason'), { target: { value: 'Declared freight' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save unposted proposal' }));
  await screen.findByText('Temporary failure');
  const body = api.saveCostAllocation.mock.calls[0][1];
  expect(body).toEqual({ operation_key: 'stable-key', valuation_ids: [3, 4], total_scr: '0.000001', basis: 'GOODS_VALUE', charge_reference: 'FREIGHT-1', reason: 'Declared freight' });
  fireEvent.click(screen.getByRole('button', { name: 'Save unposted proposal' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('saved-key'));
  expect(api.saveCostAllocation.mock.calls[1][1]).toEqual(body);
});
