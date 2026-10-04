import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import StockAdjustmentCases from "./StockAdjustmentCases";

jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));

const operationKey = "11111111-1111-4111-8111-111111111111";
const balance = {
  id: 3, version: 8, product_name: "Synthetic tile", sku: "TILE-SYN", base_unit: "M2",
  tracking_policy: "BATCH", on_hand: "10.000000", reserved: "2.000000", available: "8.000000",
  damaged: "0.000000", quarantined: "0.000000",
};

const emptyPage = { data: { items: [], total: 0, page: 1, limit: 25, pages: 1 } };

function createApi(items = []) {
  return {
    stockAdjustmentCases: jest.fn().mockResolvedValue({
      data: { items, total: items.length, page: 1, limit: 25, pages: 1 },
    }),
    requestStockAdjustment: jest.fn(),
    reviewStockAdjustment: jest.fn().mockResolvedValue({ data: { status: "APPROVED" } }),
    executeStockAdjustment: jest.fn(),
  };
}

beforeEach(() => {
  Object.defineProperty(window, "crypto", {
    configurable: true,
    value: { randomUUID: jest.fn(() => operationKey) },
  });
});

test("failed correction request keeps exact values and retry identity", async () => {
  const api = createApi();
  api.stockAdjustmentCases.mockResolvedValue(emptyPage);
  api.requestStockAdjustment.mockRejectedValueOnce({ response: { data: { detail: "Temporary failure" } } })
    .mockResolvedValueOnce({ data: { case_key: "case-key", status: "REQUESTED" } });
  render(<StockAdjustmentCases api={api} balance={balance} userId={7} canRequest onClose={jest.fn()} />);
  await screen.findByText("No adjustment cases for this stock record.");
  fireEvent.change(screen.getByLabelText("Target on hand"), { target: { value: "11.250000" } });
  fireEvent.change(screen.getByLabelText("Correction reason"), { target: { value: "Verified physical count" } });
  fireEvent.click(screen.getByRole("button", { name: "Request manager review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Temporary failure");
  fireEvent.click(screen.getByRole("button", { name: "Request manager review" }));
  await waitFor(() => expect(api.requestStockAdjustment).toHaveBeenCalledTimes(2));
  expect(api.requestStockAdjustment.mock.calls[0][0]).toEqual(api.requestStockAdjustment.mock.calls[1][0]);
  expect(api.requestStockAdjustment.mock.calls[1][0]).toEqual(expect.objectContaining({
    operation_key: operationKey, balance_id: 3, expected_source_version: 8,
    target_on_hand: "11.250000", target_damaged: "0.000000",
    target_quarantined: "0.000000", reason: "Verified physical count",
  }));
  expect(await screen.findByText(/Review requested: case-key/)).toBeInTheDocument();
});

test("independent review submits the selected case version", async () => {
  const row = {
    case_key: "case-key", version: 3, status: "REQUESTED", requestor_id: 7,
    before_on_hand: "10.000000", before_damaged: "0.000000", before_quarantined: "0.000000",
    target_on_hand: "11.000000", target_damaged: "0.000000", target_quarantined: "0.000000",
    reason: "Verified physical count",
  };
  const api = createApi([row]);
  render(<StockAdjustmentCases api={api} balance={balance} userId={8} canReview onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Review" }));
  fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "Count witnessed" } });
  fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
  await waitFor(() => expect(api.reviewStockAdjustment).toHaveBeenCalledWith("case-key", {
    operation_key: operationKey, expected_version: 3, outcome: "APPROVED", reason: "Count witnessed",
  }, expect.any(AbortSignal)));
});

test("approved correction needs confirmation and reports one immutable execution", async () => {
  const row = {
    case_key: "approved-key", version: 2, status: "APPROVED", requestor_id: 7,
    before_on_hand: "10.000000", before_damaged: "0.000000", before_quarantined: "0.000000",
    target_on_hand: "11.000000", target_damaged: "0.000000", target_quarantined: "0.000000",
    reason: "Verified physical count",
  };
  const api = createApi([row]), onStockChanged = jest.fn();
  api.executeStockAdjustment.mockImplementation((caseKey, payload) => Promise.resolve({ data: {
    operation_key: payload.operation_key, case_key: caseKey, status: "CONSUMED", balance_id: 3,
    version: 9, on_hand: "11.000000", reserved: "2.000000", available: "9.000000",
    damaged: "0.000000", quarantined: "0.000000", replayed: false,
  } }));
  render(<StockAdjustmentCases api={api} balance={balance} userId={8} canExecute
    onStockChanged={onStockChanged} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Execute" }));
  expect(screen.getByRole("button", { name: "Execute approved adjustment" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Execute approved adjustment" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Adjustment posted once");
  expect(api.executeStockAdjustment).toHaveBeenCalledWith("approved-key", { operation_key: operationKey }, expect.any(AbortSignal));
  expect(onStockChanged).toHaveBeenCalledTimes(1);
});

test("serial totals cannot be adjusted through the aggregate workflow", async () => {
  const api = createApi();
  api.stockAdjustmentCases.mockResolvedValue(emptyPage);
  render(<StockAdjustmentCases api={api} balance={{ ...balance, tracking_policy: "SERIAL" }}
    userId={7} canRequest onClose={jest.fn()} />);
  expect(await screen.findByText(/Serial stock requires an identity-specific workflow/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Request manager review" })).not.toBeInTheDocument();
  expect(api.requestStockAdjustment).not.toHaveBeenCalled();
});
