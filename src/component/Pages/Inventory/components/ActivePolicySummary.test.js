import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ActivePolicySummary from "./ActivePolicySummary";

test("shows the active snapshot separately from a newer draft", async () => {
  const api = { activePolicy: jest.fn().mockResolvedValue({ data: { status: "ACTIVE", version: 1, draft_version: 3,
    config: { tracking: "BATCH", base_unit: "M2", quantity_step: "0.01" } } }) };
  render(<ActivePolicySummary api={api} productId={7} />);
  expect(await screen.findByText(/from reviewed draft 3/)).toBeInTheDocument();
  expect(screen.getByText(/Saving another draft does not replace/)).toBeInTheDocument();
});

test("failed load never labels a policy inactive and permits retry", async () => {
  const api = { activePolicy: jest.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue({ data: { status: "NOT_ACTIVE" } }) };
  render(<ActivePolicySummary api={api} productId={7} />);
  fireEvent.click(await screen.findByRole("button", { name: "Retry active policy" }));
  expect(await screen.findByText(/No reviewed policy is active/)).toBeInTheDocument();
});
