import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CostPoolValuations from "./CostPoolValuations";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: true }) }));
jest.mock("../../../../context/AuthContext", () => ({
  useAuth: () => ({ permissions: [], isSuperAdmin: false, userId: 4 }),
}));
const pool = { id: 3, code: "POOL", name: "Test pool" };
const data = { items: [{ id: 1, product_name: "Tile", balance_id: 7, source_version: 1, version: 1,
  quantity: "10.000000", base_unit: "PCS", goods_value_scr: "99999999999999999.123456",
  additional_cost_scr: "0.000000", pool_quantity: "10.000000", pool_value_scr: "99999999999999999.123456",
  status: "UNRECONCILED", reason: "Approved synthetic cost" }], total: 26, pages: 2 };

test('charge history identifies its opening source and cannot be selected for another allocation', async () => {
  const api = { poolValuations: jest.fn().mockResolvedValue({ data: { ...data, items: [{ ...data.items[0], kind: 'CHARGE', source_valuation_id: 8 }] } }) };
  render(<CostPoolValuations api={api} pool={pool} onClose={jest.fn()} />);
  expect(await screen.findByLabelText('Select valuation 1')).toBeDisabled();
  expect(screen.getByText(/CHARGE.*Source valuation #8/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Preview additional-cost allocation' })).toBeDisabled();
});

test('receipt value is labelled and remains eligible for reviewed landed-cost allocation', async () => {
  const api = { poolValuations: jest.fn().mockResolvedValue({ data: { ...data, items: [{ ...data.items[0], kind: 'RECEIPT' }] } }) };
  render(<CostPoolValuations api={api} pool={pool} onClose={jest.fn()} />);
  const choice = await screen.findByLabelText('Select valuation 1');
  expect(choice).toBeEnabled();
  expect(screen.getByText(/RECEIPT.*Stock #7.*Movement 1/)).toBeInTheDocument();
  fireEvent.click(choice);
  expect(screen.getByRole('button', { name: 'Preview additional-cost allocation' })).toBeEnabled();
});

test("selects current-page source and opens allocation without posting", async () => {
  const api = { poolValuations: jest.fn().mockResolvedValue({ data }) };
  render(<CostPoolValuations api={api} pool={pool} onClose={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Preview additional-cost allocation" })).toBeDisabled();
  fireEvent.click(await screen.findByLabelText("Select valuation 1"));
  fireEvent.click(screen.getByRole("button", { name: "Preview additional-cost allocation" }));
  expect(screen.getByRole("heading", { name: "Freight allocation preview" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to valuations" }));
  fireEvent.click(screen.getByTitle("Next Page"));
  await screen.findByText("UNRECONCILED");
  expect(screen.getByRole("button", { name: "Preview additional-cost allocation" })).toBeDisabled();
});

test("shows exact historical values and requests server pages", async () => {
  const api = { poolValuations: jest.fn().mockResolvedValue({ data }) };
  render(<CostPoolValuations api={api} pool={pool} onClose={jest.fn()} />);
  await screen.findByText("UNRECONCILED");
  expect(screen.getAllByText("99999999999999999.123456")).toHaveLength(2);
  fireEvent.click(screen.getByTitle("Next Page"));
  await screen.findByText("UNRECONCILED");
  expect(api.poolValuations).toHaveBeenLastCalledWith(3, 2, 25, expect.any(AbortSignal));
});

test("refresh failure removes previous costs and allows retry", async () => {
  const api = { poolValuations: jest.fn().mockResolvedValueOnce({ data }).mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<CostPoolValuations api={api} pool={pool} onClose={jest.fn()} />);
  await screen.findByText("UNRECONCILED");
  fireEvent.click(screen.getByRole("button", { name: "Refresh valuations" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("UNRECONCILED")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh valuations" }));
  await screen.findByText(/does not mean stock has zero cost/);
});

test("company changes abort old responses and hide old costs", async () => {
  let finish;
  const api = { poolValuations: jest.fn(() => new Promise(resolve => { finish = resolve; })) };
  const next = { poolValuations: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  const view = render(<CostPoolValuations api={api} pool={pool} onClose={jest.fn()} />);
  view.rerender(<CostPoolValuations api={next} pool={pool} onClose={jest.fn()} />);
  await act(async () => finish({ data }));
  expect(api.poolValuations.mock.calls[0][3].aborted).toBe(true);
  expect(screen.queryByText("UNRECONCILED")).not.toBeInTheDocument();
});

test("opens the read-only reconciliation comparison without implying final accounts", async () => {
  const readiness = { items: [{ product_id: 4, product_name: "Tile", physical_base_units: ["PCS"],
    physical_quantity: "10.000000", valuation_id: 1, valuation_version: 1,
    valuation_base_unit: "PCS", pool_quantity: "10.000000", pool_value_scr: "120.000000",
    difference: "0.000000", readiness: "READY" }], total: 1, pages: 1 };
  const api = { poolValuations: jest.fn().mockResolvedValue({ data }),
    reconciliationReadiness: jest.fn().mockResolvedValue({ data: readiness }) };
  render(<CostPoolValuations api={api} pool={pool} onClose={jest.fn()} />);
  await screen.findByText("UNRECONCILED");
  fireEvent.click(screen.getByRole("button", { name: "Reconciliation readiness" }));
  expect(await screen.findByRole("heading", { name: "Reconciliation readiness" })).toBeInTheDocument();
  expect(screen.getByText("Quantity agrees")).toBeInTheDocument();
  expect(screen.getByText(/not final accounting approval/)).toBeInTheDocument();
  expect(api.reconciliationReadiness).toHaveBeenCalledWith(3, 1, 25, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "Back to valuations" }));
  expect(await screen.findByRole("heading", { name: "Valuation history" })).toBeInTheDocument();
});
