/**
 * The sidebar marks exactly one item as the current page.
 *
 * The page registry holds routes nested under one another (/orders and
 * /orders/new). A prefix test alone reported both as active, so two rows in the
 * same section carried the current-page highlight at once.
 *
 * react-router-dom is mocked virtually: its v7 package.json points "main" at a
 * file it does not ship, which webpack resolves through "exports" but jest in
 * react-scripts 5 cannot. Mocking it also lets a test name the current path
 * without a router.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

let mockPath = "/";

jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ to, children, ...rest }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: mockPath }),
    useNavigate: () => jest.fn(),
  }),
  { virtual: true }
);

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: "tester", logout: jest.fn(), isRoot: false }),
}));
jest.mock("../../context/ThemeContext", () => ({
  useTheme: () => ({ isDark: false, toggleTheme: jest.fn() }),
}));
jest.mock("../../hooks/useAppMenu", () => ({
  useAppMenu: () => ({ menu: mockMenu, loading: false, error: null, reload: jest.fn() }),
}));

const mockMenu = [
  {
    id: 1,
    label: "Procurement",
    icon: "ShoppingBag",
    children: [
      { id: 2, label: "Purchase Orders", route: "/orders", icon: "ShoppingBag", children: [] },
      { id: 3, label: "New Purchase Order", route: "/orders/new", icon: "FilePlus", children: [] },
    ],
  },
];

const Sidebar = require("./Menu").default;

const currentLabels = (path) => {
  mockPath = path;
  render(<Sidebar />);
  return screen
    .getAllByRole("link", { current: "page" })
    .map((element) => element.textContent.trim());
};

describe("Sidebar current-page highlight", () => {
  it("marks only the deepest matching item, not its route prefix", () => {
    expect(currentLabels("/orders/new")).toEqual(["New Purchase Order"]);
  });

  it("marks the parent on a detail route that is in no menu", () => {
    expect(currentLabels("/orders/1234")).toEqual(["Purchase Orders"]);
  });

  it("marks the parent on its own route", () => {
    expect(currentLabels("/orders")).toEqual(["Purchase Orders"]);
  });
});
