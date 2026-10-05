import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SalesCollectionPanel from './SalesCollectionPanel';

const options = {
  invoice_key: 'invoice-key', invoice_number: 'INV-1', payment_status: 'PAID',
  fulfilment_status: 'AWAITING_COLLECTION', branch_id: 4,
  branch_settings_version: 2, assignment_version: 3,
  counters: [{ counter_key: 'counter-key', code: 'COL', name: 'Collection desk', version: 5 }],
  lines: [{ line_key: 'line-key', product_id: 9, product_name: 'Tile', sku: 'T-1', base_quantity: '4.000000', collected: '0.000000', remaining: '4.000000', base_unit: 'piece' }],
  reservations: [{ line_key: 'line-key', reservation_key: 'reservation-key', branch_id: 4,
    balance_id: 8, location_id: 6, location_code: 'A-01', location_name: 'Main floor',
    tracking_policy: 'UNTRACKED', batch_key: null, batch_code: null, shade: null,
    calibre: null, base_unit: 'piece', quantity: '4.000000', collected: '0.000000',
    remaining: '4.000000', stock_version: 7 }],
};

function client() {
  return {
    collectionOptions: jest.fn().mockResolvedValue({ data: options }),
    invoiceCollections: jest.fn().mockResolvedValue({ data: [] }),
    createCollection: jest.fn().mockResolvedValue({ data: { replayed: false, collection: {
      collection_key: 'collection-key', fulfilment_status: 'PARTIALLY_COLLECTED',
      allocations: [{ quantity: '2.000000' }],
    } } }),
  };
}

test('records an explicit partial handover and keeps payment separate', async () => {
  const api = client();
  render(<SalesCollectionPanel api={api} invoice={{ invoice_key: 'invoice-key', invoice_number: 'INV-1' }} customerName="Sample customer" onClose={jest.fn()} />);

  expect(await screen.findByText('Main floor · A-01')).toBeInTheDocument();
  expect(screen.getByText('PAID')).toBeInTheDocument();
  expect(screen.getByText('AWAITING COLLECTION')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Collector name'), { target: { value: 'Jane Collector' } });
  fireEvent.change(screen.getByLabelText('Collector contact'), { target: { value: '2 510 000' } });
  fireEvent.change(screen.getByLabelText('Handover quantity at Main floor'), { target: { value: '2.000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm physical handover' }));

  await waitFor(() => expect(api.createCollection).toHaveBeenCalledTimes(1));
  const [, body] = api.createCollection.mock.calls[0];
  expect(body).toMatchObject({ invoice_key: 'invoice-key', branch_id: 4,
    counter_key: 'counter-key', expected_branch_settings_version: 2,
    expected_counter_settings_version: 5, expected_assignment_version: 3,
    collector_name: 'Jane Collector', collector_contact: '2 510 000',
    allocations: [{ line_key: 'line-key', reservation_key: 'reservation-key',
      quantity: '2.000000', expected_stock_version: 7 }] });
  expect(await screen.findByText('Handover recorded once')).toBeInTheDocument();
});

test('requires explicit serial selection and posts the derived whole-unit quantity', async () => {
  const api = client();
  api.collectionOptions.mockResolvedValue({ data: { ...options, reservations: [{
    ...options.reservations[0], tracking_policy: 'SERIAL', remaining: '2.000000',
    serials: [
      { serial_key: 'serial-key-1', serial_number: 'SN-0001' },
      { serial_key: 'serial-key-2', serial_number: 'SN-0002' },
    ],
  }] } });
  api.invoiceCollections.mockResolvedValue({ data: [{
    collection_key: 'previous', collector_name: 'Earlier collector',
    collector_contact: '2 500 000', collected_at: '2026-10-05T08:00:00Z',
    allocations: [{ serials: [{ serial_key: 'past-key', serial_number: 'SN-PAST' }] }],
  }] });
  render(<SalesCollectionPanel api={api} invoice={{ invoice_key: 'invoice-key', invoice_number: 'INV-1' }} customerName="Sample customer" onClose={jest.fn()} />);

  expect(await screen.findByText('SN-0001')).toBeInTheDocument();
  expect(screen.queryByLabelText('Handover quantity at Main floor')).not.toBeInTheDocument();
  expect(screen.getByText('Serials: SN-PAST')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Collector name'), { target: { value: 'Jane Collector' } });
  fireEvent.change(screen.getByLabelText('Collector contact'), { target: { value: '2 510 000' } });
  fireEvent.click(screen.getByLabelText('Serial SN-0001 at Main floor'));
  expect(screen.getByText('Selected 1 of 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm physical handover' }));

  await waitFor(() => expect(api.createCollection).toHaveBeenCalledTimes(1));
  expect(api.createCollection.mock.calls[0][1].allocations[0]).toEqual({
    line_key: 'line-key', reservation_key: 'reservation-key',
    quantity: '1', expected_stock_version: 7,
    serial_keys: ['serial-key-1'],
  });
});

test('does not offer another handover after authoritative completion', async () => {
  const api = client();
  api.collectionOptions.mockResolvedValue({ data: { ...options,
    fulfilment_status: 'COLLECTED', reservations: [] } });
  render(<SalesCollectionPanel api={api} invoice={{ invoice_key: 'invoice-key', invoice_number: 'INV-1' }} customerName="Sample customer" onClose={jest.fn()} />);
  expect(await screen.findByText('All eligible invoice quantities have been collected.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Confirm physical handover' })).not.toBeInTheDocument();
});

test('locks an uncertain handover and retries the identical request', async () => {
  const api = client();
  api.createCollection.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: {
    replayed: true, collection: { collection_key: 'collection-key',
      fulfilment_status: 'PARTIALLY_COLLECTED', allocations: [{ quantity: '1.000000' }] },
  } });
  render(<SalesCollectionPanel api={api} invoice={{ invoice_key: 'invoice-key', invoice_number: 'INV-1' }} customerName="Sample customer" onClose={jest.fn()} />);
  await screen.findByText('Main floor · A-01');
  fireEvent.change(screen.getByLabelText('Collector name'), { target: { value: 'Jane Collector' } });
  fireEvent.change(screen.getByLabelText('Collector contact'), { target: { value: '2 510 000' } });
  fireEvent.change(screen.getByLabelText('Handover quantity at Main floor'), { target: { value: '1.000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm physical handover' }));
  expect(await screen.findByRole('button', { name: 'Retry exact handover' })).toBeInTheDocument();
  expect(screen.getByLabelText('Collector name')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry exact handover' }));
  await waitFor(() => expect(api.createCollection).toHaveBeenCalledTimes(2));
  expect(api.createCollection.mock.calls[1][1]).toEqual(api.createCollection.mock.calls[0][1]);
});
