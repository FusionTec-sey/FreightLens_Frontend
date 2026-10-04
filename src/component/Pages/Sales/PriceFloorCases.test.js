import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PriceFloorCases from './PriceFloorCases';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));

const row = { case_key: 'case-1', version: 1, status: 'REQUESTED', document_key: 'draft-1',
  draft_version: 3, currency: 'SCR', gross_total_scr: '2200.00', floor_line_count: 1,
  pricing_fingerprint: 'a'.repeat(64), reason: 'Signed price is below floor',
  requestor_id: 1, reviewer_id: null, review_reason: null, requested_at: '2026-10-04T10:00:00Z' };

test('manager reviews an exact pricing fingerprint without exposing a posting action', async () => {
  const api = { floorCases: jest.fn().mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } }),
    reviewFloorCase: jest.fn().mockResolvedValue({ data: { case_key: 'case-1', version: 2, status: 'APPROVED' } }) };
  render(<PriceFloorCases api={api} userId={2} canReview />);
  expect(await screen.findByText('SCR 2200.00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review' }));
  expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
  expect(screen.getByText(/does not post an invoice/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Decision reason'), { target: { value: 'Approved signed customer terms' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
  await waitFor(() => expect(api.reviewFloorCase).toHaveBeenCalledTimes(1));
  expect(api.reviewFloorCase.mock.calls[0][1]).toMatchObject({ expected_version: 1,
    outcome: 'APPROVED', reason: 'Approved signed customer terms' });
  expect(await screen.findByText(/No sale or payment was posted/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /post|invoice|payment/i })).not.toBeInTheDocument();
});

test('requestor cannot see a self-review action', async () => {
  const api = { floorCases: jest.fn().mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } }) };
  render(<PriceFloorCases api={api} userId={1} canReview />);
  await screen.findByText('SCR 2200.00');
  expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
});
