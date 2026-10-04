import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockGaugeBar from './StockGaugeBar';

test('does not present an unavailable authoritative total as zero stock', () => {
  render(<StockGaugeBar currentStock={null} minStock={5} unit="PCS" />);
  expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  expect(screen.queryByText('Out of Stock')).not.toBeInTheDocument();
  expect(screen.getByTitle(/base-unit reconciliation/i)).toBeInTheDocument();
});

test('still distinguishes a real zero balance from unavailable stock', () => {
  render(<StockGaugeBar currentStock="0.000000" minStock={5} unit="PCS" />);
  expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
});
