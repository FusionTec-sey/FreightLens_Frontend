import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DraftReservations from './DraftReservations';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn() } }));
const row = { reservation_key: 'hold', source_version: 2, line_key: 'line', location_id: 1, product_id: 1,
  remaining_quantity: '15.000000', held_quantity: '20.000000', released_before: '5.000000', base_unit: 'PCS', review_at: '2026-10-10T08:00:00Z' };
const draft = { document_key: 'draft', lines: [{ line_key: 'line', product_name: 'Synthetic tile' }] };
let api;

test('reallocation selects fresh destination and preserves exact uncertain retry', async () => {
  api.reservations.mockResolvedValue({ data: { items: [{ ...row, branch_id: 2, document_key: 'draft' }], total: 1, pages: 1 } });
  api.list = jest.fn().mockResolvedValue({ data: { items: [{ document_key: 'target', branch_id: 2, version: 1 }], total: 1, pages: 1 } });
  api.read = jest.fn().mockResolvedValue({ data: { document_key: 'target', branch_id: 2, status: 'DRAFT', version: 4,
    lines: [{ line_key: 'target-line', product_id: 1, base_unit: 'PCS', base_quantity: '10' }] } });
  api.requestReallocation = jest.fn().mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ data: { case_key: 'move-case', version: 1, status: 'REQUESTED' } });
  render(<DraftReservations api={api} draft={draft} canRequestReallocation onClose={jest.fn()} />);
  fireEvent.click(await screen.findByText('Request reallocation'));
  expect(screen.getByText(/The reassigned quantity stays/)).toHaveTextContent('compatible stock across locations in the same store');
  fireEvent.change(screen.getByLabelText('Quantity to reallocate (PCS)'), { target: { value: '0.000001' } });
  fireEvent.change(screen.getByLabelText(/Next review/), { target: { value: '2026-12-01T10:00' } });
  fireEvent.change(screen.getByLabelText('Reallocation reason'), { target: { value: 'Customer agreement' } });
  fireEvent.click(screen.getByText('Submit reallocation review'));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a destination');
  fireEvent.click(screen.getByText('Choose destination'));
  fireEvent.click(await screen.findByText('Select Draft target'));
  fireEvent.click(await screen.findByText('Choose line target-line'));
  expect(api.read).toHaveBeenCalledWith('target', expect.any(AbortSignal));
  fireEvent.click(screen.getByText('Submit reallocation review'));
  await screen.findByText(/Request not confirmed/);
  expect(screen.getByText('Choose destination')).toBeDisabled();
  expect(screen.getByText('Back to reservations')).toBeDisabled();
  const body = api.requestReallocation.mock.calls[0][0];
  expect(body.target).toEqual({ document_key: 'target', line_key: 'target-line', version: 4 });
  expect(body.quantity).toBe('0.000001'); expect(body.review_at).toBe(new Date('2026-12-01T10:00').toISOString());
  fireEvent.click(screen.getByText('Retry same request'));
  await screen.findByText(/Stock is still reserved/);
  expect(api.requestReallocation.mock.calls[1][0]).toEqual(body);
  expect(api.requestRelease).not.toHaveBeenCalled();
});
beforeEach(() => {
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: jest.fn(() => 'operation') } });
  api = { reservations: jest.fn().mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } }),
    requestRelease: jest.fn().mockResolvedValue({ data: { case_key: 'case', version: 1, status: 'REQUESTED' } }) };
});
async function fill() {
  fireEvent.click(await screen.findByText('Request release'));
  fireEvent.change(screen.getByLabelText('Quantity to release (PCS)'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('Release reason'), { target: { value: 'Customer request' } });
}
test('submits exact current source and leaves stock reserved', async () => {
  render(<DraftReservations api={api} draft={draft} canRequest onClose={jest.fn()} />);
  await fill(); fireEvent.click(screen.getByText('Submit release review'));
  expect(await screen.findByRole('status')).toHaveTextContent('Stock is still reserved');
  expect(api.requestRelease).toHaveBeenCalledWith({ operation_key: 'operation', reservation_key: 'hold', expected_source_version: 2,
    expected_released: '5.000000', quantity: '5', reason: 'Customer request' }, expect.anything());
});
test('uncertain outcome retains same payload and disables editing and exit', async () => {
  api.requestRelease.mockRejectedValueOnce(new Error('offline'));
  render(<DraftReservations api={api} draft={draft} canRequest onClose={jest.fn()} />);
  await fill(); fireEvent.click(screen.getByText('Submit release review'));
  await screen.findByText(/Request not confirmed/);
  expect(screen.getByLabelText('Quantity to release (PCS)')).toBeDisabled();
  expect(screen.getByText('Back to reservations')).toBeDisabled();
  fireEvent.click(screen.getByText('Retry same request'));
  await screen.findByText(/Stock is still reserved/);
  expect(api.requestRelease.mock.calls[0][0]).toEqual(api.requestRelease.mock.calls[1][0]);
});
test('invalid quantities are not sent and dirty exit requires confirmation', async () => {
  render(<DraftReservations api={api} draft={draft} canRequest onClose={jest.fn()} />);
  await fill(); fireEvent.change(screen.getByLabelText('Quantity to release (PCS)'), { target: { value: '15.000001' } });
  fireEvent.click(screen.getByText('Submit release review'));
  expect(screen.getByRole('alert')).toHaveTextContent('no greater than'); expect(api.requestRelease).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Back to reservations')); expect(screen.getByText('Discard request')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Keep editing')); expect(screen.getByLabelText('Release reason')).toHaveValue('Customer request');
});
test('changed source blocks retry until refreshed', async () => {
  api.requestRelease.mockRejectedValueOnce({ response: { status: 409 } });
  render(<DraftReservations api={api} draft={draft} canRequest onClose={jest.fn()} />);
  await fill(); fireEvent.click(screen.getByText('Submit release review'));
  await screen.findByText(/Source or access changed/); expect(screen.getByText('Submit release review')).toBeDisabled();
  fireEvent.click(screen.getByText('Back to reservations'));
  await waitFor(() => expect(api.reservations).toHaveBeenCalledTimes(2));
});
test('review-only viewer has no release action; refresh clears stale rows', async () => {
  render(<DraftReservations api={api} draft={draft} canRequest={false} onClose={jest.fn()} />);
  await screen.findByText(/Synthetic tile/); expect(screen.queryByText('Request release')).not.toBeInTheDocument();
  api.reservations.mockRejectedValueOnce(new Error('denied'));
  fireEvent.click(screen.getByText('Refresh reservations')); await screen.findByRole('alert');
  expect(screen.queryByText(/Synthetic tile/)).not.toBeInTheDocument();
});
test('unmount aborts submission and ignores late success', async () => {
  let resolve; api.requestRelease.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = render(<DraftReservations api={api} draft={draft} canRequest onClose={jest.fn()} />);
  await fill(); fireEvent.click(screen.getByText('Submit release review')); view.unmount();
  expect(api.requestRelease.mock.calls[0][1].aborted).toBe(true);
  await act(async () => resolve({ data: { case_key: 'case', version: 1, status: 'REQUESTED' } }));
});

