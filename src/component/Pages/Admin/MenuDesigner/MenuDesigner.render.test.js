/**
 * Render-level tests for the designer panes.
 *
 * The pure-helper tests in menuDraft.test.js cannot see these defects: choosing
 * "Page" snapping back to "Folder", or a folder ignoring its chosen icon, were
 * both bugs in what the component rendered, not in the draft it held.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import MenuItemForm from "./MenuItemForm";
import MenuTreeEditor from "./MenuTreeEditor";

const PAGES = [
  {
    page_key: "DASHBOARD",
    route: "/dashboard",
    title: "Dashboard",
    default_icon: "LayoutDashboard",
    permission_codes: [],
    module_codes: [],
  },
  {
    page_key: "ORDERS",
    route: "/orders",
    title: "Purchase Orders",
    default_icon: "ShoppingBag",
    permission_codes: ["View_Order"],
    module_codes: ["ORDERS"],
  },
];

const item = (overrides = {}) => ({
  temp_id: "t1",
  parent_temp_id: null,
  label: "Item",
  icon: null,
  page_key: null,
  sort_order: 0,
  is_active: true,
  show_when_locked: false,
  ...overrides,
});

const renderForm = (overrides = {}, draft = null) => {
  const current = item(overrides);
  const onChange = jest.fn();
  render(
    <MenuItemForm
      draft={draft || [current]}
      item={current}
      onChange={onChange}
      pages={PAGES}
    />
  );
  return { onChange, current };
};

describe("MenuItemForm", () => {
  it("shows Folder selected for an item with no page_key", () => {
    renderForm({ page_key: null });
    expect(screen.getByLabelText("Folder")).toBeChecked();
    expect(screen.getByLabelText("Page")).not.toBeChecked();
  });

  it("switching to Page asks for an empty page_key, not null", () => {
    const { onChange } = renderForm({ page_key: null });
    fireEvent.click(screen.getByLabelText("Page"));
    expect(onChange).toHaveBeenCalledWith({ page_key: "", is_separator: false });
  });

  it("keeps Page selected while no page has been chosen yet", () => {
    // page_key "" is falsy: a truthiness test would flip this back to Folder.
    renderForm({ page_key: "" });
    // Two controls are labelled "Page" once the page type is active: the radio
    // and the registry dropdown, so the radio is matched by selector.
    expect(screen.getByLabelText("Page", { selector: 'input[type="radio"]' })).toBeChecked();
    expect(screen.getByLabelText("Folder")).not.toBeChecked();
  });

  it("offers the page dropdown and prompts for a selection", () => {
    renderForm({ page_key: "" });
    expect(screen.getByLabelText("Page", { selector: "select" })).toBeInTheDocument();
    expect(screen.getByText("Pick the page this item opens.")).toBeInTheDocument();
  });

  it("offers Separator as a third type", () => {
    const { onChange } = renderForm({ page_key: null });
    fireEvent.click(screen.getByLabelText("Separator"));
    // A heading opens nothing, holds nothing, and sits at the top level.
    expect(onChange).toHaveBeenCalledWith({
      page_key: null,
      is_separator: true,
      show_when_locked: false,
      parent_temp_id: null,
    });
  });

  it("shows a separator as its own type, not as a folder", () => {
    renderForm({ page_key: null, is_separator: true, label: "System" });
    expect(screen.getByLabelText("Separator")).toBeChecked();
    expect(screen.getByLabelText("Folder")).not.toBeChecked();
    expect(screen.getByText(/heading above a group of items/i)).toBeInTheDocument();
  });

  it("hides icon and parent for a separator, which has neither", () => {
    renderForm({ page_key: null, is_separator: true, label: "System" });
    expect(screen.queryByLabelText("Icon")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Parent folder")).not.toBeInTheDocument();
  });

  it("offers an icon search rather than a list of a few names", () => {
    renderForm({ page_key: null, label: "Logistics" });
    // The whole library is available, so the picker searches instead of listing.
    expect(screen.getByLabelText("Icon")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search icons/i)).toBeInTheDocument();
  });

  it("finds an icon that was never on the old hand-kept list", () => {
    const { onChange } = renderForm({ page_key: null, label: "Logistics" });
    fireEvent.change(screen.getByLabelText("Icon"), { target: { value: "forklift" } });
    const match = screen.getByRole("button", { name: "Forklift" });
    fireEvent.click(match);
    expect(onChange).toHaveBeenCalledWith({ icon: "Forklift" });
  });

  it("clears back to the default icon", () => {
    const { onChange } = renderForm({ page_key: null, icon: "Truck", label: "L" });
    fireEvent.click(screen.getByLabelText("Clear icon"));
    expect(onChange).toHaveBeenCalledWith({ icon: null });
  });

  it("fills label and icon from the registry when a page is picked", () => {
    const { onChange } = renderForm({ page_key: "", label: "" });
    fireEvent.change(screen.getByLabelText("Page", { selector: "select" }), {
      target: { value: "ORDERS" },
    });
    expect(onChange).toHaveBeenCalledWith({
      page_key: "ORDERS",
      label: "Purchase Orders",
      icon: "ShoppingBag",
    });
  });

  it("shows the page's required access read-only", () => {
    renderForm({ page_key: "ORDERS", label: "Purchase Orders" });
    expect(screen.getByText("View_Order")).toBeInTheDocument();
    expect(screen.getByText(/Module: ORDERS/)).toBeInTheDocument();
  });

  it("hides show-when-locked for a folder, since a folder opens nothing", () => {
    renderForm({ page_key: null });
    expect(
      screen.queryByText(/Show locked when access is missing/)
    ).not.toBeInTheDocument();
  });

  it("warns that a top-level folder renders as a heading without its icon", () => {
    renderForm({ page_key: null, icon: "Database" });
    expect(screen.getByText(/drawn as a section heading/)).toBeInTheDocument();
  });
});

describe("MenuTreeEditor", () => {
  const noop = () => {};

  const renderTree = (draft) =>
    render(
      <MenuTreeEditor
        collapsed={new Set()}
        draft={draft}
        onMove={noop}
        onRemove={noop}
        onSelect={noop}
        onToggleCollapse={noop}
        selectedId={null}
      />
    );

  it("renders the icon a folder was given, not a generic folder icon", () => {
    const { container } = renderTree([
      item({ temp_id: "f1", label: "Logistics", icon: "Container", page_key: null }),
    ]);
    // lucide names the rendered svg after the icon, so the class reveals which one.
    expect(container.querySelector(".lucide-container")).toBeInTheDocument();
    expect(container.querySelector(".lucide-folder")).not.toBeInTheDocument();
  });

  it("falls back to a folder icon when no icon was chosen", () => {
    const { container } = renderTree([
      item({ temp_id: "f1", label: "Logistics", icon: null, page_key: null }),
    ]);
    expect(container.querySelector(".lucide-folder")).toBeInTheDocument();
  });

  it("labels a page awaiting a selection as such, not as a folder", () => {
    renderTree([item({ temp_id: "p1", label: "Pending", page_key: "" })]);
    expect(screen.getByText("No page")).toBeInTheDocument();
    expect(screen.queryByText("Folder")).not.toBeInTheDocument();
  });

  it("marks real folders as folders", () => {
    renderTree([item({ temp_id: "f1", label: "Logistics", page_key: null })]);
    expect(screen.getByText("Folder")).toBeInTheDocument();
  });

  it("disables moving the first item up and the last item down", () => {
    renderTree([
      item({ temp_id: "a", label: "First", page_key: "DASHBOARD", sort_order: 0 }),
      item({ temp_id: "b", label: "Second", page_key: "ORDERS", sort_order: 1 }),
    ]);
    expect(screen.getByLabelText("Move First up")).toBeDisabled();
    expect(screen.getByLabelText("Move Second down")).toBeDisabled();
    expect(screen.getByLabelText("Move First down")).toBeEnabled();
  });

  it("explains itself when the menu is empty", () => {
    renderTree([]);
    expect(screen.getByText("This menu is empty.")).toBeInTheDocument();
  });
});
