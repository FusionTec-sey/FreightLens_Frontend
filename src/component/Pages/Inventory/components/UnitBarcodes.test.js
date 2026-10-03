import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UnitBarcodes from "./UnitBarcodes";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
let api;
const product = { id: 7, name: "Tile" };
beforeEach(() => {
  api = { unitBarcodes: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }),
    activePolicy: jest.fn().mockResolvedValue({ data: { status: "ACTIVE", version: 2,
      config: { base_unit: "M2", conversions: [{ unit: "BOX", factor: "1.44000000" }] } } }),
    createUnitBarcode: jest.fn(), resolveUnitBarcode: jest.fn() };
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "stable-key") } });
});

test("retirement request preserves its reason and retry key after a failure", async () => {
  api.unitBarcodes.mockResolvedValue({ data: { items: [{ id: 9, barcode: "WRONG", unit: "BOX", base_quantity: "1.44000000", base_unit: "M2", policy_version: 2 }], total: 1, pages: 1 } });
  api.requestBarcodeRetirement = jest.fn().mockRejectedValue(new Error("Offline"));
  render(<UnitBarcodes api={api} product={product} canRequestRetirement onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Request retirement WRONG" }));
  fireEvent.change(screen.getByLabelText("Review request reason"), { target: { value: "Incorrect label" } });
  fireEvent.click(screen.getByRole("button", { name: "Request retirement review" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Review request reason")).toHaveValue("Incorrect label");
  fireEvent.click(screen.getByRole("button", { name: "Request retirement review" }));
  await waitFor(() => expect(api.requestBarcodeRetirement).toHaveBeenCalledTimes(2));
  expect(api.requestBarcodeRetirement.mock.calls[0][0]).toEqual({ operation_key: "stable-key", barcode_id: 9, expected_source_version: 1, reason: "Incorrect label" });
  expect(api.requestBarcodeRetirement.mock.calls[1][0]).toEqual(api.requestBarcodeRetirement.mock.calls[0][0]);
  await waitFor(() => expect(screen.getByRole("button", { name: "Back to barcodes" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Back to barcodes" }));
  expect(screen.getByRole("button", { name: "Discard barcode draft" })).toBeInTheDocument();
});

test.each([true, false])("retired barcode history is visible without another retirement action (%s)", async (canRequestRetirement) => {
  api.unitBarcodes.mockResolvedValue({ data: { items: [{ id: 9, barcode: "RETIRED", retired: true }], total: 1, pages: 1 } });
  render(<UnitBarcodes api={api} product={product} canRequestRetirement={canRequestRetirement} onClose={jest.fn()} />);
  expect(await screen.findByText("Retired — cannot reuse")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Request retirement/ })).not.toBeInTheDocument();
});

test("uses only active units and preserves failed registration with stable retries", async () => {
  api.createUnitBarcode.mockRejectedValue({ response: { data: { detail: "Barcode already registered" } } });
  render(<UnitBarcodes api={api} product={product} canManage onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Add unit barcode" }));
  expect(screen.getByRole("button", { name: "Register barcode" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Barcode"), { target: { value: "000-BOX" } });
  fireEvent.change(screen.getByLabelText("Barcode unit"), { target: { value: "BOX" } });
  fireEvent.click(screen.getByRole("button", { name: "Register barcode" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Barcode already registered");
  fireEvent.click(screen.getByRole("button", { name: "Register barcode" }));
  await waitFor(() => expect(api.createUnitBarcode).toHaveBeenCalledTimes(2));
  expect(api.createUnitBarcode.mock.calls[0][1]).toEqual(api.createUnitBarcode.mock.calls[1][1]);
  expect(api.createUnitBarcode.mock.calls[0][1]).toEqual({ operation_key: "stable-key", expected_policy_version: 2, barcode: "000-BOX", unit: "BOX" });
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Back to barcodes" }));
  expect(screen.getByRole("button", { name: "Discard barcode draft" })).toBeInTheDocument();
});

test("requires active policy and respects read-only access", async () => {
  api.activePolicy.mockResolvedValue({ data: { status: "NOT_ACTIVE" } });
  render(<UnitBarcodes api={api} product={product} onClose={jest.fn()} />);
  expect(await screen.findByText(/reviewed active policy is required/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add unit barcode" })).not.toBeInTheDocument();
});

test("lookup preserves decimal strings and does not imply a sale", async () => {
  api.resolveUnitBarcode.mockResolvedValue({ data: { product_id: 7, unit: "BOX", base_quantity: "1.44000000", base_unit: "M2" } });
  render(<UnitBarcodes api={api} product={product} canManage onClose={jest.fn()} />);
  fireEvent.change(await screen.findByLabelText("Check registered barcode"), { target: { value: "000-BOX" } });
  fireEvent.click(screen.getByRole("button", { name: "Check barcode" }));
  expect(await screen.findByRole("status")).toHaveTextContent("BOX = 1.44000000 M2. Lookup does not reserve or sell stock.");
});

test("list is paginated and failed refresh removes stale results", async () => {
  api.unitBarcodes.mockResolvedValueOnce({ data: { items: [{ id: 1, barcode: "OLD", unit: "BOX", base_quantity: "1.44000000", base_unit: "M2", policy_version: 1, eligible: false }], total: 26, pages: 2 } })
    .mockRejectedValue(new Error("Offline"));
  render(<UnitBarcodes api={api} product={product} onClose={jest.fn()} />);
  await screen.findByText("OLD");
  fireEvent.click(screen.getByTitle("Next Page"));
  await screen.findByRole("button", { name: "Retry barcodes" });
  expect(screen.queryByText("OLD")).not.toBeInTheDocument();
  expect(api.unitBarcodes).toHaveBeenLastCalledWith(7, 2, 25, expect.any(AbortSignal));
});

test("a pending registration cannot submit twice or discard its fields", async () => {
  let finish;
  api.createUnitBarcode.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  render(<UnitBarcodes api={api} product={product} canManage onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Add unit barcode" }));
  fireEvent.change(screen.getByLabelText("Barcode"), { target: { value: "000-M2" } });
  fireEvent.change(screen.getByLabelText("Barcode unit"), { target: { value: "M2" } });
  fireEvent.click(screen.getByRole("button", { name: "Register barcode" }));
  fireEvent.click(screen.getByRole("button", { name: "Registering…" }));
  expect(screen.getByRole("button", { name: "Back to barcodes" })).toBeDisabled();
  expect(api.createUnitBarcode).toHaveBeenCalledTimes(1);
  finish({});
  await screen.findByRole("button", { name: "Add unit barcode" });
});
