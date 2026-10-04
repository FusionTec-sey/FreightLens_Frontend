import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomerProfileHistory from './CustomerProfileHistory';
import CustomerDuplicateDetails from './CustomerDuplicateDetails';
import CustomerDuplicateRequest from './CustomerDuplicateRequest';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('../../../hooks/useOperationIntent', () => () => ({
  payloadFor: jest.fn((scope, payload) => ({ operation_key: 'operation-1', ...payload })),
}));
jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));

const profile = (key, version, name) => ({ customer_key: key, version, name,
  kind: 'PERSON', contacts: [{ kind: 'PHONE', value: '2000000', label: '', primary: true }] });

test('history renders exact revisions and clears stale data on failed refresh', async () => {
  const row = { ...profile('one', 2, 'Updated Customer'), reason: 'Corrected phone',
    created_by: 7, created_at: '2026-10-04T08:00:00Z' };
  const api = { history: jest.fn().mockResolvedValueOnce({ data: { items: [row], total: 2, pages: 1 } })
    .mockRejectedValueOnce(new Error('offline')) };
  render(<CustomerProfileHistory api={api} customerKey="one" onClose={jest.fn()} />);
  expect(await screen.findByText(/Version 2.*Updated Customer/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }));
  await screen.findByRole('alert');
  expect(screen.queryByText(/Updated Customer/)).not.toBeInTheDocument();
});

test('duplicate decision waits for both exact historical profiles', async () => {
  let resolveSecond;
  const api = { readVersion: jest.fn()
    .mockResolvedValueOnce({ data: profile('one', 2, 'One') })
    .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve; })) };
  const ready = jest.fn();
  render(<CustomerDuplicateDetails api={api} item={{ assessment: 'SAME_CUSTOMER',
    customers: [{ customer_key: 'one', version: 2 }, { customer_key: 'two', version: 1 }] }} onReady={ready} />);
  await screen.findByText('Loading exact profile versions…');
  expect(ready).toHaveBeenLastCalledWith(false);
  await act(async () => resolveSecond({ data: profile('two', 1, 'Two') }));
  expect(await screen.findByText(/One.*Version 2/)).toBeInTheDocument();
  expect(screen.getByText(/No records, contacts, sales references or balances are merged/)).toBeInTheDocument();
  expect(ready).toHaveBeenLastCalledWith(true);
});

test('profile mismatch blocks duplicate review readiness', async () => {
  const api = { readVersion: jest.fn()
    .mockResolvedValueOnce({ data: profile('wrong', 1, 'Wrong') })
    .mockResolvedValueOnce({ data: profile('two', 1, 'Two') }) };
  const ready = jest.fn();
  render(<CustomerDuplicateDetails api={api} item={{ assessment: 'DISTINCT_CUSTOMERS',
    customers: [{ customer_key: 'one', version: 1 }, { customer_key: 'two', version: 1 }] }} onReady={ready} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Exact reviewed profiles could not be loaded');
  expect(ready).not.toHaveBeenCalledWith(true);
});

test('uncertain duplicate request retries the same stable intent', async () => {
  const first = { orgId: 9, customerKey: 'one', version: 2, profile: profile('one', 2, 'One') };
  const second = { orgId: 9, customerKey: 'two', version: 1, profile: profile('two', 1, 'Two') };
  const api = { requestDuplicate: jest.fn().mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({ data: { case_key: 'operation-1', version: 1, status: 'REQUESTED' } }) };
  const saved = jest.fn();
  let pick = 0;
  const renderPicker = select => <button type="button" onClick={() => select(pick++ === 0 ? first : second)}>Pick customer</button>;
  render(<CustomerDuplicateRequest api={api} orgId={9} renderPicker={renderPicker}
    onClose={jest.fn()} onSaved={saved} />);
  fireEvent.click(screen.getByRole('button', { name: 'Choose customer 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pick customer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose customer 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pick customer' }));
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Possible duplicate' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request independent review' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Outcome unknown');
  fireEvent.click(screen.getByRole('button', { name: 'Retry same request' }));
  await act(async () => {});
  expect(api.requestDuplicate).toHaveBeenCalledTimes(2);
  expect(api.requestDuplicate.mock.calls[0][0]).toEqual(api.requestDuplicate.mock.calls[1][0]);
  expect(saved).toHaveBeenCalledWith({ case_key: 'operation-1', version: 1, status: 'REQUESTED' });
});
