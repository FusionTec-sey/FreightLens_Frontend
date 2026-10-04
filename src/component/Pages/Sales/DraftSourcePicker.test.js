import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DraftSourcePicker from './DraftSourcePicker';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));

test('embedded selection retains catalogue and respects locked cart', async () => {
  const row = { id: 1, name: 'Synthetic product', sku: 'SAMPLE', policy_version: 1 };
  const load = jest.fn().mockResolvedValue({ data: { items: [row], pages: 1, total: 1 } });
  const select = jest.fn();
  const view = render(<DraftSourcePicker title="Products" products embedded load={load} onSelect={select} disabled />);
  const button = await screen.findByRole('button', { name: 'Select Synthetic product' });
  expect(button).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Back to draft' })).not.toBeInTheDocument();
  fireEvent.click(button); expect(select).not.toHaveBeenCalled();
  view.rerender(<DraftSourcePicker title="Products" products embedded load={load} onSelect={select} />);
  fireEvent.click(button); expect(select).toHaveBeenCalledWith(row);
  expect(screen.getByRole('button', { name: 'Select Synthetic product' })).toBeInTheDocument();
});
