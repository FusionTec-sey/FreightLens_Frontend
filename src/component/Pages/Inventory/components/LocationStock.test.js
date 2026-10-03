import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
import LocationStock, { displayQuantity } from "./LocationStock";
jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: true }) }));
const branch = { id: 11, name: "Main", is_active: true };
const location = { id: 91, name: "Warehouse", code: "WH", is_active: true };
const row = { id: 1, product_name: "Tile", sku: "TILE", base_unit: "PCS", product_status: "active", version: 2,
  on_hand: "999999999999.123456", reserved: "2.000000", available: "999999999997.123456", damaged: "0.000000", quarantined: "0.000000" };
const empty = { data: { items: [], total: 0, pages: 1 } };

test("opens proposals for the exact balance and returns to stock", async () => {
  const api = { stock: jest.fn().mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } }),
    reclassificationProposals: jest.fn().mockResolvedValue(empty) };
  render(<LocationStock api={api} branch={branch} location={location} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Reclassification proposals" }));
  await screen.findByText(/No saved proposals/);
  expect(api.reclassificationProposals).toHaveBeenCalledWith(1, 1, 25, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "Back to stock" }));
  await screen.findByRole("button", { name: "Reclassification proposals" });
});

test("shows absence without claiming zero physical stock", async () => {
  const api = { stock: jest.fn().mockResolvedValue(empty) };
  render(<LocationStock api={api} branch={branch} location={location} onClose={jest.fn()} />);
  expect(await screen.findByText(/does not mean physical stock is zero/)).toBeInTheDocument();
  expect(api.stock).toHaveBeenCalledWith(11, 91, 1, 25, expect.any(AbortSignal));
});

test("renders exact decimals and paginates on server", async () => {
  const api = { stock: jest.fn().mockResolvedValue({ data: { items: [row], total: 26, pages: 2 } }) };
  render(<LocationStock api={api} branch={branch} location={location} onClose={jest.fn()} />);
  expect(await screen.findByText("999999999999.123456")).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Quarantined" })).toBeInTheDocument();
  expect(screen.getByText(/Unit rules need review/)).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("Next Page"));
  await waitFor(() => expect(api.stock).toHaveBeenLastCalledWith(11, 91, 2, 25, expect.any(AbortSignal)));
  await screen.findByText("Tile");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "10" } });
  await waitFor(() => expect(api.stock).toHaveBeenLastCalledWith(11, 91, 1, 10, expect.any(AbortSignal)));
  await screen.findByText("Tile");
});

test("failed refresh hides stale balances and offers retry", async () => {
  const api = { stock: jest.fn().mockResolvedValueOnce({ data: { items: [row], total: 1, pages: 1 } })
    .mockRejectedValueOnce({ response: { data: { detail: "Access denied" } } }).mockResolvedValue(empty) };
  render(<LocationStock api={api} branch={branch} location={location} onClose={jest.fn()} />);
  await screen.findByText("Tile");
  fireEvent.click(screen.getByRole("button", { name: "Refresh stock" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  expect(screen.queryByText("Tile")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry stock" }));
  await screen.findByText(/No ledger balances/);
});

test("aborts old requests and ignores late results after leaving", async () => {
  let resolve;
  const api = { stock: jest.fn().mockImplementation(() => new Promise((done) => { resolve = done; })) };
  const { unmount } = render(<LocationStock api={api} branch={branch} location={location} onClose={jest.fn()} />);
  const signal = api.stock.mock.calls[0][4];
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: { items: [row], total: 1, pages: 1 } }));
});

test("quantity display never treats missing or numeric payloads as zero", () => {
  expect(displayQuantity("0.000000")).toBe("0");
  expect(displayQuantity("10.120000")).toBe("10.12");
  expect(displayQuantity("100")).toBe("100");
  for (const value of [null, undefined, 0, "NaN"]) expect(displayQuantity(value)).toBe("Unavailable");
});

test("opens serial register and refreshes stock on return", async () => {
  const api = { stock: jest.fn().mockResolvedValue({ data: { items: [{ ...row, tracking_policy: "SERIAL" }], total: 1, pages: 1 } }),
    serials: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<LocationStock api={api} branch={branch} location={location} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View serials" }));
  expect(await screen.findByText(/No serial identities recorded/)).toBeInTheDocument();
  expect(api.serials).toHaveBeenCalledWith(11, 91, 1, 1, 25, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "Back to stock" }));
  await waitFor(() => expect(api.stock).toHaveBeenCalledTimes(2));
  await screen.findByText("Tile");
});

test("shows lot identity and exact increment without implying expiry clearance", async () => {
  const batch = { ...row, tracking_policy: "BATCH", batch_code: "LOT-A", batch_shade: "S1", batch_calibre: "C2",
    expires_on: "2026-10-02", quantity_step: "0.001000", unit_policy_status: "SNAPSHOTTED" };
  const api = { stock: jest.fn().mockResolvedValue({ data: { items: [batch], total: 1, pages: 1 } }) };
  render(<LocationStock api={api} branch={branch} location={location} onClose={jest.fn()} />);
  expect(await screen.findByText("LOT-A")).toBeInTheDocument();
  expect(screen.getByText("Shade: S1")).toBeInTheDocument();
  expect(screen.getByText("Calibre: C2")).toBeInTheDocument();
  expect(screen.getByText("Expiry: 2026-10-02")).toBeInTheDocument();
  expect(screen.getByText("Increment: 0.001")).toBeInTheDocument();
  expect(screen.getByText(/posting must recheck availability, batch matching and expiry/)).toBeInTheDocument();
});
