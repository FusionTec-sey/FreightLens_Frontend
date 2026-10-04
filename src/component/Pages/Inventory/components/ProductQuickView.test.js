import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./InventoryPolicyDraft', () => () => <div data-testid="policy-draft" />);

import ProductQuickView from './ProductQuickView';

const product = { id: 7, name: 'Synthetic tiles', sku: 'TILE-7', unit: 'BOX',
  current_stock: 15, min_stock_quantity: 2, max_stock_quantity: 30,
  stock_status: 'AVAILABLE', stock_base_unit: 'PCS', stock_on_hand: '15.000000',
  stock_reserved: '3.000000', stock_available: '10.000000',
  stock_damaged: '1.000000', stock_quarantined: '1.000000', images: [] };

test('shows authoritative stock categories separately', () => {
  render(<ProductQuickView product={product} onClose={jest.fn()} />);
  expect(screen.getByText('15.000000')).toBeInTheDocument();
  expect(screen.getByText('3.000000')).toBeInTheDocument();
  expect(screen.getByText('10.000000')).toBeInTheDocument();
  expect(screen.getAllByText('1.000000')).toHaveLength(2);
  expect(screen.queryByText(/reconciliation is required/i)).not.toBeInTheDocument();
});

test('does not invent a total when base units conflict', () => {
  render(<ProductQuickView product={{ ...product, stock_status: 'MIXED_UNITS',
    current_stock: null, stock_on_hand: null, stock_reserved: null,
    stock_available: null, stock_damaged: null, stock_quarantined: null }}
    onClose={jest.fn()} />);
  expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(5);
  expect(screen.getByRole('alert')).toHaveTextContent('Incompatible base units were not summed');
});
