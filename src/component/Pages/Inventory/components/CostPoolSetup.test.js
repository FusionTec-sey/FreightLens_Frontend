import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CostPoolSetup from "./CostPoolSetup";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn() } }));
const branch = { id: 12, name: "Warehouse", is_active: true };
const pool = { id: 21, code: "POOL", name: "Shared pool", is_active: true };
let api;
beforeEach(() => {
  api = { listPools: jest.fn().mockResolvedValue({ data: { items: [pool], total: 1, pages: 1 } }),
    branchPool: jest.fn().mockResolvedValue({ data: null }), createPool: jest.fn(), assignPool: jest.fn() };
});
const setup = (props = {}) => render(<CostPoolSetup api={api} orgId={7} branch={branch} canManage onClose={jest.fn()} {...props} />);
test("read-only users can see pools but cannot create or assign", async () => {
  setup({ canManage: false });
  await screen.findByText("Shared pool");
  expect(screen.queryByRole("button", { name: "Add cost pool" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Select POOL" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "View POOL valuations" })).not.toBeInTheDocument();
});

test("financial viewers open valuation history without enabling writes", async () => {
  api.poolValuations = jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } });
  setup({ canManage: false, canViewValues: true });
  fireEvent.click(await screen.findByRole("button", { name: "View POOL valuations" }));
  await screen.findByText(/does not mean stock has zero cost/);
  fireEvent.click(screen.getByRole("button", { name: "Back to cost pools" }));
  expect(screen.getByText("Shared pool")).toBeInTheDocument();
});
test("assignment requires confirmation and blocks double submit", async () => {
  let resolve;
  api.assignPool.mockImplementation(() => new Promise((done) => { resolve = done; }));
  setup();
  fireEvent.click(await screen.findByRole("button", { name: "Select POOL" }));
  expect(api.assignPool).not.toHaveBeenCalled();
  const form = screen.getByRole("button", { name: "Confirm assignment" }).closest("form");
  fireEvent.submit(form); fireEvent.submit(form);
  expect(api.assignPool).toHaveBeenCalledTimes(1);
  expect(api.assignPool).toHaveBeenCalledWith(12, 21, expect.any(AbortSignal));
  api.branchPool.mockResolvedValue({ data: { cost_pool_id: 21 } });
  await act(async () => resolve({ data: { cost_pool_id: 21 } }));
  await screen.findByText("Assigned");
  expect(screen.queryByRole("button", { name: "Select POOL" })).not.toBeInTheDocument();
});
test("existing binding disables assignment and cancellation writes nothing", async () => {
  api.branchPool.mockResolvedValue({ data: { cost_pool_id: 99 } });
  setup();
  await screen.findByText(/Assigned pool ID: 99/);
  expect(screen.queryByRole("button", { name: "Select POOL" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add cost pool" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api.createPool).not.toHaveBeenCalled();
});
test("create normalizes input, retains values on server validation failure", async () => {
  api.createPool.mockRejectedValue({ response: { data: { detail: [{ loc: ["body", "code"], msg: "Reserved code" }] } } });
  setup();
  await screen.findByText("Shared pool");
  fireEvent.click(screen.getByRole("button", { name: "Add cost pool" }));
  fireEvent.change(screen.getByLabelText("Pool code"), { target: { value: " main " } });
  fireEvent.change(screen.getByLabelText("Pool name"), { target: { value: " Main pool " } });
  fireEvent.click(screen.getByRole("button", { name: "Save pool" }));
  await screen.findByText("Reserved code");
  expect(api.createPool).toHaveBeenCalledWith({ code: "MAIN", name: "Main pool" }, expect.any(AbortSignal));
  expect(screen.getByLabelText("Pool code")).toHaveValue(" main ");
  expect(screen.getByLabelText("Pool code")).toHaveAttribute("aria-invalid", "true");
});
test("failed binding lookup does not enable unsafe assignment; refresh recovers", async () => {
  api.branchPool.mockRejectedValueOnce({ response: { data: { detail: "Cannot read assignment" } } });
  setup();
  await screen.findByRole("alert");
  expect(screen.queryByRole("button", { name: "Select POOL" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh pools" }));
  await screen.findByRole("button", { name: "Select POOL" });
});
test("pagination goes to server and pending reads cancel on leaving", async () => {
  api.listPools.mockResolvedValue({ data: { items: [pool], total: 30, pages: 2 } });
  const { unmount } = setup();
  await screen.findByText("Shared pool");
  fireEvent.click(screen.getByTitle("Next Page"));
  await waitFor(() => expect(api.listPools).toHaveBeenLastCalledWith(2, 25, expect.any(AbortSignal)));
  const signal = api.listPools.mock.calls.at(-1)[2];
  unmount();
  expect(signal.aborted).toBe(true);
});
