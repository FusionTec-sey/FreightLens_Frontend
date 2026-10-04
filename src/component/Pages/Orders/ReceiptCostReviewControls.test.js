import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReceiptCostReviewControls from './ReceiptCostReviewControls';

const manifestKey = '60f33b56-f1eb-488d-904c-cdbe4adc7b18';
let api;
beforeEach(() => {
  let next = 0;
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => `11111111-1111-4111-8111-${String(++next).padStart(12, '0')}` } });
  api = {
    evidenceDocuments: jest.fn().mockResolvedValue({ data: { items: [{ id: 'doc-1', label: 'PO-14.pdf', doc_type: 'PO' }, { id: 'fx-1', label: 'Bank-rate.pdf', doc_type: 'GENERAL' }], pages: 1 } }),
    costCases: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }),
    requestCostReview: jest.fn().mockRejectedValueOnce(new Error('Connection uncertain')).mockResolvedValue({ data: { case_key: 'case-1' } }),
    reviewCost: jest.fn(), costDocument: jest.fn(),
  };
});

test('retains an exact foreign-currency declaration and retry operation identity after uncertain save', async () => {
  render(<ReceiptCostReviewControls api={api} manifestKey={manifestKey} userId={4} canRequest />);
  await screen.findByRole('option', { name: 'PO-14.pdf · PO' });
  fireEvent.change(screen.getByLabelText('Source currency'), { target: { value: 'USD' } });
  fireEvent.change(screen.getByLabelText('Unit price in source currency'), { target: { value: '12.345600' } });
  fireEvent.change(screen.getByLabelText('SCR per source-currency unit'), { target: { value: '14.12345678' } });
  fireEvent.change(screen.getByLabelText('Price evidence document'), { target: { value: 'doc-1' } });
  fireEvent.change(screen.getByLabelText('Exchange-rate evidence document'), { target: { value: 'fx-1' } });
  fireEvent.change(screen.getByLabelText('Cost justification'), { target: { value: 'Reviewed supplier price' } });
  fireEvent.change(screen.getByLabelText('Cost review request reason'), { target: { value: 'Confirm invoice and rate' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request receipt cost review' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection uncertain');
  expect(screen.getByLabelText('Unit price in source currency')).toHaveValue('12.345600');
  fireEvent.click(screen.getByRole('button', { name: 'Request receipt cost review' }));
  expect(await screen.findByText('Receipt cost review requested: case-1')).toBeInTheDocument();
  expect(api.requestCostReview).toHaveBeenCalledTimes(2);
  expect(api.requestCostReview.mock.calls[1][1]).toEqual(api.requestCostReview.mock.calls[0][1]);
  expect(api.requestCostReview.mock.calls[0][1].declaration).toEqual(expect.objectContaining({
    source_currency: 'USD', unit_price_source: '12.345600', exchange_rate_to_scr: '14.12345678',
    document_id: 'doc-1', fx_document_id: 'fx-1',
  }));
});

test('binds a manager decision to the listed version and exposes no posting action', async () => {
  api.costCases.mockResolvedValue({ data: { items: [{ case_key: 'case-2', manifest_key: manifestKey, version: 3,
    status: 'REQUESTED', requestor_id: 99, receipt_quantity: '4.000000', goods_value_scr: '200.000000',
    declaration: { source_currency: 'SCR', unit_price_source: '50.000000', exchange_rate_to_scr: '1.00000000', justification: 'Invoice price' },
    documents: [{ id: 'doc-1', label: 'PO-14.pdf', doc_type: 'PO' }] }], total: 1, pages: 1 } });
  api.reviewCost.mockResolvedValue({ data: { case_key: 'case-2', status: 'APPROVED' } });
  render(<ReceiptCostReviewControls api={api} manifestKey={manifestKey} userId={4} canReview />);
  fireEvent.click(await screen.findByRole('button', { name: 'Approve cost evidence' }));
  expect(screen.getByText(/version 3/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Cost decision reason'), { target: { value: 'Documents inspected' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cost approved' }));
  await waitFor(() => expect(api.reviewCost).toHaveBeenCalledWith(manifestKey, 'case-2', expect.objectContaining({
    expected_version: 3, outcome: 'APPROVED', reason: 'Documents inspected',
  }), expect.any(AbortSignal)));
  expect(await screen.findByText(/No stock or value was posted/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /post stock|post value|receive stock/i })).not.toBeInTheDocument();
});