test('follow-up request submits exact schedule version and explicit timezone without release quantity', async () => {
  api.reservations.mockResolvedValue({ data: { items: [{ ...row, deadline_version: 3, review_due: true }], total: 1, pages: 1 } });
  api.requestDeadline = jest.fn().mockResolvedValue({ data: { case_key: 'deadline', version: 1, status: 'REQUESTED' } });
  render(<DraftReservations api={api} draft={draft} canRequest={false} canRequestDeadline onClose={jest.fn()} />);
  expect(await screen.findByText('Follow-up due — still held')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Request follow-up'));
  fireEvent.change(screen.getByLabelText(/Next review/), { target: { value: '2026-12-01T10:00' } });
  fireEvent.change(screen.getByLabelText('Agreed follow-up reason'), { target: { value: 'Customer agreed Tuesday' } });
  fireEvent.click(screen.getByText('Submit follow-up review')); await screen.findByText(/Stock is still reserved/);
  const body = api.requestDeadline.mock.calls[0][0];
  expect(body.expected_deadline_version).toBe(3); expect(body.next_review_at).toBe(new Date('2026-12-01T10:00').toISOString());
  expect(body.quantity).toBeUndefined(); expect(api.requestRelease).not.toHaveBeenCalled();
});

test('due inbox reuses paginated list, labels stores, and opens the authoritative draft', async () => {
  api.dueReservations = jest.fn().mockResolvedValue({ data: { items: [{ ...row, document_key: 'draft', product_name: 'Demo tile', branch_name: 'Demo store', location_name: 'Demo shelf', review_due: true }], total: 30, pages: 2 } });
  const open = jest.fn().mockResolvedValue(true);
  render(<DraftReservations api={api} dueInbox onOpenDraft={open} onClose={jest.fn()} />);
  await screen.findByText('Demo store'); expect(api.reservations).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTitle('Next Page'));
  await waitFor(() => expect(api.dueReservations).toHaveBeenLastCalledWith(2, 25, expect.anything()));
  fireEvent.click(await screen.findByText('Open draft'));
  await waitFor(() => expect(open).toHaveBeenCalledWith(expect.objectContaining({ document_key: 'draft' })));
});

test('due inbox cannot silently open an inaccessible draft', async () => {
  api.dueReservations = jest.fn().mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } });
  render(<DraftReservations api={api} dueInbox onOpenDraft={jest.fn().mockRejectedValue(new Error('denied'))} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByText('Open draft'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Draft could not be opened');
});
