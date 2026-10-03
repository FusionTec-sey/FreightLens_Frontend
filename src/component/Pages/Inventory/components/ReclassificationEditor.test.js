import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
import ReclassificationEditor from "./ReclassificationEditor";
const balance = { id: 3, product_id: 7, version: 4, product_name: "Tool", tracking_policy: "UNTRACKED", reserved: "0.000000", on_hand: "3.000000", damaged: "1.000000", quarantined: "1.000000" };
const apiFor = tracking => ({ activePolicy: jest.fn().mockResolvedValue({ data: { version: 1 } }),
  policyDraft: jest.fn().mockResolvedValue({ data: { version: 2, config: { tracking, base_unit: "PCS" } } }),
  saveReclassificationProposal: jest.fn().mockResolvedValue({ data: { proposal_key: "saved" } }) });
beforeEach(() => { let counter = 0; Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => `key-${++counter}`) } }); });

test("policy load failure can be retried without leaving the editor", async () => {
  const api = apiFor("BATCH");
  api.activePolicy.mockRejectedValueOnce(new Error("offline"));
  render(<ReclassificationEditor api={api} balance={balance} onSaved={jest.fn()} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Retry loading policies" }));
  await screen.findByLabelText("Proposal reason");
  expect(api.activePolicy).toHaveBeenCalledTimes(2);
});

test("batch form preserves exact strings and retries the same failed save", async () => {
  const api = apiFor("BATCH"), onSaved = jest.fn();
  api.saveReclassificationProposal.mockRejectedValueOnce({ response: { data: { detail: "Uncertain save; retry" } } }).mockResolvedValue({ data: { proposal_key: "saved" } });
  render(<ReclassificationEditor api={api} balance={balance} onSaved={onSaved} onClose={jest.fn()} />);
  fireEvent.change(await screen.findByLabelText("Proposal reason"), { target: { value: "Audited" } });
  fireEvent.click(screen.getByRole("button", { name: "Add audited batch" }));
  fireEvent.change(screen.getByLabelText("Batch code"), { target: { value: "LOT-01" } });
  fireEvent.change(screen.getByLabelText("On-hand"), { target: { value: "3.000000" } });
  fireEvent.click(screen.getByRole("button", { name: "Save proposal" }));
  await screen.findByText("Uncertain save; retry");
  const first = api.saveReclassificationProposal.mock.calls[0][0];
  expect(first).toMatchObject({ expected_balance_version: 4, expected_active_version: 1, expected_draft_version: 2 });
  expect(first.batches[0].on_hand).toBe("3.000000");
  fireEvent.click(screen.getByRole("button", { name: "Save proposal" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith("saved"));
  expect(api.saveReclassificationProposal.mock.calls[1][0]).toEqual(first);
});

test("serial entry requires explicit conditions and protects unsaved text", async () => {
  const api = apiFor("SERIAL"), close = jest.fn();
  render(<ReclassificationEditor api={api} balance={balance} onSaved={jest.fn()} onClose={close} />);
  fireEvent.change(await screen.findByLabelText("Proposal reason"), { target: { value: "Serial audit" } });
  fireEvent.change(screen.getByLabelText(/Serial manifest/), { target: { value: "0001" } });
  fireEvent.click(screen.getByRole("button", { name: "Save proposal" }));
  await screen.findByText(/Each serial line must/);
  expect(api.saveReclassificationProposal).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Back to proposals" }));
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  fireEvent.change(screen.getByLabelText(/Serial manifest/), { target: { value: "0001 | AVAILABLE\n0002 | DAMAGED\n0003 | QUARANTINED" } });
  fireEvent.click(screen.getByRole("button", { name: "Save proposal" }));
  await waitFor(() => expect(api.saveReclassificationProposal).toHaveBeenCalledTimes(1));
  expect(api.saveReclassificationProposal.mock.calls[0][0].serials.items[0].serial_number).toBe("0001");
});

test("reserved stock blocks entry instead of releasing it", async () => {
  const api = apiFor("BATCH");
  render(<ReclassificationEditor api={api} balance={{ ...balance, reserved: "1.000000" }} onSaved={jest.fn()} onClose={jest.fn()} />);
  await screen.findByText(/no reserved quantity are required/);
  expect(screen.getByRole("button", { name: "Save proposal" })).toBeDisabled();
  expect(api.saveReclassificationProposal).not.toHaveBeenCalled();
});
