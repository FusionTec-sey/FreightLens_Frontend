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
  expect(screen.getByRole("link", { name: "Policy approvals" })).toHaveAttribute("href", "/inventory/approvals");
  expect(screen.queryByText("Logistics & Stock")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Sales/POS" })).not.toBeInTheDocument();
});

test("approvals are highlighted independently from inventory", () => {
  show("/inventory/approvals");
  expect(screen.getByRole("link", { name: "Policy approvals" })).toHaveAttribute("aria-current", "page");
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
  expect(screen.queryByRole("link", { name: "Policy approvals" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cost pools" })).toBeInTheDocument();
});

test("inventory subscription is required for its navigation", () => {
  access.hasModule = (name) => name !== "INVENTORY";
  show("/dashboard");
  expect(screen.queryByRole("button", { name: "Inventory" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Policy approvals" })).not.toBeInTheDocument();
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

test("customer-only access opens Sales without granting drafts or reviews", () => {
  access.permissions = ['View_Customer', 'View_Personal_Data'];
  show('/master-data/customers');
  expect(screen.getByRole('button', { name: 'Sales' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('link', { name: 'Sales drafts' })).not.toBeInTheDocument();
  expect(screen.queryByText('Reservation reviews')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Master Data' })).not.toBeInTheDocument();
});

test('count deep links restore the count accordion', () => {
  access.permissions = ['View_CountPlan'];
  show('/inventory/counts/plans');
  expect(screen.getByRole('button', { name: 'Stock Counts' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'Count plans' })).toHaveAttribute('aria-current', 'page');
});

test('review deep links expand the grouped reviews with unchanged route', () => {
  access.isSuperAdmin = true;
  show('/sales/reviews/releases');
  const link = screen.getByRole('link', { name: 'Release reviews' });
  expect(link).toHaveAttribute('aria-current', 'page');
  expect(link.closest('details')).toHaveAttribute('open');
  expect(screen.getByRole('link', { name: 'Customers' })).toBeInTheDocument();
});

test('packing lists belong to Logistics and retain Orders permissions', () => {
  show('/packing-lists');
  const link = screen.getByRole('link', { name: 'Packing Lists' });
  expect(link).toHaveAttribute('aria-current', 'page');
  expect(screen.getByText('Logistics').compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Purchase Orders' })).toHaveAttribute('aria-expanded', 'false');
});

test('module sections follow the approved order', () => {
  access.isSuperAdmin = true;
  access.permissions = ['Administrator', 'View_Setting'];
  const { container } = show('/dashboard');
  const headings = [...container.querySelectorAll('nav span.uppercase')].map(node => node.textContent);
  expect(headings).toEqual(['Core', 'Sales', 'Inventory', 'Procurement', 'Logistics', 'Reports', 'Administration']);
  expect(screen.getByRole('link', { name: 'Template Studio' })).toBeInTheDocument();
});
