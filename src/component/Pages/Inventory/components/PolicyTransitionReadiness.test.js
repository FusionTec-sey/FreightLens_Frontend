import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import PolicyTransitionReadiness from "./PolicyTransitionReadiness";

const data = { draft_version: 2, active_version: 1, changed_fields: ["quantity_step"], blockers: [], route: "EMPTY_REVISION_REVIEW" };

test("compatible unit additions are labelled separately from stock conversion", async () => {
  const api = { policyTransitionReadiness: jest.fn().mockResolvedValue({ data: { ...data, route: "COMPATIBLE_REVISION_REVIEW", changed_fields: ["conversions"] } }) };
  render(<PolicyTransitionReadiness api={api} productId={7} />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("status")).toHaveTextContent("Alternate-unit extension: existing stock, reservations and barcode meanings are preserved");
});

test("comparison displays exact saved factors and before/after rules even when blocked", async () => {
  const active_config = { base_unit: "M2", quantity_step: "0.1", tracking: "BATCH", require_shade: true, conversions: [{ unit: "BOX", factor: "1.44000000" }] };
  const proposed_config = { ...active_config, quantity_step: "0.01", conversions: [{ unit: "BOX", factor: "1.44500000" }] };
  const api = { policyTransitionReadiness: jest.fn().mockResolvedValue({ data: { ...data, active_config, proposed_config, route: "BLOCKED", blockers: ["Stock conversion required"] } }) };
  render(<PolicyTransitionReadiness api={api} productId={7} />);
  fireEvent.click(screen.getByRole("button"));
  const table = await screen.findByRole("table", { name: "Saved policy comparison" });
  expect(within(table).getByText("BOX = 1.44000000 M2")).toBeInTheDocument();
  expect(within(table).getByText("BOX = 1.44500000 M2")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Stock conversion required");
  expect(screen.queryByText(/Eligible for manager/)).not.toBeInTheDocument();
});

test.each(["product", "editing"])("%s change aborts and clears an obsolete result", async (change) => {
  let finish;
  const api = { policyTransitionReadiness: jest.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; })) };
  const view = render(<PolicyTransitionReadiness api={api} productId={7} />);
  fireEvent.click(screen.getByRole("button"));
  const signal = api.policyTransitionReadiness.mock.calls[0][1];
  view.rerender(<PolicyTransitionReadiness api={api} productId={change === "product" ? 8 : 7} disabled={change === "editing"} />);
  expect(signal.aborted).toBe(true);
  await act(async () => finish({ data }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
test("checks saved rules without posting and clears stale results after failed refresh", async () => {
  const api = { policyTransitionReadiness: jest.fn().mockResolvedValue({ data }) };
  render(<PolicyTransitionReadiness api={api} productId={7} />);
  expect(screen.getByText(/Every existing code must first complete reviewed retirement/)).toHaveTextContent("retired codes stay reserved and cannot be reused");
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("status")).toHaveTextContent("Changes: Quantity increment");
  expect(screen.getByRole("status")).toHaveTextContent("advisory, not approval");
  expect(api.policyTransitionReadiness).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  api.policyTransitionReadiness.mockRejectedValue(new Error("offline"));
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be verified");
  expect(screen.queryByText(/Eligible for manager/)).not.toBeInTheDocument();
});

test("shows blockers, protects unsaved drafts and cancels stale checks on unmount", async () => {
  const api = { policyTransitionReadiness: jest.fn().mockResolvedValue({ data: { ...data, route: "BLOCKED", blockers: ["Existing stock history requires review"] } }) };
  const view = render(<PolicyTransitionReadiness api={api} productId={7} disabled />);
  expect(screen.getByRole("button")).toBeDisabled();
  view.rerender(<PolicyTransitionReadiness api={api} productId={7} />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("status")).toHaveTextContent("Existing stock history requires review");
  let finish;
  api.policyTransitionReadiness.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(screen.getByRole("button"));
  expect(api.policyTransitionReadiness).toHaveBeenCalledTimes(2);
  const signal = api.policyTransitionReadiness.mock.calls[1][1];
  view.unmount(); expect(signal.aborted).toBe(true);
  await act(async () => finish({ data }));
});

test("identical saved rules do not suggest an unnecessary review", async () => {
  const api = { policyTransitionReadiness: jest.fn().mockResolvedValue({ data: { ...data, changed_fields: [], route: "NO_CHANGE" } }) };
  render(<PolicyTransitionReadiness api={api} productId={7} />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("no transition is needed"));
});
