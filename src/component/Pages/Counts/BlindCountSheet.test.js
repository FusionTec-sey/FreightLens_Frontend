import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BlindCountSheet from './BlindCountSheet';
jest.mock('react-toastify', () => ({ toast: { success: jest.fn() } }));
jest.mock('../../../hooks/useOperationIntent', () => () => ({ payloadFor: (_, body) => ({ ...body, operation_key: 'synthetic-operation' }) }));
const session = { session_key: 'synthetic-round', round: 1 };
const sheet = { ...session, state: 'ASSIGNED', lines: [{ product_id: 1, location_id: 2, base_unit: 'PCS', units: ['PCS'], quantity_step: '1', entered: false }] };

test('uncertain save freezes input and navigation and replays the identical request', async () => {
  const api = { sheet: jest.fn().mockResolvedValue({ data: sheet }), saveEntries: jest.fn().mockRejectedValue(new Error('offline')) };
  render(<BlindCountSheet api={api} session={session} onClose={jest.fn()} onSubmitted={jest.fn()} />);
  const input = await screen.findByLabelText('Counted quantity');
  fireEvent.change(input, { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save counted lines' }));
  await screen.findByText(/Save outcome is unconfirmed/);
  expect(input).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Back to rounds' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry same save' }));
  await waitFor(() => expect(api.saveEntries).toHaveBeenCalledTimes(2));
  expect(api.saveEntries.mock.calls[1][1]).toEqual(api.saveEntries.mock.calls[0][1]);
});

test('confirmed save with failed reload retries only the sheet read', async () => {
  const api = { sheet: jest.fn().mockResolvedValueOnce({ data: sheet }).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { ...sheet, lines: [{ ...sheet.lines[0], entered: true }] } }),
    saveEntries: jest.fn().mockResolvedValue({ data: { ...session, state: 'IN_PROGRESS', entered_lines: 1 } }) };
  render(<BlindCountSheet api={api} session={session} onClose={jest.fn()} onSubmitted={jest.fn()} />);
  fireEvent.change(await screen.findByLabelText('Counted quantity'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save counted lines' }));
  await screen.findByText(/sheet could not refresh/);
  expect(screen.getByLabelText('Counted quantity')).toHaveValue('2');
  fireEvent.click(screen.getByRole('button', { name: 'Retry sheet refresh' }));
  await screen.findByText('Counted on this round');
  expect(api.saveEntries).toHaveBeenCalledTimes(1);
});
