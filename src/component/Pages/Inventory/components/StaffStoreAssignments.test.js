import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StaffStoreAssignments from './StaffStoreAssignments';
jest.mock('../../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));
const row = { user_id: 7, username: 'Synthetic salesperson', version: 0, config: null, branch_name: null };
const props = { branch: { id: 2, name: 'Demo store' }, canManage: true, onClose: jest.fn() };
const apiFor = () => ({ staffAssignments: jest.fn().mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } }),
  saveStaffAssignment: jest.fn().mockResolvedValue({ data: { user_id: 7, version: 1, config: { branch_id: 2 } } }) });
beforeEach(() => Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111') } }));

test('view-only users can inspect but cannot assign', async () => {
  const api = apiFor(); render(<StaffStoreAssignments {...props} canManage={false} api={api} />);
  await screen.findByRole('cell', { name: row.username });
  expect(screen.queryByRole('button', { name: /Edit assignment/ })).not.toBeInTheDocument();
  expect(api.staffAssignments).toHaveBeenCalledWith(2, 1, 25, expect.any(AbortSignal));
});

test('assignment can be enabled without a usual counter', async () => {
  const api = apiFor(); render(<StaffStoreAssignments {...props} api={api} />);
  fireEvent.click(await screen.findByRole('button', { name: `Edit assignment ${row.username}` }));
  fireEvent.click(screen.getByLabelText('Enable working-store assignment'));
  fireEvent.click(screen.getByRole('button', { name: 'Save assignment' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Assignment saved');
  expect(api.saveStaffAssignment.mock.calls[0][2]).toEqual(expect.objectContaining({ expected_version: 0,
    config: { branch_id: 2, counter_id: null, is_enabled: true } }));
});

test('uncertain save locks edits and retries identical operation', async () => {
  const api = apiFor(); api.saveStaffAssignment.mockRejectedValueOnce(new Error('Network'));
  render(<StaffStoreAssignments {...props} api={api} />);
  fireEvent.click(await screen.findByRole('button', { name: `Edit assignment ${row.username}` }));
  fireEvent.click(screen.getByRole('button', { name: 'Save assignment' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Enable working-store assignment')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel edit' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry identical save' }));
  await waitFor(() => expect(api.saveStaffAssignment).toHaveBeenCalledTimes(2));
  expect(api.saveStaffAssignment.mock.calls[1][2]).toEqual(api.saveStaffAssignment.mock.calls[0][2]);
});

test('failed refresh clears staff rows and does not show stale names', async () => {
  const api = apiFor(); render(<StaffStoreAssignments {...props} api={api} />);
  await screen.findByRole('cell', { name: row.username });
  api.staffAssignments.mockRejectedValue({ response: { status: 403, data: { detail: 'Access revoked' } } });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh assignments' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Access revoked');
  expect(screen.queryByText(row.username)).not.toBeInTheDocument();
});
