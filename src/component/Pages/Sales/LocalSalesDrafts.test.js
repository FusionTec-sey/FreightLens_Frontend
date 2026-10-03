import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LocalSalesDrafts from './LocalSalesDrafts';
import { writeRecovery } from '../../../services/salesDraftRecovery';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: true }) }));
const snapshot = { expected_version: 0, draft: { customer_key: null, branch_id: 2, lines: [] }, units: [] };
beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window.navigator, 'locks', { configurable: true, value: { request: (name, work) => Promise.resolve().then(work) } });
});
test('company/user and selected store constrain recovery choices', async () => {
  await writeRecovery('1:7', 'local', 0, snapshot);
  await writeRecovery('2:7', 'foreign', 0, snapshot);
  await writeRecovery('1:8', 'other-user', 0, snapshot);
  const recover = jest.fn(); render(<LocalSalesDrafts orgId={1} userId={7} onRecover={recover} onClose={jest.fn()} />);
  expect(screen.getByText('local')).toBeInTheDocument(); expect(screen.queryByText('foreign')).not.toBeInTheDocument();
  expect(screen.queryByText('other-user')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Selling store'), { target: { value: '2' } });
  fireEvent.click(screen.getByText('Recover draft')); expect(recover.mock.calls[0][0].key).toBe('local');
});
test('list refresh is required after another tab changes the record', async () => {
  await writeRecovery('1:7', 'local', 0, snapshot);
  const recover = jest.fn(); render(<LocalSalesDrafts orgId={1} userId={7} onRecover={recover} onClose={jest.fn()} />);
  await writeRecovery('1:7', 'local', 1, snapshot);
  fireEvent.click(screen.getByText('Recover draft')); expect(screen.getByRole('alert')).toHaveTextContent('another tab');
  expect(recover).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Refresh local drafts')); fireEvent.click(screen.getByText('Recover draft'));
  expect(recover.mock.calls[0][0].revision).toBe(2);
});
