import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesDraftRows from './SalesDraftRows';

const rows = [{ document_key: 'synthetic-one', customer_name: 'Synthetic buyer', branch_name: 'Synthetic store', version: 3 },
  { document_key: 'synthetic-two', branch_id: 4, version: 1 }];

test('split-view list preserves every register field and invokes only explicit selection', () => {
  const onOpen = jest.fn();
  render(<SalesDraftRows rows={rows} selectedKey="synthetic-one" onOpen={onOpen} />);
  expect(screen.getByRole('list', { name: 'Sales drafts on this page' })).toBeInTheDocument();
  expect(screen.getByText('Synthetic buyer')).toBeInTheDocument();
  expect(screen.getByText('Synthetic store · Version 3')).toBeInTheDocument();
  expect(screen.getByText('Branch 4 · Version 1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'View draft synthetic-one' })).toHaveAttribute('aria-current', 'true');
  expect(onOpen).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'View draft synthetic-two' }));
  expect(onOpen).toHaveBeenCalledWith(rows[1]);
});

test('full register retains table headers and disables actions during detail reads', () => {
  render(<SalesDraftRows rows={rows} loading onOpen={jest.fn()} />);
  expect(screen.getAllByRole('columnheader')).toHaveLength(9);
  expect(screen.getAllByText('Not calculated')).toHaveLength(2);
  expect(screen.getAllByText('Not recorded')).toHaveLength(2);
  expect(screen.getAllByText('Not authorised')).toHaveLength(2);
  expect(screen.getByText('Customer name unavailable')).toBeInTheDocument();
  screen.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
});
