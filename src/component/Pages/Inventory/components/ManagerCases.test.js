import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManagerCases from "./ManagerCases";
jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: true }) }));
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
const row = { case_key: "case", version: 1, status: "REQUESTED", product_name: "Tile", source_version: 3,
  config: { base_unit: "M2", tracking: "BATCH", quantity_step: "0.01", conversions: [] }, requestor_id: 7,
  reason: "Review tile rules", requested_at: "2026-10-02T08:00:00Z" };
let api;

test.each([7, 9])('cost allocation creator/requester %s cannot approve, and exact amounts remain strings', async (userId) => {
  const cost = { ...row, creator_id: 9, charge_reference: 'FREIGHT-TEST', declaration_reason: 'Declared freight',
    snapshot: { total_scr: '0.000001', basis: 'GOODS_VALUE', lines: [{ valuation_id: 5, balance_id: 6,
      product_name: 'Tile', basis_value: '10.000000', allocated_scr: '0.000001' }] } };
  api.managerCases.mockResolvedValue({ data: { items: [cost], total: 1, pages: 1 } });
  render(<ManagerCases costAllocation api={api} userId={userId} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review case FREIGHT-TEST' }));
  expect(screen.getByRole('button', { name: 'Approve exact allocation' })).toBeDisabled();
  expect(screen.getByText('0.000001')).toBeInTheDocument();
  expect(screen.getByText(/Creator #9/)).toBeInTheDocument();
});

test('financial viewer can inspect allocation but cannot decide or execute', async () => {
  api.managerCases.mockResolvedValue({ data: { items: [{ ...row, charge_reference: 'FREIGHT-TEST',
    creator_id: 9, snapshot: { total_scr: '1.000000', basis: 'GOODS_VALUE', lines: [] } }], total: 1, pages: 1 } });
  render(<ManagerCases costAllocation canActivate canReview={false} api={api} userId={8} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review case FREIGHT-TEST' }));
  expect(screen.queryByRole('button', { name: /Approve|Activate|Post/ })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Decision reason')).not.toBeInTheDocument();
});

test('approved allocation never offers activation even when canActivate is supplied', async () => {
  api.managerCases.mockResolvedValue({ data: { items: [{ ...row, status: 'APPROVED', charge_reference: 'FREIGHT-TEST',
    creator_id: 9, snapshot: { total_scr: '1.000000', basis: 'GOODS_VALUE', lines: [] } }], total: 1, pages: 1 } });
  render(<ManagerCases costAllocation canActivate api={api} userId={8} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review case FREIGHT-TEST' }));
  expect(screen.queryByRole('button', { name: /Approve|Activate|Post/ })).not.toBeInTheDocument();
});
test("proposal review shows its manifest and never enables stock execution", async () => {
  api.managerCases.mockResolvedValue({ data: { items: [{ ...row, status: "APPROVED" }], total: 1, pages: 1 } });
  render(<ManagerCases reclassification canActivate api={api} userId={8} onClose={jest.fn()} reviewDetails={<p>Exact audited manifest</p>} />);
  expect(screen.getByRole("button", { name: "Back to proposal" })).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Review case Tile" }));
  expect(screen.getByText("Exact audited manifest")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Activate/ })).not.toBeInTheDocument();
});
beforeEach(() => {
  api = { managerCases: jest.fn().mockResolvedValue({ data: { items: [row], total: 26, pages: 2 } }), reviewPolicyCase: jest.fn() };
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "review-key") } });
});

test("barcode case displays retirement-specific review controls", async () => {
  render(<ManagerCases retirement standalone api={api} userId={8} onClose={jest.fn()} />);
  expect(screen.getByRole("heading", { name: "Approvals — barcode retirement" })).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Review case Tile" }));
  expect(screen.getByRole("button", { name: "Approve barcode retirement" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Approve exact policy" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "Checked code" } });
  expect(screen.getByRole("button", { name: "Approve barcode retirement" })).toBeEnabled();
});

test("standalone review queue filters on server and resets pagination", async () => {
  render(<ManagerCases standalone api={api} userId={8} onClose={jest.fn()} />);
  await screen.findByRole("button", { name: "Review case Tile" });
  expect(api.managerCases).toHaveBeenLastCalledWith(1, 25, expect.any(AbortSignal), "NEEDS_MY_REVIEW");
  fireEvent.click(screen.getByTitle("Next Page"));
  await waitFor(() => expect(api.managerCases).toHaveBeenLastCalledWith(2, 25, expect.any(AbortSignal), "NEEDS_MY_REVIEW"));
  fireEvent.change(screen.getByLabelText("Case view"), { target: { value: "MY_REQUESTS" } });
  await waitFor(() => expect(api.managerCases).toHaveBeenLastCalledWith(1, 25, expect.any(AbortSignal), "MY_REQUESTS"));
});

test("obsolete queue responses cannot overwrite a newly selected view", async () => {
  let resolveOld;
  api.managerCases.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ data: { items: [], total: 0, pages: 1 } });
  render(<ManagerCases standalone api={api} userId={8} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Case view"), { target: { value: "MY_REQUESTS" } });
  await screen.findByText("You have no policy review requests in this company.");
  resolveOld({ data: { items: [row], total: 1, pages: 1 } });
  await waitFor(() => expect(screen.queryByText("Tile")).not.toBeInTheDocument());
  expect(api.managerCases.mock.calls[0][2].aborted).toBe(true);
});

test("manager inbox paginates and shows the exact reviewed policy", async () => {
  render(<ManagerCases api={api} userId={8} onClose={jest.fn()} />);
  await screen.findByRole("button", { name: "Review case Tile" });
  fireEvent.click(screen.getByTitle("Next Page"));
  await waitFor(() => expect(api.managerCases).toHaveBeenLastCalledWith(2, 25, expect.any(AbortSignal), "ALL"));
  fireEvent.click(await screen.findByRole("button", { name: "Review case Tile" }));
  expect(screen.getByText(/"quantity_step": "0.01"/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approve exact policy" })).toBeDisabled();
});

test("self review is blocked in the UI as well as backend", async () => {
  render(<ManagerCases api={api} userId={7} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Review case Tile" }));
  expect(screen.getByText("You cannot review your own request.")).toBeInTheDocument();
  expect(screen.getByLabelText("Decision reason")).toBeDisabled();
});

test("failed decision retains reason and retry identity, with discard confirmation", async () => {
  api.reviewPolicyCase.mockRejectedValue({ response: { data: { detail: "Draft changed" } } });
  render(<ManagerCases api={api} userId={8} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Review case Tile" }));
  fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "Checked configuration" } });
  fireEvent.click(screen.getByRole("button", { name: "Approve exact policy" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Draft changed");
  fireEvent.click(screen.getByRole("button", { name: "Approve exact policy" }));
  await waitFor(() => expect(api.reviewPolicyCase).toHaveBeenCalledTimes(2));
  expect(api.reviewPolicyCase.mock.calls[0][1]).toEqual(api.reviewPolicyCase.mock.calls[1][1]);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Back to cases" }));
  expect(screen.getByRole("button", { name: "Discard decision draft" })).toBeInTheDocument();
});
