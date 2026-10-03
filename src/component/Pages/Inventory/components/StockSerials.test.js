import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import StockSerials from "./StockSerials";
jest.mock("../../../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: true }) }));
const props = { branch: { id: 1, name: "Branch", is_active: true }, location: { id: 2, name: "Warehouse", is_active: true },
  balance: { id: 3, product_name: "Tool", sku: "TOOL", product_status: "active" }, onClose: jest.fn() };
const data = { items: [{ id: 5, serial_number: "001234567890123456789", condition: "AVAILABLE" }], total: 26, pages: 2 };

test("shows exact serial text, reservation caveat and server pagination", async () => {
  const api = { serials: jest.fn().mockResolvedValue({ data }) };
  render(<StockSerials api={api} {...props} />);
  expect(await screen.findByText("001234567890123456789")).toBeInTheDocument();
  expect(screen.getByText(/Reservations hold quantities, not particular serial numbers/)).toBeInTheDocument();
  expect(screen.getByText("Eligible condition — not assigned")).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("Next Page"));
  await waitFor(() => expect(api.serials).toHaveBeenLastCalledWith(1, 2, 3, 2, 25, expect.any(AbortSignal)));
  await screen.findByText("001234567890123456789");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "10" } });
  await waitFor(() => expect(api.serials).toHaveBeenLastCalledWith(1, 2, 3, 1, 10, expect.any(AbortSignal)));
  await screen.findByText("001234567890123456789");
});

test("failed refresh hides stale serials; empty response never invents identities", async () => {
  const api = { serials: jest.fn().mockResolvedValueOnce({ data }).mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<StockSerials api={api} {...props} />);
  await screen.findByText("001234567890123456789");
  fireEvent.click(screen.getByRole("button", { name: "Refresh serials" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  expect(screen.queryByText("001234567890123456789")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry serials" }));
  expect(await screen.findByText(/Do not infer serial numbers/)).toBeInTheDocument();
});

test("late response is aborted on leaving", async () => {
  let done;
  const api = { serials: jest.fn().mockImplementation(() => new Promise((resolve) => { done = resolve; })) };
  const view = render(<StockSerials api={api} {...props} />);
  const signal = api.serials.mock.calls[0][5];
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => done({ data }));
});
