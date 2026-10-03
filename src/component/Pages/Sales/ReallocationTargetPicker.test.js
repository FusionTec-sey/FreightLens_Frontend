import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReallocationTargetPicker from './ReallocationTargetPicker';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
const source = { document_key: 'source', line_key: 'line', branch_id: 2, product_id: 1, base_unit: 'PCS' };
function setup(detail) {
  const api = { list: jest.fn().mockResolvedValue({ data: { items: [{ document_key: 'target', branch_id: 2, version: 1 }], total: 26, pages: 2 } }),
    read: jest.fn().mockResolvedValue({ data: { document_key: 'target', branch_id: 2, version: 2, status: 'DRAFT', lines: [], ...detail } }) };
  const select = jest.fn();
  render(<ReallocationTargetPicker api={api} source={source} onSelect={select} onClose={jest.fn()} />);
  return { api, select };
}
test.each([{ branch_id: 3 }, { document_key: 'unexpected' }, { status: 'CONFIRMED' }])('rejects stale/ineligible destination %j', async detail => {
  const { select } = setup(detail);
  fireEvent.click(await screen.findByText('Select Draft target'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Destination unavailable');
  expect(select).not.toHaveBeenCalled();
});
test('paginates server-side and only offers exact product and unit lines', async () => {
  const { api, select } = setup({ lines: [
    { line_key: 'other-product', product_id: 9, base_unit: 'PCS' },
    { line_key: 'other-unit', product_id: 1, base_unit: 'BOX' },
    { line_key: 'eligible', product_id: 1, base_unit: 'PCS', base_quantity: '4' }] });
  await screen.findByText('Select Draft target'); fireEvent.click(screen.getByTitle('Next Page'));
  await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(2, 25, expect.anything(), ''));
  fireEvent.click(await screen.findByText('Select Draft target'));
  fireEvent.click(await screen.findByText('Choose line eligible'));
  expect(screen.queryByText('Choose line other-product')).not.toBeInTheDocument();
  expect(screen.queryByText('Choose line other-unit')).not.toBeInTheDocument();
  expect(select).toHaveBeenCalledWith({ document_key: 'target', line_key: 'eligible', version: 2 });
});
