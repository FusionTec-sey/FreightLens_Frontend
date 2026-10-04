import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CostPoolReconciliationReadiness from "./CostPoolReconciliationReadiness";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
jest.mock("../../../../context/AuthContext", () => ({ useAuth: () => ({ permissions: [], isSuperAdmin: false, userId: 4 }) }));

const pool = { id: 3, code: "POOL", name: "Test pool" };
const props = { pool, panel: "panel", button: "button", isDark: false, onClose: jest.fn() };
const row = { product_id: 4, product_name: "Tile", physical_base_units: ["PCS"],
  physical_quantity: "11.000000", valuation_id: 1, valuation_version: 2,
  valuation_base_unit: "PCS", pool_quantity: "10.000000", pool_value_scr: "120.000000",
  difference: "1.000000", readiness: "QUANTITY_MISMATCH" };

test("shows exact readiness exceptions and server pagination", async () => {
  const api = { reconciliationReadiness: jest.fn().mockResolvedValue({ data: { items: [row], total: 26, pages: 2 } }) };
  render(<CostPoolReconciliationReadiness {...props} api={api} />);
  expect(await screen.findByText("Quantity mismatch")).toBeInTheDocument();
  expect(screen.getByText("11.000000")).toBeInTheDocument();
  expect(screen.getByText("1.000000")).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("Next Page"));
  await screen.findByText("Quantity mismatch");
  expect(api.reconciliationReadiness).toHaveBeenLastCalledWith(3, 2, 25, expect.any(AbortSignal));
});

test("clears stale readiness on failure and offers an explicit retry", async () => {
  const api = { reconciliationReadiness: jest.fn()
    .mockResolvedValueOnce({ data: { items: [row], total: 1, pages: 1 } })
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<CostPoolReconciliationReadiness {...props} api={api} />);
  await screen.findByText("Quantity mismatch");
  fireEvent.click(screen.getByRole("button", { name: "Refresh readiness" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("Quantity mismatch")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh readiness" }));
  expect(await screen.findByText(/No physical or valuation records/)).toBeInTheDocument();
});
