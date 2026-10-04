import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import BranchCounters from "./BranchCounters";
jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn() } }));
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
const props = { branch: { id: 1, name: "Branch", is_active: true }, canManage: true, onClose: jest.fn() };
const row = { id: 2, counter_key: "counter", code: "C1", version: 1, config: { name: "Counter one", purpose: "BOTH", is_enabled: false } };
let api;

test('viewers can inspect the saved area without editing configuration', async () => {
  api.counters.mockResolvedValue({ data: { items: [{ ...row, config: { ...row.config, default_stock_location_id: 9 } }], total: 1, pages: 1 } });
  api.counterStockArea = jest.fn().mockResolvedValue({ data: { root: { name: 'Demo area', code: 'AREA' },
    counter_version: 1, counter_enabled: false, items: [], total: 0, pages: 1 } });
  render(<BranchCounters api={api} {...props} canManage={false} />);
  fireEvent.click(await screen.findByRole('button', { name: 'View picking preference C1' }));
  await screen.findByText(/Root: Demo area/);
  expect(api.counterStockArea).toHaveBeenCalledWith(1, 'counter', 1, 1, 25, expect.any(AbortSignal));
  fireEvent.click(screen.getByText('Back to counters'));
  await screen.findByRole('button', { name: 'View picking preference C1' });
  expect(api.saveCounter).not.toHaveBeenCalled();
});

test('selects a branch stock area without creating stock or typing IDs', async () => {
  api.list = jest.fn().mockResolvedValue({ data: { items: [{ id: 9, branch_id: 1, is_active: true, name: 'Demo work area' }], total: 1, pages: 1 } });
  api.saveCounter.mockResolvedValue({ data: row });
  render(<BranchCounters api={api} {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit C1' }));
  expect(screen.getByText(/eligible stock across this store/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Choose preferred picking area'));
  fireEvent.click(await screen.findByText('Select Demo work area'));
  expect(screen.getByText('Demo work area')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Save counter'));
  await waitFor(() => expect(api.saveCounter).toHaveBeenCalledWith(1, 'counter', expect.objectContaining({
    expected_version: 1, config: expect.objectContaining({ default_stock_location_id: 9 }) }), expect.anything()));
  expect(api.list).toHaveBeenCalledWith(1, 1, 25, expect.anything());
});
beforeEach(() => {
  api = { counters: jest.fn().mockResolvedValue({ data: { items: [row], total: 26, pages: 2 } }), saveCounter: jest.fn() };
  let count = 0;
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => `key-${++count}`) } });
});

test("server pagination and immutable code while editing", async () => {
  render(<BranchCounters api={api} {...props} />);
  await screen.findByText("Counter one");
  fireEvent.click(screen.getByTitle("Next Page"));
  await waitFor(() => expect(api.counters).toHaveBeenLastCalledWith(1, 2, 25, expect.any(AbortSignal)));
  fireEvent.click(await screen.findByRole("button", { name: "Edit C1" }));
  expect(screen.getByLabelText("Permanent code")).toBeDisabled();
  expect(screen.getByLabelText("Display name")).toHaveValue("Counter one");
});

test("new counter requires explicit purpose and keeps failed-save intent", async () => {
  api.saveCounter.mockRejectedValue({ response: { data: { detail: "Uncertain save" } } });
  render(<BranchCounters api={api} {...props} />);
  await screen.findByText("Counter one");
  fireEvent.click(screen.getByRole("button", { name: "Add counter" }));
  expect(screen.getByLabelText("Counter purpose")).toHaveValue("");
  expect(screen.getByLabelText("Available for future authorised workflows")).not.toBeChecked();
  fireEvent.change(screen.getByLabelText("Permanent code"), { target: { value: "C2" } });
  fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Counter two" } });
  fireEvent.change(screen.getByLabelText("Counter purpose"), { target: { value: "COLLECTION" } });
  fireEvent.click(screen.getByRole("button", { name: "Save counter" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Uncertain save");
  fireEvent.click(screen.getByRole("button", { name: "Save counter" }));
  await waitFor(() => expect(api.saveCounter).toHaveBeenCalledTimes(2));
  expect(api.saveCounter.mock.calls[0][1]).toBe(api.saveCounter.mock.calls[1][1]);
  expect(api.saveCounter.mock.calls[0][2]).toEqual(api.saveCounter.mock.calls[1][2]);
  await screen.findByRole("alert");
});

test("duplicate submits blocked and pending edits need explicit discard", async () => {
  let done;
  api.saveCounter.mockImplementation(() => new Promise((resolve) => { done = resolve; }));
  render(<BranchCounters api={api} {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "Edit C1" }));
  fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Renamed" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel counter edit" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Discard unsaved");
  fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  const form = screen.getByRole("button", { name: "Save counter" }).closest("form");
  fireEvent.submit(form); fireEvent.submit(form);
  expect(api.saveCounter).toHaveBeenCalledTimes(1);
  await act(async () => done({ data: row }));
  await screen.findByText("Counter one");
});

test("viewers cannot create or edit counters", async () => {
  render(<BranchCounters api={api} {...props} canManage={false} />);
  await screen.findByText("Counter one");
  expect(screen.queryByRole("button", { name: "Add counter" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit C1" })).not.toBeInTheDocument();
});
