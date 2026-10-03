import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import Dashboard from "./dashboard";
jest.mock("axios", () => ({ get: jest.fn() }));
jest.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ selectedOrgId: 1 }) }));
jest.mock("../../../context/ThemeContext", () => ({ useTheme: () => ({ theme: "light" }) }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));
jest.mock("./components/WidgetCard", () => ({ data }) => <p>Metric: {data.total ?? 0}</p>);
let log;
beforeEach(() => { localStorage.clear(); axios.get.mockReset(); log = jest.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => log.mockRestore());
test("failed metrics are withheld, and retry displays confirmed data", async () => {
  let fail = true;
  axios.get.mockImplementation((url) => url.endsWith("/layout")
    ? Promise.resolve({ data: { widgets: [{ id: 1 }] } })
    : fail ? Promise.reject(new Error("offline")) : Promise.resolve({ data: { data: { total: 7 } } }));
  render(<Dashboard />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard metrics unavailable");
  expect(screen.queryByText(/Metric:/)).not.toBeInTheDocument();
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(await screen.findByText("Metric: 7")).toBeInTheDocument();
});
test("failed layout does not claim that the dashboard is empty", async () => {
  axios.get.mockRejectedValue(new Error("offline"));
  render(<Dashboard />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard layout unavailable");
  expect(screen.queryByText("Your Dashboard is Empty")).not.toBeInTheDocument();
});
