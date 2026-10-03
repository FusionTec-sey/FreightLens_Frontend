import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import InventoryLocationsPage from "./InventoryLocationsPage";
import { useAuth } from "../../../context/AuthContext";
import { inventoryLocationsApi } from "../../../services/inventoryLocationsApi";

jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
jest.mock("../../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn() } }));
jest.mock("../../../services/inventoryLocationsApi", () => ({
  ...jest.requireActual("../../../services/inventoryLocationsApi"), inventoryLocationsApi: jest.fn(),
}));
const empty = { data: { items: [], total: 0, pages: 1 } };
const branch = { id: 11, code: "MAIN", name: "Main warehouse", kind: "WAREHOUSE", is_active: true };
let list, create, auth;
beforeEach(() => {
  list = jest.fn().mockResolvedValue(empty);
  create = jest.fn();
  auth = { token: "test-token", orgId: 7, selectedOrgId: null, permissions: ["View_Product", "Manage_InventoryLocation"], isSuperAdmin: false };
  useAuth.mockImplementation(() => auth);
  inventoryLocationsApi.mockImplementation(() => ({ list, create }));
});
const startBranch = async () => {
  await screen.findByText("No branches in this organisation yet.");
  fireEvent.click(screen.getByRole("button", { name: "Add branch" }));
  fireEvent.change(screen.getByLabelText("Code"), { target: { value: " main " } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Main warehouse" } });
};
test("loads scoped paginated empty state and hides writes for viewers", async () => {
  auth.permissions = ["View_Product"];
  render(<InventoryLocationsPage />);
  await screen.findByText("No branches in this organisation yet.");
  expect(inventoryLocationsApi).toHaveBeenCalledWith("test-token", 7);
  expect(list).toHaveBeenCalledWith(undefined, 1, 25, expect.any(AbortSignal));
  expect(screen.queryByRole("button", { name: "Add branch" })).not.toBeInTheDocument();
});
test("creates normalized branch once and opens its locations", async () => {
  let resolve;
  create.mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<InventoryLocationsPage />);
  await startBranch();
  const form = screen.getByRole("button", { name: "Save" }).closest("form");
  fireEvent.submit(form); fireEvent.submit(form);
  expect(create).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith(undefined, { code: "MAIN", name: "Main warehouse", kind: "STORE", notes: null }, expect.any(AbortSignal));
  await act(async () => resolve({ data: branch }));
  expect(await screen.findByRole("heading", { name: "Main warehouse — locations" })).toBeInTheDocument();
  expect(list).toHaveBeenLastCalledWith(11, 1, 25, expect.any(AbortSignal));
});
test("failed save preserves fields and shows conflict", async () => {
  create.mockRejectedValue({ response: { status: 409, data: { detail: "Code already exists" } } });
  render(<InventoryLocationsPage />);
  await startBranch();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Code already exists");
  expect(screen.getByLabelText("Code")).toHaveValue(" main ");
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});
test("validates codes inline before any write", async () => {
  render(<InventoryLocationsPage />);
  await startBranch();
  fireEvent.change(screen.getByLabelText("Code"), { target: { value: "bad code" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByLabelText("Code")).toHaveAttribute("aria-invalid", "true");
  expect(create).not.toHaveBeenCalled();
});
test("creates zone only under the selected site", async () => {
  list.mockResolvedValueOnce({ data: { items: [branch], total: 1, pages: 1 } });
  list.mockResolvedValue({ data: { items: [{ id: 91, code: "SITE", name: "Main site", kind: "SITE", is_active: true }], total: 1, pages: 1 } });
  create.mockResolvedValue({ data: { name: "Zone A" } });
  render(<InventoryLocationsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Open locations for Main warehouse" }));
  fireEvent.click(await screen.findByRole("button", { name: "Add zone to Main site" }));
  fireEvent.change(screen.getByLabelText("Code"), { target: { value: "ZONE_A" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Zone A" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(create).toHaveBeenCalledWith(11, { code: "ZONE_A", name: "Zone A", kind: "ZONE", parent_id: 91 }, expect.any(AbortSignal)));
  await screen.findByRole("heading", { name: "Main warehouse — locations" });
});

test("viewer opens exact-location stock and returns to location list", async () => {
  auth.permissions = ["View_Product"];
  const stock = jest.fn().mockResolvedValue(empty);
  inventoryLocationsApi.mockImplementation(() => ({ list, create, stock }));
  list.mockResolvedValueOnce({ data: { items: [branch], total: 1, pages: 1 } });
  list.mockResolvedValue({ data: { items: [{ id: 91, code: "SITE", name: "Main site", kind: "SITE", is_active: true }], total: 1, pages: 1 } });
  render(<InventoryLocationsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Open locations for Main warehouse" }));
  fireEvent.click(await screen.findByRole("button", { name: "View stock at Main site" }));
  await screen.findByText(/No ledger balances/);
  expect(stock).toHaveBeenCalledWith(11, 91, 1, 25, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "Back to locations" }));
  expect(await screen.findByRole("heading", { name: "Main warehouse — locations" })).toBeInTheDocument();
});
test("organisation switch aborts old reads and discards forms", async () => {
  const { rerender } = render(<InventoryLocationsPage />);
  await startBranch();
  const oldSignal = list.mock.calls[0][3];
  auth = { ...auth, selectedOrgId: 8 };
  rerender(<InventoryLocationsPage />);
  await screen.findByText("No branches in this organisation yet.");
  expect(oldSignal.aborted).toBe(true);
  expect(screen.queryByLabelText("Code")).not.toBeInTheDocument();
});
test("late response cannot populate a different organisation", async () => {
  let resolveOld;
  list.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  const { rerender } = render(<InventoryLocationsPage />);
  const signal = list.mock.calls[0][3];
  auth = { ...auth, selectedOrgId: 8 };
  rerender(<InventoryLocationsPage />);
  await screen.findByText("No branches in this organisation yet.");
  await act(async () => resolveOld({ data: { items: [branch], total: 1, pages: 1 } }));
  expect(signal.aborted).toBe(true);
  expect(screen.queryByText("Main warehouse")).not.toBeInTheDocument();
  expect(screen.getByText(/Organisation #8/)).toBeInTheDocument();
});
test("load errors have a working retry and server pagination", async () => {
  list.mockRejectedValueOnce({ response: { data: { detail: "Access denied" } } });
  list.mockResolvedValue({ data: { items: [branch], total: 30, pages: 2 } });
  render(<InventoryLocationsPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Main warehouse");
  fireEvent.click(screen.getByTitle("Next Page"));
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(undefined, 2, 25, expect.any(AbortSignal)));
});
