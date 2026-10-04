import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManifestBrowser } from './ReceiptManifestPanel';

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../services/receiptManifestsApi', () => ({ receiptManifestsApi: jest.fn() }));
jest.mock('../../../services/inventoryLocationsApi', () => ({
  inventoryLocationsApi: jest.fn(),
  locationError: error => ({ message: error?.message || 'Request failed.' }),
}));

const key = '60f33b56-f1eb-488d-904c-cdbe4adc7b18';
const summary = {
  manifest_key: key,
  receipt_id: 41,
  receipt_item_id: 42,
  product_id: 7,
  branch_id: 2,
  location_id: 5,
};
const detail = {
  ...summary,
  historical_snapshot: true,
  physical_posting_enabled: false,
  source: {
    policy_version: 3,
    policy: { tracking: 'BATCH' },
    base_unit: 'PCS',
  },
  manifest: {
    reason: 'Received with two damaged pieces.',
    batches: [{
      identity: { batch_key: 'b98a5d8e-1b77-45db-a502-020226fa3ac4', code: 'LOT-01' },
      on_hand: '10.000000',
      damaged: '2.000000',
      quarantined: '2.000000',
    }],
    serials: { items: [] },
  },
  quantities: {
    on_hand: '10.000000',
    damaged: '2.000000',
    quarantined: '2.000000',
    available: '8.000000',
  },
  condition_review_required: true,
};

function makeApi() {
  return {
    list: jest.fn().mockResolvedValue({ data: { items: [summary], page: 1, limit: 10, pages: 1, total: 1 } }),
    read: jest.fn().mockResolvedValue({ data: detail }),
    cases: jest.fn().mockResolvedValue({ data: { items: [], page: 1, limit: 10, pages: 1, total: 0 } }),
    requestReview: jest.fn(),
    review: jest.fn(),
  };
}

beforeEach(() => Object.defineProperty(window, 'crypto', { configurable: true,
  value: { randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111') } }));

test('loads only after explicit open and exposes read-only saved status', async () => {
  const api = makeApi();
  render(<ManifestBrowser token="token" orgId={1} receiptId={41} suppliedApi={api} />);
  expect(api.list).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Inspect physical manifests' }));
  expect(await screen.findByText(/Product 7/)).toBeInTheDocument();
  expect(api.list).toHaveBeenCalledWith(41, 1, 10, expect.any(AbortSignal));
  expect(screen.getByText(/Saved—not posted/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /save|post|approve/i })).not.toBeInTheDocument();
});

test('shows exact historical detail and never presents it as current approval', async () => {
  const api = makeApi();
  render(<ManifestBrowser token="token" orgId={1} receiptId={41} suppliedApi={api} isDark />);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect physical manifests' }));
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(key) }));

  expect(await screen.findByText('Historical policy v3 · BATCH')).toBeInTheDocument();
  expect(screen.getByText('10.000000 PCS')).toBeInTheDocument();
  expect(screen.getByText(/not a current approval status/i)).toBeInTheDocument();
  expect(screen.getByText(/LOT-01/)).toHaveTextContent('2.000000 damaged');
});

test('rejects mismatched detail and clears the previous list', async () => {
  const api = makeApi();
  api.read.mockResolvedValue({ data: { ...detail, receipt_id: 99 } });
  render(<ManifestBrowser token="token" orgId={1} receiptId={41} suppliedApi={api} />);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect physical manifests' }));
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(key) }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Unexpected manifest response');
  expect(screen.queryByText(/Product 7/)).not.toBeInTheDocument();
  expect(screen.queryByText('10.000000 PCS')).not.toBeInTheDocument();
});

test('aborts obsolete receipt reads and ignores their late results', async () => {
  let resolveFirst;
  const api = makeApi();
  api.list
    .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
    .mockResolvedValueOnce({ data: { items: [], page: 1, limit: 10, pages: 1, total: 0 } });
  const view = render(<ManifestBrowser token="token" orgId={1} receiptId={41} suppliedApi={api} />);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect physical manifests' }));
  const firstSignal = api.list.mock.calls[0][3];

  view.rerender(<ManifestBrowser token="token" orgId={1} receiptId={52} suppliedApi={api} />);
  expect(firstSignal.aborted).toBe(true);
  expect(await screen.findByText('No saved physical manifests on this page.')).toBeInTheDocument();

  await act(async () => resolveFirst({ data: { items: [summary], page: 1, limit: 10, pages: 1, total: 1 } }));
  expect(screen.queryByText(/Product 7/)).not.toBeInTheDocument();
});

test('retains a failed review request and retries with the same operation identity', async () => {
  const api = makeApi();
  api.requestReview.mockRejectedValueOnce(new Error('Connection uncertain')).mockResolvedValueOnce({ data: {
    case_key: '22222222-2222-4222-8222-222222222222', status: 'REQUESTED', version: 1, replayed: true,
  } });
  render(<ManifestBrowser token="token" orgId={1} receiptId={41} suppliedApi={api} userId={10} canRequest />);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect physical manifests' }));
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(key) }));
  const input = await screen.findByLabelText('Review request reason');
  fireEvent.change(input, { target: { value: 'Inspect condition classification' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request classification review' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection uncertain');
  expect(input).toHaveValue('Inspect condition classification');
  expect(screen.getByRole('button', { name: 'Hide physical manifests' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Request classification review' }));
  expect(await screen.findByText(/Review requested:/)).toBeInTheDocument();
  expect(api.requestReview.mock.calls[0][1].operation_key).toBe(api.requestReview.mock.calls[1][1].operation_key);
  expect(api.requestReview.mock.calls[1][2]).toEqual(expect.any(AbortSignal));
});

test('allows an independent manager decision without presenting a posting action', async () => {
  const api = makeApi(); const caseKey = '33333333-3333-4333-8333-333333333333';
  api.cases.mockResolvedValue({ data: { items: [{ case_key: caseKey, manifest_key: key, version: 1,
    status: 'REQUESTED', requestor_id: 99, reason: 'Review batch conditions' }], page: 1, limit: 10, pages: 1, total: 1 } });
  api.review.mockResolvedValue({ data: { case_key: caseKey, status: 'APPROVED', version: 2, replayed: false } });
  render(<ManifestBrowser token="token" orgId={1} receiptId={41} suppliedApi={api} userId={10} canReview />);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect physical manifests' }));
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(key) }));
  fireEvent.click(await screen.findByRole('button', { name: 'Approve classification' }));
  fireEvent.change(screen.getByLabelText('Decision reason'), { target: { value: 'Classification inspected' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm approved' }));
  expect(await screen.findByText(/No stock or value was posted/)).toBeInTheDocument();
  expect(api.review).toHaveBeenCalledWith(key, caseKey, expect.objectContaining({
    expected_version: 1, outcome: 'APPROVED', reason: 'Classification inspected',
  }), expect.any(AbortSignal));
  expect(screen.queryByRole('button', { name: /post stock|receive stock|post value/i })).not.toBeInTheDocument();
});
