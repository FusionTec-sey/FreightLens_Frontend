import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChargeEvidenceDetails from './ChargeEvidenceDetails';

test('version-bound evidence uses only the exact case download and shows failures', async () => {
  const api = { reviewedEvidenceDocument: jest.fn().mockRejectedValue(new Error('missing version')), evidenceDocument: jest.fn() };
  render(<ChargeEvidenceDetails api={api} item={{ case_key: 'case', source_version: 2,
    declaration: { document_id: 'doc' }, documents: [{ id: 'doc', label: 'Invoice.pdf' }] }} />);
  expect(screen.getByText(/Version-bound evidence/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Download Invoice.pdf' }));
  await screen.findByRole('alert');
  expect(api.reviewedEvidenceDocument).toHaveBeenCalledWith('case', 'doc', expect.any(AbortSignal));
  expect(api.evidenceDocument).not.toHaveBeenCalled();
});
