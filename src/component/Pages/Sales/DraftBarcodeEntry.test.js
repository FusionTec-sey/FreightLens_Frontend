import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DraftBarcodeEntry from './DraftBarcodeEntry';

test('scan uses registered alternate unit and current reviewed policy', async () => {
  const api = {
    resolveUnitBarcode: jest.fn().mockResolvedValue({ data: { barcode: '00012', product_id: 7, eligible: true, unit: 'BOX', base_unit: 'PCS' } }),
    activePolicy: jest.fn().mockResolvedValue({ data: { product_id: 7, version: 3, status: 'ACTIVE', config: { base_unit: 'PCS', conversions: [{ unit: 'BOX', factor: '12' }] } } }),
  };
  const onSelect = jest.fn();
  render(<DraftBarcodeEntry api={api} onSelect={onSelect} />);
  fireEvent.change(screen.getByLabelText('Scan or enter unit barcode'), { target: { value: '00012' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add barcode' }));
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 7, unit: 'BOX', policy_version: 3 })));
  expect(api.resolveUnitBarcode).toHaveBeenCalledWith('00012', expect.anything());
});

test('failed resolution does not add a product or fall back to catalogue search', async () => {
  const api = { resolveUnitBarcode: jest.fn().mockRejectedValue(new Error('Retired')), activePolicy: jest.fn() };
  const onSelect = jest.fn();
  render(<DraftBarcodeEntry api={api} onSelect={onSelect} />);
  fireEvent.change(screen.getByLabelText('Scan or enter unit barcode'), { target: { value: '00012' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add barcode' }));
  await screen.findByText(/Nothing added/);
  expect(onSelect).not.toHaveBeenCalled(); expect(api.activePolicy).not.toHaveBeenCalled();
});
