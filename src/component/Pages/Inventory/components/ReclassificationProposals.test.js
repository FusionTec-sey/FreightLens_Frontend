import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
import ReclassificationProposals from "./ReclassificationProposals";
jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: true }) }));
const balance = { id: 3, product_name: "Tile", sku: "TILE" };
const row = { proposal_key: "demo-key", reason: "Audited stock", target_tracking: "BATCH", balance_version: 1, active_version: 2, draft_version: 3, created_at: "2026-10-03" };
const data = { items: [row], total: 26, pages: 2 };

test("review navigation is bound to the selected proposal", async () => {
  const api = { reclassificationProposals: jest.fn().mockResolvedValue({ data }),
    reclassificationProposal: jest.fn().mockResolvedValue({ data: detail }),
    reclassificationCases: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<ReclassificationProposals api={api} balance={balance} canReview userId={8} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View proposal" }));
  fireEvent.click(await screen.findByRole("button", { name: "Proposal review cases" }));
  await screen.findByText("No reclassification proposal review cases.");
  expect(api.reclassificationCases).toHaveBeenCalledWith("demo-key", 1, 25, expect.any(AbortSignal), "ALL");
  fireEvent.click(screen.getByRole("button", { name: "Back to proposal" }));
  await screen.findByText("Historical proposal detail");
});
const detail = { ...row, snapshot: { balance_version: 1, active_version: 2, draft_version: 3,
  original_policy: { tracking: "UNTRACKED" }, target_policy: { tracking: "BATCH", base_unit: "M2" },
  quantities: { on_hand: "999999999999.123456", reserved: "0.000000", damaged: "1.000000", quarantined: "0.000000" } },
  manifest: { batches: [{ identity: { batch_key: "batch", code: "LOT-001", shade: "A" }, on_hand: "999999999999.123456", damaged: "1", quarantined: "0" }], serials: null } };

test("loads scoped pages and read-only exact manifest detail", async () => {
  const api = { reclassificationProposals: jest.fn().mockResolvedValue({ data }), reclassificationProposal: jest.fn().mockResolvedValue({ data: detail }) };
  render(<ReclassificationProposals api={api} balance={balance} onClose={jest.fn()} />);
  await screen.findByText("Audited stock");
  fireEvent.click(screen.getByTitle("Next Page"));
  await waitFor(() => expect(api.reclassificationProposals).toHaveBeenLastCalledWith(3, 2, 25, expect.any(AbortSignal)));
  fireEvent.click(await screen.findByRole("button", { name: "View proposal" }));
  await screen.findByText("LOT-001");
  expect(screen.getAllByText("999999999999.123456")).toHaveLength(2);
  expect(screen.getByText(/Conversion is disabled/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /approve|convert|save/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to proposals" }));
  await screen.findByRole("button", { name: "View proposal" });
});

test("failed refresh clears stale rows and retry shows empty state", async () => {
  const api = { reclassificationProposals: jest.fn().mockResolvedValueOnce({ data }).mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<ReclassificationProposals api={api} balance={balance} onClose={jest.fn()} />);
  await screen.findByText("Audited stock");
  fireEvent.click(screen.getByRole("button", { name: "Refresh proposals" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("Audited stock")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry proposals" }));
  await screen.findByText(/No saved proposals/);
});

test("company change aborts late detail and removes old selection", async () => {
  let finish;
  const api = { reclassificationProposals: jest.fn().mockResolvedValue({ data }), reclassificationProposal: jest.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; })) };
  const view = render(<ReclassificationProposals api={api} balance={balance} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View proposal" }));
  const signal = api.reclassificationProposal.mock.calls[0][1];
  const nextApi = { reclassificationProposals: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  view.rerender(<ReclassificationProposals api={nextApi} balance={balance} onClose={jest.fn()} />);
  expect(signal.aborted).toBe(true);
  await act(async () => finish({ data: detail }));
  await screen.findByText(/No saved proposals/);
  expect(screen.queryByText("LOT-001")).not.toBeInTheDocument();
});

test("leaving aborts an outstanding list request", () => {
  const api = { reclassificationProposals: jest.fn().mockReturnValue(new Promise(() => {})) };
  const view = render(<ReclassificationProposals api={api} balance={balance} onClose={jest.fn()} />);
  const signal = api.reclassificationProposals.mock.calls[0][3];
  view.unmount(); expect(signal.aborted).toBe(true);
});
