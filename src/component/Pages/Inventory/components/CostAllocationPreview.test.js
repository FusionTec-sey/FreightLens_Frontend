import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CostAllocationPreview from "./CostAllocationPreview";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
const pool = { id: 3, code: "POOL" };
const result = { total_scr: "0.000001", posting_enabled: false, lines: [{ valuation_id: 4, balance_id: 7, product_name: "Tile", basis_value: "100.000000", allocated_scr: "0.000001" }] };

test("sends exact amount and source IDs, displays calculation then invalidates edits", async () => {
  const api = { previewCostAllocation: jest.fn().mockResolvedValue({ data: result }) };
  render(<CostAllocationPreview api={api} pool={pool} ids={[4]} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Additional cost SCR"), { target: { value: "0.000001" } });
  fireEvent.click(screen.getByRole("button", { name: "Calculate allocation" }));
  await screen.findByText("Allocated total SCR");
  expect(api.previewCostAllocation).toHaveBeenCalledWith(3, { valuation_ids: [4], total_scr: "0.000001", basis: "GOODS_VALUE" }, expect.any(AbortSignal));
  expect(screen.queryByRole("button", { name: /Post|Approve/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Allocation basis"), { target: { value: "BASE_QUANTITY" } });
  expect(screen.queryByText("Allocated total SCR")).not.toBeInTheDocument();
});

test("late calculation cannot overwrite edited amount", async () => {
  let finish;
  const api = { previewCostAllocation: jest.fn(() => new Promise(resolve => { finish = resolve; })) };
  render(<CostAllocationPreview api={api} pool={pool} ids={[4]} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Additional cost SCR"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "Calculate allocation" }));
  fireEvent.change(screen.getByLabelText("Additional cost SCR"), { target: { value: "2" } });
  await act(async () => finish({ data: result }));
  expect(api.previewCostAllocation.mock.calls[0][2].aborted).toBe(true);
  expect(screen.queryByText("Allocated total SCR")).not.toBeInTheDocument();
});

test("invalid decimals do not call server and failed calculations keep inputs", async () => {
  const api = { previewCostAllocation: jest.fn().mockRejectedValue({ response: { data: { detail: "Mixed units" } } }) };
  render(<CostAllocationPreview api={api} pool={pool} ids={[4]} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Additional cost SCR"), { target: { value: "0.0000001" } });
  fireEvent.click(screen.getByRole("button", { name: "Calculate allocation" }));
  expect(api.previewCostAllocation).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Additional cost SCR"), { target: { value: "12.34" } });
  fireEvent.click(screen.getByRole("button", { name: "Calculate allocation" }));
  await screen.findByText("Mixed units");
  expect(screen.getByLabelText("Additional cost SCR")).toHaveValue("12.34");
});
