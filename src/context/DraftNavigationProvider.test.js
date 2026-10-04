import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DraftNavigationProvider from './DraftNavigationProvider';
import { useDraftNavigationGuard } from './DraftNavigationContext';

let mockBlocker, mockShouldBlock;
jest.mock('react-router-dom', () => ({ useBlocker: fn => { mockShouldBlock = fn; return mockBlocker; } }), { virtual: true });
function Editor({ active = true, prepare }) {
  useDraftNavigationGuard({ active, prepareToLeave: prepare });
  return <input aria-label="Draft field" />;
}
beforeEach(() => { mockBlocker = { state: 'blocked', reset: jest.fn(), proceed: jest.fn() }; });

test('retains recovery before proceeding and prevents repeated leave requests', async () => {
  let resolve;
  const prepare = jest.fn(() => new Promise(done => { resolve = done; }));
  render(<DraftNavigationProvider><Editor prepare={prepare} /></DraftNavigationProvider>);
  expect(mockShouldBlock()).toBe(true);
  fireEvent.click(screen.getByText('Keep locally and leave'));
  fireEvent.click(screen.getByText('Retaining recovery…'));
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(mockBlocker.proceed).not.toHaveBeenCalled();
  await act(async () => resolve());
  expect(mockBlocker.proceed).toHaveBeenCalledTimes(1);
});

test('failed persistence stays in editor and permits retry', async () => {
  const prepare = jest.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValue(undefined);
  render(<DraftNavigationProvider><Editor prepare={prepare} /></DraftNavigationProvider>);
  fireEvent.click(screen.getByText('Keep locally and leave'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable');
  expect(mockBlocker.proceed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Keep locally and leave'));
  await waitFor(() => expect(mockBlocker.proceed).toHaveBeenCalledTimes(1));
});

test('latest active state controls blocking and Stay resets without persistence', () => {
  const prepare = jest.fn();
  const view = render(<DraftNavigationProvider><Editor active={false} prepare={prepare} /></DraftNavigationProvider>);
  expect(mockShouldBlock()).toBe(false);
  view.rerender(<DraftNavigationProvider><Editor active prepare={prepare} /></DraftNavigationProvider>);
  expect(mockShouldBlock()).toBe(true);
  fireEvent.click(screen.getByText('Stay in draft'));
  expect(mockBlocker.reset).toHaveBeenCalled();
  expect(prepare).not.toHaveBeenCalled();
});

test('changing editor while recovery is pending revokes the leave decision', async () => {
  let resolve;
  const prepare = () => new Promise(done => { resolve = done; });
  const view = render(<DraftNavigationProvider><Editor key="first" prepare={prepare} /></DraftNavigationProvider>);
  fireEvent.click(screen.getByText('Keep locally and leave'));
  view.rerender(<DraftNavigationProvider><Editor key="second" prepare={prepare} /></DraftNavigationProvider>);
  await act(async () => resolve());
  expect(mockBlocker.proceed).not.toHaveBeenCalled();
});
