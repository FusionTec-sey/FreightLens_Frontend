import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import BranchSettings from "./BranchSettings";
jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: true }) }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn() } }));
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
const empty = { branch_id: 1, version: 0, status: "NOT_CONFIGURED", missing_fields: ["timezone_name", "weekday_cutoff", "weekend_cutoff", "trading_weekdays"],
  config: { timezone_name: null, weekday_cutoff: null, weekend_cutoff: null, trading_weekdays: null, date_overrides: [] } };
let api;
const props = { branch: { id: 1, name: "Synthetic", is_active: true }, canManage: true, onClose: jest.fn() };
beforeEach(() => {
  api = { branchSettings: jest.fn().mockResolvedValue({ data: empty }), saveBranchSettings: jest.fn() };
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn().mockReturnValue("00000000-0000-4000-8000-000000000001") } });
});

test("does not invent settings and supports explicit Saturday and date overrides", async () => {
  render(<BranchSettings api={api} {...props} />);
  expect(await screen.findByLabelText(/IANA timezone/)).toHaveValue("");
  expect(screen.getByLabelText("Configure weekly trading days")).not.toBeChecked();
  fireEvent.click(screen.getByLabelText("Configure weekly trading days"));
  fireEvent.click(screen.getByLabelText("Saturday"));
  expect(screen.getByLabelText("Saturday")).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Add date exception" }));
  expect(screen.getByLabelText("Exception date 1")).toHaveValue("");
  expect(screen.getByLabelText("Open for trading")).not.toBeChecked();
});

test("failed saves retain input and reuse operation key on unchanged retry", async () => {
  api.saveBranchSettings.mockRejectedValue({ response: { data: { detail: "Save uncertain" } } });
  render(<BranchSettings api={api} {...props} />);
  fireEvent.change(await screen.findByLabelText(/IANA timezone/), { target: { value: "Indian/Mahe" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings revision" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Save uncertain");
  expect(screen.getByLabelText(/IANA timezone/)).toHaveValue("Indian/Mahe");
  fireEvent.click(screen.getByRole("button", { name: "Save settings revision" }));
  await waitFor(() => expect(api.saveBranchSettings).toHaveBeenCalledTimes(2));
  expect(api.saveBranchSettings.mock.calls[0][1]).toEqual(api.saveBranchSettings.mock.calls[1][1]);
  expect(window.crypto.randomUUID).toHaveBeenCalledTimes(1);
  await screen.findByRole("alert");
});

test("duplicate submit is blocked and confirmed revision disables save", async () => {
  let done;
  api.saveBranchSettings.mockImplementation(() => new Promise((resolve) => { done = resolve; }));
  render(<BranchSettings api={api} {...props} />);
  fireEvent.change(await screen.findByLabelText(/IANA timezone/), { target: { value: "Indian/Mahe" } });
  const form = screen.getByRole("button", { name: "Save settings revision" }).closest("form");
  fireEvent.submit(form); fireEvent.submit(form);
  expect(api.saveBranchSettings).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Back to locations" })).toBeDisabled();
  await act(async () => done({ data: { ...empty, version: 1, status: "INCOMPLETE", config: api.saveBranchSettings.mock.calls[0][1].config } }));
  expect(screen.getByRole("button", { name: "Save settings revision" })).toBeDisabled();
});

test("unsaved navigation needs explicit discard", async () => {
  const close = jest.fn();
  render(<BranchSettings api={api} {...props} onClose={close} />);
  fireEvent.change(await screen.findByLabelText(/IANA timezone/), { target: { value: "Indian/Mahe" } });
  fireEvent.click(screen.getByRole("button", { name: "Back to locations" }));
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(close).toHaveBeenCalledTimes(1);
});

test("read-only users cannot edit or save", async () => {
  render(<BranchSettings api={api} {...props} canManage={false} />);
  expect(await screen.findByLabelText(/IANA timezone/)).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Save settings revision" })).not.toBeInTheDocument();
});

test("failed reload hides stale form and can be retried", async () => {
  api.branchSettings.mockResolvedValueOnce({ data: empty }).mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ data: empty });
  render(<BranchSettings api={api} {...props} />);
  await screen.findByLabelText(/IANA timezone/);
  fireEvent.click(screen.getByRole("button", { name: "Reload" }));
  await screen.findByRole("alert");
  expect(screen.queryByLabelText(/IANA timezone/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reload" }));
  await screen.findByLabelText(/IANA timezone/);
});
