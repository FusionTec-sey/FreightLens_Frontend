import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import InventoryPolicyDraft from "./InventoryPolicyDraft";
import { inventoryLocationsApi } from "../../../../services/inventoryLocationsApi";
import { useAuth } from "../../../../context/AuthContext";
jest.mock("../../../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../services/inventoryLocationsApi", () => ({ inventoryLocationsApi: jest.fn() }));
const product = { id: 7, name: "Tile" };
const empty = { data: { product_id: 7, current_base_unit: "PCS", version: 0, status: "NOT_CONFIGURED", config: null } };
let api, auth;
beforeEach(() => {
  auth = { token: "token", orgId: 1 };
  useAuth.mockImplementation(() => auth);
  api = { policyDraft: jest.fn().mockResolvedValue(empty), savePolicyDraft: jest.fn(), activePolicy: jest.fn().mockResolvedValue({ data: { status: "NOT_ACTIVE" } }) };
  inventoryLocationsApi.mockReturnValue(api);
});

test("unsent review reason is protected by the draft discard confirmation", async () => {
  auth.permissions = ["Request_InventoryReview"];
  api.policyDraft.mockResolvedValue({ data: { ...empty.data, version: 1, config: { base_unit: "PCS", quantity_step: "1",
    tracking: "UNTRACKED", conversions: [] } } });
  const close = jest.fn();
  render(<InventoryPolicyDraft product={product} canEdit onClose={close} />);
  fireEvent.change(await screen.findByLabelText("Review request reason"), { target: { value: "Please check this policy" } });
  fireEvent.click(screen.getByRole("button", { name: "Close draft" }));
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Discard and close" })).toBeInTheDocument();
});

test("requires explicit tracking, supports batch fields and preserves failed save", async () => {
  api.savePolicyDraft.mockRejectedValue({ response: { data: { detail: "Draft changed" } } });
  render(<InventoryPolicyDraft product={product} canEdit onClose={jest.fn()} />);
  const tracking = await screen.findByLabelText("Tracking mode");
  expect(tracking).toHaveValue("");
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  fireEvent.change(tracking, { target: { value: "BATCH" } });
  fireEvent.click(screen.getByLabelText("Match tile shade"));
  fireEvent.click(screen.getByRole("button", { name: "Add alternate unit" }));
  fireEvent.change(screen.getByLabelText("Unit 1"), { target: { value: "BOX" } });
  fireEvent.change(screen.getByLabelText("Base units per unit 1"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Draft changed");
  expect(screen.getByLabelText("Unit 1")).toHaveValue("BOX");
  expect(api.savePolicyDraft).toHaveBeenCalledWith(7, expect.objectContaining({ expected_version: 0,
    config: expect.objectContaining({ tracking: "BATCH", require_shade: true, conversions: [{ unit: "BOX", factor: "12" }] }) }), expect.any(AbortSignal));
});

test("serial mode resets batch flags and requires whole units", async () => {
  render(<InventoryPolicyDraft product={product} canEdit onClose={jest.fn()} />);
  fireEvent.change(await screen.findByLabelText("Tracking mode"), { target: { value: "BATCH" } });
  fireEvent.click(screen.getByLabelText("Require expiry date"));
  fireEvent.change(screen.getByLabelText("Quantity increment"), { target: { value: "0.001" } });
  fireEvent.change(screen.getByLabelText("Tracking mode"), { target: { value: "SERIAL" } });
  expect(screen.getByLabelText("Quantity increment")).toHaveValue("1");
  expect(screen.queryByLabelText("Require expiry date")).not.toBeInTheDocument();
});

test("duplicate submit is guarded and confirmed save updates version", async () => {
  let done;
  api.savePolicyDraft.mockImplementation(() => new Promise((resolve) => { done = resolve; }));
  render(<InventoryPolicyDraft product={product} canEdit onClose={jest.fn()} />);
  fireEvent.change(await screen.findByLabelText("Tracking mode"), { target: { value: "UNTRACKED" } });
  const form = screen.getByRole("button", { name: "Save draft" }).closest("form");
  fireEvent.submit(form); fireEvent.submit(form);
  expect(api.savePolicyDraft).toHaveBeenCalledTimes(1);
  await act(async () => done({ data: { ...empty.data, version: 1, config: api.savePolicyDraft.mock.calls[0][1].config } }));
  expect(screen.getByRole("status")).toHaveTextContent("Draft saved");
});

test("unsaved close requires explicit discard", async () => {
  const close = jest.fn();
  render(<InventoryPolicyDraft product={product} canEdit onClose={close} />);
  fireEvent.change(await screen.findByLabelText("Tracking mode"), { target: { value: "UNTRACKED" } });
  fireEvent.click(screen.getByRole("button", { name: "Close draft" }));
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  expect(screen.getByLabelText("Tracking mode")).toHaveValue("UNTRACKED");
  fireEvent.click(screen.getByRole("button", { name: "Close draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard and close" }));
  expect(close).toHaveBeenCalledTimes(1);
});

test("read-only users cannot save", async () => {
  render(<InventoryPolicyDraft product={product} canEdit={false} onClose={jest.fn()} />);
  expect(await screen.findByLabelText("Tracking mode")).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
});

test("organisation change aborts old request", async () => {
  const { rerender } = render(<InventoryPolicyDraft product={product} canEdit onClose={jest.fn()} />);
  await screen.findByLabelText("Tracking mode");
  const signal = api.policyDraft.mock.calls[0][1];
  auth = { ...auth, selectedOrgId: 2 };
  rerender(<InventoryPolicyDraft product={product} canEdit onClose={jest.fn()} />);
  await screen.findByLabelText("Tracking mode");
  expect(signal.aborted).toBe(true);
  expect(inventoryLocationsApi).toHaveBeenLastCalledWith("token", 2);
});
