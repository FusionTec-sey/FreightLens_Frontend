import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useLocation } from "react-router-dom";
import Sidebar from "./Menu";
import { useAuth } from "../../context/AuthContext";
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-router-dom", () => ({ useLocation: jest.fn(), useNavigate: () => jest.fn(),
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock("../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: false, toggleTheme: jest.fn() }) }));
let access;
beforeEach(() => {
  localStorage.clear();
  access = { permissions: ["View_Product", "Review_InventoryPolicy", "View_Order"], user: "Tester",
    logout: jest.fn(), hasModule: () => true, isRoot: false, isSuperAdmin: false };
  useAuth.mockImplementation(() => access);
});
const show = (path) => { useLocation.mockReturnValue({ pathname: path }); return render(<Sidebar />); };

test("inventory groups existing screens with direct setup and approval links", () => {
  show("/inventory/cost-pools");
  expect(screen.getByText("FreightLens")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Inventory" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "Cost pools" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Branches & locations" })).toHaveAttribute("href", "/inventory/locations");
  expect(screen.getByRole("link", { name: "Approvals" })).toHaveAttribute("href", "/inventory/approvals");
  expect(screen.queryByText("Logistics & Stock")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Sales/POS" })).not.toBeInTheDocument();
});

test("approvals are highlighted independently from inventory", () => {
  show("/inventory/approvals");
  expect(screen.getByRole("link", { name: "Approvals" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Inventory" })).toHaveAttribute("aria-expanded", "false");
});

test("profile review shortcut follows inventory and reviewer permissions", () => {
  const { rerender } = show("/dashboard");
  expect(screen.getByRole("link", { name: "My review queue" })).toHaveAttribute("href", "/inventory/approvals");
  access.permissions = ["View_Product"];
  rerender(<Sidebar />);
  expect(screen.queryByRole("link", { name: "My review queue" })).not.toBeInTheDocument();
  access.permissions = ["Review_InventoryPolicy"];
  access.hasModule = () => false;
  rerender(<Sidebar />);
  expect(screen.queryByRole("link", { name: "My review queue" })).not.toBeInTheDocument();
});

test("module and action access hide unavailable entries", () => {
  access.permissions = ["View_Product"];
  show("/inventory");
  expect(screen.queryByRole("link", { name: "Approvals" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cost pools" })).toBeInTheDocument();
});

test("inventory subscription is required for its navigation", () => {
  access.hasModule = (name) => name !== "INVENTORY";
  show("/dashboard");
  expect(screen.queryByRole("button", { name: "Inventory" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Approvals" })).not.toBeInTheDocument();
});

test.each([["/orders/42/edit", "Purchase Orders"], ["/sourcing/42", "Sourcing"]])("detail route %s restores its module", (path, label) => {
  show(path);
  expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-expanded", "true");
});

test("collapsed menu still allows explicitly opening inventory", () => {
  localStorage.setItem("sidebar_locked", "false");
  show("/inventory/locations");
  fireEvent.click(screen.getByRole("button", { name: "Inventory" }));
  expect(screen.getByRole("link", { name: "Branches & locations" })).toHaveAttribute("aria-current", "page");
});
