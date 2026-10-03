import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PolicyReviewRequest from "./PolicyReviewRequest";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
const props = { productId: 1, version: 2, disabled: false, panel: "", button: "", onBusyChange: jest.fn() };
test("proposal review uses the saved proposal reference, not policy activation", async () => {
  const api = { requestReclassificationReview: jest.fn().mockResolvedValue({ data: { case_key: "proposal-case" } }) };
  render(<PolicyReviewRequest {...props} proposalKey="proposal" api={api} />);
  fireEvent.change(screen.getByLabelText("Review request reason"), { target: { value: "Audited identities" } });
  fireEvent.click(screen.getByRole("button", { name: "Request proposal review" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Review requested: proposal-case");
  expect(api.requestReclassificationReview).toHaveBeenCalledWith("proposal",
    { reason: "Audited identities", operation_key: "request-key" }, expect.any(AbortSignal));
});
beforeEach(() => Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "request-key") } }));

test("unsaved drafts cannot be submitted for review", () => {
  render(<PolicyReviewRequest {...props} disabled api={{}} />);
  expect(screen.getByRole("button", { name: "Request activation review" })).toBeDisabled();
});

test("request binds product/version/reason and blocks duplicate submission", async () => {
  let done;
  const api = { requestPolicyReview: jest.fn(() => new Promise((resolve) => { done = resolve; })) };
  render(<PolicyReviewRequest {...props} api={api} />);
  fireEvent.change(screen.getByLabelText("Review request reason"), { target: { value: "Please check units" } });
  fireEvent.click(screen.getByRole("button", { name: "Request activation review" }));
  fireEvent.click(screen.getByRole("button", { name: "Requesting…" }));
  expect(api.requestPolicyReview).toHaveBeenCalledTimes(1);
  expect(api.requestPolicyReview.mock.calls[0][0]).toEqual({ product_id: 1, expected_source_version: 2,
    reason: "Please check units", operation_key: "request-key" });
  await act(async () => done({ data: { case_key: "case" } }));
  expect(screen.getByRole("status")).toHaveTextContent("Review requested: case");
});

test("uncertain request keeps the same retry key", async () => {
  const api = { requestPolicyReview: jest.fn().mockRejectedValue(new Error("offline")) };
  render(<PolicyReviewRequest {...props} api={api} />);
  fireEvent.change(screen.getByLabelText("Review request reason"), { target: { value: "Please check units" } });
  fireEvent.click(screen.getByRole("button", { name: "Request activation review" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Request activation review" }));
  await waitFor(() => expect(api.requestPolicyReview).toHaveBeenCalledTimes(2));
  expect(api.requestPolicyReview.mock.calls[0][0]).toEqual(api.requestPolicyReview.mock.calls[1][0]);
  await screen.findByRole("alert");
});
