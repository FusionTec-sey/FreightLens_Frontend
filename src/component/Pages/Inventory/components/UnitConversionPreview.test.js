import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import UnitConversionPreview from "./UnitConversionPreview";
const config = { base_unit: "PCS", tracking: "UNTRACKED", conversions: [{ unit: "BOX", factor: "12" }] };

test("uses exact strings and clears result when inputs change", async () => {
  const api = { previewPolicyUnit: jest.fn().mockResolvedValue({ data: { base_quantity: "6.000000", base_unit: "PCS", quantity_step: "1" } }) };
  render(<UnitConversionPreview api={api} productId={7} config={config} />);
  fireEvent.change(screen.getByLabelText("Test quantity"), { target: { value: "0.5" } });
  fireEvent.change(screen.getByLabelText("Test unit"), { target: { value: "BOX" } });
  fireEvent.click(screen.getByRole("button", { name: "Check conversion" }));
  expect(await screen.findByRole("status")).toHaveTextContent("6.000000 PCS");
  expect(api.previewPolicyUnit).toHaveBeenCalledWith(7, { config, quantity: "0.5", unit: "BOX" }, expect.any(AbortSignal));
  fireEvent.change(screen.getByLabelText("Test quantity"), { target: { value: "0.1" } });
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("aborts stale results and keeps failed inputs", async () => {
  let done;
  const api = { previewPolicyUnit: jest.fn().mockImplementation(() => new Promise((resolve) => { done = resolve; })) };
  const view = render(<UnitConversionPreview api={api} productId={7} config={config} />);
  fireEvent.click(screen.getByRole("button", { name: "Check conversion" }));
  const signal = api.previewPolicyUnit.mock.calls[0][2];
  fireEvent.change(screen.getByLabelText("Test quantity"), { target: { value: "0.1" } });
  await act(async () => done({ data: { base_quantity: "12.000000" } }));
  expect(signal.aborted).toBe(true);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  api.previewPolicyUnit.mockRejectedValue({ response: { data: { detail: "Rounding is not allowed" } } });
  fireEvent.click(screen.getByRole("button", { name: "Check conversion" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Rounding is not allowed");
  expect(screen.getByLabelText("Test quantity")).toHaveValue("0.1");
  view.unmount();
  expect(api.previewPolicyUnit.mock.calls[1][2].aborted).toBe(true);
});
