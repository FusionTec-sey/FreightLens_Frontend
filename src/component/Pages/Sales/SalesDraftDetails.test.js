import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesDraftDetails from './SalesDraftDetails';

const draft = { document_key: 'synthetic-draft', customer_key: 'synthetic-customer', branch_id: 2, version: 3,
  lines: [{ line_key: 'line-1', product_id: 7, product_name: 'Sample tiles', sku: 'SAMPLE-TILE',
    quantity: '2.5', unit: 'BOX', base_quantity: '10', base_unit: 'PCS', reserved_quantity: '4', expected_policy_version: 2 }] };

test('inspection preserves exact units and does not expose unavailable write actions', () => {
  render(<SalesDraftDetails draft={draft} onClose={jest.fn()} />);
  expect(screen.getByText('2.5 BOX')).toBeInTheDocument();
  expect(screen.getByText('Reserved: 4 PCS')).toBeInTheDocument();
  expect(screen.getByText('Payment: not recorded by this draft.')).toBeInTheDocument();
  expect(screen.getByText('Collection: not authorised by this draft.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit draft' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Allocate same-store stock' })).not.toBeInTheDocument();
});

test('opening details and expanding policy information have no business side effects', () => {
  const allocate = jest.fn(); const edit = jest.fn(); const close = jest.fn();
  render(<SalesDraftDetails draft={draft} onAllocate={allocate} onEdit={edit} onClose={close} />);
  fireEvent.click(screen.getByText('Unit and policy details'));
  expect(allocate).not.toHaveBeenCalled(); expect(edit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Allocate same-store stock' }));
  expect(allocate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(close).toHaveBeenCalledTimes(1);
});
